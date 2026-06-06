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
    ArrowSquareOut: Icon,
    Bicycle: Icon,
    Buildings: Icon,
    CaretDown: Icon,
    CaretUp: Icon,
    CheckCircle: Icon,
    CircleNotch: Icon,
    Clock: Icon,
    ClockCounterClockwise: Icon,
    Code: Icon,
    Copy: Icon,
    CopySimple: Icon,
    CreditCard: Icon,
    DeviceMobile: Icon,
    Fingerprint: Icon,
    Gear: Icon,
    House: Icon,
    ListPlus: Icon,
    LockKey: Icon,
    MapTrifold: Icon,
    Mountains: Icon,
    Package: Icon,
    Phone: Icon,
    Printer: Icon,
    PlugsConnected: Icon,
    QrCode: Icon,
    Receipt: Icon,
    Robot: Icon,
    SealCheck: Icon,
    ShieldCheck: Icon,
    Sparkle: Icon,
    Storefront: Icon,
    Tent: Icon,
    Trash: Icon,
    User: Icon,
    UserCircle: Icon,
    WarningCircle: Icon,
    WhatsappLogo: Icon,
    X: Icon,
  };
});
