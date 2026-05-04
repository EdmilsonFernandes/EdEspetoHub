import { Transporter, ProcessorHandler } from '../interfaces/transporter.interface';
import { QueueTopic, formatQueueTopic } from '../interfaces/queue-topic.interface';
import { ServiceRequest } from '../interfaces/service-request.interface';
import { ServiceResponse } from '../interfaces/service-response.interface';
import { ServiceProcessStatus } from '../enums/service-process-status.enum';

export class InMemoryTransporter implements Transporter {
    private readonly handlers = new Map<string, ProcessorHandler>();
    public async init(): Promise<void> {}
    public register(topic: QueueTopic, handler: ProcessorHandler): void { this.handlers.set(formatQueueTopic(topic), handler); }
    public async send<TInput, TOutput>(topic: QueueTopic, request: ServiceRequest<TInput>): Promise<ServiceResponse<TOutput>> {
        const key = formatQueueTopic(topic);
        const handler = this.handlers.get(key);
        if (!handler) return { status: ServiceProcessStatus.Fail, message: `No processor for: ${key}`, data: null as unknown as TOutput, httpCode: 501 };
        try { return await handler(request as ServiceRequest<unknown>) as ServiceResponse<TOutput>; }
        catch (err: unknown) { return { status: ServiceProcessStatus.Fail, message: err instanceof Error ? err.message : 'Unknown error', data: null as unknown as TOutput, httpCode: 500 }; }
    }
    public async destroy(): Promise<void> { this.handlers.clear(); }
}
