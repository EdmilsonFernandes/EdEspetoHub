import { StoreRepository } from '../repositories/StoreRepository';
import { CreateStoreDto } from '../dto/CreateStoreDto';
import { StoreSettings } from '../entities/StoreSettings';
import { slugify } from '../utils/slugify';
import { UserRepository } from '../repositories/UserRepository';
import { SubscriptionService } from './SubscriptionService';

export class StoreService {
  private storeRepository = new StoreRepository();
  private userRepository = new UserRepository();
  private subscriptionService = new SubscriptionService();

  async create(input: CreateStoreDto) {
    const owner = await this.userRepository.findById(input.ownerId);
    if (!owner) throw new Error('Proprietário não encontrado');

    const slug = input.slug || slugify(input.name);
    const settings = new StoreSettings();
    settings.logoUrl = input.logoUrl;
    settings.primaryColor = input.primaryColor;
    settings.secondaryColor = input.secondaryColor;

    const store = this.storeRepository.create({
      name: input.name,
      slug,
      owner,
      settings,
    });
    settings.store = store;

    return this.storeRepository.save(store);
  }

  async update(storeId: string, data: Partial<CreateStoreDto>) {
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new Error('Loja não encontrada');

    store.name = data.name ?? store.name;
    store.slug = data.slug ? slugify(data.slug) : store.slug;
    store.settings.logoUrl = data.logoUrl ?? store.settings.logoUrl;
    store.settings.primaryColor = data.primaryColor ?? store.settings.primaryColor;
    store.settings.secondaryColor = data.secondaryColor ?? store.settings.secondaryColor;

    return this.storeRepository.save(store);
  }

  async setStatus(storeId: string, open: boolean) {
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new Error('Loja não encontrada');
    if (open) {
      const isActive = await this.subscriptionService.assertStoreIsActive(store.id);
      if (!isActive) {
        throw new Error('Assinatura inativa. Renove para reabrir a loja.');
      }
    }
    store.open = open;
    return this.storeRepository.save(store);
  }

  async getBySlug(slug: string) {
    return this.storeRepository.findBySlug(slug);
  }
}
