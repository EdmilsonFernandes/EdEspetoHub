import { Request, Response } from 'express';
import { userIdentityService } from '../services/UserIdentityService';

/**
 * Lookup de identidade: dado um email/CPF/CNPJ, diz se já pertence a uma conta
 * e retorna nome + papéis — pra o validador "já tem conta? integrar?".
 *
 * É uma rota pública (usada em fluxo de cadastro, quando a pessoa digita o
 * próprio identificador). Revela apenas existência + nome/papéis, não dados
 * sensíveis — equivalente ao "este email já está cadastrado" de qualquer login.
 */
export class IdentityController {
  static async lookup(req: Request, res: Response) {
    try {
      const value = String(req.query?.value || '').trim();
      if (!value) return res.json({ exists: false });
      const resolved = await userIdentityService.resolveByAnyValue(value);
      if (!resolved) return res.json({ exists: false });
      const description = await userIdentityService.describeUser(resolved.user.id);
      if (!description) return res.json({ exists: false });
      return res.json({
        exists: true,
        identifierType: resolved.identifier.type,
        userId: description.id,
        name: description.name,
        roles: description.roles,
        verified: resolved.identifier.verified,
      });
    } catch (error: any) {
      return res.status(400).json({ exists: false, error: { code: 'IDENTITY_LOOKUP_FAILED', message: error?.message || 'Falha no lookup.' } });
    }
  }
}
