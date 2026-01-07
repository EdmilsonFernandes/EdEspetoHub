// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storeService } from '../services/storeService';
import { planService } from '../services/planService';
import { BILLING_OPTIONS, PLAN_TIERS, getPlanName } from '../constants/planCatalog';

export function CreateStore() {
  const navigate = useNavigate();
  const [storeError, setStoreError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [paymentResult, setPaymentResult] = useState(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const openedPaymentLinkRef = useRef('');
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const platformLogo = '/chama-no-espeto.jpeg';
  const primaryPalette = [ '#dc2626', '#ea580c', '#f59e0b', '#16a34a', '#0ea5e9', '#2563eb', '#7c3aed' ];
  const secondaryPalette = [ '#111827', '#1f2937', '#334155', '#0f172a', '#0f766e', '#065f46', '#4b5563' ];
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    document: '',
    documentType: 'CPF',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
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

  const formatAddress = () => {
    const parts = [
      registerForm.street && `${registerForm.street}, ${registerForm.number || 's/n'}`,
      registerForm.complement,
      registerForm.neighborhood,
      registerForm.city && registerForm.state ? `${registerForm.city} - ${registerForm.state}` : registerForm.city,
      registerForm.cep && `CEP ${registerForm.cep}`,
    ].filter(Boolean);
    return parts.join(' | ');
  };

  const handleCepLookup = async () => {
    const rawCep = registerForm.cep.replace(/\D/g, '');
    if (rawCep.length !== 8) return;
    setIsCepLoading(true);
    setCepError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await response.json();
      if (data?.erro) {
        setCepError('CEP nao encontrado.');
        return;
      }
      setRegisterForm((prev) => ({
        ...prev,
        street: prev.street || data.logradouro || '',
        neighborhood: prev.neighborhood || data.bairro || '',
        city: prev.city || data.localidade || '',
        state: prev.state || data.uf || '',
        complement: prev.complement || data.complemento || '',
      }));
    } catch (error) {
      setCepError('Nao foi possivel consultar o CEP.');
    } finally {
      setIsCepLoading(false);
    }
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await planService.list();
        setPlans(response || []);
        const defaultPlan = response?.find((plan) => plan.name === getPlanName('basic', 'monthly'));
        if (defaultPlan) {
          setSelectedPlanId(defaultPlan.id);
        } else if (response?.[0]) {
          setSelectedPlanId(response[0].id);
        }
      } catch (error) {
        console.error('Não foi possível carregar os planos', error);
      }
    };

    fetchPlans();
  }, []);

  const billingKey = isAnnual ? 'yearly' : 'monthly';
  const billing = BILLING_OPTIONS[billingKey];
  const plansByName = plans.reduce((acc, plan) => {
    acc[plan.name] = plan;
    return acc;
  }, {});

  useEffect(() => {
    if (!plans.length) return;
    const currentPlan = plans.find((plan) => plan.id === selectedPlanId);
    const isCurrentCycle = currentPlan?.name?.endsWith(`_${billingKey}`);
    if (isCurrentCycle) return;
    const fallback = PLAN_TIERS
      .map((tier) => plansByName[getPlanName(tier.key, billingKey)]?.id)
      .find(Boolean);
    if (fallback) setSelectedPlanId(fallback);
  }, [billingKey, plans, plansByName, selectedPlanId]);

  useEffect(() => {
    const method = paymentResult?.payment?.method;
    const link = paymentResult?.payment?.paymentLink;
    if (!method || !link) return;
    if (method !== 'CREDIT_CARD' && method !== 'BOLETO') return;
    if (openedPaymentLinkRef.current === link) return;
    openedPaymentLinkRef.current = link;
    window.open(link, '_blank', 'noopener,noreferrer');
  }, [paymentResult]);

  const handleCreateStore = async (event) => {
    event?.preventDefault();
    setStoreError('');
    setPaymentResult(null);

    try {
      if (!termsAccepted || !lgpdAccepted) {
        setStoreError('Aceite os termos de uso e a politica de privacidade para continuar.');
        return;
      }
      setIsRegistering(true);
      const payload = {
        user: {
          fullName: registerForm.fullName,
          email: registerForm.email,
          password: registerForm.password,
          phone: registerForm.phone,
          document: registerForm.document,
          documentType: registerForm.documentType,
          address: formatAddress(),
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
        termsAccepted,
        lgpdAccepted,
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

  const slugify = (value = '') =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

  const storeSlugPreview = slugify(registerForm.storeName || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <button onClick={() => navigate('/')} className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-lg border border-white bg-white">
                <img src={platformLogo} alt="Chama no Espeto" className="w-full h-full object-cover" />
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
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg mx-auto mb-4 border border-white bg-white">
              <img src={platformLogo} alt="Chama no Espeto" className="w-full h-full object-cover" />
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
                    <p className="text-xs text-gray-500">Cada e-mail pode ter apenas uma conta.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Documento</label>
                    <div className="flex gap-2">
                      <select
                        value={registerForm.documentType}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, documentType: e.target.value }))}
                        className="border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="CPF">CPF</option>
                        <option value="CNPJ">CNPJ</option>
                      </select>
                      <input
                        required
                        value={registerForm.document}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, document: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                        placeholder={registerForm.documentType === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                      />
                    </div>
                  </div>
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

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">CEP</label>
                      <div className="flex gap-2">
                      <input
                        required
                        value={registerForm.cep}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, cep: e.target.value }))}
                          onBlur={handleCepLookup}
                          className="flex-1 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                          placeholder="00000-000"
                        />
                        <button
                          type="button"
                          onClick={handleCepLookup}
                          className="px-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                        >
                          {isCepLoading ? 'Buscando...' : 'Buscar'}
                        </button>
                      </div>
                      {cepError && <p className="text-xs text-red-600">{cepError}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Cidade</label>
                      <input
                        required
                        value={registerForm.city}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, city: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                        placeholder="Sua cidade"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Estado</label>
                      <input
                        required
                        value={registerForm.state}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, state: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                        placeholder="UF"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Rua / Avenida</label>
                      <input
                        required
                        value={registerForm.street}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, street: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                        placeholder="Nome da rua"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Bairro</label>
                      <input
                        required
                        value={registerForm.neighborhood}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, neighborhood: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                        placeholder="Bairro"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Numero</label>
                      <input
                        required
                        value={registerForm.number}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, number: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                        placeholder="123"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Complemento</label>
                      <input
                        value={registerForm.complement}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, complement: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                        placeholder="Apto, sala, bloco"
                      />
                    </div>
                  </div>
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
              <div className="text-xs text-gray-500">
                URL da loja: <span className="font-semibold text-gray-700">/chamanoespeto/{storeSlugPreview || 'sua-loja'}</span>
              </div>
              <p className="text-xs text-gray-500">
                Se ja existir uma loja com esse nome, o sistema adiciona um sufixo (ex.: {storeSlugPreview || 'sua-loja'}-2).
              </p>
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
                      <div className="flex flex-wrap gap-2">
                        {primaryPalette.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setRegisterForm((prev) => ({ ...prev, primaryColor: color }))}
                            className={`w-8 h-8 rounded-full border ${registerForm.primaryColor === color ? 'border-gray-900' : 'border-gray-200'}`}
                            style={{ backgroundColor: color }}
                            aria-label={`Selecionar cor ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Escolha a cor principal da sua marca.</p>
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
                      <div className="flex flex-wrap gap-2">
                        {secondaryPalette.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setRegisterForm((prev) => ({ ...prev, secondaryColor: color }))}
                            className={`w-8 h-8 rounded-full border ${registerForm.secondaryColor === color ? 'border-gray-900' : 'border-gray-200'}`}
                            style={{ backgroundColor: color }}
                            aria-label={`Selecionar cor ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Use um tom de apoio para fundos e detalhes.</p>
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
              <div className="flex items-center justify-center gap-4 mb-6">
                <span className={`text-sm font-semibold ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
                  Mensal
                </span>
                <button
                  type="button"
                  onClick={() => setIsAnnual(!isAnnual)}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${isAnnual ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-9' : 'translate-x-1'
                      }`}
                  />
                </button>
                <span className={`text-sm font-semibold ${isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
                  Anual
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {PLAN_TIERS.map((tier) => {
                  const planKey = getPlanName(tier.key, billingKey);
                  const plan = plansByName[planKey];
                  const price = plan ? Number(plan.price) : billing.priceByTier[tier.key];
                  const durationLabel = plan
                    ? `${plan.durationDays} dias de acesso`
                    : billingKey === 'yearly'
                      ? '365 dias de acesso'
                      : '30 dias de acesso';
                  const isSelected = plan?.id && selectedPlanId === plan.id;
                  const isDisabled = !plan?.id;
                  return (
                  <button
                    type="button"
                    key={planKey}
                    onClick={() => plan?.id && setSelectedPlanId(plan.id)}
                    disabled={isDisabled}
                    className={`border rounded-2xl p-4 text-left transition-all relative ${isSelected
                      ? 'border-red-500 shadow-lg bg-red-50'
                      : 'border-gray-200 hover:border-red-200'
                      } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {tier.popular && (
                      <span className="absolute -top-3 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        MAIS POPULAR
                      </span>
                    )}
                    {billing.savings && (
                      <span className="absolute -top-3 left-4 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
                        {billing.savings}
                      </span>
                    )}
                    <p className="text-sm uppercase font-semibold text-gray-500">{tier.label}</p>
                    <p className="text-2xl font-bold text-gray-900">R$ {Number(price).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{billing.period}</p>
                    <p className="text-xs text-gray-500 mt-1">{durationLabel}</p>
                    <ul className="mt-3 text-xs text-gray-600 space-y-1">
                      {tier.features.map((feature) => (
                        <li key={feature}>✓ {feature}</li>
                      ))}
                    </ul>
                  </button>
                );
                })}
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
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('BOLETO')}
                    className={`px-4 py-2 rounded-xl border ${
                      paymentMethod === 'BOLETO' ? 'border-red-500 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    Boleto
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 space-y-3">
              <label className="flex items-start gap-3 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  Li e aceito os{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/terms')}
                    className="text-brand-primary font-semibold hover:underline"
                  >
                    termos de uso
                  </button>{' '}
                  da plataforma.
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={lgpdAccepted}
                  onChange={(e) => setLgpdAccepted(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  Concordo com o tratamento de dados pessoais conforme a LGPD e a{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/terms')}
                    className="text-brand-primary font-semibold hover:underline"
                  >
                    politica de privacidade
                  </button>
                  .
                </span>
              </label>
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
                {(paymentResult.payment?.method === 'CREDIT_CARD' || paymentResult.payment?.method === 'BOLETO') && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">
                      {paymentResult.payment?.method === 'BOLETO'
                        ? 'Boleto gerado. Abra o link para pagar.'
                        : 'Pagamento por cartão disponível no link abaixo.'}
                    </p>
                    {paymentResult.payment?.paymentLink && (
                      <a
                        href={paymentResult.payment.paymentLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90"
                      >
                        Abrir pagamento
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500 text-center">
              Ao criar sua conta, voce confirma a veracidade dos dados fornecidos.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
