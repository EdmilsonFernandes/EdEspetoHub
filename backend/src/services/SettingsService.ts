import { AppDataSource } from '../config/database';
import { SiteSetting } from '../entities/SiteSetting';

export class SettingsService {
  private repository = AppDataSource.getRepository(SiteSetting);

  async getValue(key: string) {
    const setting = await this.repository.findOne({ where: { key } });
    return setting?.value ?? null;
  }

  async getNumber(key: string, fallback: number) {
    const raw = await this.getValue(key);
    if (!raw) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  async setValue(key: string, value: string) {
    const existing = await this.repository.findOne({ where: { key } });
    if (existing) {
      existing.value = value;
      return this.repository.save(existing);
    }
    const next = this.repository.create({ key, value });
    return this.repository.save(next);
  }
}
