/*
 * Ja no Caminho CONFIDENTIAL
 * Copyright (C) 2026 Ja no Caminho - All Rights Reserved.
 * @Date: 2026-05-04
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */
export interface QueueTopic { service: string; action: string; }
export function formatQueueTopic(t: QueueTopic): string { return `${t.service}:${t.action}`; }
