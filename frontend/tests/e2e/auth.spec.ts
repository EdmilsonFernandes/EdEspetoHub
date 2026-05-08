import { test, expect } from '@playwright/test';

test.describe('Suíte E2E: Auth e Acesso', () => {
  test('deve abrir a tela principal e carregar a plataforma do marketplace (Mobile)', async ({ page }) => {
    // A baseURL já gerencia o http://localhost:8080 configurado no playwright.config.ts
    await page.goto('/');

    // Verificação base: a home pública carrega com o branding atual sem tela em branco.
    await expect(page).toHaveTitle(/Já no Caminho|Plataforma/i);
  });
});
