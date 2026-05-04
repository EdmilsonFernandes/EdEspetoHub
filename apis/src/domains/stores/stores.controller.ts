import { NextFunction, Request, Response } from 'express';
import { StoreLib } from '../../libs/store.lib';
import { sendServiceResponse } from '../../lib/response';
export class StoresController {
    constructor(private readonly lib: StoreLib) {}
    public async getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.getBySlug(req.params.slug)); } catch (e) { next(e); } }
    public async listProducts(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.listProducts(req.params.slug, req.query.category as string | undefined)); } catch (e) { next(e); } }
    public async listCategories(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.listCategories(req.params.slug)); } catch (e) { next(e); } }
    public async getTableStatus(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.getTableStatus(req.params.slug)); } catch (e) { next(e); } }
}
