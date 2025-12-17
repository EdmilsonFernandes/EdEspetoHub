import { AppDataSource } from '../config/database';
import { CreateStoreDto } from '../dto/CreateStoreDto';
import { StoreSettings } from '../entities/StoreSettings';
import { slugify } from '../utils/slugify';
import { SubscriptionService } from './SubscriptionService';
import { Store } from '../entities/Store';
import { User } from '../entities/User';
import { EntityManager } from 'typeorm';

export class StoreService
{
  private subscriptionService = new SubscriptionService();

  /* =========================
   * CREATE STORE
   * ========================= */
  async create(input: CreateStoreDto)
  {
    return AppDataSource.transaction(async (manager) =>
    {
      const userRepo = manager.getRepository(User);
      const storeRepo = manager.getRepository(Store);

      // 1️⃣ Owner
      const owner = await userRepo.findOne({ where: { id: input.ownerId } });
      if (!owner)
      {
        throw new Error('Proprietário não encontrado');
      }

      // 2️⃣ Slug único
      const slug = await this.generateUniqueSlug(
        input.slug ?? input.name,
        manager
      );

      // 3️⃣ Settings
      const settings = manager.create(StoreSettings, {
        logoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor,
      });

      // 4️⃣ Store
      const store = storeRepo.create({
        name: input.name,
        slug,
        owner,
        settings,
      });

      return storeRepo.save(store);
    });
  }

  /* =========================
   * UPDATE STORE
   * ========================= */
  async update(storeId: string, data: Partial<CreateStoreDto>)
  {
    return AppDataSource.transaction(async (manager) =>
    {
      const storeRepo = manager.getRepository(Store);

      const store = await storeRepo.findOne({
        where: { id: storeId },
        relations: [ 'settings' ],
      });

      if (!store)
      {
        throw new Error('Loja não encontrada');
      }

      // 🧠 REGRA DE NOME / SLUG
      if (data.name && !data.slug)
      {
        store.name = data.name;
        store.slug = await this.generateUniqueSlug(data.name, manager);
      } else
      {
        store.name = data.name ?? store.name;

        if (data.slug)
        {
          store.slug = await this.generateUniqueSlug(data.slug, manager);
        }
      }

      // 🧠 SETTINGS (garantia)
      if (!store.settings)
      {
        store.settings = manager.create(StoreSettings);
      }

      store.settings.logoUrl =
        data.logoUrl ?? store.settings.logoUrl;

      store.settings.primaryColor =
        data.primaryColor ?? store.settings.primaryColor;

      store.settings.secondaryColor =
        data.secondaryColor ?? store.settings.secondaryColor;

      return storeRepo.save(store);
    });
  }

  /* =========================
   * OPEN / CLOSE STORE
   * ========================= */
  async setStatus(storeId: string, open: boolean)
  {
    return AppDataSource.transaction(async (manager) =>
    {
      const storeRepo = manager.getRepository(Store);

      const store = await storeRepo.findOne({ where: { id: storeId } });
      if (!store)
      {
        throw new Error('Loja não encontrada');
      }

      if (open)
      {
        await this.subscriptionService.assertStoreIsActive(store.id);
      }

      store.open = open;
      return storeRepo.save(store);
    });
  }

  /* =========================
   * GET BY SLUG
   * ========================= */
  async getBySlug(slug: string)
  {
    const repo = AppDataSource.getRepository(Store);

    return repo.findOne({
      where: { slug },
      relations: [ 'settings' ],
    });
  }

  /* =========================
   * SLUG UNIQUE (PRIVATE)
   * ========================= */
  private async generateUniqueSlug(
    value: string,
    manager: EntityManager
  ): Promise<string>
  {
    const base = slugify(value);
    let candidate = base;
    let counter = 1;

    const repo = manager.getRepository(Store);

    while (await repo.findOne({ where: { slug: candidate } }))
    {
      candidate = `${base}-${counter++}`;
    }

    return candidate;
  }
}
