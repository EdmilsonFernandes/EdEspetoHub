import { Response } from 'express';
import { ServiceResponse } from '../bus/interfaces/service-response.interface';
import { ServiceProcessStatus } from '../bus/enums/service-process-status.enum';

export function sendServiceResponse<T>(res: Response, r: ServiceResponse<T>): Response {
    const code = r.httpCode ?? (r.status === ServiceProcessStatus.Success ? 200 : 500);
    if (r.status === ServiceProcessStatus.Fail) {
        return res.status(code).json({ message: r.message });
    }
    // Return raw data exactly as backend returns it — no envelope
    return res.status(code).json(r.data);
}
