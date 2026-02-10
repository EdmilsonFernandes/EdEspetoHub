import { useEffect, useMemo, useRef, useState } from 'react';

type FacingMode = 'user' | 'environment';

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  mode: 'single' | 'cnh';
  initialFacingMode?: FacingMode;
  onClose: () => void;
  onDone: (dataUrl: string) => void;
};

function stopStream(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((t) => t.stop());
}

function fitSize(srcW: number, srcH: number, maxW: number) {
  if (!srcW || !srcH) return { w: maxW, h: Math.round((maxW * 3) / 4) };
  if (srcW <= maxW) return { w: srcW, h: srcH };
  const scale = maxW / srcW;
  return { w: Math.round(srcW * scale), h: Math.round(srcH * scale) };
}

async function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar imagem.'));
    img.src = dataUrl;
  });
}

export function CameraCaptureModal({
  open,
  title,
  subtitle,
  mode,
  initialFacingMode = 'environment',
  onClose,
  onDone,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>(initialFacingMode);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [cnhFront, setCnhFront] = useState<string | null>(null);
  const [cnhBack, setCnhBack] = useState<string | null>(null);

  const step = useMemo(() => {
    if (mode !== 'cnh') return 'single';
    if (!cnhFront) return 'front';
    if (!cnhBack) return 'back';
    return 'done';
  }, [mode, cnhFront, cnhBack]);

  useEffect(() => {
    if (!open) return;

    let canceled = false;
    const start = async () => {
      setError(null);
      setBusy(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (canceled) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => null);
        }
      } catch (e: any) {
        setError(
          e?.name === 'NotAllowedError'
            ? 'Permissão de câmera negada. Libere a câmera no navegador.'
            : 'Não foi possível acessar a câmera neste dispositivo.'
        );
      } finally {
        setBusy(false);
      }
    };

    start();

    return () => {
      canceled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [open, facingMode]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setBusy(false);
      setCnhFront(null);
      setCnhBack(null);
      setFacingMode(initialFacingMode);
    }
  }, [open, initialFacingMode]);

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return null;

    const srcW = video.videoWidth || 0;
    const srcH = video.videoHeight || 0;
    const { w, h } = fitSize(srcW, srcH, 1200);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.86);
  };

  const handleCapture = async () => {
    setError(null);
    const shot = captureFrame();
    if (!shot) {
      setError('Não foi possível capturar a imagem. Tente novamente.');
      return;
    }

    if (mode === 'single') {
      onDone(shot);
      return;
    }

    if (step === 'front') {
      setCnhFront(shot);
      return;
    }
    if (step === 'back') {
      setCnhBack(shot);
      return;
    }
  };

  const handleFinishCnh = async () => {
    if (!cnhFront || !cnhBack) return;
    setBusy(true);
    setError(null);
    try {
      const [imgFront, imgBack] = await Promise.all([dataUrlToImage(cnhFront), dataUrlToImage(cnhBack)]);
      const width = Math.max(imgFront.naturalWidth || imgFront.width, imgBack.naturalWidth || imgBack.width, 900);
      const pad = 28;
      const labelH = 44;
      const canvas = document.createElement('canvas');
      canvas.width = width + pad * 2;
      canvas.height =
        pad * 3 +
        labelH * 2 +
        (imgFront.naturalHeight || imgFront.height) +
        (imgBack.naturalHeight || imgBack.height);

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const drawLabel = (text: string, y: number) => {
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 22px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText(text, pad, y + 30);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pad, y + 40);
        ctx.lineTo(canvas.width - pad, y + 40);
        ctx.stroke();
      };

      let y = pad;
      drawLabel('CNH - FRENTE', y);
      y += labelH;
      ctx.drawImage(imgFront, pad, y);
      y += (imgFront.naturalHeight || imgFront.height) + pad;
      drawLabel('CNH - VERSO', y);
      y += labelH;
      ctx.drawImage(imgBack, pad, y);

      onDone(canvas.toDataURL('image/jpeg', 0.86));
    } catch {
      setError('Não foi possível montar a imagem da CNH. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const stepText =
    mode !== 'cnh'
      ? 'Tire a foto e confirme.'
      : step === 'front'
      ? 'Passo 1/2: fotografe a FRENTE da CNH.'
      : step === 'back'
      ? 'Passo 2/2: fotografe o VERSO da CNH.'
      : 'Pronto: revise e confirme.';

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/60 px-3 py-4 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-white shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-slate-900">{title}</p>
            {subtitle ? <p className="text-xs text-slate-600">{subtitle}</p> : null}
            <p className="mt-2 text-[11px] text-slate-500">{stepText}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
          >
            Fechar
          </button>
        </div>

        <div className="p-4 space-y-3">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-slate-900 overflow-hidden">
            <video ref={videoRef} className="w-full aspect-[4/3] object-cover" playsInline muted />
          </div>

          {mode === 'cnh' && (cnhFront || cnhBack) ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-white p-2">
                <p className="text-[10px] font-extrabold text-slate-600">Frente</p>
                {cnhFront ? (
                  <img src={cnhFront} alt="CNH frente" className="mt-1 w-full h-24 object-cover rounded-lg" />
                ) : (
                  <div className="mt-1 h-24 rounded-lg bg-slate-50 border border-dashed border-slate-200" />
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2">
                <p className="text-[10px] font-extrabold text-slate-600">Verso</p>
                {cnhBack ? (
                  <img src={cnhBack} alt="CNH verso" className="mt-1 w-full h-24 object-cover rounded-lg" />
                ) : (
                  <div className="mt-1 h-24 rounded-lg bg-slate-50 border border-dashed border-slate-200" />
                )}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-extrabold text-slate-700 disabled:opacity-60"
              disabled={busy}
            >
              Trocar camera
            </button>
            {mode === 'cnh' && step === 'done' ? (
              <button
                type="button"
                onClick={handleFinishCnh}
                className="rounded-xl bg-slate-900 px-4 py-3 text-xs font-extrabold text-white disabled:opacity-60"
                disabled={busy}
              >
                {busy ? 'Processando...' : 'Confirmar CNH'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCapture}
                className="rounded-xl bg-slate-900 px-4 py-3 text-xs font-extrabold text-white disabled:opacity-60"
                disabled={busy}
              >
                {busy ? 'Abrindo camera...' : 'Capturar foto'}
              </button>
            )}
          </div>

          {mode === 'cnh' ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCnhFront(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold text-slate-600 disabled:opacity-60"
                disabled={busy || !cnhFront}
              >
                Refazer frente
              </button>
              <button
                type="button"
                onClick={() => setCnhBack(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold text-slate-600 disabled:opacity-60"
                disabled={busy || !cnhBack}
              >
                Refazer verso
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

