import crypto from 'node:crypto';

export class CommercialRules {
  public static cataloguePosterCheck(slug: string, config: Record<string, any>): { valid: boolean; errors: string[]; commercial_mode?: string; price_matrix_required?: boolean } {
    if (!['catalogues', 'posters'].includes(slug)) {
      return { valid: true, errors: [] };
    }
    const errors: string[] = [];
    const quantity = parseInt(String(config.quantity ?? ''), 10);
    if (isNaN(quantity) || quantity < 500) {
      errors.push('Minimum order quantity is 500 pieces.');
    }
    const colors = parseInt(String(config.print_colors ?? ''), 10);
    if (![1, 2, 4].includes(colors)) {
      errors.push('Print colors must be 1, 2 or 4.');
    }
    return {
      valid: errors.length === 0,
      errors,
      commercial_mode: 'QUOTE',
      price_matrix_required: true
    };
  }

  public static a3SheetBasePrice(slug: string, config: Record<string, any>): { currency: string; unit_price: number; unit: string; is_base_price: boolean; quote_required_for_total: boolean } | null {
    if (!['labels-stickers', 'custom-sticker-sheets'].includes(slug)) {
      return null;
    }
    const size = String(config.sheet_size ?? config.finished_size ?? '').trim().toUpperCase();
    if (size !== 'A3') {
      return null;
    }
    return {
      currency: 'PKR',
      unit_price: 2500,
      unit: 'sheet',
      is_base_price: true,
      quote_required_for_total: true
    };
  }

  public static canonicalize(value: any): any {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(CommercialRules.canonicalize);
    }
    const sortedKeys = Object.keys(value).sort();
    const result: Record<string, any> = {};
    for (const key of sortedKeys) {
      result[key] = CommercialRules.canonicalize(value[key]);
    }
    return result;
  }

  public static priceHash(configuration: Record<string, any>): string {
    const canonical = CommercialRules.canonicalize(configuration);
    return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  }
}
