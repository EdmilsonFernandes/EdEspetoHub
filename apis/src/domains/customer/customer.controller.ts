import { NextFunction, Request, Response } from 'express';
import { CustomerLib } from '../../libs/customer.lib';
import { sendServiceResponse } from '../../lib/response';
export class CustomerController {
    constructor(private readonly lib: CustomerLib) {}
    public async register(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.register(req.body)); } catch (e) { next(e); } }
    public async login(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.login(req.body)); } catch (e) { next(e); } }
    public async verifyEmailCode(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.verifyEmailCode(req.body)); } catch (e) { next(e); } }
    public async resendEmailCode(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.resendEmailCode(req.body)); } catch (e) { next(e); } }
    public async me(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.me(req.token!)); } catch (e) { next(e); } }
    public async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.updateMe(req.body, req.token!)); } catch (e) { next(e); } }
    public async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.changePassword(req.body, req.token!)); } catch (e) { next(e); } }
    public async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.deactivate(req.token!)); } catch (e) { next(e); } }
    public async listOrders(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.listOrders(req.query, req.token!)); } catch (e) { next(e); } }
    public async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.cancelOrder(req.params.orderId, req.body, req.token!)); } catch (e) { next(e); } }
    public async confirmOrderReceived(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.confirmOrderReceived(req.params.orderId, req.token!)); } catch (e) { next(e); } }
    public async listAddresses(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.listAddresses(req.token!)); } catch (e) { next(e); } }
    public async createAddress(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.createAddress(req.body, req.token!)); } catch (e) { next(e); } }
    public async lookupZipCode(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.lookupZipCode(req.params.cep)); } catch (e) { next(e); } }
    public async registerPushToken(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.registerPushToken(req.body, req.token!)); } catch (e) { next(e); } }
    public async registerGuestPushToken(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.registerGuestPushToken(req.body)); } catch (e) { next(e); } }
}
