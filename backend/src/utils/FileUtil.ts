import fs from 'fs/promises';
import path from 'path';
import { Provide } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';

@Provide(Tokens.Utils.FileUtil)
export class FileUtil {
  private readonly UPLOADS_DIR = path.join(process.cwd(), 'uploads');

  private async ensureDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
  }

  private resolveTargetDir(folder: string): string {
    return path.join(this.UPLOADS_DIR, folder);
  }

  public async saveBase64Image(
    data?: string | null,
    prefix = 'logo',
    folder = 'logos'
  ): Promise<string | undefined> {
    if (!data) return undefined;

    const base64Content = data.replace(/^data:[^;]+;base64,/, '');
    const mimeMatch = data.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const extension = mimeMatch?.[1]?.split('/')?.[1] || 'png';

    const targetDir = this.resolveTargetDir(folder);
    await this.ensureDir(targetDir);

    const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`;
    const filePath = path.join(targetDir, filename);

    const buffer = Buffer.from(base64Content, 'base64');
    await fs.writeFile(filePath, buffer);

    return `/uploads/${folder}/${filename}`;
  }
}
