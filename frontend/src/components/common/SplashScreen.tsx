import { useEffect, useState } from 'react';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Inicia a saída após 2.2 segundos (tempo para o app hidratar)
    const fadeTimer = setTimeout(() => setIsVisible(false), 2200);
    // Remove do DOM após a animação de fade (3 segundos no total)
    const removeTimer = setTimeout(() => setShouldRender(false), 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#F8F9FB] transition-opacity duration-700 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Elementos de Fundo Premium */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(51,104,134,0.12),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(51,104,134,0.08),transparent_40%)]" />
      
      <div className="relative flex flex-col items-center">
        {/* Círculos de Brilho */}
        <div className="absolute h-48 w-48 animate-pulse rounded-full bg-[#336886]/5 blur-3xl" />
        
        {/* Logo/Mascote com Animação Premium */}
        <div className="relative animate-in zoom-in-90 duration-1000 ease-out">
          <div className="relative h-32 w-32 sm:h-36 sm:w-36">
            <div className="h-full w-full overflow-hidden rounded-3xl border border-[#336886]/20 bg-white p-1 shadow-[0_20px_60px_-16px_rgba(13,79,102,0.35)]">
              <img
                src="/janocaminho.jpg"
                alt="Já no Caminho"
                className="h-full w-full rounded-[1.5rem] object-cover"
              />
            </div>
            <div className="mx-auto mt-3 h-1.5 w-12 animate-pulse rounded-full bg-[#336886]/20 blur-sm" />
          </div>
        </div>

        {/* Texto de Carregamento */}
        <div className="mt-12 flex flex-col items-center gap-2">
          <h1 className="text-xl font-black uppercase tracking-[0.3em] text-slate-900 animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-300">
            Já no Caminho
          </h1>
          <div className="flex gap-1.5">
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#336886] [animation-delay:0ms]" />
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#336886] [animation-delay:200ms]" />
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#336886] [animation-delay:400ms]" />
          </div>
        </div>
      </div>

      {/* Rodapé do Splash */}
      <div className="absolute bottom-12 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-in fade-in duration-1000 delay-700">
        Iniciando sua experiência premium
      </div>
    </div>
  );
}
