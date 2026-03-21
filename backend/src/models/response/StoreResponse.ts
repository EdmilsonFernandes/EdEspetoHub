import { UserResponse } from './UserResponse';

export interface StoreResponse {
  id: string;
  name: string;
  slug: string;
  open: boolean;
  owner?: UserResponse;
  settings?: any; // To be refined if needed
  createdAt: Date;
}
