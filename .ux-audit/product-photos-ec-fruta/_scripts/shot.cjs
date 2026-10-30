// Screenshot da vitrine da EC Ponto da Fruta (anônimo, mobile). Uso: node shot.cjs [rotulo]
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join('C:/Users/esantos/projeto-pessoal/EdEspetoHub/frontend', 'node_modules', 'playwright'));

const OUT = 'C:/Users/esantos/projeto-pessoal/EdEspetoHub/.ux-audit/product-photos-ec-fruta/shots';
fs.mkdirSync(OUT, { recursive: true });
const label = process.argv[2] || 'vitrine';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844, deviceScaleFactor: 2 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 200)); });
  await page.goto('https://janocaminho.com.br/ec-ponto-da-fruta', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);
  // Rola até a categoria/primeiro produto com imagem carregada
  const shot1 = path.join(OUT, `${label}-1-topo.png`);
  await page.screenshot({ path: shot1, fullPage: false });
  console.log('shot:', shot1);
  // Procura imagens de produto <img> e mostra as primeiras src
  const imgs = await page.$$eval('img', (els) => els.slice(0, 40).map((e) => ({ src: (e.getAttribute('src') || '').slice(0, 120), alt: e.getAttribute('alt') || '', loaded: e.complete && e.naturalWidth > 0 })));
  console.log('imgs:', JSON.stringify(imgs.filter((i) => i.src), null, 1).slice(0, 3000));
  await browser.close();
})().catch((e) => { console.error('ERRO', e.message); process.exit(1); });
