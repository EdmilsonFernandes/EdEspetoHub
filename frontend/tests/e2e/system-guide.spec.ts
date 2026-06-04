import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test.describe('Guia interativo da landing page', () => {
  test('abre o guia atualizado e troca a jornada exibida pelo robo', async ({ page }) => {
    await page.goto('/guia');

    await expect(page.getByRole('heading', { name: /Entenda o Já no Caminho/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Guia 2026 atualizado')).toBeVisible();
    await expect(page.getByRole('link', { name: /Criar loja com 3 meses VIP/i })).toBeVisible();

    await page.getByRole('button', { name: /Lojista e operador/i }).click();
    await expect(page.getByText('Operação rápida')).toBeVisible();
    await expect(page.getByText(/fila, impressão, itens avulsos, couvert e taxa/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Impressão Bluetooth' })).toBeVisible();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
      .toBe(true);
  });
});
