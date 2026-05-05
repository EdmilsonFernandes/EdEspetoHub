import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env';
import { publicUploadsMiddleware } from './publicUploads';

const { getPublicObjectFromS3Mock, shouldReadPublicUploadFromS3Mock, loggerWarnMock } = vi.hoisted(() => ({
  getPublicObjectFromS3Mock: vi.fn(),
  shouldReadPublicUploadFromS3Mock: vi.fn(),
  loggerWarnMock: vi.fn(),
}));

vi.mock('../utils/objectStorage', async () => {
  const actual = await vi.importActual<typeof import('../utils/objectStorage')>('../utils/objectStorage');
  return {
    ...actual,
    getPublicObjectFromS3: getPublicObjectFromS3Mock,
    shouldReadPublicUploadFromS3: shouldReadPublicUploadFromS3Mock,
  };
});

vi.mock('../utils/logger', () => ({
  logger: {
    warn: loggerWarnMock,
  },
}));

const createTestApp = () => {
  const app = express();
  app.use('/uploads', publicUploadsMiddleware);
  app.use('/uploads', (req, res) => {
    res.status(200).send(`local:${req.path}`);
  });
  return app;
};

describe('publicUploadsMiddleware', () => {
  const originalMode = env.storage.publicUploadsMode;

  beforeEach(() => {
    env.storage.publicUploadsMode = originalMode;
    getPublicObjectFromS3Mock.mockReset();
    shouldReadPublicUploadFromS3Mock.mockReset();
    loggerWarnMock.mockReset();
  });

  it('serves public uploads from S3 when available', async () => {
    env.storage.publicUploadsMode = 'hybrid';
    shouldReadPublicUploadFromS3Mock.mockReturnValue(true);
    getPublicObjectFromS3Mock.mockResolvedValue({
      body: Buffer.from('from-s3'),
      cacheControl: 'public, max-age=60',
      contentLength: 7,
      contentType: 'image/jpeg',
      etag: '"etag-1"',
      lastModified: new Date('2026-05-05T20:05:24Z'),
    });

    const response = await request(createTestApp()).get('/uploads/products/item.jpg');

    expect(response.status).toBe(200);
    expect(Buffer.from(response.body).toString('utf-8')).toBe('from-s3');
    expect(response.headers['content-type']).toContain('image/jpeg');
    expect(response.headers['cache-control']).toBe('public, max-age=60');
    expect(response.headers.etag).toBe('"etag-1"');
    expect(getPublicObjectFromS3Mock).toHaveBeenCalledWith('/uploads/products/item.jpg');
  });

  it('falls back to local storage in hybrid mode when the object is missing in S3', async () => {
    env.storage.publicUploadsMode = 'hybrid';
    shouldReadPublicUploadFromS3Mock.mockReturnValue(true);
    getPublicObjectFromS3Mock.mockResolvedValue(null);

    const response = await request(createTestApp()).get('/uploads/products/item.jpg');

    expect(response.status).toBe(200);
    expect(response.text).toBe('local:/products/item.jpg');
  });

  it('falls back to local storage in hybrid mode when S3 read fails', async () => {
    env.storage.publicUploadsMode = 'hybrid';
    shouldReadPublicUploadFromS3Mock.mockReturnValue(true);
    getPublicObjectFromS3Mock.mockRejectedValue(new Error('s3_unavailable'));

    const response = await request(createTestApp()).get('/uploads/products/item.jpg');

    expect(response.status).toBe(200);
    expect(response.text).toBe('local:/products/item.jpg');
    expect(loggerWarnMock).toHaveBeenCalledWith(
      'Falling back to local public upload after S3 read failure',
      expect.objectContaining({
        error: 's3_unavailable',
        relativePath: '/uploads/products/item.jpg',
      })
    );
  });

  it('returns 404 in strict s3 mode when the object is missing in S3', async () => {
    env.storage.publicUploadsMode = 's3';
    shouldReadPublicUploadFromS3Mock.mockReturnValue(true);
    getPublicObjectFromS3Mock.mockResolvedValue(null);

    const response = await request(createTestApp()).get('/uploads/products/item.jpg');

    expect(response.status).toBe(404);
  });

  it('keeps non-public uploads on the local path', async () => {
    shouldReadPublicUploadFromS3Mock.mockReturnValue(false);

    const response = await request(createTestApp()).get('/uploads/customers/private.jpg');

    expect(response.status).toBe(200);
    expect(response.text).toBe('local:/customers/private.jpg');
    expect(getPublicObjectFromS3Mock).not.toHaveBeenCalled();
  });
});
