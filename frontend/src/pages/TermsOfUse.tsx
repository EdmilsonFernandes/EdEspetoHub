import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../config/apiClient';

const FALLBACK_TERMS = `
<h2>Termos de Uso — Já no Caminho</h2>
<p>Ao usar a plataforma, você concorda com estes termos. Este documento regula o uso do serviço, sem substituir orientação jurídica individual.</p>
<h3>1. Uso da Plataforma</h3>
<p>O usuário deve fornecer dados verdadeiros, manter a segurança de sua conta e respeitar a legislação aplicável.</p>
<h3>2. Pedidos e Pagamentos</h3>
<p>Pedidos são intermediados pela plataforma e executados pelas lojas parceiras. Preços, disponibilidade e prazos podem variar por loja.</p>
<h3>3. Responsabilidades</h3>
<p>A plataforma adota medidas técnicas razoáveis de segurança, mas nenhum sistema é totalmente imune a falhas ou ataques.</p>
<h3>4. Limitação</h3>
<p>A responsabilidade é limitada nos termos da legislação aplicável, respeitados os direitos do consumidor.</p>
<h3>5. Contato</h3>
<p>Suporte: contato@janocaminho.com.br</p>
`;

const FALLBACK_LGPD = `
<h2>Política de Privacidade e LGPD</h2>
<p>Tratamos dados pessoais com base na Lei nº 13.709/2018 (LGPD), para autenticação, pedidos, notificações e suporte.</p>
<h3>1. Dados Coletados</h3>
<p>Nome, e-mail, telefone, endereço, histórico de pedidos, dados técnicos do dispositivo e token de notificações.</p>
<h3>2. Finalidades</h3>
<p>Operação do serviço, execução de pedidos, prevenção de fraude, atendimento e melhoria do produto.</p>
<h3>3. Compartilhamento</h3>
<p>Compartilhamos dados estritamente necessários com lojas, gateways de pagamento, serviços de envio/notificação e provedores de infraestrutura.</p>
<h3>4. Direitos do Titular</h3>
<p>Você pode solicitar confirmação de tratamento, acesso, correção, exclusão e portabilidade conforme LGPD.</p>
<h3>5. Terceiros Utilizados</h3>
<ul>
  <li>Mercado Pago (pagamentos)</li>
  <li>AWS (infraestrutura/armazenamento)</li>
  <li>Google Firebase/FCM (notificações push)</li>
  <li>ViaCEP (consulta de CEP)</li>
</ul>
<h3>6. Canal de Privacidade</h3>
<p>Solicitações: contato@janocaminho.com.br</p>
<p><em>Importante: este conteúdo é modelo operacional e deve ser revisado por assessoria jurídica para adequação final ao seu contexto.</em></p>
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


