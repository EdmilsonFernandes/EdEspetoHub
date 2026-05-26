import { NextFunction, Request, Response } from 'express';
import { AuthLib } from '../../libs/auth.lib';
import { sendServiceResponse } from '../../lib/response';
export class AuthController {
    constructor(private readonly lib: AuthLib) {}
    public async register(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.register(req.body)); } catch (e) { next(e); } }
    public async preflight(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.preflight(req.body)); } catch (e) { next(e); } }
    public async login(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.login(req.body)); } catch (e) { next(e); } }
    public async adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.adminLogin(req.body)); } catch (e) { next(e); } }
    public async superAdminLogin(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.superAdminLogin(req.body)); } catch (e) { next(e); } }
    public async condominiumLogin(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.condominiumLogin(req.body)); } catch (e) { next(e); } }
    public async verifyMfaChallenge(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.verifyMfaChallenge(req.body)); } catch (e) { next(e); } }
    public async mfaStatus(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.mfaStatus(req.token!)); } catch (e) { next(e); } }
    public async startMfaSetup(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.startMfaSetup(req.token!)); } catch (e) { next(e); } }
    public async confirmMfaSetup(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.confirmMfaSetup(req.body, req.token!)); } catch (e) { next(e); } }
    public async disableMfa(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.disableMfa(req.body, req.token!)); } catch (e) { next(e); } }
    public async listTrustedDevices(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.listTrustedDevices(req.token!)); } catch (e) { next(e); } }
    public async revokeTrustedDevice(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.revokeTrustedDevice(String(req.params.deviceId || ''), req.token!)); } catch (e) { next(e); } }
    public async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.forgotPassword(req.body)); } catch (e) { next(e); } }
    public async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.resetPassword(req.body)); } catch (e) { next(e); } }
    public async resetPasswordWithCode(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.resetPasswordWithCode(req.body)); } catch (e) { next(e); } }
    public async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.verifyEmail(req.body, req.query)); } catch (e) { next(e); } }
    public async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.resendVerification(req.body)); } catch (e) { next(e); } }
    public async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> { try { sendServiceResponse(res, await this.lib.changePassword(req.body, req.token!)); } catch (e) { next(e); } }
}
