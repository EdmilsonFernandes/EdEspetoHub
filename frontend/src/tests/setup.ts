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
    ArrowClockwise: Icon,
    Buildings: Icon,
    CaretDown: Icon,
    CaretUp: Icon,
    CheckCircle: Icon,
    ClockCounterClockwise: Icon,
    Code: Icon,
    Copy: Icon,
    CreditCard: Icon,
    DeviceMobile: Icon,
    Fingerprint: Icon,
    Gear: Icon,
    House: Icon,
    LockKey: Icon,
    Mountains: Icon,
    Printer: Icon,
    PlugsConnected: Icon,
    QrCode: Icon,
    Receipt: Icon,
    ShieldCheck: Icon,
    Sparkle: Icon,
    Trash: Icon,
    UserCircle: Icon,
    WarningCircle: Icon,
    X: Icon,
  };
});
