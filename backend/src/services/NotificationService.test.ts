import { describe, it, expect } from 'vitest';

/**
 * Tests notification validation logic (same pattern as other unit tests).
 */

function validateCreateNotification(input: { title?: string; body?: string; url?: string } | null) {
  if (!input) return { error: 'Input obrigatório.' };
  const title = String(input.title || '').trim();
  if (!title) return { error: 'Título obrigatório.' };
  return { ok: true, title, body: String(input.body || '').trim(), url: input.url || null };
}

function validateMarkRead(userId: string | null, notificationId: string | null) {
  if (!userId) return { error: 'Não autenticado.' };
  if (!notificationId) return { error: 'ID da notificação obrigatório.' };
  return { ok: true };
}

describe('Notification — validation', () => {
  describe('createNotification', () => {
    it('rejects null input', () => {
      expect(validateCreateNotification(null).error).toContain('obrigatório');
    });

    it('rejects empty title', () => {
      expect(validateCreateNotification({ title: '', body: 'test' }).error).toContain('Título');
    });

    it('rejects whitespace-only title', () => {
      expect(validateCreateNotification({ title: '   ', body: 'test' }).error).toContain('Título');
    });

    it('accepts valid notification', () => {
      const result = validateCreateNotification({ title: 'Pedido atualizado', body: 'Seu pedido está pronto', url: '/pedido/123' });
      expect(result.ok).toBe(true);
      expect(result.title).toBe('Pedido atualizado');
      expect(result.body).toBe('Seu pedido está pronto');
      expect(result.url).toBe('/pedido/123');
    });

    it('trims title and body', () => {
      const result = validateCreateNotification({ title: '  Hello  ', body: '  World  ' });
      expect(result.title).toBe('Hello');
      expect(result.body).toBe('World');
    });

    it('url defaults to null when empty', () => {
      const result = validateCreateNotification({ title: 'Test', body: '' });
      expect(result.url).toBeNull();
    });
  });

  describe('markRead', () => {
    it('rejects null userId', () => {
      expect(validateMarkRead(null, 'notif-1').error).toContain('autenticado');
    });

    it('rejects null notificationId', () => {
      expect(validateMarkRead('user-1', null).error).toContain('ID');
    });

    it('accepts valid params', () => {
      expect(validateMarkRead('user-1', 'notif-1').ok).toBe(true);
    });
  });
});
