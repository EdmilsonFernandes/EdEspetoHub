/*
 * Ja no Caminho CONFIDENTIAL
 * Copyright (C) 2026 Ja no Caminho - All Rights Reserved.
 * @Date: 2026-05-04
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */
import { ServiceProcessStatus } from '../enums/service-process-status.enum';
export interface ServiceResponse<T> { status: ServiceProcessStatus; message: string; data: T; httpCode: number; }
