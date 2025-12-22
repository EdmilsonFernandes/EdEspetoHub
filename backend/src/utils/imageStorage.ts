import fs from 'fs/promises';
import path from 'path';

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const LOGO_DIR = path.join(UPLOADS_DIR, 'logos');

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

export const saveBase64Image = async (
  data?: string | null,
  prefix = 'logo'
): Promise<string | undefined> => {
  if (!data) return undefined;

  const base64Content = data.replace(/^data:[^;]+;base64,/, '');
  const mimeMatch = data.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  const extension = mimeMatch?.[1]?.split('/')?.[1] || 'png';

  await ensureDir(LOGO_DIR);

  const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`;
  const filePath = path.join(LOGO_DIR, filename);

  const buffer = Buffer.from(base64Content, 'base64');
  await fs.writeFile(filePath, buffer);

  return `/uploads/logos/${filename}`;
};
