import { apiClient } from "../config/apiClient";

export const authService = {
    async login(username, password) {
        const response = await apiClient.post("/login", {
            username,
            password,
        });
        return {
            token: response.token,
            name: response.name || "Administrador",
        };
    },
};
