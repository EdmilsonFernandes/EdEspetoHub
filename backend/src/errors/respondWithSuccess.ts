import { Response, Request } from 'express';
import { getMessage, resolveLang } from '../i18n';

export const respondWithSuccess = (
  req: Request,
  res: Response,
  code: string,
  data: Record<string, any> = {},
  status = 200
) => {
  const lang = resolveLang(req);
  const payload = {
    ...data,
    code,
    message: getMessage(code, lang),
  };

  return res.status(status).json(payload);
};
