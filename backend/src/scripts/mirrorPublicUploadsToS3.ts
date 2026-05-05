import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';
import {
  inferContentTypeFromFilename,
  publicObjectExistsInS3,
  resolveLocalUploadDir,
  resolveUploadRelativePath,
  uploadPublicObjectToS3,
} from '../utils/objectStorage';

const walkFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walkFiles(absolutePath);
      }
      return [absolutePath];
    })
  );
  return files.flat();
};

async function main() {
  const overwrite = process.env.PUBLIC_UPLOADS_BACKFILL_OVERWRITE === 'true';
  const dryRun = process.env.PUBLIC_UPLOADS_BACKFILL_DRY_RUN === 'true';

  if (!dryRun && (!env.storage.publicUploadsS3Bucket || !env.storage.publicUploadsS3Region)) {
    throw new Error('PUBLIC_UPLOADS_S3_BUCKET e PUBLIC_UPLOADS_S3_REGION são obrigatórios para o espelhamento.');
  }

  let uploaded = 0;
  let skipped = 0;
  let missingFolders = 0;

  for (const folder of env.storage.publicFolders) {
    const folderDir = resolveLocalUploadDir(folder);
    let files: string[] = [];

    try {
      files = await walkFiles(folderDir);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        missingFolders += 1;
        console.log(`[mirror-public-uploads] pasta ausente, ignorando: ${folderDir}`);
        continue;
      }
      throw error;
    }

    for (const absolutePath of files) {
      const relativeWithinFolder = path.relative(folderDir, absolutePath).split(path.sep).join('/');
      const relativePath = resolveUploadRelativePath(folder, relativeWithinFolder);

      if (dryRun) {
        console.log(`[mirror-public-uploads] dry-run ${relativePath}`);
        uploaded += 1;
        continue;
      }

      if (!overwrite && await publicObjectExistsInS3(relativePath)) {
        skipped += 1;
        continue;
      }

      const buffer = await fs.readFile(absolutePath);
      await uploadPublicObjectToS3(relativePath, buffer, inferContentTypeFromFilename(absolutePath));
      uploaded += 1;
      console.log(`[mirror-public-uploads] enviado ${relativePath}`);
    }
  }

  console.log(
    `[mirror-public-uploads] concluído uploaded=${uploaded} skipped=${skipped} missingFolders=${missingFolders}`
  );
}

main().catch((error) => {
  console.error('[mirror-public-uploads] falhou', error);
  process.exit(1);
});
