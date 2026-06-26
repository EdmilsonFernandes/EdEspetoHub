import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

/**
 * Validação E2E (Fase 2a): vínculo do chalé ao login do cliente.
 * Roda contra o stack real (localhost:8080 + backend/DB). Cria um cliente real
 * (register + verify direto no DB + login) pra testar a detecção de sessão.
 */
const API = process.env.BASE_URL || 'http://localhost:8080';
const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

type CustomerSession = { token: string; user: any; email: string; password: string };

async function createVerifiedCustomer(fullName = 'Cliente E2E'): Promise<CustomerSession> {
  const email = `e2e-link-${uid()}@test.local`;
  const password = 'Test@123456';
  await fetch(`${API}/api/customer/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email, password, termsAccepted: true, lgpdAccepted: true }),
  });
  // Verifica o e-mail direto no banco (sem depender do envio do código).
  execSync(
    `docker exec janocaminho-postgres psql -U postgres -d espetinho -c "UPDATE users SET email_verified=true WHERE email='${email}'"`,
    { stdio: 'ignore' },
  );
  const res = await fetch(`${API}/api/customer/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  return { token: body.token, user: body.user, email, password };
}

async function mockDestinations(page: import('@playwright/test').Page) {
  await page.route('**/api/public/destinations', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'dest-sao-bento', slug: 'sao-bento-do-sapucai', name: 'São Bento do Sapucaí', city: 'São Bento do Sapucaí', state: 'SP' },
      ]),
    });
  });
}

async function fillChaleForm(page: import('@playwright/test').Page, email: string) {
  await page.getByLabel('Nome público').fill('Chalé E2E');
  await page.getByLabel('Descrição pública').fill('Hospedagem para o teste automatizado.');
  await page.getByLabel('Nome do responsável').fill('Cliente E2E');
  await page.getByLabel('E-mail do responsável').fill(email);
  await page.getByLabel('WhatsApp do responsável').fill('12999998888');
}

const submitButton = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /Enviar para aprovação/i });

test.use({ serviceWorkers: 'block' });
// Criar cliente via API + carregar a página é lento; dar folga de timeout.
test.beforeEach(async ({}, testInfo) => { testInfo.setTimeout(90000); });

test.describe('Vínculo chalé ↔ login do cliente (Fase 2a)', () => {
  test('cliente logado vê o banner de vínculo e envia linkToAccount=true', async ({ page }) => {
    const { token, user } = await createVerifiedCustomer('João Vinculo');
    await page.addInitScript(
      (session: any) => { localStorage.setItem('customerSession', JSON.stringify(session)); },
      { token, user },
    );

    await mockDestinations(page);
    let payload: any = null;
    await page.route('**/api/public/destination-partner-requests', async (route) => {
      payload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'pr-e2e', status: 'PENDING' }) });
    });

    await page.goto('/destinos/cadastrar');
    await expect(page.getByText('Vincular ao seu login')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('João Vinculo')).toBeVisible();
    await page.screenshot({ path: 'test-results/01-banner-vinculo.png', fullPage: true });

    await fillChaleForm(page, user.email);
    await expect(submitButton(page)).toBeEnabled({ timeout: 15000 });
    await submitButton(page).click();
    // Logado + vínculo -> abre o modal de confirmação explícita.
    await page.getByRole('button', { name: /Sim, vincular e enviar/i }).click();

    await expect(page.getByText('Recebemos sua solicitação')).toBeVisible();
    expect(payload.linkToAccount).toBe(true);
    await page.screenshot({ path: 'test-results/02-sucesso-vinculo.png', fullPage: true });
  });

  test('recusar vínculo com o próprio e-mail mostra o painel amigável (DEST-014)', async ({ page }) => {
    const { token, user } = await createVerifiedCustomer('Maria Recusa');
    await page.addInitScript(
      (session: any) => { localStorage.setItem('customerSession', JSON.stringify(session)); },
      { token, user },
    );

    await mockDestinations(page);
    await page.route('**/api/public/destination-partner-requests', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'DEST-014', message: 'Este e-mail já pertence a uma conta no Já no Caminho.', error: { code: 'DEST-014' } }),
      });
    });

    await page.goto('/destinos/cadastrar');
    await expect(page.getByText('Vincular ao seu login')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Não, outro e-mail/i }).click();
    await fillChaleForm(page, user.email); // o próprio e-mail do cliente
    await expect(submitButton(page)).toBeEnabled({ timeout: 15000 });
    await submitButton(page).click();

    await expect(page.getByRole('button', { name: /Entrar para vincular o chalé/i })).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/03-dest-014-amigavel.png', fullPage: true });
  });

  test('anônimo (sem login) NÃO vê o banner de vínculo', async ({ page }) => {
    await mockDestinations(page);
    await page.route('**/api/public/destination-partner-requests', async (route) => {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'pr-e2e', status: 'PENDING' }) });
    });

    await page.goto('/destinos/cadastrar');
    await expect(page.getByText('Vincular ao seu login')).toBeHidden();
    await page.screenshot({ path: 'test-results/04-anonimo-sem-banner.png', fullPage: true });
  });

  test('REGRESSÃO REAL: cliente logado envia e o pedido fica vinculado no banco (user_id)', async ({ page }) => {
    const { token, user } = await createVerifiedCustomer('Carlos Real');
    await page.addInitScript(
      (session: any) => { localStorage.setItem('customerSession', JSON.stringify(session)); },
      { token, user },
    );

    // Busca um destino REAL do banco pra o submit real funcionar (id válido).
    const destJson = execSync(
      `docker exec janocaminho-postgres psql -U postgres -d espetinho -t -A -c "SELECT json_build_object('id',id,'name',name,'slug',slug,'city',city,'state',state) FROM travel_destinations WHERE active IS DISTINCT FROM false ORDER BY name LIMIT 1"`,
      { encoding: 'utf-8' },
    ).trim();
    const dest = JSON.parse(destJson);
    expect(dest.id).toBeTruthy();
    await page.route('**/api/public/destinations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([dest]),
      });
    });

    await page.goto('/destinos/cadastrar');
    await expect(page.getByText('Vincular ao seu login')).toBeVisible({ timeout: 15000 });
    await fillChaleForm(page, user.email);

    await expect(submitButton(page)).toBeEnabled({ timeout: 15000 });
    await submitButton(page).click();
    // Modal de confirmação de vínculo — o POST real só dispara ao confirmar.
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/public/destination-partner-requests') && r.request().method() === 'POST'),
      page.getByRole('button', { name: /Sim, vincular e enviar/i }).click(),
    ]);
    expect(response.status()).toBe(201);
    const body = await response.json();
    const requestId = body?.id;
    expect(requestId).toBeTruthy();

    // O pedido ficou VINCULADO ao cliente (user_id) no banco real.
    const row = execSync(
      `docker exec janocaminho-postgres psql -U postgres -d espetinho -t -c "SELECT user_id FROM destination_partner_requests WHERE id='${requestId}'"`,
      { encoding: 'utf-8' },
    ).trim();
    expect(row.length).toBeGreaterThan(0);
    expect(row).not.toBe(''); // user_id não é nulo
    await page.screenshot({ path: 'test-results/05-real-vinculado.png', fullPage: true });
  });

  test('validador: e-mail de cliente existente oferece "Entrar para integrar" (A.3)', async ({ page }) => {
    const { user } = await createVerifiedCustomer('Cliente Val Existente');
    await mockDestinations(page);
    await page.route('**/api/public/destination-partner-requests', async (route) => {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'pr-val', status: 'PENDING' }) });
    });

    await page.goto('/destinos/cadastrar');
    await page.getByLabel('E-mail do responsável').fill(user.email);
    await expect(page.getByText('Este e-mail já é de uma conta no Já no Caminho')).toBeVisible({ timeout: 12000 });
    await expect(page.getByRole('button', { name: /Entrar para integrar o chalé/i })).toBeVisible();
    await expect(page.getByText(/Cliente Val Existente/)).toBeVisible();
    await page.screenshot({ path: 'test-results/06-validador-email-existente.png', fullPage: true });

    // E-mail novo → o banner some.
    await page.getByLabel('E-mail do responsável').fill(`novo-${Date.now()}@test.local`);
    await expect(page.getByText('Este e-mail já é de uma conta no Já no Caminho')).toBeHidden({ timeout: 8000 });
    await page.screenshot({ path: 'test-results/07-validador-email-novo.png', fullPage: true });
  });
});
