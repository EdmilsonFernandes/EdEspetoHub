/*
 * Ja no Caminho CONFIDENTIAL
 * Copyright (C) 2026 Ja no Caminho - All Rights Reserved.
 * @Date: 2026-05-04
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */
import { QueueTopic } from './queue-topic.interface';
import { ServiceRequest } from './service-request.interface';
import { ServiceResponse } from './service-response.interface';
export type ProcessorHandler = (request: ServiceRequest<unknown>) => Promise<ServiceResponse<unknown>>;
export interface Transporter {
    init(): Promise<void>;
    register(topic: QueueTopic, handler: ProcessorHandler): void;
    send<TInput, TOutput>(topic: QueueTopic, request: ServiceRequest<TInput>): Promise<ServiceResponse<TOutput>>;
    destroy?(): Promise<void>;
}
