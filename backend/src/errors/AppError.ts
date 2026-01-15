/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: AppError.ts
 * @Date: 2026-01-12
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

/**
 * Represents AppError.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-12
 */
export class AppError extends Error {
  code: string;
  status: number;
  details?: Record<string, any>;

  /**
   * Creates a new AppError.
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
