import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Notification } from '../entities/Notification';

export class NotificationController {
  static async list(req: Request, res: Response) {
    const userId = req.auth?.sub;
    if (!userId) return res.status(401).json({ error: 'Não autenticado.' });
    const repo = AppDataSource.getRepository(Notification);
    const items = await repo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 50 });
    const unreadCount = await repo.count({ where: { userId, read: false } });
    return res.json({ items, unreadCount });
  }

  static async create(req: Request, res: Response) {
    const userId = req.auth?.sub;
    if (!userId) return res.status(401).json({ error: 'Não autenticado.' });
    const { title, body, url } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Título obrigatório.' });
    const repo = AppDataSource.getRepository(Notification);
    const entry = repo.create({ userId, title: String(title).trim(), body: String(body || '').trim(), url: url || null });
    await repo.save(entry);
    return res.status(201).json(entry);
  }

  static async markRead(req: Request, res: Response) {
    const userId = req.auth?.sub;
    if (!userId) return res.status(401).json({ error: 'Não autenticado.' });
    const { id } = req.params;
    await AppDataSource.getRepository(Notification).update({ id, userId }, { read: true });
    return res.json({ ok: true });
  }

  static async markAllRead(req: Request, res: Response) {
    const userId = req.auth?.sub;
    if (!userId) return res.status(401).json({ error: 'Não autenticado.' });
    await AppDataSource.getRepository(Notification).update({ userId, read: false }, { read: true });
    return res.json({ ok: true });
  }

  static async remove(req: Request, res: Response) {
    const userId = req.auth?.sub;
    if (!userId) return res.status(401).json({ error: 'Não autenticado.' });
    const { id } = req.params;
    await AppDataSource.getRepository(Notification).delete({ id, userId });
    return res.json({ ok: true });
  }

  static async clearAll(req: Request, res: Response) {
    const userId = req.auth?.sub;
    if (!userId) return res.status(401).json({ error: 'Não autenticado.' });
    await AppDataSource.getRepository(Notification).delete({ userId });
    return res.json({ ok: true });
  }
}
// deploy trigger 1778081507
