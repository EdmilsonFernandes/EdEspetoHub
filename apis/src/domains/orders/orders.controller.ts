import { NextFunction, Request, Response } from 'express';
import { OrderLib } from '../../libs/order.lib';
import { sendServiceResponse } from '../../lib/response';
export class OrdersController {
    constructor(private readonly lib: OrderLib) {}
    public async create(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.create(req.params.storeId, req.body, req.token)); } catch (e) { next(e); } }
    public async createBySlug(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.createBySlug(req.params.slug, req.body, req.token)); } catch (e) { next(e); } }
    public async getPublic(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.getPublic(req.params.orderId)); } catch (e) { next(e); } }
    public async getTrackingV2(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.getTrackingV2(req.params.orderId)); } catch (e) { next(e); } }
    public async listQueue(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.listQueue(req.params.storeId, req.token!)); } catch (e) { next(e); } }
    public async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.updateStatus(req.params.orderId, req.body, req.token!)); } catch (e) { next(e); } }
    public async list(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.list(req.params.storeId, req.token!)); } catch (e) { next(e); } }
    public async updateItems(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.updateItems(req.params.orderId, req.body, req.token!)); } catch (e) { next(e); } }
    public async listHighlightsBySlug(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.listHighlightsBySlug(req.params.slug)); } catch (e) { next(e); } }
}
