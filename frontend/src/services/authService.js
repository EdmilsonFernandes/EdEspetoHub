import { apiClient } from "../config/apiClient";

export const authService = {
    async login(username, password, espetoId) {
        const response = await apiClient.post("/login", {
            username,
            password,
            espetoId,
        });
        return {
            token: response.token,
            name: response.name || "Administrador",
            ownerId: response.ownerId || espetoId,
        };
    },
};
