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

let currentOwnerId = null;

const buildUrl = (path) => {
    const url = new URL(path, API_BASE_URL);
    if (currentOwnerId) {
        url.searchParams.set("ownerId", currentOwnerId);
    }
    return url.toString();
};

const handleResponse = async (response) => {
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Erro na API");
    }
    return response.json();
};

const attachOwnerToBody = (body) => {
    if (!body || typeof body !== "string") return body;
    try {
        const parsed = JSON.parse(body);
        if (currentOwnerId && !parsed.ownerId) {
            parsed.ownerId = currentOwnerId;
        }
        return JSON.stringify(parsed);
    } catch (error) {
        return body;
    }
};

const request = async (path, options = {}) => {
    try {
        const url = buildUrl(path);
        const finalOptions = { ...options };

        finalOptions.headers = {
            ...defaultHeaders,
            ...(options.headers || {}),
        };

        if (currentOwnerId) {
            finalOptions.headers["x-owner-id"] = currentOwnerId;
        }

        if (finalOptions.body) {
            finalOptions.body = attachOwnerToBody(finalOptions.body);
        }

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

    if (currentOwnerId) {
        finalOptions.headers["x-owner-id"] = currentOwnerId;
    }

    if (finalOptions.body && typeof finalOptions.body === "object") {
        finalOptions.body = JSON.stringify({
            ...finalOptions.body,
            ...(currentOwnerId ? { ownerId: currentOwnerId } : {}),
        });
    }

    return fetch(url, finalOptions);
};

export const apiClient = {
    setOwnerId: (ownerId) => {
        currentOwnerId = ownerId || null;
    },
    getOwnerId: () => currentOwnerId,
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
