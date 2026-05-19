import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

vi.mock('@phosphor-icons/react', () => {
  const Icon = ({ size = 16, weight: _weight, ...props }: any) =>
    React.createElement('svg', {
      ...props,
      width: size,
      height: size,
      'data-testid': 'phosphor-icon',
    });

  return {
    __esModule: true,
    ArrowLeft: Icon,
    CheckCircle: Icon,
    ClockCounterClockwise: Icon,
    Code: Icon,
    Copy: Icon,
    CreditCard: Icon,
    DeviceMobile: Icon,
    Fingerprint: Icon,
    LockKey: Icon,
    QrCode: Icon,
    ShieldCheck: Icon,
    Sparkle: Icon,
    Trash: Icon,
    WarningCircle: Icon,
    X: Icon,
  };
});
