import { apiClient } from "../config/apiClient";

export const authService = {
    async login(email, password) {
        const response = await apiClient.post("/auth/login", {
            email,
            password,
        });
        return response;
    },
    async adminLogin(slug, password) {
        const response = await apiClient.post("/auth/admin-login", {
            slug,
            password,
        });
        return response;
    },
};
