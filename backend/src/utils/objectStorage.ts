import fs from 'fs/promises';
import path from 'path';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env';

export type PublicUploadsStorageMode = 'local' | 'hybrid' | 's3';

export const DEFAULT_PUBLIC_UPLOAD_FOLDERS = ['products', 'logos', 'condominiums', 'payment'] as const;

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

const normalizeFolder = (folder: string) => String(folder || '').trim().toLowerCase();

export const normalizeS3KeyPrefix = (value?: string) =>
  String(value || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

export const resolveUploadRelativePath = (folder: string, filename: string) =>
  `/uploads/${folder}/${filename}`;

export const isPublicUploadFolder = (
  folder: string,
  folders: readonly string[] = DEFAULT_PUBLIC_UPLOAD_FOLDERS
) => {
  const normalized = normalizeFolder(folder);
  return folders.some((value) => normalizeFolder(value) === normalized);
};

export const isPublicUploadPath = (
  relativePath: string,
  folders: readonly string[] = DEFAULT_PUBLIC_UPLOAD_FOLDERS
) => {
  const normalized = String(relativePath || '').trim();
  const match = normalized.match(/^\/uploads\/([^/]+)\//i);
  return match ? isPublicUploadFolder(match[1], folders) : false;
};

export const resolveUploadObjectKey = (relativePath: string, prefix = 'uploads') => {
  const normalizedPath = String(relativePath || '')
    .trim()
    .replace(/^\/+/, '');
  const uploadsRelative = normalizedPath.replace(/^uploads\//i, '');
  const normalizedPrefix = normalizeS3KeyPrefix(prefix);
  return normalizedPrefix ? `${normalizedPrefix}/${uploadsRelative}` : uploadsRelative;
};

export const resolveLocalUploadDir = (folder: string) => path.join(UPLOADS_ROOT, folder);

export const resolveLocalUploadPath = (relativePath: string) => {
  const normalized = String(relativePath || '').trim();
  const uploadsRelative = normalized.replace(/^\/uploads\//i, '');
  return path.join(UPLOADS_ROOT, ...uploadsRelative.split('/').filter(Boolean));
};

export const ensureLocalUploadDir = async (folder: string) => {
  await fs.mkdir(resolveLocalUploadDir(folder), { recursive: true });
};

export const inferContentTypeFromFilename = (value: string) => {
  const normalized = path.extname(value).replace('.', '').toLowerCase() || value.replace(/^\./, '').toLowerCase();
  switch (normalized) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'avif':
      return 'image/avif';
    default:
      return 'application/octet-stream';
  }
};

export const shouldWritePublicUploadToS3 = (
  folder: string,
  mode: PublicUploadsStorageMode = env.storage.publicUploadsMode
) => isPublicUploadFolder(folder, env.storage.publicFolders) && mode !== 'local';

export const shouldWriteUploadToLocal = (
  folder: string,
  mode: PublicUploadsStorageMode = env.storage.publicUploadsMode
) => !isPublicUploadFolder(folder, env.storage.publicFolders) || mode !== 's3';

let s3Client: S3Client | null = null;

const ensureS3Configured = () => {
  if (!env.storage.publicUploadsS3Bucket || !env.storage.publicUploadsS3Region) {
    throw new Error('public_uploads_s3_not_configured');
  }
};

const getS3Client = () => {
  ensureS3Configured();
  if (!s3Client) {
    s3Client = new S3Client({ region: env.storage.publicUploadsS3Region });
  }
  return s3Client;
};

export const uploadPublicObjectToS3 = async (
  relativePath: string,
  buffer: Buffer,
  contentType?: string
) => {
  ensureS3Configured();
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.storage.publicUploadsS3Bucket,
      Key: resolveUploadObjectKey(relativePath, env.storage.publicUploadsS3Prefix),
      Body: buffer,
      ContentType: contentType || inferContentTypeFromFilename(relativePath),
    })
  );
};

export const publicObjectExistsInS3 = async (relativePath: string) => {
  ensureS3Configured();
  try {
    await getS3Client().send(
      new HeadObjectCommand({
        Bucket: env.storage.publicUploadsS3Bucket,
        Key: resolveUploadObjectKey(relativePath, env.storage.publicUploadsS3Prefix),
      })
    );
    return true;
  } catch (error: any) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') {
      return false;
    }
    throw error;
  }
};
