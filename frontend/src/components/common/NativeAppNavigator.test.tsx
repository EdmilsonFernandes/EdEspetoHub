import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => ({
  value: { user: null },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ auth: authMock.value }),
}));

vi.mock('../../services/nativeBiometricService', () => ({
  nativeBiometricService: {
    hasValidStoredCustomerEnrollment: () => false,
    loginCustomerWithBiometrics: vi.fn(),
  },
}));

import { NativeAppNavigator } from './NativeAppNavigator';

describe('NativeAppNavigator', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    authMock.value = { user: null };
  });

  it('ignores stale hidden state and keeps navigation visible on destination pages', () => {
    sessionStorage.setItem('jnk_native_nav_hidden_v1', '1');

    render(
      <MemoryRouter initialEntries={['/destinos/goncalves']}>
        <NativeAppNavigator />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /Destinos/i })).toBeInTheDocument();
    expect(sessionStorage.getItem('jnk_native_nav_hidden_v1')).toBeNull();
  });

  it('marks orders as active on public order tracking pages', () => {
    render(
      <MemoryRouter initialEntries={['/pedido/order-123']}>
        <NativeAppNavigator />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /Pedidos/i })).toHaveClass('text-[#2d5f7b]');
  });
});
