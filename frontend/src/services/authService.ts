import { apiClient } from "../config/apiClient";
import { getMfaDeviceContext, type MfaAuthMode } from "../utils/mfaDevice";

export const authService = {
    async login(identifier: string, password: string, options?: { authMode?: MfaAuthMode }) {
        const normalizedIdentifier = String(identifier || "").trim();
        const response = await apiClient.post("/auth/login", {
            email: normalizedIdentifier,
            password,
            ...getMfaDeviceContext({ authMode: options?.authMode || 'admin' }),
        });
        return response;
    },
    async adminLogin(identifier: string, password: string) {
        const normalizedIdentifier = String(identifier || "").trim();
        const response = await apiClient.post("/auth/admin-login", {
            identifier: normalizedIdentifier,
            password,
            ...getMfaDeviceContext({ authMode: 'admin' }),
        });
        return response;
    },
    async condominiumLogin(identifier: string, password: string) {
        const response = await apiClient.post("/auth/condominium-login", {
            email: String(identifier || "").trim().toLowerCase(),
            password,
            ...getMfaDeviceContext({ authMode: 'condominium' }),
        });
        return response;
    },
    async verifyMfaChallenge(payload: { challengeToken: string; code: string; trustDevice?: boolean }, options?: { authMode?: MfaAuthMode }) {
        const response = await apiClient.post("/auth/mfa/challenge/verify", {
            ...payload,
            ...getMfaDeviceContext({ authMode: options?.authMode }),
        }, { authMode: options?.authMode || 'admin', skipAutoLogout: true });
        return response;
    },
    async getMfaStatus(options?: { authMode?: 'admin' | 'customer' | 'motoboy' | 'superadmin' }) {
        return apiClient.get("/auth/mfa/status", { authMode: options?.authMode || 'admin' });
    },
    async startMfaSetup(options?: { authMode?: 'admin' | 'customer' | 'motoboy' | 'superadmin' }) {
        return apiClient.post("/auth/mfa/setup/start", {}, { authMode: options?.authMode || 'admin' });
    },
    async confirmMfaSetup(code: string, options?: { authMode?: 'admin' | 'customer' | 'motoboy' | 'superadmin' }) {
        return apiClient.post("/auth/mfa/setup/confirm", { code }, { authMode: options?.authMode || 'admin' });
    },
    async disableMfa(code: string, options?: { authMode?: 'admin' | 'customer' | 'motoboy' | 'superadmin' }) {
        return apiClient.post("/auth/mfa/disable", { code }, { authMode: options?.authMode || 'admin' });
    },
    async listTrustedDevices(options?: { authMode?: 'admin' | 'customer' | 'motoboy' | 'superadmin' }) {
        return apiClient.get("/auth/mfa/trusted-devices", { authMode: options?.authMode || 'admin' });
    },
    async revokeTrustedDevice(deviceId: string, options?: { authMode?: 'admin' | 'customer' | 'motoboy' | 'superadmin' }) {
        return apiClient.delete(`/auth/mfa/trusted-devices/${deviceId}`, { authMode: options?.authMode || 'admin' });
    },
    async forgotPassword(email: string) {
        const response = await apiClient.post("/auth/forgot-password", {
            email,
        });
        return response;
    },
    async resetPassword(token: string, newPassword: string) {
        const response = await apiClient.post("/auth/reset-password", {
            token,
            newPassword,
        });
        return response;
    },
    async verifyEmail(payload: { token: string; email?: string }) {
        const response = await apiClient.post("/auth/verify-email", payload);
        return response;
    },
    async registerMotoboy(payload: any) {
        const response = await apiClient.post("/auth/register", payload);
        return response;
    },
    async resendVerification(email: string) {
        const response = await apiClient.post("/auth/resend-verification", {
            email,
        });
        return response;
    },
    async changePassword(currentPassword: string, newPassword: string, options?: { authMode?: 'admin' | 'motoboy' }) {
        const response = await apiClient.post("/auth/change-password", {
            currentPassword,
            newPassword,
        }, {
            authMode: options?.authMode || 'admin',
        });
        return response;
    },
};
