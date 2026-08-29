/**
 * Converte cor hex (com ou sem #) para rgba com alpha aplicado.
 * Usado pela navegação mobile (AdminMobileBottomNav).
 */
export const hexToRgba = (hex: string, alpha = 1): string => {
  const clean = String(hex || '').replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) return String(hex || '');
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const a = Math.min(1, Math.max(0, Number(alpha)));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export default hexToRgba;
