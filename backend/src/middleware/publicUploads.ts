import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { getPublicObjectFromS3, shouldReadPublicUploadFromS3 } from '../utils/objectStorage';
import { logger } from '../utils/logger';

const uploadsLog = logger.child({ scope: 'PublicUploads' });

const buildRelativeUploadPath = (requestPath: string) => {
  const normalized = String(requestPath || '').startsWith('/') ? String(requestPath || '') : `/${String(requestPath || '')}`;
  return `/uploads${normalized}`;
};

const logReadDecision = (message: string, meta?: Record<string, any>) => {
  if (!env.storage.publicUploadsDebugLog) {
    return;
  }

  uploadsLog.info(message, meta);
};

const applyObjectHeaders = (
  response: Response,
  object: Awaited<ReturnType<typeof getPublicObjectFromS3>>
) => {
  if (!object) return;

  if (object.cacheControl) {
    response.setHeader('Cache-Control', object.cacheControl);
  }
  if (object.contentLength != null) {
    response.setHeader('Content-Length', String(object.contentLength));
  }
  if (object.contentType) {
    response.type(object.contentType);
  }
  if (object.etag) {
    response.setHeader('ETag', object.etag);
  }
  if (object.lastModified) {
    response.setHeader('Last-Modified', object.lastModified.toUTCString());
  }
};

export const publicUploadsMiddleware = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return next();
  }

  const relativePath = buildRelativeUploadPath(request.path);
  if (!shouldReadPublicUploadFromS3(relativePath)) {
    return next();
  }

  try {
    const object = await getPublicObjectFromS3(relativePath);

    if (!object) {
      if (env.storage.publicUploadsMode === 'hybrid') {
        logReadDecision('Public upload missing in S3, falling back to local storage', {
          method: request.method,
          mode: env.storage.publicUploadsMode,
          relativePath,
        });
        return next();
      }

      logReadDecision('Public upload missing in S3 while running in strict S3 mode', {
        method: request.method,
        mode: env.storage.publicUploadsMode,
        relativePath,
      });
      return response.status(404).end();
    }

    applyObjectHeaders(response, object);

    logReadDecision('Served public upload from S3', {
      method: request.method,
      mode: env.storage.publicUploadsMode,
      relativePath,
      contentLength: object.contentLength ?? object.body.length,
      contentType: object.contentType || null,
    });

    if (request.method === 'HEAD') {
      return response.status(200).end();
    }

    return response.status(200).send(object.body);
  } catch (error) {
    if (env.storage.publicUploadsMode === 'hybrid') {
      logger.warn('Falling back to local public upload after S3 read failure', {
        error: error instanceof Error ? error.message : String(error),
        relativePath,
      });
      return next();
    }

    return next(error);
  }
};
