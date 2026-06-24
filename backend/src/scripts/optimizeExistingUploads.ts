/**
 * Backfill: otimiza as imagens JÁ enviadas (resize + compressão com sharp).
 *
 * Percorre as pastas públicas de upload (LOCAL), lê cada imagem, otimiza e
 * sobrescreve SOMENTE se a versão otimizada for menor (idempotente). Se o S3
 * estiver configurado (híbrido/s3), re-envia também pro S3. Pula svg/gif/pdf.
 *
 * Como rodar (no EC2, dentro de backend/):
 *   1) DRY-RUN:  OPTIMIZE_DRY_RUN=true npm run uploads:public:optimize
 *   2) Pra valer: npm run uploads:public:optimize
 */
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';
import {
  inferContentTypeFromFilename,
  resolveLocalUploadDir,
  resolveUploadRelativePath,
  shouldWritePublicUploadToS3,
  uploadPublicObjectToS3,
} from '../utils/objectStorage';
import { optimizeImageBuffer } from '../utils/imageStorage';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const extOf = (absolutePath: string) => (path.extname(absolutePath).slice(1) || '').toLowerCase();

const walkFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(dir, entry.name);
      return entry.isDirectory() ? walkFiles(absolutePath) : [absolutePath];
    })
  );
  return nested.flat();
};

async function main() {
  const dryRun = process.env.OPTIMIZE_DRY_RUN === 'true';
  const s3Configured = Boolean(env.storage.publicUploadsS3Bucket && env.storage.publicUploadsS3Region);

  console.log(`[optimize-uploads] iniciando. dryRun=${dryRun} s3Configured=${s3Configured}`);

  let optimized = 0;
  let skipped = 0;
  let errors = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;

  for (const folder of env.storage.publicFolders) {
    const folderDir = resolveLocalUploadDir(folder);
    let files: string[] = [];
    try {
      files = await walkFiles(folderDir);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    for (const absolutePath of files) {
      const ext = extOf(absolutePath);
      if (!IMAGE_EXTENSIONS.has(ext)) continue;
      try {
        const original = await fs.readFile(absolutePath);
        const optimizedBuf = await optimizeImageBuffer(original, folder, ext);
        bytesBefore += original.length;
        bytesAfter += optimizedBuf.length;

        // Idempotente: só sobrescreve se reduziu.
        if (optimizedBuf.length >= original.length) {
          skipped += 1;
          continue;
        }

        if (dryRun) {
          console.log(`[dry-run] ${absolutePath}: ${original.length} -> ${optimizedBuf.length} bytes`);
          optimized += 1;
          continue;
        }

        await fs.writeFile(absolutePath, optimizedBuf);
        if (s3Configured && shouldWritePublicUploadToS3(folder)) {
          const relativeWithinFolder = path.relative(folderDir, absolutePath).split(path.sep).join('/');
          const relativePath = resolveUploadRelativePath(folder, relativeWithinFolder);
          await uploadPublicObjectToS3(relativePath, optimizedBuf, inferContentTypeFromFilename(absolutePath));
        }
        optimized += 1;
        if (optimized % 25 === 0) {
          console.log(`[optimize-uploads] progresso ${optimized}...`);
        }
      } catch (error: any) {
        errors += 1;
        console.warn(`[optimize-uploads] erro em ${absolutePath}: ${error?.message || error}`);
      }
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
