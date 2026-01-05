import fs from 'fs/promises';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const resolveTargetDir = (folder: string) => path.join(UPLOADS_DIR, folder);

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

export const saveBase64Image = async (
  data?: string | null,
  prefix = 'logo',
  folder = 'logos'
): Promise<string | undefined> => {
  if (!data) return undefined;

  const base64Content = data.replace(/^data:[^;]+;base64,/, '');
  const mimeMatch = data.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  const extension = mimeMatch?.[1]?.split('/')?.[1] || 'png';

  const targetDir = resolveTargetDir(folder);
  await ensureDir(targetDir);

  const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`;
  const filePath = path.join(targetDir, filename);

  const buffer = Buffer.from(base64Content, 'base64');
  await fs.writeFile(filePath, buffer);

  return `/uploads/${folder}/${filename}`;
};
