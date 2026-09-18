import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushNotificationsMock = vi.hoisted(() => ({
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  register: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
    isPluginAvailable: () => true,
  },
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: pushNotificationsMock,
}));

vi.mock('@capacitor/app', () => ({
  App: { openSettings: vi.fn() },
}));

vi.mock('@phosphor-icons/react', () => ({
  BellSimple: () => null,
  X: () => null,
}));

import { NativePushPermissionBanner } from './NativePushPermissionBanner';

describe('NativePushPermissionBanner', () => {
  beforeEach(() => {
    pushNotificationsMock.checkPermissions.mockResolvedValue({ receive: 'denied' });
    pushNotificationsMock.requestPermissions.mockResolvedValue({ receive: 'denied' });
    pushNotificationsMock.register.mockResolvedValue(undefined);
  });

  it('allows the notification permission banner to be dismissed', async () => {
    render(
      <MemoryRouter initialEntries={['/hub']}>
        <NativePushPermissionBanner />
      </MemoryRouter>
    );

    const dismissButton = await waitFor(() => screen.getByRole('button', { name: 'Fechar aviso de notificações' }));
    fireEvent.click(dismissButton);

    expect(screen.queryByRole('button', { name: 'Fechar aviso de notificações' })).not.toBeInTheDocument();
    expect(screen.queryByText('Ative notificações de pedido')).not.toBeInTheDocument();
  });
});
