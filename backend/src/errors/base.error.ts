export enum ResponseStatus {
  Success = 'Success',
  Fail = 'Fail',
  Error = 'Error',
}

interface BaseExceptionOptions {
  status?: ResponseStatus;
  module?: string;
}

export class BaseException extends Error {
  public readonly httpStatus: number;
  public readonly status: ResponseStatus;
  public readonly module?: string;

  constructor(httpStatus: number, message: string, options?: BaseExceptionOptions) {
    super(message);

    this.httpStatus = httpStatus;
    this.status = options?.status ?? ResponseStatus.Fail;
    this.module = options?.module;

    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}
