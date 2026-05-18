import { CommandProducer } from '../bus/command-producer';
import { ServiceResponse } from '../bus/interfaces/service-response.interface';
export class AuthLib {
    constructor(private readonly p: CommandProducer) {}
    public async register(body: unknown): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'register' }, { data: { body } }); }
    public async preflight(body: unknown): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'preflight' }, { data: { body } }); }
    public async login(body: unknown): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'login' }, { data: { body } }); }
    public async adminLogin(body: unknown): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'adminLogin' }, { data: { body } }); }
    public async superAdminLogin(body: unknown): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'superAdminLogin' }, { data: { body } }); }
    public async condominiumLogin(body: unknown): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'condominiumLogin' }, { data: { body } }); }
    public async verifyMfaChallenge(body: unknown): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'verifyMfaChallenge' }, { data: { body } }); }
    public async mfaStatus(token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'mfaStatus' }, { data: {}, accessToken: token }); }
    public async startMfaSetup(token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'startMfaSetup' }, { data: {}, accessToken: token }); }
    public async confirmMfaSetup(body: unknown, token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'confirmMfaSetup' }, { data: { body }, accessToken: token }); }
    public async disableMfa(body: unknown, token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'disableMfa' }, { data: { body }, accessToken: token }); }
    public async listTrustedDevices(token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'listTrustedDevices' }, { data: {}, accessToken: token }); }
    public async revokeTrustedDevice(deviceId: string, token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'revokeTrustedDevice' }, { data: { deviceId }, accessToken: token }); }
    public async forgotPassword(body: unknown): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'forgotPassword' }, { data: { body } }); }
    public async resetPassword(body: unknown): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'resetPassword' }, { data: { body } }); }
    public async verifyEmail(body: unknown, query: unknown): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'verifyEmail' }, { data: { body, query } }); }
    public async resendVerification(body: unknown): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'resendVerification' }, { data: { body } }); }
    public async changePassword(body: unknown, token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'auth', action: 'changePassword' }, { data: { body }, accessToken: token }); }
}
