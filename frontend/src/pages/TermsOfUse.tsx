import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../config/apiClient';

const FALLBACK_TERMS = `
<h2>Termos e Condições de Uso da Plataforma</h2>
<p>Bem-vindo à plataforma <strong>Já no Caminho / Datony</strong> (doravante "Plataforma"). Ao acessar ou utilizar nossa Plataforma, você ("Usuário") concorda expressamente com estes Termos de Uso. Caso não concorde, não utilize nossos serviços.</p>

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
<p>Esta Política de Privacidade descreve como a Plataforma coleta, utiliza e protege os dados pessoais dos Usuários, em conformidade estrita com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD).</p>

<h3>1. Dados Coletados</h3>
<p>Coletamos os dados estritamente necessários para a execução e viabilização dos serviços contratados: Nome, E-mail, Telefone, Endereço de Entrega, Histórico de Pedidos, Informações de Dispositivo (IP, modelo, etc.) e Tokens de Notificações Push.</p>

<h3>2. Finalidade do Tratamento</h3>
<p>Os dados são utilizados exclusivamente para:</p>
<ul>
  <li>Processar, encaminhar e facilitar a entrega de pedidos às Lojas parceiras;</li>
  <li>Processamento e validação de pagamentos através de parceiros financeiros;</li>
  <li>Envio de comunicações transacionais e atualizações sobre o status de pedidos (via WhatsApp, Push, E-mail);</li>
  <li>Prevenção à fraude, garantia de segurança da plataforma e suporte ao cliente.</li>
</ul>

<h3>3. Compartilhamento com Terceiros</h3>
<p>O Usuário consente, de forma livre e inequívoca, que seus dados pessoais (como Nome, Telefone e Endereço) sejam compartilhados com:</p>
<ul>
  <li><strong>As Lojas/Restaurantes:</strong> Para que possam preparar, processar e faturar o pedido;</li>
  <li><strong>Entregadores (Motoboys):</strong> Para possibilitar a logística e a entrega física no endereço solicitado;</li>
  <li><strong>Processadores de Pagamento:</strong> Como Mercado Pago e outros, para a efetivação segura da cobrança;</li>
  <li><strong>Provedores de Infraestrutura:</strong> Como AWS, Google Firebase e sistemas de roteamento de mapas (ViaCEP, Mapas).</li>
</ul>
<p><strong>Atenção:</strong> A Plataforma atua com zelo, mas exime-se de qualquer responsabilidade civil ou criminal pelo uso indevido, vazamento ou tratamento inadequado de dados pessoais cometido isoladamente pelas Lojas Parceiras, Entregadores ou Processadores de Pagamento após o compartilhamento necessário para a execução do serviço.</p>

<h3>4. Armazenamento e Segurança</h3>
<p>Empregamos medidas técnicas e organizacionais condizentes com os padrões de mercado para proteger seus dados contra acessos não autorizados. Contudo, o Usuário reconhece expressamente que nenhum sistema digital é totalmente imune a violações, isentando a Plataforma de responsabilidades por danos decorrentes de vazamentos causados por ataques cibernéticos de terceiros ou falhas estruturais da internet fora de nosso controle razoável.</p>

<h3>5. Direitos do Titular (LGPD)</h3>
<p>O Usuário tem o direito garantido por lei de solicitar acesso, correção, atualização, portabilidade ou exclusão de seus dados pessoais. A exclusão de dados fundamentais poderá inviabilizar permanentemente o uso da Plataforma. Ressalta-se que determinados dados poderão ser retidos em nossas bases mesmo após o pedido de exclusão, para o estrito cumprimento de obrigações legais, regulatórias ou fiscais.</p>

<h3>6. Canal de Contato</h3>
<p>Para dúvidas jurídicas ou exercício de direitos referentes aos seus dados, contate nosso Encarregado de Proteção de Dados (DPO) através do e-mail: <strong>contato@janocaminho.com.br</strong></p>
`;

export function TermsOfUse() {
  const navigate = useNavigate();
  const location = useLocation();
  const platformLogo = '/janocaminho-logo.png';
  const [termsContent, setTermsContent] = useState('');
  const [lgpdContent, setLgpdContent] = useState('');
  const [loading, setLoading] = useState(true);
  const fromHub = new URLSearchParams(location.search || '').get('from') === 'hub';

  useEffect(() => {
    const load = async () => {
      try {
        const [terms, lgpd] = await Promise.all([
          apiClient.get('/legal/terms'),
          apiClient.get('/legal/lgpd'),
        ]);
        setTermsContent(terms?.content || '');
        setLgpdContent(lgpd?.content || '');
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

          {loading ? (
            <p className="text-sm text-slate-500">Carregando termos...</p>
          ) : termsContent ? (
            <div
              className="prose prose-slate max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: termsContent }}
            />
          ) : (
            <div className="prose prose-slate max-w-none text-sm" dangerouslySetInnerHTML={{ __html: FALLBACK_TERMS }} />
          )}

          <div className="border-t border-slate-200 pt-6">
            <h2 id="lgpd" className="text-base font-semibold text-slate-900 mb-3">LGPD</h2>
            {loading ? (
              <p className="text-sm text-slate-500">Carregando política de dados...</p>
            ) : lgpdContent ? (
              <div
                className="prose prose-slate max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: lgpdContent }}
              />
            ) : (
              <div className="prose prose-slate max-w-none text-sm" dangerouslySetInnerHTML={{ __html: FALLBACK_LGPD }} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


