// Som sutil de feedback quando o pedido avança de status no rastreio do cliente.
// Padrão iFood×99 (benchmark out/26): áudio curto e discreto por evento, sem asset
// externo — Web Audio puro. Som é enhancement: qualquer falha é silenciosa e não
// pode afetar o rastreio.
let audioCtx: AudioContext | null = null;

const DELIVERED_STATUSES = ['done', 'delivered', 'finished'];

export function playOrderStatusChime(status?: string | null): void {
  try {
    if (typeof window === 'undefined') return;
    // Fora do app aberto o push é o canal certo — não tocar em aba oculta.
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx.state === 'suspended') void audioCtx.resume();

    const isDelivered = DELIVERED_STATUSES.includes(String(status || '').toLowerCase());
    // Entregue ganha um arpejo maior (celebração); transições normais, duas notas discretas.
    const notes = isDelivered ? [523.25, 659.25, 783.99] : [659.25, 880.0];
    const now = audioCtx.currentTime;
    notes.forEach((frequency, index) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      const start = now + index * 0.09;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.06, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  } catch {
    // Enhancement opcional — nunca quebra o rastreio.
  }
}
