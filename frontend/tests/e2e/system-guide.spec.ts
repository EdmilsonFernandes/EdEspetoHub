import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test.describe('Guia interativo da landing page', () => {
  test('abre o guia atualizado e troca a jornada exibida pelo robo', async ({ page }) => {
    await page.goto('/guia');

    await expect(page.getByRole('heading', { name: /Veja como o Já no Caminho ajuda a vender mais/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Guia atualizado')).toBeVisible();
    await expect(page.getByRole('link', { name: /Criar loja com 3 meses VIP/i })).toBeVisible();

    await page.getByRole('button', { name: /Lojista e operador/i }).click();
    await expect(page.getByText('Venda e operação')).toBeVisible();
    await expect(page.getByText(/mesa, retirada ou entrega sem travar o balcão/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Impressão pelo app' })).toBeVisible();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
      .toBe(true);
  });
});
