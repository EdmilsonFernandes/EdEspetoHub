const resolveBaseUrl = () => {
    const base = process.env.REACT_APP_API_BASE_URL || "/api";

    if (base.endsWith("/api")) {
        return base.replace(/\/+$/, "");
    }

    return `${base.replace(/\/+$/, "")}/api`;
};

const API_BASE_URL = resolveBaseUrl();

const defaultHeaders = {
    "Content-Type": "application/json",
};

let currentStoreSlug = null;

const buildUrl = (path) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
};

const handleResponse = async (response) => {
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Erro na API");
    }
    return response.json();
};

const request = async (path, options = {}) => {
    try {
        const url = buildUrl(path);
        const finalOptions = { ...options };

        finalOptions.headers = {
            ...defaultHeaders,
            ...(options.headers || {}),
        };

        const response = await fetch(url, finalOptions);
        return await handleResponse(response);
    } catch (error) {
        console.error("Erro ao comunicar com a API", error);
        throw new Error(
            "Não foi possível conectar à API. Verifique se o servidor está ativo."
        );
    }
};

const rawRequest = async (path, options = {}) => {
    const url = buildUrl(path);
    const finalOptions = { ...options };

    finalOptions.headers = {
        ...defaultHeaders,
        ...(options.headers || {}),
    };

    if (finalOptions.body && typeof finalOptions.body === "object") {
        finalOptions.body = JSON.stringify(finalOptions.body);
    }

    return fetch(url, finalOptions);
};

export const apiClient = {
    setOwnerId: (storeSlug) => {
        currentStoreSlug = storeSlug || null;
    },
    getOwnerId: () => currentStoreSlug,
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
    rawGet: (path) => rawRequest(path, { method: "GET" }),
    rawPost: (path, body) => rawRequest(path, { method: "POST", body }),
    rawPut: (path, body) => rawRequest(path, { method: "PUT", body }),
    rawPatch: (path, body) => rawRequest(path, { method: "PATCH", body }),
};
