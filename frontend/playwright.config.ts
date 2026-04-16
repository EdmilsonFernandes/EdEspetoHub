import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Onde os testes vão morar
  testDir: './tests/e2e',
  
  // Limite máximo de tempo que um teste E2E pode demorar
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  
  // Roda testes em paralelo
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    // A Base URI é a URL onde seu frontend levanta via Docker-compose
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    
    // Liga os rastros (tracing) quando o teste falha, pra você ver um 'replay' exato de onde o robô clicou
    trace: 'on-first-retry',
  },

  // Projetos configurados: Focaremos primeiramente 100% no Mobile, já que o EdEspetoHub é Mobile First
  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
