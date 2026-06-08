import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../services/storePushService', () => ({
  storePushService: {
    unregisterPushToken: vi.fn(() => Promise.resolve()),
  },
}));

const adminSession = {
  token: 'admin-token',
  user: {
    id: 'admin-1',
    email: 'loja@teste.com',
    role: 'LOJISTA',
  },
  store: {
    id: 'store-1',
    slug: 'loja-teste',
    name: 'Loja Teste',
    settings: {},
  },
};

function AuthProbe() {
  const { auth, setAuth } = useAuth();
  return (
    <div>
      <span data-testid="role">{auth?.user?.role || 'none'}</span>
      <button type="button" onClick={() => setAuth(adminSession as any)}>
        login-admin
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('limpa sessões de cliente e entregador ao iniciar sessão operacional', () => {
    localStorage.setItem('customerSession', JSON.stringify({ token: 'customer-token' }));
    localStorage.setItem('customerSession:loja-teste', JSON.stringify({ token: 'customer-token' }));
    localStorage.setItem('motoboySession', JSON.stringify({ token: 'motoboy-token' }));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    act(() => {
      screen.getByText('login-admin').click();
    });

    expect(screen.getByTestId('role')).toHaveTextContent('LOJISTA');
    expect(localStorage.getItem('adminSession')).toContain('admin-token');
    expect(localStorage.getItem('customerSession')).toBeNull();
    expect(localStorage.getItem('customerSession:loja-teste')).toBeNull();
    expect(localStorage.getItem('motoboySession')).toBeNull();
  });

  it('preserva sessão de cliente ao apenas restaurar admin salvo no boot do app', () => {
    localStorage.setItem('adminSession', JSON.stringify(adminSession));
    localStorage.setItem('customerSession', JSON.stringify({ token: 'customer-token' }));
    localStorage.setItem('customerSession:loja-teste', JSON.stringify({ token: 'customer-token' }));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    expect(screen.getByTestId('role')).toHaveTextContent('LOJISTA');
    expect(localStorage.getItem('customerSession')).toContain('customer-token');
    expect(localStorage.getItem('customerSession:loja-teste')).toContain('customer-token');
  });
});
