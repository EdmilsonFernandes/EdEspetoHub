export interface CreateUserDto {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  storeName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
}
