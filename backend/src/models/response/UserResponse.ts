export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  emailVerified: boolean;
  profileImageUrl?: string;
  createdAt: Date;
}
