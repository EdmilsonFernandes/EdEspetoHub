import { Response } from 'express';
import { ServiceResponse } from '../bus/interfaces/service-response.interface';
import { ServiceProcessStatus } from '../bus/enums/service-process-status.enum';

export function sendServiceResponse<T>(res: Response, r: ServiceResponse<T>): Response {
    const code = r.httpCode ?? (r.status === ServiceProcessStatus.Success ? 200 : 500);
    if (r.status === ServiceProcessStatus.Fail) {
        const payload: Record<string, unknown> = { message: r.message };
        if ((r as any).code) payload.code = (r as any).code;
        if ((r as any).details) payload.details = (r as any).details;
        return res.status(code).json(payload);
    }
    // Return raw data exactly as backend returns it — no envelope
    return res.status(code).json(r.data);
}
