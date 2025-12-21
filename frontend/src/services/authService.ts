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
};
