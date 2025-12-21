const resolveBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || '/api';
};

const API_BASE_URL = resolveBaseUrl();

const defaultHeaders = {
    "Content-Type": "application/json",
};

let currentStoreSlug: string | null = null;

const buildUrl = (path: string) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
};

const handleResponse = async (response: any) => {
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Erro na API");
    }
    return response.json();
};

const request = async (path: string, options: any = {}) => {
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

const rawRequest = async (path: string, options: any = {}) => {
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
    setOwnerId: (storeSlug: string) => {
        currentStoreSlug = storeSlug || null;
    },
    getOwnerId: () => currentStoreSlug,
    get: async (path: string) => request(path),
    post: async (path: string, body: any) =>
        request(path, {
            method: "POST",
            headers: defaultHeaders,
            body: JSON.stringify(body),
        }),
    put: async (path: string, body: any) =>
        request(path, {
            method: "PUT",
            headers: defaultHeaders,
            body: JSON.stringify(body),
        }),
    patch: async (path: string, body: any) =>
        request(path, {
            method: "PATCH",
            headers: defaultHeaders,
            body: JSON.stringify(body),
        }),
    delete: async (path: string) => request(path, { method: "DELETE" }),
    rawGet: (path: string) => rawRequest(path, { method: "GET" }),
    rawPost: (path: string, body: any) => rawRequest(path, { method: "POST", body }),
    rawPut: (path: string, body: any) => rawRequest(path, { method: "PUT", body }),
    rawPatch: (path: string, body: any) => rawRequest(path, { method: "PATCH", body }),
};
