export type OrderNotificationPreset = 'default' | 'chime' | 'triple' | 'alert' | 'none';

const MIN_ORDER_NOTIFICATION_DURATION_SECONDS = 1;
const MAX_ORDER_NOTIFICATION_DURATION_SECONDS = 15;
const DEFAULT_ORDER_NOTIFICATION_DURATION_SECONDS = 4;

type ToneStep = {
  offset: number;
  frequency: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
};

const PRESET_PATTERNS: Record<OrderNotificationPreset, ToneStep[]> = {
  none: [],
  default: [
    { offset: 0, frequency: 880, duration: 0.2, gain: 0.07, type: 'sine' },
  ],
  chime: [
    { offset: 0, frequency: 720, duration: 0.12, gain: 0.06, type: 'sine' },
    { offset: 0.14, frequency: 980, duration: 0.14, gain: 0.065, type: 'sine' },
  ],
  triple: [
    { offset: 0, frequency: 900, duration: 0.1, gain: 0.07, type: 'sine' },
    { offset: 0.16, frequency: 900, duration: 0.1, gain: 0.07, type: 'sine' },
    { offset: 0.32, frequency: 1020, duration: 0.12, gain: 0.075, type: 'sine' },
  ],
  alert: [
    { offset: 0, frequency: 760, duration: 0.14, gain: 0.08, type: 'sine' },
    { offset: 0.18, frequency: 620, duration: 0.14, gain: 0.08, type: 'sine' },
    { offset: 0.36, frequency: 760, duration: 0.14, gain: 0.08, type: 'sine' },
  ],
};

export const normalizeOrderNotificationDurationSeconds = (
  value: unknown,
  fallback = DEFAULT_ORDER_NOTIFICATION_DURATION_SECONDS,
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return Math.min(MAX_ORDER_NOTIFICATION_DURATION_SECONDS, Math.max(MIN_ORDER_NOTIFICATION_DURATION_SECONDS, rounded));
};

export const parseOrderNotificationSoundSetting = (value: unknown) => {
  const raw = String(value || '').trim();
  const customUrl = /^(https?:\/\/|\/|data:)/i.test(raw) ? raw : '';
  const normalizedSetting = raw.toLowerCase();
  const preset: OrderNotificationPreset =
    normalizedSetting === 'none'
      ? 'none'
      : normalizedSetting === 'preset:chime'
      ? 'chime'
      : normalizedSetting === 'preset:triple'
      ? 'triple'
      : normalizedSetting === 'preset:alert'
      ? 'alert'
      : 'default';

  return {
    raw,
    customUrl,
    preset,
  };
};

export const playOrderNotificationPreset = (
  context: AudioContext,
  preset: OrderNotificationPreset,
  durationMs: number,
) => {
  // "none" = lojista deixou mudo: não toca nada quando chega pedido.
  if (preset === 'none') return;
  const pattern = PRESET_PATTERNS[preset] || PRESET_PATTERNS.default;
  const cycleDuration = pattern.reduce((max, step) => Math.max(max, step.offset + step.duration), 0) + 0.06;
  const requestedSeconds = Math.max(cycleDuration, Number(durationMs) > 0 ? Number(durationMs) / 1000 : cycleDuration);
  const startTime = context.currentTime + 0.01;

  for (let cycleOffset = 0; cycleOffset < requestedSeconds - 0.01; cycleOffset += cycleDuration) {
    for (const step of pattern) {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const stepStart = startTime + cycleOffset + step.offset;
      const stepEnd = stepStart + step.duration;
      oscillator.type = step.type || 'sine';
      oscillator.frequency.setValueAtTime(step.frequency, stepStart);
      gainNode.gain.setValueAtTime(0.0001, stepStart);
      gainNode.gain.exponentialRampToValueAtTime(step.gain, stepStart + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, stepEnd);
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(stepStart);
      oscillator.stop(stepEnd + 0.04);
    }
  }
};
