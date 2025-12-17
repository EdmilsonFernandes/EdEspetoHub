export interface CreateStoreDto {
  name: string;
  ownerId: string;
  slug?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
}
