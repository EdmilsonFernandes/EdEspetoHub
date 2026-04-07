import { useLocation, useNavigate } from 'react-router-dom';

const FALLBACK_TERMS = `
<h2>Termos e Condições de Uso da Plataforma</h2>
<p>Bem-vindo à plataforma <strong>Já no Caminho</strong>, desenvolvida por <strong>Edmilson Tecnologia da Informação • CNPJ 44.771.427/0001-69</strong> (doravante "Plataforma"). Ao acessar ou utilizar nossa Plataforma, você ("Usuário") concorda expressamente com estes Termos de Uso. Caso não concorde, não utilize nossos serviços.</p>

<h3>1. Natureza do Serviço</h3>
<p>A Plataforma atua exclusivamente como um <strong>intermediador tecnológico</strong> de soluções, disponibilizando um ambiente virtual para que estabelecimentos parceiros ("Lojas/Restaurantes") ofereçam seus produtos aos Usuários. <strong>Não preparamos, embalamos, vendemos ou entregamos os produtos físicos.</strong></p>

<h3>2. Isenção de Responsabilidade</h3>
<p>O Usuário reconhece e concorda que a Plataforma <strong>não possui qualquer responsabilidade</strong> sobre:</p>
<ul>
  <li>A qualidade, preparo, segurança, higiene, integridade ou adequação para consumo dos produtos comercializados pelas Lojas;</li>
  <li>Prazos de entrega, atrasos, extravios ou conduta dos entregadores (motoboys), sejam eles próprios da Loja ou independentes;</li>
  <li>A precisão das informações nutricionais, preços ou descrições dos produtos fornecidos pelas Lojas;</li>
  <li>Eventuais danos diretos, indiretos, materiais ou morais, lucros cessantes ou prejuízos decorrentes do consumo dos produtos ou da prestação do serviço de entrega.</li>
</ul>
<p>Qualquer reclamação referente ao produto ou à entrega deverá ser direcionada diretamente à Loja responsável pelo pedido.</p>

<h3>3. Pagamentos e Transações</h3>
<p>A Plataforma utiliza gateways de pagamento de terceiros (ex: Mercado Pago). Não armazenamos dados completos de cartão de crédito em nossos servidores. A Plataforma não se responsabiliza por falhas de processamento, recusas de crédito, chargebacks ou fraudes oriundas de terceiros ou dos próprios gateways. O Usuário é o único responsável por fornecer informações de pagamento precisas e válidas.</p>

<h3>4. Obrigações do Usuário</h3>
<p>O Usuário compromete-se a fornecer dados cadastrais verdadeiros, não utilizar a Plataforma para fins ilícitos, lesivos ou fraudulentos, e manter a estrita confidencialidade de suas credenciais de acesso. O uso indevido, fraudulento ou a tentativa de burla ao sistema resultará no banimento imediato da conta, sem prejuízo das medidas legais cabíveis.</p>

<h3>5. Disponibilidade da Plataforma</h3>
<p>Não garantimos que a Plataforma funcionará de forma ininterrupta, livre de erros, vírus ou outras falhas tecnológicas. Reservamo-nos o direito de suspender, alterar ou encerrar os serviços a qualquer momento, por razões de manutenção técnica ou atualizações, sem prévio aviso e sem gerar qualquer direito a indenização ao Usuário.</p>

<h3>6. Modificações dos Termos</h3>
<p>Estes Termos podem ser alterados a qualquer momento, a exclusivo critério da Plataforma. O uso contínuo dos serviços após as alterações constitui plena aceitação dos novos Termos.</p>
`;

const FALLBACK_LGPD = `
<h2>Política de Privacidade e Proteção de Dados (LGPD)</h2>
<p>Esta Política de Privacidade descreve como o aplicativo <strong>Já no Caminho</strong>, desenvolvido por <strong>Edmilson Tecnologia da Informação • CNPJ 44.771.427/0001-69</strong>, coleta, utiliza e protege os dados pessoais dos Usuários, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD).</p>

<h3>1. Dados Coletados</h3>
<p>Coletamos os dados estritamente necessários para a execução dos serviços: Nome, E-mail (identificador de login), Telefone, Endereço de Entrega, Histórico de Pedidos e Informações de Dispositivo.</p>

<h3>2. Finalidade e Exclusão de Dados</h3>
<p>Os dados são utilizados exclusivamente para processar pedidos e facilitar a entrega. 
<strong>O Usuário possui o direito de solicitar a exclusão de sua conta e seus dados a qualquer momento.</strong></p>

<h3>3. Como solicitar a exclusão da conta</h3>
<p>O usuário pode solicitar a exclusão de seus dados de duas formas:</p>
<ul>
  <li><strong>Pelo Aplicativo:</strong> Acesse o menu "Minha Conta" e clique no botão "Excluir minha conta permanentemente".</li>
  <li><strong>Pela Web/E-mail:</strong> Envie uma solicitação para <strong>contato@janocaminho.com.br</strong> com o assunto "Exclusão de Dados".</li>
</ul>

<h3>4. Dados Mantidos e Período de Armazenamento</h3>
<p>Ao solicitar a exclusão, os dados de perfil são desativados e anonimizados. Contudo, em conformidade com as leis fiscais e regulatórias brasileiras, dados referentes a transações financeiras e histórico de pedidos podem ser mantidos por até 5 anos para fins de auditoria e cumprimento legal.</p>

<h3>5. Canal de Contato</h3>
<p>Para dúvidas sobre privacidade, contate nosso DPO em: <strong>contato@janocaminho.com.br</strong></p>
`;

export function TermsOfUse() {
  const navigate = useNavigate();
  const location = useLocation();
  const platformLogo = '/janocaminho-logo.png';
  const fromHub = new URLSearchParams(location.search || '').get('from') === 'hub';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <img src={platformLogo} alt="Já no Caminho" className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <p className="text-base font-bold text-slate-900">Já no Caminho</p>
              <p className="text-xs text-slate-500">Termos e Privacidade</p>
            </div>
          </button>
          <button
            onClick={() => navigate(fromHub ? '/hub' : '/create')}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            {fromHub ? 'Voltar ao app' : 'Voltar ao cadastro'}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-10 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Termos de uso</h1>
            <p className="text-sm text-slate-500 mt-2">
              Ao criar uma conta, você declara que leu e concorda com os termos abaixo.
            </p>
          </div>

          <div className="prose prose-slate max-w-none text-sm" dangerouslySetInnerHTML={{ __html: FALLBACK_TERMS }} />

          <div className="border-t border-slate-200 pt-6">
            <h2 id="lgpd" className="text-base font-semibold text-slate-900 mb-3">LGPD</h2>
            <div className="prose prose-slate max-w-none text-sm" dangerouslySetInnerHTML={{ __html: FALLBACK_LGPD }} />
          </div>
        </div>
      </main>
    </div>
  );
}


