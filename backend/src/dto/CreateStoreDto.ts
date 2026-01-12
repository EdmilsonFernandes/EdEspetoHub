export interface CreateStoreDto {
  name: string;
  ownerId: string;
  slug?: string;
  logoUrl?: string;
  logoFile?: string | null;
  description?: string;
  primaryColor: string;
  secondaryColor?: string;
  socialLinks?: { type: string; value: string }[];
  openingHours?: any[];
  orderTypes?: string[];
}
