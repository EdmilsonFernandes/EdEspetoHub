import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { optimizeImageBuffer } from './imageStorage';

describe('optimizeImageBuffer', () => {
  it('redimensiona e comprime uma imagem jpeg grande (products -> max 800)', async () => {
    const big = await sharp({
      create: { width: 2000, height: 2000, channels: 3, background: { r: 200, g: 100, b: 50 } },
    })
      .jpeg({ quality: 95 })
      .toBuffer();

    const optimized = await optimizeImageBuffer(big, 'products', 'jpg');

    expect(optimized.length).toBeLessThan(big.length);
    const meta = await sharp(optimized).metadata();
    expect(meta.width).toBeLessThanOrEqual(800);
    expect(meta.height).toBeLessThanOrEqual(800);
  });

  it('nao otimiza formatos nao-imagem (svg passa direto)', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>');
    const result = await optimizeImageBuffer(svg, 'logos', 'svg');
    expect(result).toBe(svg);
  });

  it('preserva png (nao vira jpeg) e respeita o max da pasta logos (512)', async () => {
    const png = await sharp({
      create: { width: 1200, height: 1200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();

    const optimized = await optimizeImageBuffer(png, 'logos', 'png');
    const meta = await sharp(optimized).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBeLessThanOrEqual(512);
    expect(meta.hasAlpha).toBe(true);
  });

  it('nao amplia imagens pequenas (withoutEnlargement)', async () => {
    const small = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .jpeg()
      .toBuffer();

    const optimized = await optimizeImageBuffer(small, 'destinations', 'jpg');
    const meta = await sharp(optimized).metadata();
    expect(meta.width).toBeLessThanOrEqual(100);
  });
});
