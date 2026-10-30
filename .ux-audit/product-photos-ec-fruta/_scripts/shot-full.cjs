// Screenshot rolado da vitrine por seções.
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join('C:/Users/esantos/projeto-pessoal/EdEspetoHub/frontend', 'node_modules', 'playwright'));

const OUT = 'C:/Users/esantos/projeto-pessoal/EdEspetoHub/.ux-audit/product-photos-ec-fruta/shots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844, deviceScaleFactor: 1.5 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  await page.goto('https://janocaminho.com.br/ec-ponto-da-fruta', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);
  // conta produtos com img carregada
  const stats = await page.$$eval('img', (els) => {
    const product = els.filter((e) => (e.getAttribute('src') || '').includes('/uploads/products/'));
    return { total: product.length, loaded: product.filter((e) => e.complete && e.naturalWidth > 0).length };
  });
  console.log('imgs de produto:', JSON.stringify(stats));
  const height = await page.evaluate(() => document.body.scrollHeight);
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.floor((height / steps) * i));
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `roll-${i + 1}.png`) });
  }
  console.log('screenshots:', steps, '| página:', height, 'px');
  await browser.close();
})().catch((e) => { console.error('ERRO', e.message); process.exit(1); });
