// @ts-nocheck
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Autoplay from 'embla-carousel-autoplay';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { GradientBackground } from '@/components/reui/auth-2/gradient-background';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';

/**
 * Pele split-screen do login admin (30/10, pedido do Edmilson) — bloco ReUI
 * auth-2 adaptado à marca e à REGRA DE PRODUTO: nada de depoimentos/avaliações
 * fabricados (PRODUCT.md "não fabricar"). O carrossel mostra diferenciais REAIS
 * da oferta e o rodapé do painel de prova traz os números públicos do produto.
 * Toda a lógica de auth (MFA/biometria/ativação) continua no AdminLogin — aqui
 * é só o envólucro visual (substitui o AuthLayout nessa tela).
 */

const PROOF_SLIDES = [
  {
    id: 'zero-comissao',
    title: 'Zero comissão por pedido',
    lines: [
      'O dinheiro de cada venda cai direto no Pix da sua loja.',
      'A plataforma nunca cobra fatia do seu pedido — nunca cobrou.',
    ],
  },
  {
    id: 'operacao',
    title: 'Operação no bolso',
    lines: [
      'Fila, cardápio, mesas e impressora térmica pelo celular.',
      'Pedido pago entra na fila sozinho, sem retrabalho.',
    ],
  },
  {
    id: 'pix-fechado',
    title: 'Pix com valor fechado',
    lines: [
      'Cliente escolhe, vê o preço final e paga antes de finalizar.',
      'Unidade ou peso (kg) — o combinado é o cobrado.',
    ],
  },
  {
    id: 'vindadores',
    title: 'VIP Fundador',
    lines: [
      'Condição vitalícia de lançamento para as primeiras lojas.',
      'Mensalidade fixa, sem surpresa de reajuste depois.',
    ],
  },
];

function ProofCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedSnap, setSelectedSnap] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const plugins = useMemo(
    () => [Autoplay({ delay: 9200, stopOnInteraction: false, stopOnMouseEnter: true })],
    []
  );

  useEffect(() => {
    if (!api) return;
    const update = (carouselApi: CarouselApi) => carouselApi && setSelectedSnap(carouselApi.selectedScrollSnap());
    update(api);
    api.on('select', update);
    api.on('reInit', update);
    return () => {
      api.off('select', update);
      api.off('reInit', update);
    };
  }, [api]);

  return (
    <Carousel
      setApi={setApi}
      plugins={plugins}
      opts={{ align: 'center', loop: true }}
      className="mx-auto w-full"
      aria-label="Diferenciais da plataforma"
    >
      <CarouselContent className="-ml-3 py-1.5">
        {PROOF_SLIDES.map((slide, index) => {
          const isActive = index === selectedSnap;
          return (
            <CarouselItem key={slide.id} className="flex basis-[90%] items-center pl-3 sm:basis-[56%] lg:basis-[43%]">
              <motion.div
                className="h-full w-full origin-center"
                initial={false}
                animate={
                  shouldReduceMotion
                    ? { opacity: isActive ? 1 : 0.72 }
                    : { opacity: isActive ? 1 : 0.66, scale: isActive ? 1 : 0.9, y: isActive ? 0 : 3 }
                }
                transition={{ type: 'spring', stiffness: 180, damping: 30, mass: 0.9 }}
              >
                <Card
                  size="sm"
                  className={
                    'relative min-h-56 transition-colors duration-300 ease-out ' +
                    (isActive
                      ? 'bg-card text-card-foreground ring-1 ring-white/20'
                      : 'bg-card/45 text-card-foreground/75 ring-1 ring-white/10 backdrop-blur-sm')
                  }
                  data-active={isActive}
                >
                  <CardContent className="relative z-10 flex min-h-0 flex-1 flex-col justify-between gap-4 p-5">
                    <p className="flex flex-col gap-2 text-[0.8125rem] leading-5 text-pretty">
                      <span className="text-sm font-bold text-amber-300">{slide.title}</span>
                      {slide.lines.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </CarouselItem>
          );
        })}
      </CarouselContent>

      <div className="mt-4 flex items-center justify-center gap-1.5">
        {PROOF_SLIDES.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Diferencial ${index + 1}`}
            aria-current={index === selectedSnap ? 'true' : undefined}
            onClick={() => api?.scrollTo(index)}
            className="size-1.5 rounded-full bg-white/35 transition-colors hover:bg-white/55 data-[active=true]:bg-white data-[active=true]:ring-2 data-[active=true]:ring-white/25"
            data-active={index === selectedSnap}
          />
        ))}
      </div>
    </Carousel>
  );
}

function ProofPanel({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <aside className="relative flex min-h-56 overflow-hidden pt-8 pb-8 sm:min-h-64 sm:pt-10 lg:min-h-svh lg:pt-28 lg:pb-8">
      <GradientBackground />
      <div className="relative z-10 flex w-full flex-1 flex-col justify-center gap-0 lg:justify-start lg:gap-8">
        <header className="flex shrink-0 flex-col items-center gap-3 px-6 text-center text-slate-50 sm:px-10 lg:gap-6 lg:px-14">
          <img
            src={resolveAssetUrl('/janocaminho.jpg')}
            alt="Já no Caminho"
            className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white/60"
          />
          <div className="flex max-w-2xl flex-col items-center gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">{eyebrow}</p>
            <h1 className="text-2xl leading-tight font-semibold text-balance text-slate-50 sm:text-3xl lg:text-[2.5rem]">
              {title}
            </h1>
            {subtitle && (
              <p className="max-w-xl text-xs leading-5 text-pretty text-slate-300 sm:text-sm lg:text-base lg:leading-6">
                {subtitle}
              </p>
            )}
          </div>
        </header>

        <div className="hidden py-1 sm:py-2 lg:block">
          <ProofCarousel />
        </div>

        {/* Números públicos do produto (PRODUCT.md — nada fabricado) */}
        <div className="hidden shrink-0 px-6 sm:px-10 lg:block lg:px-14">
          <p className="text-center text-sm leading-6 text-slate-300">
            <span className="font-bold text-slate-50">Comissão zero</span> em todos os planos · 19 lojas ·
            2.077 pedidos desde o lançamento
          </p>
        </div>
      </div>
    </aside>
  );
}

export function AdminLoginSplitLayout({
  eyebrow,
  title,
  subtitle,
  backTo,
  backLabel = 'Voltar',
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-background w-full lg:grid lg:min-h-svh lg:grid-cols-[minmax(0,1fr)_640px]">
      <ProofPanel eyebrow={eyebrow} title={title} subtitle={subtitle} />

      <section className="bg-background flex min-w-0 flex-col px-6 pt-6 pb-3 sm:px-8 sm:pt-8 sm:pb-4 lg:min-h-svh lg:px-12 lg:pt-6 lg:pb-3">
        <div className="mx-auto flex w-full max-w-[38rem] flex-1 flex-col">
          {backTo && (
            <div className="flex shrink-0 items-center">
              <Link
                to={backTo}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
              >
                <ArrowLeft size={14} weight="bold" />
                {backLabel}
              </Link>
            </div>
          )}
          <div className="flex flex-1 flex-col justify-center py-8">{children}</div>
          <footer className="text-muted-foreground mx-auto flex shrink-0 items-center justify-center gap-4 pb-2 text-center text-xs">
            <span>© {new Date().getFullYear()} Já no Caminho</span>
            <Link to="/terms" className="hover:text-primary transition-colors hover:underline hover:underline-offset-4">
              Termos
            </Link>
          </footer>
        </div>
      </section>
    </div>
  );
}
