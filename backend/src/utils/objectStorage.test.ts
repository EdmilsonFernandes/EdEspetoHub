import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PUBLIC_UPLOAD_FOLDERS,
  inferContentTypeFromFilename,
  isPublicUploadFolder,
  isPublicUploadPath,
  normalizeS3KeyPrefix,
  resolveLocalUploadPath,
  resolveUploadObjectKey,
  resolveUploadRelativePath,
} from './objectStorage';

describe('objectStorage', () => {
  it('recognizes configured public upload folders and paths', () => {
    expect(isPublicUploadFolder('products')).toBe(true);
    expect(isPublicUploadFolder('motoboys')).toBe(false);
    expect(isPublicUploadPath('/uploads/logos/store.png')).toBe(true);
    expect(isPublicUploadPath('/uploads/customers/customer.png')).toBe(false);
  });

  it('normalizes prefixes and resolves object keys', () => {
    expect(normalizeS3KeyPrefix('/uploads/')).toBe('uploads');
    expect(resolveUploadObjectKey('/uploads/products/item.webp', '/mirror/')).toBe('mirror/products/item.webp');
    expect(resolveUploadObjectKey('/uploads/logos/store.jpg', '')).toBe('logos/store.jpg');
  });

  it('builds local and relative upload paths predictably', () => {
    expect(resolveUploadRelativePath('products', 'item.webp')).toBe('/uploads/products/item.webp');
    expect(resolveLocalUploadPath('/uploads/condominiums/banner.png')).toBe(
      path.join(process.cwd(), 'uploads', 'condominiums', 'banner.png')
    );
  });

  it('infers the content type from the file name', () => {
    expect(inferContentTypeFromFilename('image.jpeg')).toBe('image/jpeg');
    expect(inferContentTypeFromFilename('image.webp')).toBe('image/webp');
    expect(inferContentTypeFromFilename('.svg')).toBe('image/svg+xml');
    expect(inferContentTypeFromFilename('unknown.bin')).toBe('application/octet-stream');
  });

  it('keeps the default public folders stable', () => {
    expect(DEFAULT_PUBLIC_UPLOAD_FOLDERS).toEqual(['products', 'logos', 'condominiums', 'payment']);
  });
});
