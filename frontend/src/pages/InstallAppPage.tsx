import { useEffect } from 'react';
import { AppleLogo, ArrowSquareOut, GooglePlayLogo } from '@phosphor-icons/react';
import { LandingPageLayout } from '../layouts/LandingPageLayout';
import { JNC_GOOGLE_PLAY_URL, JNC_IOS_HUB_URL, resolveHospitalityQrRedirectUrl } from '../utils/destinationQrPoster';

export function InstallAppPage() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const isHospitalityQr = params.get('origem') === 'qr-chale';
  const isAutoRedirect = params.get('redirect') === 'auto';
  const placeName = params.get('nome') || '';
  const destinationName = params.get('cidade') || '';
  const nextPath = params.get('next') || '';
  const safeNextPath = nextPath.startsWith('/destinos/') ? nextPath : '';
  const title = isHospitalityQr && placeName
    ? `Está hospedado no ${placeName}?`
    : 'Já no Caminho no seu celular';
  const subtitle = isHospitalityQr
    ? 'Baixe o app para ver restaurantes que atendem o chalé, serviços locais e lugares próximos para visitar.'
    : 'Android: baixe pela Google Play. iPhone: adicione ao Safari como app.';

  useEffect(() => {
    if (!isAutoRedirect || typeof window === 'undefined') return;
    const redirectUrl = resolveHospitalityQrRedirectUrl(window.navigator.userAgent);
    if (redirectUrl) window.location.replace(redirectUrl);
  }, [isAutoRedirect]);

  return (
    <LandingPageLayout>
      <section className="bg-[linear-gradient(145deg,#050b16_0%,#0f172a_50%,#111827_100%)] py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-xs uppercase tracking-[0.28em] text-sky-200 font-semibold">Instale o app</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-black text-white">{title}</h1>
            <p className="mt-3 text-sm sm:text-base text-slate-200">
              {subtitle}
            </p>
            {isHospitalityQr ? (
              <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50">
                {destinationName ? <span className="block">Destino: {destinationName}</span> : null}
                <span className="block">
                  Depois de instalar, abra <strong>Destinos</strong> no app e escolha esta hospedagem para ver comida, serviços e passeios.
                </span>
                {safeNextPath ? (
                  <a href={safeNextPath} className="mt-2 inline-flex text-xs font-black uppercase tracking-[0.14em] text-amber-200 underline underline-offset-4">
                    Ver este chalé no navegador
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            {/* Android — Google Play oficial */}
            <article className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 backdrop-blur-md p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[#01875f] grid place-items-center shadow-[0_8px_24px_-8px_rgba(1,135,95,0.6)]">
                  <GooglePlayLogo size={24} weight="fill" className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Android</h2>
                  <p className="text-xs text-emerald-300 font-semibold">Disponível na Google Play ✓</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-200 leading-relaxed">
                Baixe o app oficial pelo canal seguro da Google Play Store.
              </p>
              <a
                href={JNC_GOOGLE_PLAY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#01875f] px-5 py-3 text-sm font-black text-white shadow-[0_12px_28px_-10px_rgba(1,135,95,0.7)] hover:bg-[#017a56] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <GooglePlayLogo size={18} weight="fill" />
                Baixar na Google Play
                <ArrowSquareOut size={15} weight="bold" />
              </a>
              <p className="mt-3 text-[11px] text-slate-400">
                Busque <strong className="text-slate-200">"Já no Caminho"</strong> na Play Store ou use o botão acima.
              </p>
            </article>

            {/* iPhone — PWA Safari */}
            <article className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-slate-800 border border-white/20 grid place-items-center">
                  <AppleLogo size={24} weight="fill" className="text-slate-100" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">iPhone</h2>
                  <p className="text-xs text-slate-300">App Store em breve · Use pelo Safari</p>
                </div>
              </div>
              <ol className="mt-4 space-y-2 text-sm text-slate-100 list-decimal list-inside">
                <li>Abra <strong className="text-white">janocaminho.com.br/hub</strong> no Safari.</li>
                <li>Toque em <strong className="text-white">Compartilhar</strong> (ícone de caixa com seta).</li>
                <li>Selecione <strong className="text-white">Adicionar à Tela de Início</strong>.</li>
              </ol>
              <a
                href={JNC_IOS_HUB_URL}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-300/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-slate-100 hover:bg-white/15 transition"
              >
                <AppleLogo size={18} weight="duotone" />
                Abrir no Safari
                <ArrowSquareOut size={16} weight="bold" />
              </a>
              <div className="mt-4 rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-[11px] text-sky-200">
                A versão nativa para iOS está em desenvolvimento e chegará em breve na App Store.
              </div>
            </article>
          </div>

          <div className="mt-5 rounded-2xl border border-sky-300/25 bg-sky-400/10 px-4 py-3 text-xs sm:text-sm text-sky-100">
            Dica: se o app já estiver instalado no Android, o botão de instalação pode não aparecer novamente no Chrome.
          </div>
        </div>
      </section>
    </LandingPageLayout>
  );
}
