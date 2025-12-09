const resolveBaseUrl = () => {
    if (process.env.REACT_APP_API_BASE_URL) {
        return process.env.REACT_APP_API_BASE_URL;
    }

    if (typeof window === "undefined") {
        return "http://localhost:4000";
    }

    if (window.location.port && window.location.port !== "3000") {
        return `${window.location.origin}`;
    }

    return "http://localhost:4000";
};

const API_BASE_URL = resolveBaseUrl();

const defaultHeaders = {
    "Content-Type": "application/json",
};

const handleResponse = async (response) => {
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Erro na API");
    }
    return response.json();
};

const request = async (path, options) => {
    try {
        const response = await fetch(`${API_BASE_URL}${path}`, options);
        return await handleResponse(response);
    } catch (error) {
        console.error("Erro ao comunicar com a API", error);
        throw new Error(
            "Não foi possível conectar à API. Verifique se o servidor está ativo."
        );
    }
};

export const apiClient = {
    get: async (path) => request(path),
    post: async (path, body) =>
        request(path, {
            method: "POST",
            headers: defaultHeaders,
            body: JSON.stringify(body),
        }),
    put: async (path, body) =>
        request(path, {
            method: "PUT",
            headers: defaultHeaders,
            body: JSON.stringify(body),
        }),
    patch: async (path, body) =>
        request(path, {
            method: "PATCH",
            headers: defaultHeaders,
            body: JSON.stringify(body),
        }),
    delete: async (path) => request(path, { method: "DELETE" }),
};
