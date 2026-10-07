import path from 'node:path';

const TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/tiff': 'tif',
  'application/postscript': 'eps',
};

export class R2ArtworkStorage {
  static validate(file: Express.Multer.File): boolean {
    return Boolean(TYPES[file.mimetype] && matchesSignature(file.buffer, file.mimetype));
  }

  static async store(file: Express.Multer.File, bucket: R2Bucket): Promise<{ key: string; original: string; mime: string; size: number }> {
    const mime = TYPES[file.mimetype];
    if (!mime || !R2ArtworkStorage.validate(file)) throw new Error('Artwork must be a valid PDF, PNG, JPEG, TIFF or EPS file.');
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const key = `${[...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')}.${mime}`;
    await bucket.put(key, file.buffer, {
      httpMetadata: { contentType: file.mimetype },
      customMetadata: { originalName: cleanFilename(file.originalname), byteSize: String(file.size) },
    });
    return { key, original: cleanFilename(file.originalname), mime: file.mimetype, size: file.size };
  }

  static async get(key: string, bucket: R2Bucket): Promise<R2ObjectBody | null> {
    if (!/^[0-9a-f]{48}\.(pdf|png|jpg|tif|eps)$/i.test(key)) return null;
    return await bucket.get(key);
  }

  static async delete(key: string, bucket: R2Bucket): Promise<void> {
    if (!/^[0-9a-f]{48}\.(pdf|png|jpg|tif|eps)$/i.test(key)) return;
    await bucket.delete(key);
  }
}

function matchesSignature(buffer: Buffer, mime: string): boolean {
  if (mime === 'application/pdf') return String.fromCharCode(...buffer.subarray(0, 5)) === '%PDF-';
  if (mime === 'image/png') return [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => buffer[index] === value);
  if (mime === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === 'image/tiff') return [0x49, 0x49, 0x2a, 0x00].every((value, index) => buffer[index] === value) || [0x4d, 0x4d, 0x00, 0x2a].every((value, index) => buffer[index] === value);
  if (mime === 'application/postscript') return String.fromCharCode(...buffer.subarray(0, 10)).startsWith('%!PS-Adobe');
  return false;
}

function cleanFilename(value: string): string {
  const name = path.basename(value || 'artwork').replace(/[\r\n\0]/g, '').slice(0, 180);
  return name || 'artwork';
}
