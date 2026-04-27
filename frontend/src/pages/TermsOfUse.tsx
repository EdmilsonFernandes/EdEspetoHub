import { ArrowLeft } from '@phosphor-icons/react';
import { useLocation, useNavigate } from 'react-router-dom';

const LAST_UPDATE = '22 de abril de 2026';

function Section({ title }: { title: string }) {
  return <h3 className="text-sm font-bold text-slate-800 mt-5 mb-1.5">{title}</h3>;
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-600 leading-relaxed">{children}</p>;
}

function UList({ children }: { children: React.ReactNode }) {
  return <ul className="mt-1.5 space-y-1 list-disc list-inside text-sm text-slate-600 leading-relaxed">{children}</ul>;
}

export function TermsOfUse() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromHub = new URLSearchParams(location.search || '').get('from') === 'hub';

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)]">
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/60 bg-white/95 px-4 py-3.5 backdrop-blur-xl"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
          <button
            onClick={() => navigate(fromHub ? '/hub' : -1 as any)}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-all active:scale-95"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} weight="bold" />
          </button>
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5">
              <img src="/janocaminho.png" alt="Já no Caminho" className="h-5 w-5 rounded-[0.45rem] object-cover shadow-sm" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Legal</p>
            </div>
            <h1 className="text-[15px] font-black text-slate-900">Termos e Privacidade</h1>
          </div>
          <div className="w-9" />
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">

        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-[#1a3a52] to-[#336886] p-6 sm:p-8 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg shrink-0">
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black">Termos de Uso e Privacidade</h1>
              <p className="text-sm text-white/70 mt-0.5">Última atualização: {LAST_UPDATE}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/80 leading-relaxed">
            Ao criar uma conta ou utilizar a plataforma <strong className="text-white">Já no Caminho</strong>, você declara que leu, compreendeu e concorda com os termos abaixo. Caso não concorde, não utilize nossos serviços.
          </p>
        </div>

        {/* Termos de Uso */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)] p-6 sm:p-8 space-y-1">
          <h2 className="text-lg font-black text-slate-900">Termos e Condições de Uso</h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Edmilson Tecnologia da Informação · CNPJ 44.771.427/0001-69</p>

          <Section title="1. Natureza do Serviço" />
          <Para>
            A Plataforma atua exclusivamente como um <strong>intermediador tecnológico</strong>, disponibilizando um ambiente virtual para que estabelecimentos parceiros ("Lojas") ofereçam seus produtos e serviços aos usuários. <strong>Não preparamos, embalamos, vendemos, entregamos nem somos responsáveis pelos produtos físicos</strong> comercializados pelas Lojas.
          </Para>

          <Section title="2. Isenção de Responsabilidade" />
          <Para>O usuário reconhece e concorda que a Plataforma <strong>não possui qualquer responsabilidade</strong> sobre:</Para>
          <UList>
            <li>A qualidade, preparo, segurança, higiene, integridade ou adequação para consumo dos produtos comercializados pelas Lojas;</li>
            <li>Prazos de entrega, atrasos, extravios ou conduta dos entregadores (motoboys), sejam eles próprios da Loja ou independentes;</li>
            <li>A precisão das informações nutricionais, preços ou descrições fornecidas pelas Lojas;</li>
            <li>Eventuais danos diretos, indiretos, materiais ou morais, lucros cessantes ou prejuízos decorrentes do consumo dos produtos ou da prestação do serviço de entrega;</li>
            <li>Atos ilícitos praticados por estabelecimentos parceiros, entregadores ou terceiros cadastrados na plataforma.</li>
          </UList>
          <Para>Qualquer reclamação referente ao produto ou à entrega deverá ser direcionada diretamente à Loja responsável pelo pedido.</Para>

          <Section title="3. Conteúdo Impróprio, Ilegal ou Irregular" />
          <Para>
            A Plataforma é um marketplace aberto e <strong>não realiza curadoria prévia</strong> dos produtos ou serviços cadastrados pelas Lojas parceiras. O usuário reconhece expressamente que:
          </Para>
          <UList>
            <li>A Plataforma <strong>não se responsabiliza</strong> por conteúdo, imagens, descrições ou produtos que possam ser considerados impróprios, ofensivos, ilegais ou em desacordo com a legislação vigente, publicados por Lojas ou terceiros;</li>
            <li>A comercialização de produtos ilegais, falsificados, controlados ou proibidos é de <strong>exclusiva responsabilidade da Loja</strong> que os oferta;</li>
            <li>Em caso de denúncia de conteúdo impróprio ou irregular, a Plataforma poderá suspender ou remover o estabelecimento, sem que isso gere qualquer responsabilidade para a Plataforma sobre danos já causados;</li>
            <li>O usuário que identificar conteúdo irregular deve reportar pelo e-mail <strong>contato@janocaminho.com.br</strong>.</li>
          </UList>

          <Section title="4. Responsabilidade dos Estabelecimentos Parceiros" />
          <Para>
            As Lojas parceiras são <strong>pessoas jurídicas ou físicas independentes</strong> e são as únicas responsáveis pelos produtos que oferecem, pela qualidade do atendimento, pelo cumprimento das normas sanitárias, fiscais e legais aplicáveis ao seu ramo de atividade. A relação entre a Plataforma e as Lojas é de prestação de serviço tecnológico, sem qualquer vínculo trabalhista ou societário.
          </Para>

          <Section title="5. Pagamentos e Transações" />
          <Para>
            A Plataforma utiliza gateways de pagamento de terceiros (ex: Mercado Pago). Não armazenamos dados completos de cartão de crédito. A Plataforma não se responsabiliza por falhas de processamento, recusas de crédito, chargebacks ou fraudes de terceiros. O usuário é o único responsável por fornecer informações de pagamento precisas e válidas.
          </Para>

          <Section title="6. Obrigações do Usuário" />
          <Para>
            O usuário compromete-se a fornecer dados cadastrais verdadeiros, não utilizar a Plataforma para fins ilícitos, lesivos ou fraudulentos, e manter a confidencialidade de suas credenciais. O uso indevido ou fraudulento resultará no banimento imediato da conta, sem prejuízo das medidas legais cabíveis.
          </Para>

          <Section title="7. Disponibilidade da Plataforma" />
          <Para>
            Não garantimos que a Plataforma funcionará de forma ininterrupta ou livre de erros. Reservamo-nos o direito de suspender, alterar ou encerrar os serviços a qualquer momento, por razões de manutenção técnica ou atualizações, sem prévio aviso e sem gerar direito a indenização.
          </Para>

          <Section title="8. Foro e Legislação Aplicável" />
          <Para>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de domicílio do usuário para dirimir quaisquer controvérsias decorrentes deste instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
          </Para>

          <Section title="9. Modificações dos Termos" />
          <Para>
            Estes Termos podem ser alterados a qualquer momento, a exclusivo critério da Plataforma. O uso contínuo dos serviços após as alterações constitui plena aceitação dos novos Termos.
          </Para>
        </div>

        {/* LGPD */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)] p-6 sm:p-8 space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex rounded-full bg-[#336886]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#336886]">LGPD</span>
          </div>
          <h2 className="text-lg font-black text-slate-900">Política de Privacidade e Proteção de Dados</h2>
          <p className="text-xs text-slate-400 font-medium">Em conformidade com a Lei nº 13.709/2018</p>

          <Section title="1. Dados Coletados" />
          <Para>
            Coletamos os dados estritamente necessários para a execução dos serviços: nome, e-mail (identificador de login), telefone, endereço de entrega, histórico de pedidos e informações de dispositivo (para notificações push).
          </Para>

          <Section title="2. Finalidade do Tratamento" />
          <Para>
            Os dados são utilizados exclusivamente para processar pedidos, facilitar a entrega, enviar notificações relacionadas ao serviço e cumprir obrigações legais. <strong>Não vendemos dados pessoais a terceiros.</strong>
          </Para>

          <Section title="3. Compartilhamento de Dados" />
          <Para>
            Dados de pedido (nome, endereço, telefone) são compartilhados com a Loja parceira e/ou entregador exclusivamente para viabilizar a entrega. Dados de pagamento são processados diretamente pelo gateway (Mercado Pago) e não ficam armazenados em nossos servidores.
          </Para>

          <Section title="4. Exclusão de Conta e Dados" />
          <Para>O usuário pode solicitar a exclusão de seus dados de duas formas:</Para>
          <UList>
            <li><strong>Pelo Aplicativo:</strong> acesse "Minha Conta" e clique em "Excluir minha conta permanentemente".</li>
            <li><strong>Por E-mail:</strong> envie solicitação para <strong>contato@janocaminho.com.br</strong> com o assunto "Exclusão de Dados".</li>
          </UList>

          <Section title="5. Período de Armazenamento" />
          <Para>
            Ao solicitar a exclusão, os dados de perfil são desativados e anonimizados. Dados referentes a transações financeiras podem ser mantidos por até 5 anos para fins de auditoria e cumprimento das leis fiscais e regulatórias brasileiras.
          </Para>

          <Section title="6. Canal de Contato (DPO)" />
          <Para>
            Para dúvidas sobre privacidade ou exercício de direitos previstos na LGPD (acesso, correção, portabilidade, oposição), entre em contato: <strong>contato@janocaminho.com.br</strong>
          </Para>
        </div>

        <p className="text-center text-[11px] text-slate-400 pb-4">
          © {new Date().getFullYear()} Edmilson Tecnologia da Informação · CNPJ 44.771.427/0001-69
        </p>
      </main>
    </div>
  );
}
