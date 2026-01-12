export class AppError extends Error {
  code: string;
  status: number;
  details?: Record<string, any>;

  constructor(code: string, status = 400, details?: Record<string, any>) {
    super(code);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
