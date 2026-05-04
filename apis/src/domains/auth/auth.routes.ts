import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthLib } from '../../libs/auth.lib';
import { CommandProducer } from '../../bus/command-producer';
import { authRequired } from '../../middleware/auth.middleware';
export function createAuthRoutes(producer: CommandProducer): Router {
    const ctrl = new AuthController(new AuthLib(producer));
    const r = Router();
    r.post('/register', ctrl.register.bind(ctrl));
    r.post('/signup', ctrl.register.bind(ctrl));
    r.post('/register/preflight', ctrl.preflight.bind(ctrl));
    r.post('/login', ctrl.login.bind(ctrl));
    r.post('/admin-login', ctrl.adminLogin.bind(ctrl));
    r.post('/super-login', ctrl.superAdminLogin.bind(ctrl));
    r.post('/condominium-login', ctrl.condominiumLogin.bind(ctrl));
    r.post('/forgot-password', ctrl.forgotPassword.bind(ctrl));
    r.post('/reset-password', ctrl.resetPassword.bind(ctrl));
    r.post('/verify-email', ctrl.verifyEmail.bind(ctrl));
    r.get('/verify-email', ctrl.verifyEmail.bind(ctrl));
    r.post('/resend-verification', ctrl.resendVerification.bind(ctrl));
    r.post('/change-password', authRequired, ctrl.changePassword.bind(ctrl));
    return r;
}
