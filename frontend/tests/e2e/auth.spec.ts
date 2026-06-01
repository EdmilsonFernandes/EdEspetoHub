import { test, expect, type Page } from '@playwright/test';

const waitForAppIntro = async (page: Page) => {
  await page.getByText('Conectando com segurança').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => undefined);
};

test.use({ serviceWorkers: 'block' });

test.describe('Suíte E2E: Auth e Acesso', () => {
  test('deve abrir a tela principal e carregar a plataforma do marketplace (Mobile)', async ({ page }) => {
    // A baseURL já gerencia o http://localhost:8080 configurado no playwright.config.ts
    await page.goto('/');

    // Verificação base: a home pública carrega com o branding atual sem tela em branco.
    await expect(page).toHaveTitle(/Já no Caminho|Plataforma/i);
  });

  test('entrada principal abre cliente e acessos profissionais ficam secundários', async ({ page }) => {
    await page.goto('/');
    await waitForAppIntro(page);

    await page.getByRole('button', { name: /^Entrar$/ }).last().click();
    await expect(page).toHaveURL(/\/cliente\?mode=login/);
    await expect(page.getByRole('banner')).toContainText('Área do cliente');

    await page.getByRole('button', { name: /Acesso profissional/i }).click();
    const dialog = page.getByRole('dialog', { name: /Acessos profissionais/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Lojista/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Entregador/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Parceiro/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Condomínio/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Acesso interno/i })).toBeVisible();

    await dialog.getByRole('button', { name: /Lojista/i }).click({ force: true });
    await expect(page).toHaveURL(/\/admin/);
  });

  test('rota entrar nao abre seletor de perfis e cai direto no cliente', async ({ page }) => {
    await page.goto('/entrar');
    await waitForAppIntro(page);

    await expect(page).toHaveURL(/\/cliente\?mode=login/);
    await expect(page.getByRole('banner')).toContainText('Área do cliente');
    await expect(page.getByText('Escolha como deseja entrar')).toHaveCount(0);
  });

  test('mostra header padrao e valida login do cliente sem envio silencioso', async ({ page }) => {
    await page.goto('/cliente?hub=1');
    await waitForAppIntro(page);

    await expect(page.getByRole('banner')).toContainText('Área do cliente');
    await page.getByRole('button', { name: /^Entrar$/ }).last().click();

    await expect(page.getByText('Informe seu e-mail ou usuário.').first()).toBeVisible();
    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
  });

  test('mantem login do cliente enxuto no layout web', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/cliente?hub=1');
    await waitForAppIntro(page);

    await expect(page.getByText('Conta protegida')).toHaveCount(0);
    await expect(page.getByText('Conta do cliente')).toHaveCount(0);
    await expect(page.getByText('App, pedidos e endereços')).toHaveCount(0);
    await expect(page.getByText('Desenvolvido com excelência')).toHaveCount(0);
    await expect(page.getByText('Área do cliente', { exact: true })).toHaveCount(1);
  });

  test('recuperacao envia codigo apos senha e valida automaticamente ao preencher 6 digitos', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as any;
      const originalFetch = window.fetch.bind(window);

      w.__forgotCalls = 0;
      w.__resetCalls = 0;
      w.__lastResetPayload = null;

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
        if (url.includes('/auth/forgot-password')) {
          w.__forgotCalls += 1;
          return new Response(
            JSON.stringify({ code: 'AUTH-S001', message: 'Se o e-mail existir, enviaremos instruções.' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (url.includes('/auth/reset-password-code')) {
          w.__resetCalls += 1;
          w.__lastResetPayload = JSON.parse(String(init?.body || '{}'));
          return new Response(JSON.stringify({ code: 'AUTH-S003', message: 'Senha alterada com sucesso.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return originalFetch(input, init);
      };
    });

    await page.goto('/forgot-password?perfil=cliente');
    await waitForAppIntro(page);

    await page.locator('#reset-email').fill('cliente.e2e@janocaminho.test');
    await page.getByRole('button', { name: /^Continuar$/ }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__forgotCalls)).toBe(0);

    await expect(page.getByRole('heading', { name: 'Crie sua nova senha' })).toBeVisible();
    const newPasswordInput = page.locator('#new-password');
    const confirmPasswordInput = page.locator('#confirm-password');
    const sendCodeButton = page.getByRole('button', { name: 'Enviar código por e-mail' });

    await newPasswordInput.fill('senha-nova-123');
    await expect(newPasswordInput).toHaveValue('senha-nova-123');
    await confirmPasswordInput.fill('senha-nova-123');
    await expect(confirmPasswordInput).toHaveValue('senha-nova-123');
    await expect(sendCodeButton).toBeEnabled();
    await sendCodeButton.click();

    await expect(page.getByText('Enviamos um código para seu e-mail')).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as any).__forgotCalls)).toBe(1);

    await page.locator('#reset-code').fill('123456');
    await expect(page).toHaveURL(/\/cliente\?mode=login/);
    await expect.poll(() => page.evaluate(() => (window as any).__resetCalls)).toBe(1);
    await expect
      .poll(() => page.evaluate(() => (window as any).__lastResetPayload))
      .toEqual({ email: 'cliente.e2e@janocaminho.test', code: '123456', newPassword: 'senha-nova-123' });
  });

  test('mostra header padrao e valida login do lojista sem envio silencioso', async ({ page }) => {
    await page.goto('/admin?hub=1');
    await waitForAppIntro(page);

    await expect(page.getByRole('banner')).toContainText('Área do lojista');
    await expect(page.getByText('Voltar para o app')).toBeHidden();
    await page.getByRole('button', { name: /Acessar Painel/i }).click();

    await expect(page.getByText('Informe seu e-mail ou usuário.').first()).toBeVisible();
    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
  });

  test('mostra header padrao e valida login do entregador sem envio silencioso', async ({ page }) => {
    await page.goto('/motoboy/login?hub=1');
    await waitForAppIntro(page);

    await expect(page.getByRole('banner')).toContainText('Área do entregador');
    await expect(page.getByText('Voltar para o hub')).toBeHidden();
    await page.getByRole('button', { name: /Acessar Painel/i }).click();

    await expect(page.getByText('Informe seu e-mail ou usuário.').first()).toBeVisible();
    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
  });
});
