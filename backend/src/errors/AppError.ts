/**
 * Provides AppError functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-12
 */
export class AppError extends Error {
  code: string;
  status: number;
  details?: Record<string, any>;
  /**
   * Creates a new instance.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-12
   */
  constructor(code: string, status = 400, details?: Record<string, any>) {
    /**
     * Executes super logic.
     *
     * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
     * @date 2026-01-12
     */
    super(code);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}