import fs from 'fs/promises';
import path from 'path';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { HomeConfigService } from '../services/HomeConfigService';
import { getEnvDbConn, ensureBaseSchema, ensureDatabaseExists } from '../utils/dbBootstrap';
import { inferContentTypeFromFilename } from '../utils/objectStorage';

const ROOT_DIR = path.resolve(process.cwd(), '..');
const MARKETING_DIR = path.join(ROOT_DIR, 'frontend', 'public', 'marketing');

const readImageAsDataUrl = async (filename: string) => {
  const absolutePath = path.join(MARKETING_DIR, filename);
  const buffer = await fs.readFile(absolutePath);
  const contentType = inferContentTypeFromFilename(filename);
  return `data:${contentType};base64,${buffer.toString('base64')}`;
};

async function main() {
  const overwrite = process.env.HOME_CONFIG_SEED_OVERWRITE === 'true';
  const homeConfigService = new HomeConfigService();

  await ensureDatabaseExists(getEnvDbConn());
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  await ensureBaseSchema(AppDataSource);

  const existing = await homeConfigService.getConfig();
  if (!overwrite && !existing.usesFallback) {
    console.log('[seed-home-config] configuração já existe; usando HOME_CONFIG_SEED_OVERWRITE=true para sobrescrever.');
    return;
  }

  const payload = {
    homeBanners: [
      {
        id: 'mercado-pago',
        imageFile: await readImageAsDataUrl('mp01.png'),
        title: 'Mercado Pago',
        description: 'Ative sua loja online com pagamento integrado.',
        actionUrl: '/create?plan=trial',
        order: 1,
        active: true,
        fit: 'cover',
      },
      {
        id: 'termica',
        imageFile: await readImageAsDataUrl('promo-termica-lite.jpg'),
        title: 'Operação completa',
        description: 'Pedidos, impressão e fluxo operacional em um só lugar.',
        actionUrl: '/create?plan=trial',
        order: 2,
        active: true,
        fit: 'cover',
      },
      {
        id: 'adega',
        imageFile: await readImageAsDataUrl('promo-adega-lite.jpg'),
        title: 'Adegas e conveniência',
        description: 'Vitrine pronta para segmentos com alto giro.',
        actionUrl: '/create?plan=trial',
        order: 3,
        active: true,
        fit: 'contain',
      },
      {
        id: 'marketing',
        imageFile: await readImageAsDataUrl('promo-marketing-lite.jpg'),
        title: 'Divulgação multissetorial',
        description: 'Destaque sua operação dentro do hub.',
        actionUrl: '/create?plan=trial',
        order: 4,
        active: true,
        fit: 'contain',
      },
    ],
    marketingPopup: {
      imageFile: await readImageAsDataUrl('mpv2.png'),
      title: 'Crie sua loja online',
      description: 'Integre pedidos, pagamentos e operação no Já no Caminho.',
      actionUrl: '/create?plan=trial',
      active: true,
      fit: 'cover',
    },
  };

  const saved = await homeConfigService.saveConfig(payload);
  const destination = env.storage.publicUploadsMode === 's3'
    ? 's3'
    : String(saved.homeBanners?.[0]?.imageUrl || '').startsWith('/uploads/')
      ? 'local uploads'
      : 'fallback local';

  console.log(
    `[seed-home-config] concluído mode=${env.storage.publicUploadsMode} destination=${destination} usesFallback=${saved.usesFallback}`
  );
}

main()
  .catch((error) => {
    console.error('[seed-home-config] falhou', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy().catch(() => undefined);
    }
  });
