import { apiClient } from "../config/apiClient";

export const authService = {
    async login(email: string, password: string) {
        const response = await apiClient.post("/auth/login", {
            email,
            password,
        });
        return response;
    },
<<<<<<< HEAD
    async adminLogin(slug: string, password: string) {
        const response = await apiClient.post("/auth/admin-login", {
            slug,
=======
    async adminLogin(identifier: string, password: string) {
        const normalizedIdentifier = String(identifier || "").trim();
        const response = await apiClient.post("/auth/admin-login", {
            identifier: normalizedIdentifier,
>>>>>>> main
            password,
        });
        return response;
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
<<<<<<< HEAD
    async verifyEmail(token: string) {
        const response = await apiClient.post("/auth/verify-email", {
            token,
        });
=======
    async verifyEmail(payload: { token: string; email?: string }) {
        const response = await apiClient.post("/auth/verify-email", payload);
        return response;
    },
    async registerMotoboy(payload: any) {
        const response = await apiClient.post("/auth/register", payload);
>>>>>>> main
        return response;
    },
    async resendVerification(email: string) {
        const response = await apiClient.post("/auth/resend-verification", {
            email,
        });
        return response;
    },
<<<<<<< HEAD
=======
    async changePassword(currentPassword: string, newPassword: string) {
        const response = await apiClient.post("/auth/change-password", {
            currentPassword,
            newPassword,
        });
        return response;
    },
>>>>>>> main
};
