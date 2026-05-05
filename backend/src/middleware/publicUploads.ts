import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { getPublicObjectFromS3, shouldReadPublicUploadFromS3 } from '../utils/objectStorage';
import { logger } from '../utils/logger';

const buildRelativeUploadPath = (requestPath: string) => {
  const normalized = String(requestPath || '').startsWith('/') ? String(requestPath || '') : `/${String(requestPath || '')}`;
  return `/uploads${normalized}`;
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
        return next();
      }
      return response.status(404).end();
    }

    applyObjectHeaders(response, object);

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
