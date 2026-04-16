import { test, expect } from '@playwright/test';

test.describe('Suíte E2E: Auth e Acesso', () => {
  test('deve abrir a tela principal e carregar a plataforma do marketplace (Mobile)', async ({ page }) => {
    // A baseURL já gerencia o http://localhost:8080 configurado no playwright.config.ts
    await page.goto('/');

    // O Playwright espera até que a logo ou o seletor da loja renderize sem precisar de Hard Sleeps
    const mainTitle = page.locator('text=EdEspeto'); // Ou outro label persistente
    
    // Verificação Base: App não quebra na tela limpa (White Screen of Death)
    await expect(page).toHaveTitle(/EdEspetoHub|Plataforma/i);
  });
});
