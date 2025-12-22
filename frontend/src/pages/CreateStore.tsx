// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storeService } from '../services/storeService';
import { planService } from '../services/planService';

export function CreateStore() {
  const navigate = useNavigate();
  const [storeError, setStoreError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [paymentResult, setPaymentResult] = useState(null);
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    storeName: '',
    logoFile: '',
    primaryColor: '#b91c1c',
    secondaryColor: '#111827',
    socialLinks: [
      {
        type: 'instagram',
        value: '',
      },
    ],
  });

  const convertFileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) =>
    {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) =>
  {
    const file = event.target.files?.[ 0 ];
    if (!file) return;

    try
    {
      const base64 = await convertFileToBase64(file);
      setRegisterForm((prev) => ({ ...prev, logoFile: base64 }));
    } catch (error)
    {
      console.error('Falha ao processar logo', error);
      setStoreError('Não foi possível carregar o logo enviado.');
    }
  };

  const updateSocialLink = (index: number, key: 'type' | 'value', value: string) =>
  {
    setRegisterForm((prev) => {
      const links = [ ...prev.socialLinks ];
      links[ index ] = { ...links[ index ], [ key ]: value };
      return { ...prev, socialLinks: links };
    });
  };

  const addSocialLink = () =>
  {
    setRegisterForm((prev) => ({
      ...prev,
      socialLinks: [ ...prev.socialLinks, { type: 'instagram', value: '' } ],
    }));
  };

  const removeSocialLink = (index: number) =>
  {
    setRegisterForm((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }));
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await planService.list();
        setPlans(response || []);
        if (response?.[0]) setSelectedPlanId(response[0].id);
      } catch (error) {
        console.error('Não foi possível carregar os planos', error);
      }
    };

    fetchPlans();
  }, []);

  const handleCreateStore = async (event) => {
    event?.preventDefault();
    setStoreError('');
    setIsRegistering(true);
    setPaymentResult(null);

    try {
      const payload = {
        user: {
          fullName: registerForm.fullName,
          email: registerForm.email,
          password: registerForm.password,
          phone: registerForm.phone,
          address: registerForm.address,
        },
        store: {
          name: registerForm.storeName,
          logoFile: registerForm.logoFile,
          primaryColor: registerForm.primaryColor,
          secondaryColor: registerForm.secondaryColor,
          socialLinks: registerForm.socialLinks.filter((link) => link.value),
        },
        planId: selectedPlanId,
        paymentMethod,
      };

      const result = await storeService.create(payload);
      setPaymentResult(result);

      if (result.payment?.method === 'CREDIT_CARD' && result.payment.paymentLink) {
        window.location.href = result.payment.paymentLink;
        return;
      }

      if (result.redirectUrl) {
        navigate(result.redirectUrl);
      }
    } catch (error) {
      setStoreError(error.message || 'Não foi possível criar sua loja');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <button onClick={() => navigate('/')} className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white font-black flex items-center justify-center shadow-lg">
                CS
              </div>
              <div className="hidden sm:block">
                <p className="text-lg font-bold text-gray-900">Chama no Espeto</p>
                <p className="text-sm text-gray-500">Criar nova loja</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/')}
              className="px-3 py-2 sm:px-4 text-sm rounded-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white border border-gray-100 rounded-3xl shadow-xl p-6 sm:p-8">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white text-3xl">🍖</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Criar minha loja</h1>
            <p className="text-gray-500">Preencha os dados para gerar seu site automaticamente.</p>
          </div>

          {storeError && (
            <div className="bg-red-50 text-red-700 text-sm p-4 rounded-xl border border-red-100 mb-6">
              {storeError}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleCreateStore}>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações pessoais</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Nome completo</label>
                    <input
                      required
                      value={registerForm.fullName}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Email</label>
                    <input
                      required
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Senha</label>
                    <input
                      required
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Telefone</label>
                    <input
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                      placeholder="(12) 99999-9999"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Endereço completo</label>
                  <input
                    value={registerForm.address}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                    placeholder="Rua, número, bairro, cidade"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Configurações da loja</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Nome da loja</label>
                  <input
                    required
                    value={registerForm.storeName}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, storeName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                    placeholder="Ex.: Espetinho do João"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Logo da loja (upload opcional)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="flex-1 text-sm border border-gray-200 rounded-xl p-2"
                      />
                      {registerForm.logoFile && (
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-200">
                          <img src={registerForm.logoFile} alt="Pré-visualização do logo" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Envie um arquivo de imagem. Este campo é opcional.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Cor principal</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={registerForm.primaryColor}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-12 h-12 border border-gray-200 rounded-xl cursor-pointer"
                      />
                      <input
                        type="text"
                        value={registerForm.primaryColor}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Cor secundária</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={registerForm.secondaryColor}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                        className="w-12 h-12 border border-gray-200 rounded-xl cursor-pointer"
                      />
                      <input
                        type="text"
                        value={registerForm.secondaryColor}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Redes sociais</label>
                    <div className="space-y-3">
                      {registerForm.socialLinks.map((link, index) => (
                        <div key={index} className="flex gap-3 items-center">
                          <select
                            value={link.type}
                            onChange={(e) => updateSocialLink(index, 'type', e.target.value)}
                            className="border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          >
                            <option value="instagram">Instagram</option>
                            <option value="facebook">Facebook</option>
                            <option value="twitter">Twitter (X)</option>
                          </select>
                          <input
                            value={link.value}
                            onChange={(e) => updateSocialLink(index, 'value', e.target.value)}
                            className="flex-1 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                            placeholder="@usuario ou URL"
                          />
                          {registerForm.socialLinks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSocialLink(index)}
                              className="text-sm text-red-600 hover:text-red-700"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addSocialLink}
                        className="text-sm text-red-600 hover:text-red-700 font-semibold"
                      >
                        + Adicionar rede
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Informe apenas as redes que quiser destacar.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">URL da loja</label>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl px-3 py-3"> 
                        /chamanoespeto/
                      </span>
                      <input
                        disabled
                        value="gerada automaticamente"
                        className="flex-1 border border-gray-200 rounded-r-xl p-3 bg-gray-50 text-gray-500 text-sm"
                      />
                    </div>
                  <p className="text-xs text-gray-500">A URL será criada pelo sistema após o cadastro. Use o link retornado na resposta.</p>
                </div>
              </div>
            </div>
          </div>

            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Selecione um plano</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <button
                    type="button"
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`border rounded-2xl p-4 text-left transition-all ${
                      selectedPlanId === plan.id
                        ? 'border-red-500 shadow-lg bg-red-50'
                        : 'border-gray-200 hover:border-red-200'
                    }`}
                  >
                    <p className="text-sm uppercase font-semibold text-gray-500">{plan.name}</p>
                    <p className="text-2xl font-bold text-gray-900">R$ {Number(plan.price).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{plan.durationDays} dias de acesso</p>
                  </button>
                ))}
                {!plans.length && <p className="text-sm text-gray-500">Carregando planos disponíveis...</p>}
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Forma de pagamento</h4>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PIX')}
                    className={`px-4 py-2 rounded-xl border ${paymentMethod === 'PIX' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                  >
                    PIX
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                    className={`px-4 py-2 rounded-xl border ${
                      paymentMethod === 'CREDIT_CARD' ? 'border-red-500 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    Cartão de crédito
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isRegistering ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Criando sua loja...
                </span>
              ) : (
                '🚀 Criar minha loja agora'
              )}
            </button>

            {paymentResult && (
              <div className="mt-6 bg-green-50 border border-green-100 rounded-2xl p-4 space-y-2">
                <p className="text-green-800 font-semibold">Pedido criado. Aguardando pagamento.</p>
                <p className="text-sm text-green-700">Status da assinatura: {paymentResult.subscriptionStatus}</p>
                <p className="text-sm text-green-700">Forma de pagamento: {paymentResult.payment?.method}</p>
                {paymentResult.payment?.method === 'PIX' && paymentResult.payment?.qrCodeBase64 && (
                  <div className="pt-2">
                    <p className="text-sm text-gray-700 mb-2">Escaneie o QR Code para pagar:</p>
                    <img src={paymentResult.payment.qrCodeBase64} alt="QR Code PIX" className="w-48 h-48" />
                  </div>
                )}
                {paymentResult.payment?.method === 'CREDIT_CARD' && (
                  <p className="text-sm text-gray-700">
                    Você será redirecionado para o link de pagamento: {paymentResult.payment?.paymentLink}
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500 text-center">
              Ao criar sua conta, você concorda com nossos termos de uso.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
