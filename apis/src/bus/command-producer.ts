import { Transporter } from './interfaces/transporter.interface';
import { QueueTopic } from './interfaces/queue-topic.interface';
import { ServiceRequest } from './interfaces/service-request.interface';
import { ServiceResponse } from './interfaces/service-response.interface';

export class CommandProducer {
    constructor(private readonly transporter: Transporter) {}
    public async send<TInput, TOutput>(topic: QueueTopic, request: ServiceRequest<TInput>): Promise<ServiceResponse<TOutput>> {
        return this.transporter.send<TInput, TOutput>(topic, request);
    }
}
