export type UserRole = 'ADMIN' | 'OPERATOR' | 'CHURRASQUEIRO' | 'SUPER_ADMIN' | 'MOTOBOY' | 'STORE_OWNER';

export type JwtPayload = {
  sub: string;        // userId
  storeId?: string;   // storeId do dono (opcional para super admin)
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}
