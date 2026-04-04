import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../config/apiClient';

export function TermsOfUse() {
  const navigate = useNavigate();
  const platformLogo = '/janocaminho-logo.png';
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
        </div>
      </main>
    </div>
  );
}


