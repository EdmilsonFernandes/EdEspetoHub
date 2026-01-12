// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { storeService } from '../services/storeService';
import { planService } from '../services/planService';
import { BILLING_OPTIONS, PLAN_TIERS, getPlanName } from '../constants/planCatalog';

export function CreateStore() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planIdFromUrl = searchParams.get('planId');
  const [storeError, setStoreError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('test-plan-7days');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [paymentResult, setPaymentResult] = useState(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const openedPaymentLinkRef = useRef('');
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    document: '',
    storeName: '',
  });
  const platformLogo = '/logo.svg';
  const primaryPalette = [ '#dc2626', '#ea580c', '#f59e0b', '#16a34a', '#0ea5e9', '#2563eb', '#7c3aed' ];
  const secondaryPalette = [ '#111827', '#1f2937', '#334155', '#0f172a', '#0f766e', '#065f46', '#4b5563' ];
  const termsRef = useRef<HTMLDivElement | null>(null);
  const termsCheckboxRef = useRef<HTMLInputElement | null>(null);
  const logoObjectUrlRef = useRef('');
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
    storeDescription: '',
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
      if (logoObjectUrlRef.current) {
        URL.revokeObjectURL(logoObjectUrlRef.current);
      }
      const nextPreview = URL.createObjectURL(file);
      logoObjectUrlRef.current = nextPreview;
      setLogoPreviewUrl(nextPreview);
      const base64 = await convertFileToBase64(file);
      setRegisterForm((prev) => ({ ...prev, logoFile: base64 }));
    } catch (error)
    {
      console.error('Falha ao processar logo', error);
      setLogoPreviewUrl('');
      setStoreError('Não foi possível carregar o logo enviado.');
    }
  };

  useEffect(() => {
    return () => {
      if (logoObjectUrlRef.current) {
        URL.revokeObjectURL(logoObjectUrlRef.current);
      }
    };
  }, []);

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

        // If planId is provided via URL, use it
        if (planIdFromUrl) {
          setSelectedPlanId(planIdFromUrl);
          return;
        }

        // If the test plan is already selected (default), keep it
        // Otherwise set a default paid plan
        setSelectedPlanId((current) => {
          if (current === 'test-plan-7days') {
            return current; // Keep test plan selected
          }
          const defaultPlan = response?.find((plan) => plan.name === getPlanName('basic', 'monthly'));
          if (defaultPlan) {
            return defaultPlan.id;
          } else if (response?.[0]) {
            return response[0].id;
          }
          return current;
        });
      } catch (error) {
        console.error('Não foi possível carregar os planos', error);
      }
    };

    fetchPlans();
  }, [planIdFromUrl]);

  const billingKey = isAnnual ? 'yearly' : 'monthly';
  const billing = BILLING_OPTIONS[billingKey];
  const plansByName = plans.reduce((acc, plan) => {
    acc[plan.name] = plan;
    return acc;
  }, {});

  useEffect(() => {
    // Don't modify test plan selection
    if (selectedPlanId === 'test-plan-7days') return;

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
        setStoreError('');
        setValidationMessage('Para continuar, aceite os termos de uso e a politica de privacidade.');
        setShowValidationModal(true);
        if (termsRef.current) {
          termsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (termsCheckboxRef.current) {
          termsCheckboxRef.current.focus();
        }
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
          description: registerForm.storeDescription,
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
      if (registerForm.email) {
        localStorage.setItem('signupEmail', registerForm.email.trim());
      }

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

  const validateEmail = (value = '') => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return 'Informe um e-mail valido.';
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    return isValid ? '' : 'Informe um e-mail valido.';
  };

  const normalizeDigits = (value = '') => value.replace(/\D/g, '');

  const isValidCPF = (value = '') => {
    const digits = normalizeDigits(value);
    if (digits.length !== 11) return false;
    if (/^(\d)\1+$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i += 1) sum += Number(digits[i]) * (10 - i);
    let first = (sum * 10) % 11;
    if (first === 10) first = 0;
    if (first !== Number(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i += 1) sum += Number(digits[i]) * (11 - i);
    let second = (sum * 10) % 11;
    if (second === 10) second = 0;
    return second === Number(digits[10]);
  };

  const isValidCNPJ = (value = '') => {
    const digits = normalizeDigits(value);
    if (digits.length !== 14) return false;
    if (/^(\d)\1+$/.test(digits)) return false;
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < weights1.length; i += 1) sum += Number(digits[i]) * weights1[i];
    let mod = sum % 11;
    const first = mod < 2 ? 0 : 11 - mod;
    if (first !== Number(digits[12])) return false;
    sum = 0;
    for (let i = 0; i < weights2.length; i += 1) sum += Number(digits[i]) * weights2[i];
    mod = sum % 11;
    const second = mod < 2 ? 0 : 11 - mod;
    return second === Number(digits[13]);
  };

  const validateDocument = (value = '', type = 'CPF') => {
    if (!value.trim()) return 'Informe CPF ou CNPJ.';
    const isValid = type === 'CNPJ' ? isValidCNPJ(value) : isValidCPF(value);
    return isValid ? '' : 'Documento invalido.';
  };

  const validateStoreName = (value = '') => {
    const slug = slugify(value);
    if (!value.trim()) return 'Informe o nome da loja.';
    if (slug.length < 3) return 'Nome muito curto.';
    return '';
  };

  const updateFieldError = (key: string, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [key]: message }));
  };

  const storeSlugPreview = slugify(registerForm.storeName || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <button onClick={() => navigate('/')} className="flex items-center gap-3">
                <div className="h-10 w-10">
                <img src="/logo.svg" alt="Chama no Espeto" className="h-full w-full object-cover" draggable={false} />
              </div>
              <div className="hidden sm:block">
                <p className="text-lg font-bold text-gray-900">Chama no Espeto</p>
                <p className="text-sm text-gray-500 text-left">Criar nova loja</p>
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações pessoais</h3>
              <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Email</label>
                    <input
                      required
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => {
                        const next = e.target.value;
                        setRegisterForm((prev) => ({ ...prev, email: next }));
                        if (fieldErrors.email) {
                          updateFieldError('email', '');
                        }
                      }}
                      onBlur={() => updateFieldError('email', validateEmail(registerForm.email))}
                      className={`w-full border rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors ${
                        fieldErrors.email ? 'border-red-400' : 'border-gray-200'
                      }`}
                      placeholder="seu@email.com"
                    />
                    {fieldErrors.email ? (
                      <p className="text-xs text-red-600">{fieldErrors.email}</p>
                    ) : (
                    <p className="text-xs text-gray-500">Cada e-mail pode ter apenas uma conta.</p>
                    )}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Documento</label>
                    <div className="flex gap-2">
                      <select
                        value={registerForm.documentType}
                        onChange={(e) => {
                          const nextType = e.target.value;
                          setRegisterForm((prev) => ({ ...prev, documentType: nextType }));
                          if (registerForm.document) {
                            updateFieldError('document', validateDocument(registerForm.document, nextType));
                          }
                        }}
                        className="border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="CPF">CPF</option>
                        <option value="CNPJ">CNPJ</option>
                      </select>
                      <input
                        required
                        value={registerForm.document}
                        onChange={(e) => {
                          const next = e.target.value;
                          setRegisterForm((prev) => ({ ...prev, document: next }));
                          if (fieldErrors.document) {
                            updateFieldError('document', '');
                          }
                        }}
                        onBlur={() => updateFieldError('document', validateDocument(registerForm.document, registerForm.documentType))}
                        className={`flex-1 border rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors ${
                          fieldErrors.document ? 'border-red-400' : 'border-gray-200'
                        }`}
                        placeholder={registerForm.documentType === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                      />
                    </div>
                    {fieldErrors.document && (
                      <p className="text-xs text-red-600">{fieldErrors.document}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Senha</label>
                    <div className="relative">
                      <input
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl p-3 pr-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Endereço</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="sm:col-span-2 space-y-2">
                        <label className="text-sm font-semibold text-gray-700">CEP</label>
                        <input
                          required
                          value={registerForm.cep}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, cep: e.target.value }))}
                          onBlur={handleCepLookup}
                          disabled={isCepLoading}
                          className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="00000-000"
                        />
                        <button
                          type="button"
                          onClick={handleCepLookup}
                          disabled={isCepLoading}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isCepLoading ? 'Buscando...' : 'Buscar CEP'}
                        </button>
                        {cepError && <p className="text-xs text-red-600">{cepError}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Cidade</label>
                        <input
                          required
                          value={registerForm.city}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, city: e.target.value }))}
                          disabled={isCepLoading}
                          className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Sua cidade"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Estado</label>
                        <input
                          required
                          value={registerForm.state}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, state: e.target.value }))}
                          disabled={isCepLoading}
                          className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                          disabled={isCepLoading}
                          className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Nome da rua"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Bairro</label>
                        <input
                          required
                          value={registerForm.neighborhood}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, neighborhood: e.target.value }))}
                          disabled={isCepLoading}
                          className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Bairro"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Número</label>
                        <input
                          required
                          value={registerForm.number}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, number: e.target.value }))}
                          disabled={isCepLoading}
                          className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="123"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Complemento</label>
                        <input
                          value={registerForm.complement}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, complement: e.target.value }))}
                          disabled={isCepLoading}
                          className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Apto, sala, bloco (opcional)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Configurações da loja</h3>
              <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Nome da loja</label>
              <input
                required
                value={registerForm.storeName}
                onChange={(e) => {
                  const next = e.target.value;
                  setRegisterForm((prev) => ({ ...prev, storeName: next }));
                  if (fieldErrors.storeName) {
                    updateFieldError('storeName', '');
                  }
                }}
                onBlur={() => updateFieldError('storeName', validateStoreName(registerForm.storeName))}
                className={`w-full border rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors ${
                  fieldErrors.storeName ? 'border-red-400' : 'border-gray-200'
                }`}
                placeholder="Ex.: Espetinho do João"
              />
              {fieldErrors.storeName && (
                <p className="text-xs text-red-600">{fieldErrors.storeName}</p>
              )}
              <div className="text-xs text-gray-500">
                URL da loja: <span className="font-semibold text-gray-700">/chamanoespeto/{storeSlugPreview || 'sua-loja'}</span>
              </div>
              <p className="text-xs text-gray-500">
                Se ja existir uma loja com esse nome, o sistema adiciona um sufixo (ex.: {storeSlugPreview || 'sua-loja'}-2).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Descricao curta da loja</label>
              <textarea
                value={registerForm.storeDescription}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, storeDescription: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors min-h-[110px]"
                placeholder="Conte em poucas palavras o que torna sua loja especial."
                maxLength={220}
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Isso aparece no portfolio de lojas.</span>
                <span>{registerForm.storeDescription.length}/220</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 block">Logo da loja (opcional)</label>
              <div className="flex items-start gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-red-400 transition-colors text-center">
                    <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-gray-600 mb-1">Clique para enviar</p>
                    <p className="text-xs text-gray-500">PNG, JPG até 5MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {(logoPreviewUrl || registerForm.logoFile) && (
                  <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200 flex-shrink-0">
                    <img
                      src={logoPreviewUrl || registerForm.logoFile}
                      alt="Pré-visualização do logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">Cor principal</label>
                <input
                  type="color"
                  value={registerForm.primaryColor}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-16 h-16  cursor-pointer block"
                />
                <div className="flex flex-wrap gap-2 pt-2">
                  {primaryPalette.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setRegisterForm((prev) => ({ ...prev, primaryColor: color }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${registerForm.primaryColor === color ? 'border-gray-900 scale-110' : 'border-gray-200 hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Selecionar cor ${color}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500">Escolha a cor principal da sua marca.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">Cor secundária</label>
                <input
                  type="color"
                  value={registerForm.secondaryColor}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-16 h-16  cursor-pointer block"
                />
                <div className="flex flex-wrap gap-2 pt-2">
                  {secondaryPalette.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setRegisterForm((prev) => ({ ...prev, secondaryColor: color }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${registerForm.secondaryColor === color ? 'border-gray-900 scale-110' : 'border-gray-200 hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Selecionar cor ${color}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500">Use um tom de apoio para fundos e detalhes.</p>
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
             <span className={`ml-2 inline-block px-3 py-1 rounded-full text-sm font-semibold transition-colors ${isAnnual
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}>
                Economize até 25%
              </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedPlanId('test-plan-7days')}
                  className={`border-2 rounded-2xl p-4 text-left transition-all relative cursor-pointer ${selectedPlanId === 'test-plan-7days'
                    ? 'border-amber-500 shadow-lg bg-amber-50'
                    : 'border-amber-300 hover:border-amber-400'
                  }`}
                >
                  <span className="absolute -top-3 left-4 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    7 DIAS GRATIS
                  </span>
                  <p className="text-sm uppercase font-semibold text-amber-700">Teste completo</p>
                  <p className="text-2xl font-bold text-gray-900">Sem cartao</p>
                  <p className="text-xs text-gray-500">Escolha o plano ao final do periodo gratuito.</p>
                  <ul className="mt-3 text-xs text-gray-600 space-y-1">
                    <li>✓ Loja ativa por 7 dias</li>
                    <li>✓ Acesso ao painel completo</li>
                    <li>✓ Pode renovar quando quiser</li>
                  </ul>
                </button>
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
                    className={`cursor-pointer border rounded-2xl p-4 text-left transition-all relative ${isSelected
                      ? 'border-red-500 shadow-lg bg-red-50'
                      : 'border-gray-200 hover:border-red-200'
                      } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <p className="text-sm uppercase font-semibold text-gray-500">{tier.label}</p>
                    <p className="text-2xl font-bold text-gray-900">R$ {Number(price).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{billing.period}</p>
                    <p className="text-xs text-gray-500 mt-1">{durationLabel}</p>
                    <ul className="mt-3 text-xs text-gray-600 space-y-1">
                      {tier.features.map((feature) => (
                        <li key={feature}>✓ {feature}</li>
                      ))}
                    </ul>
                    {tier.popular && (
                      <span className="absolute -top-3 left-13 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        MAIS POPULAR
                      </span>
                    )}
                  </button>
                );
                })}
                {!plans.length && <p className="text-sm text-gray-500">Carregando planos disponíveis...</p>}
              </div>

              {selectedPlanId !== 'test-plan-7days' && (
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
              )}
            </div>

            <div ref={termsRef} className="pt-6 border-t border-gray-100 space-y-3">
              <label className="flex items-start gap-3 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  ref={termsCheckboxRef}
                  className="mt-1 accent-red-500"
                />
                <span>
                  Li e aceito os{' '}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="text-red-500 font-semibold hover:underline"
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
                  className="mt-1 accent-red-500"
                />
                <span>
                  Concordo com o tratamento de dados pessoais conforme a LGPD e a{' '}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="text-red-500 font-semibold hover:underline"
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
      {showTerms && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <img src={platformLogo} alt="Chama no Espeto" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">Termos de uso</p>
                  <p className="text-xs text-slate-500">LGPD e politica de privacidade</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Fechar
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-sm text-slate-600">
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">1. Plataforma e finalidade</h3>
                <p>
                  A plataforma Chama no Espeto fornece ferramentas para criar, publicar e gerir lojas digitais.
                  O usuario e responsavel pelo conteudo, precos, ofertas e atendimento.
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">2. Cadastro e veracidade</h3>
                <p>
                  Informacoes fornecidas devem ser verdadeiras e atualizadas. Dados incorretos podem impedir
                  a ativacao da loja e o recebimento de pagamentos.
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">3. Pagamentos e acesso</h3>
                <p>
                  A ativacao completa depende da confirmacao do pagamento do plano escolhido. Boletos podem
                  levar ate 3 dias uteis para compensar.
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">4. LGPD e privacidade</h3>
                <p>
                  Os dados pessoais sao tratados para cadastro, autenticacao, cobranca e suporte, conforme a
                  LGPD. O usuario pode solicitar atualizacao ou exclusao quando aplicavel.
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">5. Uso adequado</h3>
                <p>
                  E proibido utilizar a plataforma para fins ilegais ou fraudulentos. Contas em desacordo
                  podem ser suspensas.
                </p>
              </section>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
      {showValidationModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                !
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">Falta uma confirmacao</p>
                <p className="text-xs text-slate-500">Verifique os dados abaixo.</p>
              </div>
            </div>
            <div className="px-5 py-4 text-sm text-slate-600">
              {validationMessage || 'Confira os campos obrigatorios antes de continuar.'}
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90"
              >
                Voltar ao cadastro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
