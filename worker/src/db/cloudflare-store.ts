import { initialProducts, type Product, type QuoteRequest, type ArtworkFile, type Job } from '../data/initialData.js';
import { PRIVATE_TEXTILE_SLUGS } from '../data/visibility.js';
import { CommercialRules } from '../lib/CommercialRules.js';

type D1Row = Record<string, unknown>;

export class CloudflareStore {
  constructor(private readonly db: D1Database) {}

  async ensureProductSeed(): Promise<void> {
    const statement = `INSERT OR IGNORE INTO products
      (id, slug, name, family, short_description, description, typical_uses, configuration_fields, template, commercial_mode, status, public_visibility, production_approved, approved_by, approved_at, approval_note, sort_order, profile_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    await this.db.batch(initialProducts.map((p) => this.db.prepare(statement).bind(
      p.id, p.slug, p.name, p.family, p.short_description, p.description,
      p.typical_uses ?? null, p.configuration_fields ?? p.configure ?? null,
      p.template, p.commercial_mode, p.status, p.public_visibility,
      p.production_approved, p.approved_by ?? null, p.approved_at ?? null,
      p.approval_note ?? null, p.sort_order, p.profile_json ?? null,
    )));
  }

  async getPublishedProducts(): Promise<Product[]> {
    const placeholders = PRIVATE_TEXTILE_SLUGS.map(() => '?').join(', ');
    const result = await this.db.prepare(`SELECT * FROM products
      WHERE status = 'published' AND public_visibility = 1 AND production_approved = 1
      AND slug NOT IN (${placeholders}) ORDER BY sort_order, name`).bind(...PRIVATE_TEXTILE_SLUGS).all<Product>();
    return result.results;
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    return await this.db.prepare('SELECT * FROM products WHERE slug = ?').bind(slug).first<Product>();
  }

  async getProductById(id: number): Promise<Product | null> {
    return await this.db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<Product>();
  }

  async checkRateLimit(ip: string): Promise<boolean> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
    const bucket = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
    await this.db.prepare(`INSERT INTO quote_rate_limits (bucket_hash, request_count, window_started_at)
      VALUES (?, 1, unixepoch())
      ON CONFLICT(bucket_hash) DO UPDATE SET
        request_count = CASE WHEN window_started_at < unixepoch() - 1800 THEN 1 ELSE request_count + 1 END,
        window_started_at = CASE WHEN window_started_at < unixepoch() - 1800 THEN unixepoch() ELSE window_started_at END`)
      .bind(bucket).run();
    const row = await this.db.prepare('SELECT request_count FROM quote_rate_limits WHERE bucket_hash = ?').bind(bucket).first<{ request_count: number }>();
    return (row?.request_count ?? 0) <= 5;
  }

  async findExactApprovedPrice(productId: number, configuration: Record<string, unknown>): Promise<string | null> {
    const hash = CommercialRules.priceHash(configuration);
    const row = await this.db.prepare(`SELECT price_pkr FROM price_matrix
      WHERE product_id = ? AND configuration_hash = ? AND approved = 1`)
      .bind(productId, hash).first<{ price_pkr: string }>();
    return row?.price_pkr ?? null;
  }

  async createQuoteRequest(data: {
    customer_name: string; email: string; phone?: string | null; details: string;
    product_id?: number | null; configuration?: Record<string, unknown>;
    files?: Array<{ key: string; original: string; mime: string; size: number }>;
  }): Promise<{ quoteId: number }> {
    const quoteId = Date.now() * 1000 + crypto.getRandomValues(new Uint16Array(1))[0] % 1000;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const config = data.configuration ?? {};
    const product = data.product_id ? await this.getProductById(data.product_id) : null;
    const matchedPrice = product ? await this.findExactApprovedPrice(product.id, config) : null;
    const sheetBase = product ? CommercialRules.a3SheetBasePrice(product.slug, config) : null;
    const moqRule = product ? CommercialRules.cataloguePosterCheck(product.slug, config) : null;
    const evaluation = product ? JSON.stringify({ matrix_match: matchedPrice !== null, base_sheet_price: sheetBase, moq_rule: moqRule, price_total_calculated: false }) : null;
    const configJson = product ? JSON.stringify(config) : null;
    const statements = [this.db.prepare(`INSERT INTO quote_requests
      (id, customer_name, email, phone, details, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'new', ?, ?)`).bind(quoteId, data.customer_name, data.email, data.phone ?? null, data.details, now, now)];
    if (product) statements.push(this.db.prepare(`INSERT INTO quote_items
      (quote_id, product_id, configuration_json, matched_price_pkr, evaluation_json)
      VALUES (?, ?, ?, ?, ?)`).bind(quoteId, product.id, configJson, matchedPrice, evaluation));
    const files = data.files ?? [];
    for (const file of data.files ?? []) statements.push(this.db.prepare(`INSERT INTO artwork_files
      (quote_id, storage_key, original_name, mime_type, byte_size, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`).bind(quoteId, file.key, file.original, file.mime, file.size, now));
    if (files.length > 0) {
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      statements.push(this.db.prepare(`UPDATE artwork_storage_quota
        SET used_bytes = used_bytes + ?, reserved_bytes = reserved_bytes - ?,
            stored_files = stored_files + ?, reserved_files = reserved_files - ?
        WHERE singleton_id = 1 AND reserved_bytes >= ? AND reserved_files >= ?`)
        .bind(totalBytes, totalBytes, files.length, files.length, totalBytes, files.length));
    }
    await this.db.batch(statements);
    return { quoteId };
  }

  async reserveArtworkCapacity(bytes: number, files: number, maxBytes: number, maxWrites: number): Promise<boolean> {
    const result = await this.db.prepare(`UPDATE artwork_storage_quota
      SET reserved_bytes = reserved_bytes + ?, reserved_files = reserved_files + ?,
          write_count = write_count + ?
      WHERE singleton_id = 1
        AND used_bytes + reserved_bytes + ? <= ?
        AND write_count + ? <= ?`)
      .bind(bytes, files, files, bytes, maxBytes, files, maxWrites).run();
    return result.meta.changes === 1;
  }

  async releaseArtworkCapacity(bytes: number, files: number): Promise<void> {
    await this.db.prepare(`UPDATE artwork_storage_quota
      SET reserved_bytes = MAX(0, reserved_bytes - ?),
          reserved_files = MAX(0, reserved_files - ?)
      WHERE singleton_id = 1`).bind(bytes, files).run();
  }

  async getArtworkUsage(): Promise<{ used_bytes: number; reserved_bytes: number; stored_files: number; write_count: number; download_count: number }> {
    const row = await this.db.prepare(`SELECT used_bytes, reserved_bytes, stored_files, write_count, download_count
      FROM artwork_storage_quota WHERE singleton_id = 1`)
      .first<{ used_bytes: number; reserved_bytes: number; stored_files: number; write_count: number; download_count: number }>();
    return row ?? { used_bytes: 0, reserved_bytes: 0, stored_files: 0, write_count: 0, download_count: 0 };
  }

  async reserveArtworkDownload(maxDownloads: number): Promise<boolean> {
    const result = await this.db.prepare(`UPDATE artwork_storage_quota
      SET download_count = download_count + 1
      WHERE singleton_id = 1 AND download_count < ?`).bind(maxDownloads).run();
    return result.meta.changes === 1;
  }

  async getAdminQuotes(): Promise<QuoteRequest[]> {
    const rows = await this.db.prepare(`SELECT q.*, p.name AS product_name,
      qi.matched_price_pkr, qi.evaluation_json, qi.configuration_json
      FROM quote_requests q
      LEFT JOIN quote_items qi ON qi.quote_id = q.id
      LEFT JOIN products p ON p.id = qi.product_id
      ORDER BY q.created_at DESC, q.id DESC`).all<QuoteRequest>();
    return rows.results;
  }

  async getAdminJobs(): Promise<Job[]> {
    const rows = await this.db.prepare('SELECT * FROM jobs ORDER BY created_at DESC, id DESC').all<Job>();
    return rows.results;
  }

  async getAdminProducts(): Promise<Product[]> {
    const rows = await this.db.prepare('SELECT * FROM products ORDER BY sort_order, name').all<Product>();
    return rows.results;
  }

  async getArtworkByQuoteMap(): Promise<Record<number, ArtworkFile[]>> {
    const rows = await this.db.prepare('SELECT * FROM artwork_files ORDER BY id').all<ArtworkFile>();
    const map: Record<number, ArtworkFile[]> = {};
    for (const file of rows.results) (map[file.quote_id] ??= []).push(file);
    return map;
  }

  async getArtworkFile(id: number): Promise<ArtworkFile | null> {
    return await this.db.prepare('SELECT * FROM artwork_files WHERE id = ?').bind(id).first<ArtworkFile>();
  }

  async createJob(quoteId: number, adminId: number): Promise<{ success: boolean; message: string }> {
    const quote = await this.db.prepare(`SELECT q.id, qi.product_id, qi.configuration_json, p.name
      FROM quote_requests q LEFT JOIN quote_items qi ON qi.quote_id = q.id
      LEFT JOIN products p ON p.id = qi.product_id WHERE q.id = ? AND q.status = 'quoted'`)
      .bind(quoteId).first<{ id: number; product_id: number | null; configuration_json: string | null; name: string | null }>();
    if (!quote) return { success: false, message: 'Set the request to quoted before creating a job record.' };
    const reference = `HDC-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const spec = JSON.stringify({ quote_id: quoteId, product: quote.name ?? 'Custom print', configuration: JSON.parse(quote.configuration_json ?? '{}'), accepted_by_customer: false });
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const inserted = await this.db.prepare(`INSERT INTO jobs (quote_id, job_reference, status, specification_snapshot, created_at, updated_at)
      VALUES (?, ?, 'awaiting_customer_approval', ?, ?, ?) ON CONFLICT(quote_id) DO NOTHING`)
      .bind(quoteId, reference, spec, now, now).run();
    if (!inserted.meta.changes) return { success: false, message: 'A job already exists for this quote.' };
    await this.db.prepare(`INSERT INTO audit_events (admin_id, event_type, entity_type, entity_id, details_json, created_at)
      VALUES (?, 'job_created', 'quote', ?, ?, ?)`).bind(adminId, quoteId, JSON.stringify({ job_reference: reference }), now).run();
    return { success: true, message: 'Job record created. Customer approval remains pending.' };
  }

  async updateJobStatus(jobId: number, status: Job['status'], adminId: number): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await this.db.batch([
      this.db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?').bind(status, now, jobId),
      this.db.prepare(`INSERT INTO audit_events (admin_id, event_type, entity_type, entity_id, details_json, created_at)
        SELECT ?, 'job_status_changed', 'job', ?, ?, ? WHERE EXISTS (SELECT 1 FROM jobs WHERE id = ?)`)
        .bind(adminId, jobId, JSON.stringify({ status }), now, jobId),
    ]);
  }

  async updateQuoteStatus(quoteId: number, status: QuoteRequest['status'], adminId: number): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await this.db.batch([
      this.db.prepare('UPDATE quote_requests SET status = ?, updated_at = ? WHERE id = ?').bind(status, now, quoteId),
      this.db.prepare(`INSERT INTO audit_events (admin_id, event_type, entity_type, entity_id, details_json, created_at)
        SELECT ?, 'quote_status_changed', 'quote', ?, ?, ? WHERE EXISTS (SELECT 1 FROM quote_requests WHERE id = ?)`)
        .bind(adminId, quoteId, JSON.stringify({ status }), now, quoteId),
    ]);
  }

  async addPriceMatrixRow(productId: number, configuration: Record<string, unknown>, pricePkr: number, adminId: number): Promise<void> {
    const hash = CommercialRules.priceHash(configuration);
    const now = new Date().toISOString();
    await this.db.batch([
      this.db.prepare(`INSERT INTO price_matrix (product_id, configuration_hash, price_pkr, approved, approved_by, approved_at)
        VALUES (?, ?, ?, 1, ?, ?) ON CONFLICT(product_id, configuration_hash) DO UPDATE SET
        price_pkr = excluded.price_pkr, approved = 1, approved_by = excluded.approved_by, approved_at = excluded.approved_at`)
        .bind(productId, hash, pricePkr.toFixed(2), adminId, now),
      this.db.prepare(`INSERT INTO audit_events (admin_id, event_type, entity_type, entity_id, details_json, created_at)
        VALUES (?, 'price_matrix_row_approved', 'product', ?, ?, ?)`)
        .bind(adminId, productId, JSON.stringify({ hash, price_pkr: pricePkr }), now),
    ]);
  }

  async updateProduct(id: number, update: Partial<Product>, adminId: number): Promise<void> {
    const fields: Array<keyof Product> = ['short_description', 'description', 'production_approved', 'public_visibility', 'approval_note', 'profile_json', 'status'];
    const assignments = fields.map((field) => `${field} = ?`).join(', ');
    const values = fields.map((field) => update[field] ?? null);
    const now = new Date().toISOString();
    await this.db.batch([
      this.db.prepare(`UPDATE products SET ${assignments}, updated_at = ? WHERE id = ?`).bind(...values, now, id),
      this.db.prepare(`INSERT INTO audit_events (admin_id, event_type, entity_type, entity_id, details_json, created_at)
        SELECT ?, 'product_review_saved', 'product', ?, ?, ? WHERE EXISTS (SELECT 1 FROM products WHERE id = ?)`)
        .bind(adminId, id, JSON.stringify(update), now, id),
    ]);
  }
}
