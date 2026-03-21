<<<<<<< HEAD
// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';

export function TermsOfUse() {
  const navigate = useNavigate();
  const platformLogo = '/chama-no-espeto.jpeg';
=======
﻿import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../config/apiClient';

export function TermsOfUse() {
  const navigate = useNavigate();
  const platformLogo = '/janocaminho.jpg';
  const [termsContent, setTermsContent] = useState('');
  const [lgpdContent, setLgpdContent] = useState('');
  const [loading, setLoading] = useState(true);

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
>>>>>>> main

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
<<<<<<< HEAD
              <img src={platformLogo} alt="Chama no Espeto" className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <p className="text-base font-bold text-slate-900">Chama no Espeto</p>
=======
              <img src={platformLogo} alt="Já no Caminho" className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <p className="text-base font-bold text-slate-900">Já no Caminho</p>
>>>>>>> main
              <p className="text-xs text-slate-500">Termos e Privacidade</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/create')}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Voltar ao cadastro
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

<<<<<<< HEAD
          <section className="space-y-3 text-sm text-slate-600">
            <h2 className="text-base font-semibold text-slate-900">1. Plataforma e finalidade</h2>
            <p>
              A plataforma Chama no Espeto oferece ferramentas para criação e gestão de lojas digitais de
              espetos e similares. O usuário é responsável pelo conteúdo publicado, preços, ofertas e
              atendimento aos seus clientes.
            </p>
          </section>

          <section className="space-y-3 text-sm text-slate-600">
            <h2 className="text-base font-semibold text-slate-900">2. Cadastro e veracidade</h2>
            <p>
              O usuário deve fornecer informações verdadeiras e atualizadas. Dados incorretos podem impedir
              o uso da plataforma e o recebimento de pagamentos.
            </p>
          </section>

          <section className="space-y-3 text-sm text-slate-600">
            <h2 className="text-base font-semibold text-slate-900">3. Pagamentos e acesso</h2>
            <p>
              O acesso completo ao painel e a publicação da loja dependem da confirmação do pagamento do
              plano escolhido. Pagamentos por boleto podem levar ate 3 dias uteis para compensar.
            </p>
          </section>

          <section className="space-y-3 text-sm text-slate-600">
            <h2 className="text-base font-semibold text-slate-900">4. Propriedade e conteudo</h2>
            <p>
              Todo material enviado pelo usuário (logos, textos, imagens) permanece sob sua
              responsabilidade. A plataforma pode exibir esse conteúdo para operação do serviço.
            </p>
          </section>

          <section className="space-y-3 text-sm text-slate-600">
            <h2 className="text-base font-semibold text-slate-900">5. LGPD e privacidade</h2>
            <p>
              Os dados pessoais são tratados para fins de cadastro, autenticação, cobrança e suporte,
              conforme a Lei Geral de Proteção de Dados (LGPD). O usuário pode solicitar atualização ou
              exclusão de dados quando aplicavel.
            </p>
          </section>

          <section className="space-y-3 text-sm text-slate-600">
            <h2 className="text-base font-semibold text-slate-900">6. Evolucao do produto</h2>
            <p>
              A plataforma pode ser atualizada, modificada ou descontinuada a qualquer momento para melhoria
              do servico. Mudancas relevantes poderao ser comunicadas por e-mail.
            </p>
          </section>

          <section className="space-y-3 text-sm text-slate-600">
            <h2 className="text-base font-semibold text-slate-900">7. Uso adequado</h2>
            <p>
              E proibido utilizar a plataforma para fins ilegais, fraudulentos ou que violem direitos de
              terceiros. Contas que descumprirem estes termos podem ser suspensas.
            </p>
          </section>
=======
          {loading ? (
            <p className="text-sm text-slate-500">Carregando termos...</p>
          ) : termsContent ? (
            <div
              className="prose prose-slate max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: termsContent }}
            />
          ) : (
            <p className="text-sm text-slate-500">Termos indisponíveis no momento.</p>
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
              <p className="text-sm text-slate-500">Política LGPD indisponível no momento.</p>
            )}
          </div>
>>>>>>> main
        </div>
      </main>
    </div>
  );
}
<<<<<<< HEAD
=======

>>>>>>> main
