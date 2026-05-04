export class AppError extends Error {
    constructor(public readonly statusCode: number, public readonly code: string, message: string) { super(message); this.name = 'AppError'; }
}
export function fromAxiosError(err: unknown): AppError {
    if (err && typeof err === 'object' && 'response' in err) {
        const a = err as { response: { status: number; data: { message?: string } } };
        return new AppError(a.response.status, 'BACKEND_ERROR', a.response.data?.message ?? 'Backend error');
    }
    return new AppError(502, 'BACKEND_UNAVAILABLE', 'Backend is unavailable');
}
