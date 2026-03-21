/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: face-verify.job.ts
 */

import { container } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';
import { FaceVerifyService } from '../services/FaceVerifyService';

export const runFaceVerifyJob = async () => {
  const faceVerifyService = container.get<FaceVerifyService>(Tokens.Common.Service.FaceVerifyService);
  console.log('Running face verify job...');
  // Implementation
};
