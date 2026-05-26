import { test, expect, type Page } from '@playwright/test';

const waitForAppIntro = async (page: Page) => {
  await expect(page.getByText('Conectando com segurança')).toBeHidden({ timeout: 10000 });
};

test.describe('Suíte E2E: Auth e Acesso', () => {
  test('deve abrir a tela principal e carregar a plataforma do marketplace (Mobile)', async ({ page }) => {
    // A baseURL já gerencia o http://localhost:8080 configurado no playwright.config.ts
    await page.goto('/');

    // Verificação base: a home pública carrega com o branding atual sem tela em branco.
    await expect(page).toHaveTitle(/Já no Caminho|Plataforma/i);
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
