import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import ejs from 'ejs';
import path from 'node:path';
import { env } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import { CloudflareStore } from './src/db/cloudflare-store.js';
import { siteContent } from './src/data/initialData.js';
import { isCustomerFacingProduct } from './src/data/visibility.js';
import { generatedViews } from './src/generated-views.js';
import { CommercialRules } from './src/lib/CommercialRules.js';
import { D1SessionStore } from './src/lib/d1-session-store.js';
import { R2ArtworkStorage } from './src/lib/r2-artwork-storage.js';

const app = express();
const db = new CloudflareStore(env.DB);
const viewRoot = '/hdc-views';
const MAX_ARTWORK_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ARTWORK_REQUEST_BYTES = 25 * 1024 * 1024;
const MAX_ARTWORK_STORAGE_BYTES = 8 * 1024 * 1024 * 1024;
const MAX_ARTWORK_WRITE_COUNT = 100_000;
const MAX_ARTWORK_DOWNLOADS = 1_000_000;
let productSeed: Promise<void> | undefined;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', viewRoot);
app.engine('ejs', (filePath, options, callback) => {
  const key = path.relative(viewRoot, filePath).replaceAll('\\', '/');
  const template = generatedViews[key];
  if (template === undefined) return callback(new Error(`Missing bundled view: ${key}`));
  try {
    ejs.fileLoader = (includePath) => {
      const includeKey = path.relative(viewRoot, includePath).replaceAll('\\', '/');
      const source = generatedViews[includeKey];
      if (source === undefined) throw new Error(`Missing bundled view include: ${includeKey}`);
      return source;
    };
    callback(null, ejs.render(template, options, { filename: filePath }));
  } catch (error) {
    callback(error as Error);
  }
});

// Cloudflare serves versioned static assets through the ASSETS binding.
app.use(async (req, res, next) => {
  if ((req.method !== 'GET' && req.method !== 'HEAD') || !req.path.startsWith('/assets/')) return next();
  const response = await env.ASSETS.fetch(new Request(new URL(req.originalUrl, `https://${req.headers.host || 'localhost'}`)));
  if (response.status === 404) return next();
  res.status(response.status);
  response.headers.forEach((value, name) => res.setHeader(name, value));
  if (req.method === 'HEAD') return res.end();
  res.send(Buffer.from(await response.arrayBuffer()));
});

// Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cloudflare may validate a new version before its secrets are available.
// Read secrets per request, then create the session middleware with the live
// secret instead of caching a missing value during module startup.
let sessionMiddleware: ReturnType<typeof session> | undefined;
app.use((req: Request, res: Response, next: NextFunction) => {
  const sessionSecret = env.SESSION_SECRET;
  if (!sessionSecret || new TextEncoder().encode(sessionSecret).length < 32 || !env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH) {
    return res.status(503).send('HDC is not configured yet. Set its required Worker secrets and try again.');
  }
  sessionMiddleware ??= session({
    name: 'hdc_session',
    secret: sessionSecret,
    store: new D1SessionStore(env.DB),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.APP_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    }
  });
  sessionMiddleware(req, res, next);
});

// Bounded in-memory upload handler. R2 writes are separately capped below.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ARTWORK_FILE_BYTES, files: 3, fields: 40, parts: 50 }
});

// Middleware for CSRF and Flash messages
declare module 'express-session' {
  interface SessionData {
    csrf?: string;
    adminId?: number;
    flashNotice?: string;
    flashError?: string;
  }
}

app.use(async (req: Request, res: Response, next: NextFunction) => {
  productSeed ??= db.ensureProductSeed();
  await productSeed;
  if (!req.session.csrf) {
    req.session.csrf = randomHex(32);
  }

  res.locals.csrfToken = req.session.csrf;
  res.locals.path = req.path;
  res.locals.notice = req.session.flashNotice || '';
  res.locals.error = req.session.flashError || '';
  res.locals.siteContent = siteContent;

  // Clear flash after reading
  req.session.flashNotice = '';
  req.session.flashError = '';

  next();
});

// Auth helper
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminId) {
    return res.redirect('/admin/login');
  }
  next();
}

function verifyCsrf(req: Request, res: Response): boolean {
  const token = req.body._csrf || req.headers['x-csrf-token'];
  if (!token || token !== req.session.csrf) {
    return false;
  }
  return true;
}

// ----------------------------------------------------
// Public Routes
// ----------------------------------------------------

// Home
app.get('/', async (req: Request, res: Response) => {
  const products = await db.getPublishedProducts();
  res.render('home', {
    title: 'Hadi Digital Craft — Printing, made with intent',
    products
  });
});

// Services index
app.get('/services', (req: Request, res: Response) => {
  res.render('services', {
    title: 'Printing services — Hadi Digital Craft'
  });
});

// Service detail
app.get('/services/:slug', async (req: Request, res: Response) => {
  const paramSlug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const slug = String(paramSlug) as keyof typeof siteContent.services;
  const service = siteContent.services[slug];
  if (!service) {
    return res.status(404).render('404', { title: '404 / Not found' });
  }

  const related = (await Promise.all((service.products || []).map(pSlug => db.getProductBySlug(pSlug))))
    .filter((p): p is NonNullable<typeof p> => p !== null && isCustomerFacingProduct(p));

  res.render('service', {
    title: `${service.title} — Hadi Digital Craft`,
    service,
    related
  });
});

// Finishing
app.get('/finishing', (req: Request, res: Response) => {
  res.render('finishing', {
    title: 'Finishing & embellishment — Hadi Digital Craft'
  });
});

// Surface Lab
app.get('/surface-lab', (req: Request, res: Response) => {
  res.render('surface-lab', {
    title: 'Surface Lab — Hadi Digital Craft'
  });
});

// About
app.get('/about', (req: Request, res: Response) => {
  res.render('about', {
    title: 'About Hadi Digital Craft — HDC'
  });
});

// FAQ
app.get('/faq', (req: Request, res: Response) => {
  res.render('faq', {
    title: 'Frequently asked questions — HDC'
  });
});

// Catalogue
app.get('/products', async (req: Request, res: Response) => {
  const products = await db.getPublishedProducts();
  res.render('catalogue', {
    title: 'Print services — Hadi Digital Craft',
    products
  });
});

// Product detail
app.get('/products/:slug', async (req: Request, res: Response) => {
  const paramSlug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const product = await db.getProductBySlug(String(paramSlug));
  if (!product || !isCustomerFacingProduct(product)) {
    return res.status(404).render('404', { title: '404 / Not found' });
  }
  res.render('product', {
    title: `${product.name} — Hadi Digital Craft`,
    product
  });
});

// Quote form (GET)
app.get('/quote', async (req: Request, res: Response) => {
  const products = await db.getPublishedProducts();
  const productParam = String(req.query.product || '');
  const requestedProduct = productParam ? await db.getProductBySlug(productParam) : null;
  const quoteProduct = requestedProduct && isCustomerFacingProduct(requestedProduct) ? requestedProduct : null;

  res.render('quote', {
    title: 'Request a print quote — Hadi Digital Craft',
    products,
    quoteProduct
  });
});

// Quote form (POST)
app.post('/quote', upload.array('artwork', 3), async (req: Request, res: Response) => {
  if (!verifyCsrf(req, res)) {
    return res.status(419).send('Session expired. Return to the form and try again.');
  }

  // Honeypot check
  if (req.body.website_url && String(req.body.website_url).trim() !== '') {
    req.session.flashNotice = 'Thank you. Your request has been received.';
    return res.redirect('/thanks');
  }

  const clientIp = req.get('cf-connecting-ip') || 'unknown';
  if (!await db.checkRateLimit(clientIp)) {
    req.session.flashError = 'Please wait before sending another request.';
    return res.redirect('/quote');
  }

  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim();
  const phone = String(req.body.phone || '').trim();
  const details = String(req.body.details || '').trim();
  const productId = parseInt(String(req.body.product_id || ''), 10) || null;

  let configuration: Record<string, any> = {};
  if (req.body.configuration && typeof req.body.configuration === 'object') {
    for (const [k, v] of Object.entries(req.body.configuration)) {
      if (/^[a-z_]{1,40}$/.test(k) && typeof v === 'string') {
        const cleanV = v.trim();
        if (cleanV !== '' && cleanV.length <= 300) {
          configuration[k] = cleanV;
        }
      }
    }
  }

  let error = '';
  if (!name || name.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || phone.length > 80 || details.length < 12 || details.length > 10000) {
    error = 'Please add your name, a valid email, and a little more detail about the job.';
  }

  let selectedProduct = null;
  if (productId) {
    selectedProduct = await db.getProductById(productId);
    if (!selectedProduct || !isCustomerFacingProduct(selectedProduct)) {
      error = 'That service is no longer available. Please reload the form and try again.';
    } else {
      if (!configuration.quantity) {
        error = 'Add a quantity so HDC can review the request.';
      } else {
        const check = CommercialRules.cataloguePosterCheck(selectedProduct.slug, configuration);
        if (!check.valid) {
          error = check.errors.join(' ');
        }
        if (configuration.quantity) configuration.quantity = parseInt(String(configuration.quantity), 10);
        if (configuration.print_colors) configuration.print_colors = parseInt(String(configuration.print_colors), 10);
      }
    }
  }

  if (error) {
    req.session.flashError = error;
    return res.redirect('/quote');
  }

  // Keep both the per-request upload and cumulative HDC bucket use below
  // conservative portions of R2's included monthly allowances.
  const storedFiles: Array<{ key: string; original: string; mime: string; size: number }> = [];
  const files = req.files as Express.Multer.File[] | undefined;
  let reservedBytes = 0;
  let reservedFileCount = 0;
  let uploadNotice = '';
  if (files && files.length > 0) {
    if (files.some((file) => !R2ArtworkStorage.validate(file))) {
      req.session.flashError = 'Artwork must be a valid PDF, PNG, JPEG, TIFF or EPS file.';
      return res.redirect('/quote');
    }
    const requestBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (requestBytes > MAX_ARTWORK_REQUEST_BYTES) {
      req.session.flashError = 'Please keep artwork uploads to 25 MB total per request. Larger files can be sent to HDC separately.';
      return res.redirect('/quote');
    }

    const reserved = await db.reserveArtworkCapacity(
      requestBytes, files.length, MAX_ARTWORK_STORAGE_BYTES, MAX_ARTWORK_WRITE_COUNT
    );
    if (!reserved) {
      uploadNotice = 'Your quote was received without the artwork files because HDC has reached its secure upload safety limit. Please send artwork to HDC separately.';
    } else {
      reservedBytes = requestBytes;
      reservedFileCount = files.length;
      try {
        for (const f of files) {
          const stored = await R2ArtworkStorage.store(f, env.ARTWORKS);
          storedFiles.push(stored);
        }
      } catch {
        const cleanup = await Promise.allSettled(storedFiles.map((file) => R2ArtworkStorage.delete(file.key, env.ARTWORKS)));
        // Keep the reservation if cleanup fails, so an orphaned object cannot
        // make the storage counter understate actual R2 use.
        if (cleanup.every((result) => result.status === 'fulfilled')) {
          await db.releaseArtworkCapacity(reservedBytes, reservedFileCount);
          reservedBytes = 0;
          reservedFileCount = 0;
        }
        storedFiles.length = 0;
        uploadNotice = 'Your quote was received, but artwork could not be uploaded. Please send the files to HDC separately.';
      }
    }
  }

  // Create quote request record
  try {
    await db.createQuoteRequest({
      customer_name: name,
      email,
      phone,
      details,
      product_id: productId,
      configuration,
      files: storedFiles
    });
    reservedBytes = 0;
    reservedFileCount = 0;
  } catch (error) {
    if (reservedBytes > 0 || reservedFileCount > 0) {
      const cleanup = await Promise.allSettled(storedFiles.map((file) => R2ArtworkStorage.delete(file.key, env.ARTWORKS)));
      if (cleanup.every((result) => result.status === 'fulfilled')) {
        await db.releaseArtworkCapacity(reservedBytes, reservedFileCount);
      }
    }
    throw error;
  }

  req.session.flashNotice = uploadNotice || 'Your request is in. HDC will review the artwork and production details before confirming a specification or price.';
  res.redirect('/thanks');
});

// Thanks confirmation
app.get('/thanks', (req: Request, res: Response) => {
  res.render('thanks', {
    title: 'Project brief received — Hadi Digital Craft'
  });
});

// ----------------------------------------------------
// Admin Routes
// ----------------------------------------------------

// Admin Login (GET)
app.get('/admin/login', (req: Request, res: Response) => {
  if (req.session.adminId) {
    return res.redirect('/admin');
  }
  res.render('login', {
    title: 'Admin sign in'
  });
});

// Admin Login (POST)
app.post('/admin/login', async (req: Request, res: Response) => {
  if (!verifyCsrf(req, res)) {
    return res.status(419).send('Session expired. Please try again.');
  }

  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const clientIp = req.get('cf-connecting-ip') || 'unknown';
  if (!await db.checkRateLimit(`admin:${clientIp}`)) {
    return res.status(429).render('login', { title: 'Admin sign in', error: 'Too many attempts. Please try again later.' });
  }

  if (email === env.ADMIN_EMAIL.toLowerCase() && bcrypt.compareSync(password, env.ADMIN_PASSWORD_HASH)) {
    await new Promise<void>((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
    req.session.adminId = 1;
    req.session.csrf = randomHex(32);
    return res.redirect('/admin');
  }

  res.render('login', {
    title: 'Admin sign in',
    error: 'Sign-in details did not match.'
  });
});

// Admin Logout (POST)
app.post('/admin/logout', requireAdmin, (req: Request, res: Response) => {
  if (!verifyCsrf(req, res)) {
    return res.status(419).send('Session expired.');
  }
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// Admin Review Desk (GET)
app.get('/admin', requireAdmin, async (req: Request, res: Response) => {
  const [quotes, jobs, artworkByQuote, products, artworkUsage] = await Promise.all([
    db.getAdminQuotes(), db.getAdminJobs(), db.getArtworkByQuoteMap(), db.getAdminProducts(), db.getArtworkUsage(),
  ]);

  res.render('admin', {
    title: 'ORVIA review desk',
    quotes,
    jobs,
    artworkByQuote,
    products,
    artworkUsage,
    artworkStorageLimitBytes: MAX_ARTWORK_STORAGE_BYTES,
    artworkFileWriteLimit: MAX_ARTWORK_WRITE_COUNT,
    artworkDownloadLimit: MAX_ARTWORK_DOWNLOADS
  });
});

// Admin Export Quotes CSV (GET)
app.get('/admin/export.csv', requireAdmin, async (req: Request, res: Response) => {
  const [quotes, jobs] = await Promise.all([db.getAdminQuotes(), db.getAdminJobs()]);

  const escapeCsv = (val: any) => {
    let s = String(val ?? '');
    if (/^[=+@\-\t\r]/.test(s)) {
      s = "'" + s;
    }
    return `"${s.replace(/"/g, '""')}"`;
  };

  const headers = [
    'Request ID',
    'Customer',
    'Email',
    'Phone',
    'Details',
    'Status',
    'Received',
    'Product',
    'Configuration JSON',
    'Exact approved PKR match',
    'Job reference',
    'Job status'
  ];

  const rows = quotes.map(q => {
    const job = jobs.find(j => j.quote_id === q.id);
    return [
      q.id,
      q.customer_name,
      q.email,
      q.phone || '',
      q.details,
      q.status,
      q.created_at,
      q.product_name,
      q.configuration_json || '',
      q.matched_price_pkr || '',
      job?.job_reference || '',
      job?.status || ''
    ].map(escapeCsv).join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=hdc-quote-requests.csv');
  res.setHeader('Cache-Control', 'no-store, private');
  res.send(csvContent);
});

// Admin Artwork Download (GET)
app.get('/admin/artwork', requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(String(req.query.id || ''), 10);
  const file = await db.getArtworkFile(id);
  if (!file) {
    return res.status(404).send('Not found');
  }

  if (!await db.reserveArtworkDownload(MAX_ARTWORK_DOWNLOADS)) {
    return res.status(429).send('HDC has reached its secure artwork download safety limit. Contact the site administrator.');
  }

  const object = await R2ArtworkStorage.get(file.storage_key, env.ARTWORKS);
  if (!object) {
    return res.status(404).send('Not found');
  }
  const safeName = file.original_name.replace(/[\r\n\0"]/g, '_').slice(0, 180) || 'artwork';
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  res.type(file.mime_type).send(Buffer.from(await object.arrayBuffer()));
});

// Admin Update Quote Status (POST)
app.post('/admin/quote', requireAdmin, async (req: Request, res: Response) => {
  if (!verifyCsrf(req, res)) {
    return res.status(419).send('Session expired.');
  }
  const id = parseInt(String(req.body.id || ''), 10);
  const allowed = ['new', 'in_review', 'awaiting_customer', 'quoted', 'closed'] as const;
  const status = allowed.includes(req.body.status) ? req.body.status : 'new';

  await db.updateQuoteStatus(id, status, req.session.adminId!);
  req.session.flashNotice = 'Quote status updated.';
  res.redirect('/admin');
});

// Admin Create Job (POST)
app.post('/admin/job', requireAdmin, async (req: Request, res: Response) => {
  if (!verifyCsrf(req, res)) {
    return res.status(419).send('Session expired.');
  }
  const quoteId = parseInt(String(req.body.quote_id || ''), 10);
  const result = await db.createJob(quoteId, req.session.adminId!);
  if (result.success) {
    req.session.flashNotice = result.message;
  } else {
    req.session.flashError = result.message;
  }
  res.redirect('/admin');
});

// Admin Update Job Status (POST)
app.post('/admin/job/status', requireAdmin, async (req: Request, res: Response) => {
  if (!verifyCsrf(req, res)) {
    return res.status(419).send('Session expired.');
  }
  const id = parseInt(String(req.body.id || ''), 10);
  const allowed = [
    'awaiting_customer_approval',
    'approved',
    'in_production',
    'quality_check',
    'ready',
    'completed',
    'on_hold',
    'cancelled'
  ] as const;
  const status = allowed.includes(req.body.status) ? req.body.status : 'awaiting_customer_approval';

  await db.updateJobStatus(id, status, req.session.adminId!);
  req.session.flashNotice = 'Job status updated.';
  res.redirect('/admin');
});

// Admin Exact Price Matrix (POST)
app.post('/admin/price', requireAdmin, async (req: Request, res: Response) => {
  if (!verifyCsrf(req, res)) {
    return res.status(419).send('Session expired.');
  }
  const productId = parseInt(String(req.body.product_id || ''), 10);
  const rawConfig = String(req.body.configuration_json || '');
  const pricePkr = parseFloat(String(req.body.price_pkr || ''));

  let config: Record<string, any> | null = null;
  try {
    config = JSON.parse(rawConfig);
  } catch {
    config = null;
  }

  const product = await db.getProductById(productId);
  if (!product || !config || typeof config !== 'object' || Array.isArray(config) || isNaN(pricePkr) || pricePkr <= 0) {
    req.session.flashError = 'Price row not saved. Select an approved product, a JSON configuration object and a positive PKR amount.';
    return res.redirect('/admin');
  }

  const check = CommercialRules.cataloguePosterCheck(product.slug, config);
  if (!check.valid) {
    req.session.flashError = check.errors.join(' ');
    return res.redirect('/admin');
  }

  await db.addPriceMatrixRow(productId, config, pricePkr, req.session.adminId!);
  req.session.flashNotice = 'Exact price row approved. No formula or fallback price was created.';
  res.redirect('/admin');
});

// Admin Update Product Review (POST)
app.post('/admin/product', requireAdmin, async (req: Request, res: Response) => {
  if (!verifyCsrf(req, res)) {
    return res.status(419).send('Session expired.');
  }
  const id = parseInt(String(req.body.id || ''), 10);
  const short_description = String(req.body.short_description || '').trim();
  const description = String(req.body.description || '').trim();
  const production_approved = req.body.production_approved === '1' ? 1 : 0;
  const public_visibility = req.body.public_visibility === '1' ? 1 : 0;
  const approval_note = String(req.body.approval_note || '').trim();
  const rawProfile = String(req.body.profile_json || '');

  try {
    JSON.parse(rawProfile);
  } catch {
    req.session.flashError = 'Profile must be a valid JSON object before saving.';
    return res.redirect('/admin');
  }

  let status: 'draft' | 'published' = req.body.status === 'published' ? 'published' : 'draft';
  if (!production_approved || !public_visibility) {
    status = 'draft';
  }

  await db.updateProduct(
    id,
    {
      short_description,
      description,
      production_approved,
      public_visibility,
      approval_note,
      profile_json: rawProfile,
      status
    },
    req.session.adminId!
  );

  req.session.flashNotice = 'Product review saved.';
  res.redirect('/admin');
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).render('404', {
    title: '404 / Not found'
  });
});

// Cloudflare's Node HTTP bridge exposes Express through the Worker fetch API.
app.listen(3000);
export default httpServerHandler({ port: 3000 });

function randomHex(size: number): string {
  return [...crypto.getRandomValues(new Uint8Array(size))].map((value) => value.toString(16).padStart(2, '0')).join('');
}
