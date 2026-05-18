type BackendErrorPayload = {
    code?: string;
    message?: string;
    details?: Record<string, unknown> | null;
    error?: {
        code?: string;
        message?: string;
        details?: Record<string, unknown> | null;
    };
};

export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly code: string,
        message: string,
        public readonly details: Record<string, unknown> | null = null
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export function fromAxiosError(err: unknown): AppError {
    if (err && typeof err === 'object' && 'response' in err) {
        const a = err as { response: { status: number; data?: BackendErrorPayload } };
        const payload = a.response.data || {};
        const nested = payload.error || {};
        const code = payload.code || nested.code || 'BACKEND_ERROR';
        const details = payload.details || nested.details || null;
        const detailsMessage =
            details && typeof details.message === 'string' ? String(details.message).trim() : '';
        const message =
            detailsMessage ||
            payload.message ||
            nested.message ||
            'Backend error';

        return new AppError(a.response.status, code, message, details);
    }
    return new AppError(502, 'BACKEND_UNAVAILABLE', 'Backend is unavailable');
}
