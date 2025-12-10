import { apiClient } from "../config/apiClient";

export const customerService = {
    async fetchAll(search) {
        const query = search ? `?search=${encodeURIComponent(search)}` : "";
        return apiClient.get(`/customers${query}`);
    },
};
