/** Haptics (vibração tátil) — navigator.vibrate funciona em Android / Chrome (APK e Android web);
 *  no iOS Safari e desktop é no-op (não quebra, só não vibra). Sem plugin Capacitor → zero dependência.
 *  Portado do Dr. Exame (padrões da análise SouFix) para dar "feel de app nativo". */
export function haptic(pattern: number | number[] = 12): void {
  try {
    const n = navigator as any;
    if (typeof n !== 'undefined' && typeof n.vibrate === 'function') n.vibrate(pattern);
  } catch { /* no-op — ambiente sem suporte */ }
}

/** Toque leve (navegação, taps comuns, gatilho de pull-to-refresh). */
export const hapticLight = (): void => haptic(10);
/** Toque médio (abrir menu, toggle). */
export const hapticMedium = (): void => haptic(20);
/** Padrão de sucesso (salvou, enviou): tique-tique curto. */
export const hapticSuccess = (): void => haptic([10, 35, 25]);
/** Padrão de erro (falhou): mais longo/duro. */
export const hapticError = (): void => haptic([35, 50, 35]);
