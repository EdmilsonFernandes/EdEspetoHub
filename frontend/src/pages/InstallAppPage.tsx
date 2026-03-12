import { AndroidLogo, AppleLogo, ArrowSquareOut, GooglePlayLogo } from '@phosphor-icons/react';
import { LandingPageLayout } from '../layouts/LandingPageLayout';

export function InstallAppPage() {
  return (
    <LandingPageLayout>
      <section className="bg-[linear-gradient(145deg,#050b16_0%,#0f172a_50%,#111827_100%)] py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-xs uppercase tracking-[0.28em] text-sky-200 font-semibold">Instale o app</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-black text-white">Já no Caminho no seu Android e iPhone</h1>
            <p className="mt-3 text-sm sm:text-base text-slate-200">
              Instale em poucos toques e use como aplicativo, com atalho na tela inicial.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            <article className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-black/30 border border-white/20 grid place-items-center">
                  <GooglePlayLogo size={24} weight="fill" className="text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Android (Chrome)</h2>
                  <p className="text-xs text-slate-300">Google Play style</p>
                </div>
              </div>
              <ol className="mt-4 space-y-2 text-sm text-slate-100 list-decimal list-inside">
                <li>Abra `janocaminho.com.br` no Chrome.</li>
                <li>Toque em `Instalar app` ou no menu `⋮`.</li>
                <li>Confirme em `Instalar`.</li>
              </ol>
              <a
                href="https://janocaminho.com.br/"
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-500/20 transition"
              >
                <AndroidLogo size={18} weight="duotone" />
                Abrir no Chrome
                <ArrowSquareOut size={16} weight="bold" />
              </a>
            </article>

            <article className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-black/30 border border-white/20 grid place-items-center">
                  <AppleLogo size={24} weight="fill" className="text-slate-100" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">iPhone (Safari)</h2>
                  <p className="text-xs text-slate-300">Apple style</p>
                </div>
              </div>
              <ol className="mt-4 space-y-2 text-sm text-slate-100 list-decimal list-inside">
                <li>Abra `janocaminho.com.br` no Safari.</li>
                <li>Toque em `Compartilhar`.</li>
                <li>Selecione `Adicionar à Tela de Início`.</li>
              </ol>
              <a
                href="https://janocaminho.com.br/"
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-300/30 bg-white/10 px-4 py-2 text-sm font-bold text-slate-100 hover:bg-white/15 transition"
              >
                <AppleLogo size={18} weight="duotone" />
                Abrir no Safari
                <ArrowSquareOut size={16} weight="bold" />
              </a>
            </article>
          </div>

          <div className="mt-5 rounded-2xl border border-sky-300/25 bg-sky-400/10 px-4 py-3 text-xs sm:text-sm text-sky-100">
            Dica: se o app já estiver instalado, o botão de instalação pode não aparecer novamente.
          </div>
        </div>
      </section>
    </LandingPageLayout>
  );
}

