import { SettingsService } from './SettingsService';
import {
  HOME_CONFIG_SETTING_KEY,
  HomeConfig,
  MarketingPopupConfig,
  ResolvedHomeConfig,
  normalizeHomeConfig,
  resolveHomeConfig,
} from '../utils/homeConfig';
import { saveBase64Image } from '../utils/imageStorage';

type EditableBannerInput = Partial<HomeConfig['homeBanners'][number]> & {
  imageFile?: string | null;
};

type EditablePopupInput = Partial<MarketingPopupConfig> & {
  imageFile?: string | null;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeBase64Input = (value: unknown) => {
  const trimmed = String(value ?? '').trim();
  return trimmed.startsWith('data:image/') ? trimmed : '';
};

export class HomeConfigService {
  private settingsService = new SettingsService();

  async getConfig(): Promise<ResolvedHomeConfig> {
    const storedValue = await this.settingsService.getValue(HOME_CONFIG_SETTING_KEY);
    return resolveHomeConfig(storedValue);
  }

  async saveConfig(input: unknown): Promise<ResolvedHomeConfig> {
    if (!isPlainObject(input)) {
      throw new Error('home_config_invalid_payload');
    }

    const rawBanners = Array.isArray(input.homeBanners) ? input.homeBanners : [];
    const preparedBanners = await Promise.all(
      rawBanners.map(async (banner, index) => this.prepareBanner(banner, index))
    );
    const preparedPopup = await this.prepareMarketingPopup(input.marketingPopup);

    const normalized = normalizeHomeConfig({
      homeBanners: preparedBanners,
      marketingPopup: preparedPopup,
    });

    await this.settingsService.setValue(HOME_CONFIG_SETTING_KEY, JSON.stringify(normalized));

    return {
      ...normalized,
      usesFallback: false,
    };
  }

  private async prepareBanner(input: unknown, index: number) {
    const banner = isPlainObject(input) ? (input as EditableBannerInput) : {};
    const imageFile = normalizeBase64Input(banner.imageFile);
    const uploadedImageUrl = imageFile
      ? await saveBase64Image(imageFile, `home-banner-${index + 1}`, 'logos')
      : undefined;

    return {
      ...banner,
      imageUrl: uploadedImageUrl || String(banner.imageUrl || '').trim(),
    };
  }

  private async prepareMarketingPopup(input: unknown) {
    const popup = isPlainObject(input) ? (input as EditablePopupInput) : {};
    const imageFile = normalizeBase64Input(popup.imageFile);
    const uploadedImageUrl = imageFile
      ? await saveBase64Image(imageFile, 'home-marketing-popup', 'logos')
      : undefined;

    return {
      ...popup,
      imageUrl: uploadedImageUrl || String(popup.imageUrl || '').trim(),
    };
  }
}
