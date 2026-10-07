import type { Product } from './initialData.js';

export const PRIVATE_TEXTILE_SLUGS = [
  'custom-dtf-transfers',
  'gang-sheets',
  'bulk-transfers',
  't-shirts',
  'hoodies',
  'jerseys-uniforms',
  'caps',
] as const;

export function isCustomerFacingProduct(product: Product): boolean {
  return product.status === 'published' && product.public_visibility === 1 && product.production_approved === 1 &&
    !PRIVATE_TEXTILE_SLUGS.includes(product.slug as typeof PRIVATE_TEXTILE_SLUGS[number]);
}
