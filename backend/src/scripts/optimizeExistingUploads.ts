/**
 * Backfill: otimiza as imagens JÁ enviadas no S3 (resize + compressão com sharp).
 *
 * Lista os objetos públicos, baixa cada imagem, otimiza (optimizeImageBuffer) e
 * re-envia SOMENTE se a versão otimizada for menor (idempotente: já otimizadas
 * são puladas). Pula svg/gif/pdf e erros individuais.
 *
 * Como rodar (no EC2, dentro de backend/ com o .env de prod):
 *   1) DRY-RUN primeiro pra conferer os tamanhos:
 *        OPTIMIZE_DRY_RUN=true npm run uploads:public:optimize
 *   2) Pra valer:
 *        npm run uploads:public:optimize
 */
import { env } from '../config/env';
import {
  getPublicObjectFromS3,
  isPublicUploadPath,
  listPublicUploadRelativePaths,
  uploadPublicObjectToS3,
} from '../utils/objectStorage';
import { optimizeImageBuffer } from '../utils/imageStorage';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

const extOf = (p: string) => (p.split('.').pop() || '').toLowerCase();
const folderOf = (p: string) => {
  const match = p.match(/^\/uploads\/([^/]+)\//i);
  return match?.[1] || '';
};

async function main() {
  const dryRun = process.env.OPTIMIZE_DRY_RUN === 'true';

  if (!env.storage.publicUploadsS3Bucket || !env.storage.publicUploadsS3Region) {
    throw new Error('PUBLIC_UPLOADS_S3_BUCKET e PUBLIC_UPLOADS_S3_REGION são obrigatórios.');
  }

  console.log('[optimize-uploads] listando objetos no S3...');
  const all = await listPublicUploadRelativePaths();
  const paths = all.filter((p) => isPublicUploadPath(p) && IMAGE_EXTENSIONS.has(extOf(p)));
  console.log(`[optimize-uploads] ${all.length} objetos, ${paths.length} imagens candidatas. dryRun=${dryRun}`);

  let optimized = 0;
  let skipped = 0;
  let errors = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;

  for (const relativePath of paths) {
    try {
      const obj = await getPublicObjectFromS3(relativePath);
      if (!obj) {
        skipped += 1;
        continue;
      }
      const folder = folderOf(relativePath);
      const optimizedBuf = await optimizeImageBuffer(obj.body, folder, extOf(relativePath));
      bytesBefore += obj.body.length;
      bytesAfter += optimizedBuf.length;

      // Idempotente: só re-envia se reduziu de fato.
      if (optimizedBuf.length >= obj.body.length) {
        skipped += 1;
        continue;
      }

      if (dryRun) {
        console.log(`[dry-run] ${relativePath}: ${obj.body.length} -> ${optimizedBuf.length} bytes`);
        optimized += 1;
        continue;
      }

      await uploadPublicObjectToS3(relativePath, optimizedBuf, obj.contentType || undefined);
      optimized += 1;
      if (optimized % 25 === 0) {
        console.log(`[optimize-uploads] progresso ${optimized}/${paths.length}...`);
      }
    } catch (error: any) {
      errors += 1;
      console.warn(`[optimize-uploads] erro em ${relativePath}: ${error?.message || error}`);
    }
  }

  const reduction = bytesBefore > 0 ? Math.round((1 - bytesAfter / bytesBefore) * 100) : 0;
  console.log(
    `[optimize-uploads] concluído | optimized=${optimized} skipped=${skipped} errors=${errors} | ` +
      `bytes ${bytesBefore} -> ${bytesAfter} (${reduction}% menor no total processado)`
  );
}

main().catch((error) => {
  console.error('[optimize-uploads] falhou', error);
  process.exit(1);
});
