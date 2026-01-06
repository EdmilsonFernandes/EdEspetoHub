import { apiClient } from "../config/apiClient";

export const authService = {
    async login(email: string, password: string) {
        const response = await apiClient.post("/auth/login", {
            email,
            password,
        });
        return response;
    },
    async adminLogin(slug: string, password: string) {
        const response = await apiClient.post("/auth/admin-login", {
            slug,
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
};
