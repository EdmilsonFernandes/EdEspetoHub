import { test, expect } from '@playwright/test';

test.describe('Suíte E2E: Auth e Acesso', () => {
  test('deve abrir a tela principal e carregar a plataforma do marketplace (Mobile)', async ({ page }) => {
    // A baseURL já gerencia o http://localhost:8080 configurado no playwright.config.ts
    await page.goto('/');

    // Verificação base: a home pública carrega com o branding atual sem tela em branco.
    await expect(page).toHaveTitle(/Já no Caminho|Plataforma/i);
  });

  test('mostra header padrao e valida login do cliente sem envio silencioso', async ({ page }) => {
    await page.goto('/cliente?hub=1');

    await expect(page.getByRole('banner')).toContainText('Área do cliente');
    await page.getByRole('button', { name: /^Entrar$/ }).last().click();

    await expect(page.getByText('Informe seu e-mail ou usuário.').first()).toBeVisible();
    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
  });

  test('mostra header padrao e valida login do lojista sem envio silencioso', async ({ page }) => {
    await page.goto('/admin?hub=1');

    await expect(page.getByRole('banner')).toContainText('Área do lojista');
    await page.getByRole('button', { name: /Acessar Painel/i }).click();

    await expect(page.getByText('Informe seu e-mail ou usuário.').first()).toBeVisible();
    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
  });

  test('mostra header padrao e valida login do entregador sem envio silencioso', async ({ page }) => {
    await page.goto('/motoboy/login?hub=1');

    await expect(page.getByRole('banner')).toContainText('Área do entregador');
    await page.getByRole('button', { name: /Acessar Painel/i }).click();

    await expect(page.getByText('Informe seu e-mail ou usuário.').first()).toBeVisible();
    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
  });
});
