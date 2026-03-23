// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { storeService } from '../services/storeService';
import { planService } from '../services/planService';
import { BILLING_OPTIONS, PLAN_TIERS, getPlanName, resolveAnnualPromoTotal, resolveMonthlyEquivalent } from '../constants/planCatalog';
import { getPaymentMethodMeta, getPaymentProviderMeta } from '../utils/paymentAssets';
import { formatPhoneInput } from '../utils/format';
import { FormSection } from '../components/common/FormSection';
import { Buildings, CopySimple, GlobeHemisphereWest, RocketLaunch } from '@phosphor-icons/react';

const BRAZIL_DDDS = [
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
];

const BRAZIL_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

const cityCacheKey = (uf: string) => `ibge:cities:${String(uf || '').toUpperCase()}`;

const STORE_SEGMENTS = [
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'hamburgueria', label: 'Hamburgueria' },
  { value: 'lanchonete', label: 'Lanchonete' },
  { value: 'pizzaria', label: 'Pizzaria' },
  { value: 'adega', label: 'Adega' },
  { value: 'mercado', label: 'Mercado' },
  { value: 'hortifruti', label: 'Hortifruti' },
  { value: 'farmacia', label: 'Farmácia / Drogaria' },
  { value: 'confeitaria', label: 'Confeitaria' },
  { value: 'outros', label: 'Outros' },
];

const SOCIAL_NETWORK_OPTIONS = ['instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'linkedin'];

const STORE_SEGMENT_PRESETS: Record<string, { primaryColor: string; secondaryColor: string; description: string; orderTypes: string[]; categories: string[] }> = {
  restaurante: {
    primaryColor: '#f97316',
    secondaryColor: '#0f172a',
    description: 'Pratos frescos e atendimento rápido com pedido online.',
    orderTypes: ['delivery', 'pickup', 'table'],
    categories: ['Entradas', 'Pratos', 'Bebidas', 'Sobremesas'],
  },
  hamburgueria: {
    primaryColor: '#ef4444',
    secondaryColor: '#111827',
    description: 'Hambúrgueres artesanais e combos para delivery, retirada e mesa.',
    orderTypes: ['delivery', 'pickup', 'table'],
    categories: ['Hambúrgueres', 'Combos', 'Porções', 'Bebidas'],
  },
  lanchonete: {
    primaryColor: '#f59e0b',
    secondaryColor: '#1f2937',
    description: 'Lanches, salgados e bebidas com operação simples no dia a dia.',
    orderTypes: ['delivery', 'pickup', 'table'],
    categories: ['Lanches', 'Salgados', 'Sucos', 'Bebidas'],
  },
  pizzaria: {
    primaryColor: '#dc2626',
    secondaryColor: '#111827',
    description: 'Pizzas e porções com vitrine online e fila organizada.',
    orderTypes: ['delivery', 'pickup', 'table'],
    categories: ['Pizzas', 'Broto', 'Bordas', 'Bebidas'],
  },
  adega: {
    primaryColor: '#7c3aed',
    secondaryColor: '#0f172a',
    description: 'Bebidas geladas e conveniência com pedidos rápidos.',
    orderTypes: ['delivery', 'pickup'],
    categories: ['Cervejas', 'Destilados', 'Vinhos', 'Gelo'],
  },
  mercado: {
    primaryColor: '#2563eb',
    secondaryColor: '#0f172a',
    description: 'Mercado digital com produtos por categoria e checkout rápido.',
    orderTypes: ['delivery', 'pickup'],
    categories: ['Mercearia', 'Higiene', 'Bebidas', 'Limpeza'],
  },
  hortifruti: {
    primaryColor: '#16a34a',
    secondaryColor: '#14532d',
    description: 'Frutas, verduras e legumes frescos com pedido online.',
    orderTypes: ['delivery', 'pickup'],
    categories: ['Frutas', 'Verduras', 'Legumes', 'Promoções'],
  },
  farmacia: {
    primaryColor: '#0ea5e9',
    secondaryColor: '#0f172a',
    description: 'Medicamentos e conveniência com atendimento rápido e seguro.',
    orderTypes: ['delivery', 'pickup'],
    categories: ['Medicamentos', 'Higiene', 'Beleza', 'Infantil'],
  },
  confeitaria: {
    primaryColor: '#ec4899',
    secondaryColor: '#1f2937',
    description: 'Doces e sobremesas com vitrine digital encantadora.',
    orderTypes: ['delivery', 'pickup', 'table'],
    categories: ['Bolos', 'Doces', 'Tortas', 'Bebidas'],
  },
  outros: {
    primaryColor: '#2f9df7',
    secondaryColor: '#5fd35a',
    description: 'Loja online com pedidos organizados e experiência moderna.',
    orderTypes: ['delivery', 'pickup', 'table'],
    categories: ['Destaques', 'Mais vendidos', 'Promoções', 'Novidades'],
  },
};

const extractPhoneParts = (value = '') => {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  const hasPrefix = /^\(\d{2}\)/.test(raw);
  const ddd = hasPrefix ? digits.slice(0, 2) : '';
  const hasValidDdd = BRAZIL_DDDS.includes(ddd);
  return {
    ddd: hasValidDdd ? ddd : '',
    localNumber: hasValidDdd ? digits.slice(2, 11) : digits.slice(0, 9),
  };
};

const formatLocalPhoneNumber = (value = '') => {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export function CreateStore() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planIdFromUrl = searchParams.get('planId');
  const planFromUrl = String(searchParams.get('plan') || '').toLowerCase();
  const billingFromUrl = String(searchParams.get('billing') || '').toLowerCase();
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
  const [pixCopied, setPixCopied] = useState(false);
  const [slugCopied, setSlugCopied] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [cepAutofilled, setCepAutofilled] = useState(false);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [cityLookupError, setCityLookupError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    document: '',
    storeName: '',
  });
  const platformLogo = '/janocaminho.jpg';
  const primaryPalette = [ '#dc2626', '#ea580c', '#f59e0b', '#16a34a', '#0ea5e9', '#2563eb', '#7c3aed' ];
  const secondaryPalette = [ '#111827', '#1f2937', '#334155', '#0f172a', '#0f766e', '#065f46', '#4b5563' ];
  const termsRef = useRef<HTMLDivElement | null>(null);
  const termsCheckboxRef = useRef<HTMLInputElement | null>(null);
  const logoObjectUrlRef = useRef('');
  const bannerObjectUrlRef = useRef('');
  const personalSectionRef = useRef<HTMLDivElement | null>(null);
  const addressSectionRef = useRef<HTMLDivElement | null>(null);
  const storeSectionRef = useRef<HTMLDivElement | null>(null);
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
    segment: 'outros',
    storeDescription: '',
    pixKey: '',
    logoFile: '',
    bannerFile: '',
    primaryColor: '#2f9df7',
    secondaryColor: '#5fd35a',
    socialLinks: [
      {
        type: 'instagram',
        value: '',
      },
    ],
  });
  const storePhoneParts = extractPhoneParts(registerForm.phone || '');
  const selectedSegmentPreset = STORE_SEGMENT_PRESETS[registerForm.segment] || STORE_SEGMENT_PRESETS.outros;

  const normalizeSocialNetworkType = (value = '') =>
    value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');

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
      setStoreError('Não foi possível carregar o logo enviado agora.');
    }
  };

  const handleCopyPix = async (value: string) => {
    if (!value) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setPixCopied(true);
      window.setTimeout(() => setPixCopied(false), 2000);
    } catch (error) {
      console.error('Falha ao copiar PIX', error);
    }
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (bannerObjectUrlRef.current) {
        URL.revokeObjectURL(bannerObjectUrlRef.current);
      }
      const nextPreview = URL.createObjectURL(file);
      bannerObjectUrlRef.current = nextPreview;
      setBannerPreviewUrl(nextPreview);
      const base64 = await convertFileToBase64(file);
      setRegisterForm((prev) => ({ ...prev, bannerFile: base64 }));
    } catch (error) {
      console.error('Falha ao processar banner', error);
      setBannerPreviewUrl('');
      setStoreError('Não foi possível carregar o banner enviado agora.');
    }
  };

  const handleCopyStoreUrl = async () => {
    const value = `https://www.janocaminho.com.br/${storeSlugPreview || 'sua-loja'}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setSlugCopied(true);
      window.setTimeout(() => setSlugCopied(false), 1800);
    } catch (error) {
      console.error('Falha ao copiar URL da loja', error);
    }
  };

  useEffect(() => {
    return () => {
      if (logoObjectUrlRef.current) {
        URL.revokeObjectURL(logoObjectUrlRef.current);
      }
      if (bannerObjectUrlRef.current) {
        URL.revokeObjectURL(bannerObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (registerForm.storeDescription) return;
    setRegisterForm((prev) => ({
      ...prev,
      storeDescription: STORE_SEGMENT_PRESETS[prev.segment || 'outros']?.description || '',
    }));
  }, [registerForm.storeDescription, registerForm.segment]);

  const updateSocialLink = (index: number, key: 'type' | 'value', value: string) =>
  {
    setRegisterForm((prev) => {
      const links = [ ...prev.socialLinks ];
      links[ index ] = {
        ...links[ index ],
        [ key ]: key === 'type' ? normalizeSocialNetworkType(value) : value,
      };
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

  const normalizeCep = (input = '') => {
    const digits = input.toString().replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const handleCepLookup = async (cepValue?: string) => {
    const rawCep = (cepValue ?? registerForm.cep).replace(/\D/g, '');
    if (rawCep.length !== 8) return;
    setIsCepLoading(true);
    setCepError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await response.json();
      if (data?.erro) {
        setCepError('CEP não encontrado.');
        return;
      }
      setRegisterForm((prev) => ({
        ...prev,
        cep: normalizeCep(rawCep),
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: String(data.uf || '').toUpperCase(),
        complement: data.complemento || '',
      }));
      setCepAutofilled(true);
    } catch (error) {
      setCepError('Não foi possível consultar o CEP agora.');
    } finally {
      setIsCepLoading(false);
    }
  };

  const loadCitiesByState = async (ufValue: string) => {
    const uf = String(ufValue || '').toUpperCase();
    if (!uf || uf.length !== 2) {
      setCityOptions([]);
      return;
    }
    setIsLoadingCities(true);
    setCityLookupError('');
    try {
      const cacheKey = cityCacheKey(uf);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length) {
          setCityOptions(parsed);
          setIsLoadingCities(false);
          return;
        }
      }
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
      if (!response.ok) throw new Error('Falha ao carregar cidades.');
      const data = await response.json();
      const cities = Array.isArray(data)
        ? data
            .map((entry: any) => String(entry?.nome || '').trim())
            .filter(Boolean)
            .sort((a: string, b: string) => a.localeCompare(b, 'pt-BR'))
        : [];
      setCityOptions(cities);
      localStorage.setItem(cacheKey, JSON.stringify(cities));
    } catch (error) {
      console.error('Falha ao carregar cidades por UF', error);
      setCityOptions([]);
      setCityLookupError('Não foi possível carregar as cidades. Você pode preencher manualmente.');
    } finally {
      setIsLoadingCities(false);
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

        // Friendly landing params: /create?plan=trial|basic|pro&billing=monthly|yearly
        if (planFromUrl === 'trial') {
          setSelectedPlanId('test-plan-7days');
          return;
        }

        if ((planFromUrl === 'basic' || planFromUrl === 'pro') && Array.isArray(response) && response.length) {
          const resolvedBilling = billingFromUrl === 'yearly' ? 'yearly' : 'monthly';
          const planName = getPlanName(planFromUrl, resolvedBilling);
          const matchedPlan = response.find((plan) => plan.name === planName);
          if (matchedPlan?.id) {
            setSelectedPlanId(matchedPlan.id);
            setIsAnnual(resolvedBilling === 'yearly');
            return;
          }
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
  }, [planIdFromUrl, planFromUrl, billingFromUrl]);

  useEffect(() => {
    const uf = String(registerForm.state || '').toUpperCase();
    if (!uf || uf.length !== 2) {
      setCityOptions([]);
      return;
    }
    setCityLookupError('');
    loadCitiesByState(uf);
  }, [registerForm.state]);

  const billingKey = isAnnual ? 'yearly' : 'monthly';
  const billing = BILLING_OPTIONS[billingKey];
  const plansByName = plans.reduce((acc, plan) => {
    acc[plan.name] = plan;
    return acc;
  }, {});

  const resolveEffectivePlanId = () => {
    if (selectedPlanId !== 'test-plan-7days') return selectedPlanId;
    const preferred = plansByName[getPlanName('basic', billingKey)]?.id;
    const fallback = plans?.[0]?.id;
    return preferred || fallback || selectedPlanId;
  };

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
        setValidationMessage('Para continuar, aceite os termos de uso e a política de privacidade.');
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
      const effectivePlanId = resolveEffectivePlanId();
      if (effectivePlanId === 'test-plan-7days') {
        setStoreError('Não foi possível identificar um plano válido. Atualize a página e tente novamente.');
        return;
      }

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
          segment: registerForm.segment,
          description: registerForm.storeDescription,
          address: formatAddress(),
          city: registerForm.city,
          state: registerForm.state,
          pixKey: registerForm.pixKey,
          logoFile: registerForm.logoFile,
          bannerFile: registerForm.bannerFile,
          primaryColor: registerForm.primaryColor,
          secondaryColor: registerForm.secondaryColor,
          socialLinks: registerForm.socialLinks
            .map((link) => ({
              type: normalizeSocialNetworkType(link.type) || 'instagram',
              value: String(link.value || '').trim(),
            }))
            .filter((link) => link.value),
          orderTypes: selectedSegmentPreset.orderTypes,
        },
        planId: effectivePlanId,
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
      setStoreError(error.message || 'Não foi possível criar sua loja agora.');
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
    return isValid ? '' : 'Documento inválido.';
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
  const handleStoreSegmentChange = (segment: string) => {
    const safeSegment = STORE_SEGMENT_PRESETS[segment] ? segment : 'outros';
    const preset = STORE_SEGMENT_PRESETS[safeSegment];
    setRegisterForm((prev) => ({
      ...prev,
      segment: safeSegment,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      storeDescription:
        !prev.storeDescription || prev.storeDescription.length < 12
          ? preset.description
          : prev.storeDescription,
    }));
  };

  const handleCreateStorePhoneLocalChange = (value: string) => {
    const localDigits = value.replace(/\D/g, '').slice(0, 9);
    const resolvedDdd = storePhoneParts.ddd;
    const formatted = localDigits
      ? resolvedDdd
        ? formatPhoneInput(localDigits, resolvedDdd)
        : formatPhoneInput(localDigits)
      : '';
    setRegisterForm((prev) => ({ ...prev, phone: formatted }));
  };

  const handleCreateStorePhoneDddChange = (ddd: string) => {
    const safeDdd = BRAZIL_DDDS.includes(ddd) ? ddd : '';
    const localDigits = storePhoneParts.localNumber;
    const formatted = localDigits
      ? safeDdd
        ? formatPhoneInput(localDigits, safeDdd)
        : formatPhoneInput(localDigits)
      : safeDdd
      ? formatPhoneInput('', safeDdd)
      : '';
    setRegisterForm((prev) => ({ ...prev, phone: formatted }));
  };

  const steps = [
    { id: 1, title: 'Dados pessoais', done: Boolean(registerForm.fullName && registerForm.email && registerForm.phone) },
    { id: 2, title: 'Endereço', done: Boolean(registerForm.cep && registerForm.city && registerForm.state && registerForm.street && registerForm.number) },
    { id: 3, title: 'Loja', done: Boolean(registerForm.storeName && registerForm.segment) },
  ];

  const canAdvanceFromStep = (stepId: number) => {
    if (stepId === 1) {
      return Boolean(
        registerForm.fullName &&
          registerForm.email &&
          registerForm.phone &&
          registerForm.document &&
          registerForm.password
      );
    }
    if (stepId === 2) {
      return Boolean(
        registerForm.cep &&
          registerForm.city &&
          registerForm.state &&
          registerForm.street &&
          registerForm.number &&
          registerForm.neighborhood
      );
    }
    return true;
  };

  const getStepValidationMessage = (stepId: number) => {
    if (stepId === 1) return 'Preencha os dados pessoais obrigatórios para continuar.';
    if (stepId === 2) return 'Preencha o endereço completo para continuar.';
    return 'Confira os dados obrigatórios antes de continuar.';
  };

  const scrollToStep = (stepId: number) => {
    if (stepId > currentStep && !canAdvanceFromStep(currentStep)) {
      setValidationMessage(getStepValidationMessage(currentStep));
      setShowValidationModal(true);
      return;
    }
    const target =
      stepId === 1 ? personalSectionRef.current : stepId === 2 ? addressSectionRef.current : storeSectionRef.current;
    if (!target) return;
    setCurrentStep(stepId);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleNextStep = () => {
    if (!canAdvanceFromStep(currentStep)) {
      setValidationMessage(getStepValidationMessage(currentStep));
      setShowValidationModal(true);
      return;
    }
    scrollToStep(currentStep + 1);
  };

  const previewDisplayName = registerForm.storeName.trim() || 'Sua Loja';
  const previewSlug = storeSlugPreview || 'sua-loja';
  const previewLogoSrc = logoPreviewUrl || registerForm.logoFile || '';
  const previewLocation = [registerForm.city, registerForm.state].filter(Boolean).join(' • ') || 'Cidade • UF';
  const previewBannerStyle = bannerPreviewUrl
    ? {
        backgroundImage: `url(${bannerPreviewUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        backgroundImage: `linear-gradient(120deg, ${registerForm.primaryColor || '#2f9df7'}, ${registerForm.secondaryColor || '#5fd35a'})`,
      };

  const previewPanel = (
    <div className="ds-card-elevated rounded-2xl p-4 space-y-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">
        <GlobeHemisphereWest size={12} weight="duotone" />
        Pré-visualização
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs text-slate-500 mb-1">Seu site ficará em</p>
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-slate-900 break-all flex-1">janocaminho.com.br/{storeSlugPreview || 'sua-loja'}</p>
          <button
            type="button"
            onClick={handleCopyStoreUrl}
            className="h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center"
            aria-label="Copiar URL da loja"
          >
            <CopySimple size={14} weight="bold" />
          </button>
        </div>
        {slugCopied && <p className="mt-1 text-[11px] font-semibold text-emerald-600">URL copiada</p>}
      </div>
      <div className="space-y-2 text-xs text-slate-600">
        <p className="inline-flex items-start gap-2">
          <RocketLaunch className="mt-0.5" size={13} weight="duotone" />
          Publique sua loja em minutos com link pronto para divulgar.
        </p>
        <p className="inline-flex items-start gap-2">
          <Buildings className="mt-0.5" size={13} weight="duotone" />
          Painel com vitrine, pedidos e operação no mesmo fluxo.
        </p>
        <p className="inline-flex items-start gap-2">
          <GlobeHemisphereWest className="mt-0.5" size={13} weight="duotone" />
          Experiência mobile-first para loja e cliente final.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-[11px] font-semibold text-slate-500 mb-2">Como ficará sua loja</p>
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-[0_12px_28px_-20px_rgba(15,23,42,0.45)]">
          <div className="relative h-20" style={previewBannerStyle}>
            <div className="absolute inset-0 bg-black/18" />
          </div>
          <div className="relative px-3 pb-3 pt-8">
            <div className="absolute -top-7 left-3 h-14 w-14 rounded-full border-2 border-white bg-white shadow-md overflow-hidden">
              {previewLogoSrc ? (
                <img src={previewLogoSrc} alt={previewDisplayName} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    backgroundImage: `linear-gradient(120deg, ${registerForm.primaryColor || '#2f9df7'}, ${registerForm.secondaryColor || '#5fd35a'})`,
                  }}
                />
              )}
            </div>
            <p className="text-[12px] font-black text-slate-800 truncate">{previewDisplayName}</p>
            <p className="text-[10px] text-slate-500 truncate">{previewLocation}</p>
            <p className="text-[10px] text-slate-500 truncate">janocaminho.com.br/{previewSlug}</p>
          </div>
          <div className="px-3 pb-3">
            <button
              type="button"
              className="mt-1 h-7 w-full rounded-md text-white text-[11px] font-semibold"
              style={{ backgroundColor: registerForm.primaryColor || '#2f9df7' }}
            >
            Ver vitrine
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(165deg,#eef6ff_0%,#f8fafc_45%,#ecfeff_100%)]">
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_18px_36px_-28px_rgba(15,23,42,0.5)]">
        <div className="h-1 bg-[linear-gradient(90deg,#ef4444,#f97316,#f59e0b)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 sm:py-4">
            <button onClick={() => navigate('/')} className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl overflow-hidden bg-white shadow-[0_14px_26px_-18px_rgba(239,68,68,0.7)] ring-1 ring-red-200 flex items-center justify-center">
                <img src={platformLogo} alt="Já no Caminho" className="h-full w-full object-cover" />
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-lg font-black text-gray-900">Já no Caminho</p>
                <p className="text-xs text-gray-500 uppercase tracking-[0.25em] text-left">Criar nova loja</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/')}
              className="px-3 py-2 sm:px-4 text-sm rounded-full border border-slate-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-6 md:p-10 shadow-sm">
          <div className="mb-5 flex flex-col items-center text-center gap-3 sm:gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-600">
              <Buildings size={12} weight="duotone" />
              Criar nova loja
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">Criar minha loja</h1>
            <p className="text-sm sm:text-base text-slate-600">Em 3 etapas você publica seu link e começa a vender.</p>
          </div>

          <div className="sticky top-[72px] sm:top-[84px] z-20 mb-6 rounded-2xl border border-slate-200 bg-white/95 p-3 sm:p-4 backdrop-blur">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Onboarding</p>
              <span className="text-[11px] text-slate-500 font-semibold">Etapa {currentStep} de 3</span>
            </div>
            <div className="flex items-center justify-between w-full relative mb-2">
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-100 -z-10 -translate-y-1/2" />
              {steps.map((step) => (
                <button
                  type="button"
                  key={step.id}
                  onClick={() => scrollToStep(step.id)}
                  className="flex flex-col items-center gap-2 bg-white px-2 py-1 transition-all"
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      currentStep === step.id || step.done
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step.id}
                  </span>
                  <span
                    className={`text-[11px] uppercase tracking-wider font-bold ${
                      currentStep === step.id ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {step.id === 1 ? 'Dados' : step.id === 2 ? 'Endereço' : 'Loja'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {storeError && (
            <div className="bg-red-50 text-red-700 text-sm p-4 rounded-xl border border-red-100 mb-6">
              {storeError}
            </div>
          )}

          <form className="space-y-6 pb-24 md:pb-0 [&_label]:text-xs [&_label]:font-bold [&_label]:text-slate-500 [&_label]:uppercase [&_label]:tracking-wider" onSubmit={handleCreateStore}>
            <div ref={personalSectionRef} className="scroll-mt-36" onFocusCapture={() => setCurrentStep(1)}>
            <FormSection
              title="Informações pessoais"
              subtitle="Dados do responsável pela operação da loja."
              variant="primary"
              contentClassName="space-y-4"
            >
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Nome completo</label>
                  <input
                    required
                    value={registerForm.fullName}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className={`ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all ${
                        fieldErrors.email ? 'border-red-400' : 'border-gray-200'
                      }`}
                      placeholder="seu@email.com"
                    />
                    {fieldErrors.email ? (
                      <p className="ds-field-error">{fieldErrors.email}</p>
                    ) : (
                    <p className="text-xs text-gray-500">Cada e-mail pode ter apenas uma conta.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Telefone</label>
                    <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2 min-w-0">
                      <select
                        value={storePhoneParts.ddd || ''}
                        onChange={(e) => handleCreateStorePhoneDddChange(e.target.value)}
                        className="ds-select ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all w-full min-w-0 text-sm font-semibold"
                      >
                        <option value="" disabled>
                          DDD
                        </option>
                        {BRAZIL_DDDS.map((ddd) => (
                          <option key={ddd} value={ddd}>
                            {ddd}
                          </option>
                        ))}
                      </select>
                      <input
                        value={formatLocalPhoneNumber(storePhoneParts.localNumber)}
                        onChange={(e) => handleCreateStorePhoneLocalChange(e.target.value)}
                        placeholder={storePhoneParts.ddd ? '99999-9999' : 'Selecione o DDD'}
                        disabled={!storePhoneParts.ddd}
                        className="ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all w-full min-w-0 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Documento</label>
                    <div className="grid grid-cols-[92px_1fr] gap-2 min-w-0">
                      <select
                        value={registerForm.documentType}
                        onChange={(e) => {
                          const nextType = e.target.value;
                          setRegisterForm((prev) => ({ ...prev, documentType: nextType }));
                          if (registerForm.document) {
                            updateFieldError('document', validateDocument(registerForm.document, nextType));
                          }
                        }}
                        className="ds-select ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 text-sm"
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
                        className={`ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 ${
                          fieldErrors.document ? 'border-red-400' : 'border-gray-200'
                        }`}
                        placeholder={registerForm.documentType === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                      />
                    </div>
                    {fieldErrors.document && (
                      <p className="ds-field-error">{fieldErrors.document}</p>
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
                        className="ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all w-full pr-10"
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

                <div ref={addressSectionRef} className="pt-4 border-t border-gray-200 scroll-mt-36" onFocusCapture={() => setCurrentStep(2)}>
                  <h4 className="text-sm font-semibold text-gray-700">Endereço</h4>
                  <p className="text-xs text-slate-500 mb-3">Onde sua loja opera e recebe pedidos.</p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
                      <div className="space-y-2 min-w-0">
                        <label className="text-sm font-semibold text-gray-700">CEP</label>
                        <input
                          required
                          value={registerForm.cep}
                          onChange={(e) => {
                            setCepAutofilled(false);
                            setRegisterForm((prev) => ({ ...prev, cep: normalizeCep(e.target.value) }));
                          }}
                          onBlur={(e) => handleCepLookup(e.target.value)}
                          disabled={isCepLoading}
                          className="ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="00000-000"
                        />
                        <button
                          type="button"
                          onClick={() => handleCepLookup(registerForm.cep)}
                          disabled={isCepLoading}
                          className="w-full ds-btn ds-btn-secondary ds-focus-ring px-3 py-2 text-sm text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                        >
                          {isCepLoading ? (
                            <>
                              <span className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                              Buscando...
                            </>
                          ) : (
                            'Buscar CEP'
                          )}
                        </button>
                        {cepError && <p className="ds-field-error">{cepError}</p>}
                      </div>
                      <div className="space-y-2 min-w-0">
                        <label className="text-sm font-semibold text-gray-700">UF</label>
                        <select
                          required
                          value={registerForm.state}
                          onChange={(e) =>
                            setRegisterForm((prev) => ({
                              ...prev,
                              state: String(e.target.value || '').toUpperCase(),
                              city: '',
                            }))
                          }
                          disabled={isCepLoading}
                          className="ds-select ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="">Selecione</option>
                          {BRAZIL_STATES.map((uf) => (
                            <option key={uf.value} value={uf.value}>
                              {uf.value} · {uf.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-sm font-semibold text-gray-700">Cidade</label>
                          {cepAutofilled && (
                            <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Preenchido via CEP
                            </span>
                          )}
                        </div>
                        <input
                          required
                          list={registerForm.state ? `cities-${registerForm.state}` : undefined}
                          value={registerForm.city}
                          onChange={(e) => {
                            setCepAutofilled(false);
                            setRegisterForm((prev) => ({ ...prev, city: e.target.value }));
                          }}
                          disabled={isCepLoading}
                          className="ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder={isLoadingCities ? 'Carregando cidades...' : 'Digite ou selecione a cidade'}
                        />
                        {registerForm.state && cityOptions.length > 0 && (
                          <datalist id={`cities-${registerForm.state}`}>
                            {cityOptions.map((city) => (
                              <option key={city} value={city} />
                            ))}
                          </datalist>
                        )}
                        {isLoadingCities && (
                          <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                            <span className="h-3.5 w-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                            Carregando cidades...
                          </p>
                        )}
                        {cityLookupError && <p className="text-xs text-amber-700">{cityLookupError}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                      <div className="space-y-2 min-w-0">
                        <label className="text-sm font-semibold text-gray-700">Rua / Avenida</label>
                        <input
                          required
                          value={registerForm.street}
                          onChange={(e) => {
                            setCepAutofilled(false);
                            setRegisterForm((prev) => ({ ...prev, street: e.target.value }));
                          }}
                          disabled={isCepLoading}
                          className="ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Nome da rua"
                        />
                      </div>
                      <div className="space-y-2 min-w-0">
                        <label className="text-sm font-semibold text-gray-700">Bairro</label>
                        <input
                          required
                          value={registerForm.neighborhood}
                          onChange={(e) => {
                            setCepAutofilled(false);
                            setRegisterForm((prev) => ({ ...prev, neighborhood: e.target.value }));
                          }}
                          disabled={isCepLoading}
                          className="ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Bairro"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                      <div className="space-y-2 min-w-0">
                        <label className="text-sm font-semibold text-gray-700">Número</label>
                        <input
                          required
                          value={registerForm.number}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, number: e.target.value }))}
                          disabled={isCepLoading}
                          className="ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="123"
                        />
                      </div>
                      <div className="space-y-2 min-w-0">
                        <label className="text-sm font-semibold text-gray-700">Complemento</label>
                        <input
                          value={registerForm.complement}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, complement: e.target.value }))}
                          disabled={isCepLoading}
                          className="ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Apto, sala, bloco (opcional)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
            </FormSection>
            </div>

            <div ref={storeSectionRef} className="pt-6 border-t border-gray-100 scroll-mt-36" onFocusCapture={() => setCurrentStep(3)}>
              <FormSection
                title="Configurações da loja"
                subtitle="Defina identidade, segmento e canais de contato."
                variant="warning"
                contentClassName="space-y-4"
              >
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
                className={`ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all ${
                  fieldErrors.storeName ? 'border-red-400' : 'border-gray-200'
                }`}
                placeholder="Nome da sua loja"
              />
              {fieldErrors.storeName && (
                <p className="ds-field-error">{fieldErrors.storeName}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">URL da loja:</span>
                <span className="inline-flex max-w-full items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  www.janocaminho.com.br/{storeSlugPreview || 'sua-loja'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyStoreUrl}
                  className="h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center"
                  aria-label="Copiar URL da loja"
                >
                  <CopySimple size={14} weight="bold" />
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Se já existir uma loja com esse nome, o sistema adiciona um sufixo (ex.: {storeSlugPreview || 'sua-loja'}-2).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Descrição curta da loja</label>
              <textarea
                value={registerForm.storeDescription}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, storeDescription: e.target.value }))}
                className="ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-h-[110px]"
                placeholder="Conte em poucas palavras o que torna sua loja especial."
                maxLength={220}
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Isso aparece no portfólio de lojas.</span>
                <span>{registerForm.storeDescription.length}/220</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Ramo da loja</label>
              <select
                value={registerForm.segment}
                onChange={(e) => handleStoreSegmentChange(e.target.value)}
                className="ds-select ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
              >
                {STORE_SEGMENTS.map((segment) => (
                  <option key={segment.value} value={segment.value}>
                    {segment.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                Aplicamos presets de cores, descrição e tipo de pedido para acelerar o setup.
              </p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sugestões de categorias</p>
                <p className="mt-1 text-xs text-slate-700">
                  {selectedSegmentPreset.categories.join(' • ')}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">Chave Pix da loja</label>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                  novo
                </span>
              </div>
              <input
                value={registerForm.pixKey}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, pixKey: e.target.value }))}
                className="ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                placeholder="012999999999 ou email@pix.com"
              />
              <p className="text-xs text-gray-500">Telefone com DDD pode começar com 0 que ajustamos para +55.</p>
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

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 block">Banner da loja (opcional)</label>
              <div className="flex items-start gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-red-400 transition-colors text-center">
                    <p className="text-sm text-gray-600 mb-1">Clique para enviar</p>
                    <p className="text-xs text-gray-500">Imagem horizontal para destaque da vitrine</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                </label>
                {bannerPreviewUrl && (
                  <div className="w-28 h-20 rounded-xl overflow-hidden border-2 border-gray-200 flex-shrink-0">
                    <img src={bannerPreviewUrl} alt="Pré-visualização do banner" className="w-full h-full object-cover" />
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
                      className={`w-8 h-8 rounded-full border-2 transition-all ${registerForm.primaryColor === color ? 'border-gray-900 scale-110 ring-2 ring-offset-2 ring-slate-400' : 'border-gray-200 hover:scale-105'}`}
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
                      className={`w-8 h-8 rounded-full border-2 transition-all ${registerForm.secondaryColor === color ? 'border-gray-900 scale-110 ring-2 ring-offset-2 ring-slate-400' : 'border-gray-200 hover:scale-105'}`}
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
                          <input
                            list={`social-network-options-${index}`}
                            value={link.type}
                            onChange={(e) => updateSocialLink(index, 'type', e.target.value)}
                            className="ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-[132px] text-sm"
                            placeholder="Rede (ex: instagram)"
                          />
                          <datalist id={`social-network-options-${index}`}>
                            {SOCIAL_NETWORK_OPTIONS.map((option) => (
                              <option key={option} value={option} />
                            ))}
                          </datalist>
                          <input
                            value={link.value}
                            onChange={(e) => updateSocialLink(index, 'value', e.target.value)}
                            className="ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 flex-1"
                            placeholder="@usuário ou URL"
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
              </FormSection>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <FormSection
                title="Selecione um plano"
                subtitle="Comece pelo teste gratuito e escolha o plano ideal depois."
                variant="success"
                contentClassName="space-y-6"
                actions={
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    7 dias grátis
                  </span>
                }
              >
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
                Economize 15%
              </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedPlanId('test-plan-7days')}
                    className={`border-2 rounded-2xl p-4 text-left transition-all relative cursor-pointer ${selectedPlanId === 'test-plan-7days'
                    ? 'border-2 border-slate-900 shadow-md bg-white'
                    : 'border border-slate-200 opacity-80 hover:opacity-100'
                  }`}
                >
                  <span className="absolute -top-3 left-4 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                    7 DIAS GRATIS
                  </span>
                  <p className="text-sm uppercase font-semibold text-amber-700">Trial completo</p>
                  <p className="text-2xl font-bold text-gray-900">Sem cartão</p>
                  <p className="text-xs text-gray-500">No trial você usa todos os recursos do plano Pro por 7 dias.</p>
                  <ul className="mt-3 text-xs text-gray-600 space-y-1">
                    <li>✓ Loja ativa por 7 dias</li>
                    <li>✓ Recursos Pro liberados</li>
                    <li>✓ Escolha o plano depois</li>
                  </ul>
                </button>
                {PLAN_TIERS.map((tier) => {
                  const planKey = getPlanName(tier.key, billingKey);
                  const plan = plansByName[planKey];
                  const full = plan ? Number(plan.price) : billing.priceByTier[tier.key];
                  const promoFromApi = plan?.promoPrice != null ? Number(plan.promoPrice) : null;
                  const promo = billingKey === 'yearly'
                    ? (promoFromApi != null && promoFromApi > 0 && promoFromApi < full ? promoFromApi : resolveAnnualPromoTotal(full))
                    : promoFromApi;
                  const showPromo = billingKey === 'yearly' && promo != null && promo > 0 && promo < full;
                  const displayPrice = billingKey === 'yearly' ? (showPromo ? promo : full) : full;
                  const monthlyEq = billingKey === 'yearly' ? resolveMonthlyEquivalent(displayPrice) : null;
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
                    className={`cursor-pointer rounded-2xl p-4 text-left transition-all relative ${isSelected
                      ? 'border-2 border-slate-900 shadow-md bg-white'
                      : 'border border-slate-200 opacity-80 hover:opacity-100'
                      } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <p className="text-sm uppercase font-semibold text-gray-500">{tier.label}</p>
                    {showPromo ? (
                      <div className="mt-1">
                        <p className="text-xs text-gray-400 line-through">R$ {Number(full).toFixed(2)}</p>
                        <p className="text-2xl font-bold text-gray-900">R$ {Number(displayPrice).toFixed(2)}</p>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-gray-900">R$ {Number(displayPrice).toFixed(2)}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {billingKey === 'yearly' ? `${billing.period} (R$ ${Number(monthlyEq || 0).toFixed(2)}/mês)` : billing.period}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{durationLabel}</p>
                    <ul className="mt-3 text-xs text-gray-600 space-y-1">
                      {tier.features.map((feature) => (
                        <li key={feature}>✓ {feature}</li>
                      ))}
                    </ul>
                    {tier.popular && (
                      <span className="absolute -top-3 left-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                        MAIS POPULAR
                      </span>
                    )}
                  </button>
                );
                })}
                {!plans.length && <p className="text-sm text-gray-500">Carregando planos disponíveis...</p>}
              </div>
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                Durante o trial, sua loja fica com recursos Pro liberados. Após o período, você pode manter no Basic ou trocar para Pro.
              </p>

              {selectedPlanId !== 'test-plan-7days' && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Forma de pagamento</h4>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('PIX')}
                      className={`rounded-2xl px-4 py-3 text-left transition-all border active:scale-[0.98] ${
                        paymentMethod === 'PIX'
                          ? 'border-2 border-slate-900 bg-white text-slate-900 shadow-md'
                          : 'border-gray-200 text-gray-600 bg-white/80 hover:border-brand-primary/40 hover:shadow-sm'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <img
                          src={getPaymentMethodMeta('PIX').icon}
                          alt="Pix"
                          className="h-6 w-6 object-contain"
                        />
                        <span className="text-sm font-semibold tracking-tight">Pix</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CREDIT_CARD')}
                      className={`rounded-2xl px-4 py-3 text-left transition-all border active:scale-[0.98] ${
                        paymentMethod === 'CREDIT_CARD'
                          ? 'border-2 border-slate-900 bg-white text-slate-900 shadow-md'
                          : 'border-gray-200 text-gray-600 bg-white/80 hover:border-brand-primary/40 hover:shadow-sm'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <img
                          src={getPaymentMethodMeta('CREDIT_CARD').icon}
                          alt="Cartão"
                          className="h-6 w-6 object-contain"
                        />
                        <span className="text-sm font-semibold tracking-tight">Cartão de crédito</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('BOLETO')}
                      className={`rounded-2xl px-4 py-3 text-left transition-all border active:scale-[0.98] ${
                        paymentMethod === 'BOLETO'
                          ? 'border-2 border-slate-900 bg-white text-slate-900 shadow-md'
                          : 'border-gray-200 text-gray-600 bg-white/80 hover:border-brand-primary/40 hover:shadow-sm'
                      }`}
                    >
                      <span className="text-sm font-semibold tracking-tight">Boleto</span>
                    </button>
                  </div>
                </div>
              )}
              </FormSection>
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
                    política de privacidade
                  </button>
                  .
                </span>
              </label>
            </div>

            <div className="fixed bottom-0 left-0 w-full z-50 rounded-none border-t border-slate-200 bg-white/90 backdrop-blur-md p-4 shadow-[0_-10px_26px_-20px_rgba(15,23,42,0.45)] md:static md:rounded-2xl md:border md:border-slate-200/90 md:p-3 md:shadow-[0_24px_46px_-30px_rgba(15,23,42,0.55)]">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="text-[11px] text-slate-500">
                  Etapa atual <span className="font-semibold text-slate-700">{currentStep} de 3</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollToStep(Math.max(1, currentStep - 1))}
                    disabled={currentStep === 1}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Voltar
                  </button>
                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={!canAdvanceFromStep(currentStep)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próximo
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isRegistering ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Criando loja...
                        </span>
                      ) : (
                        'Criar minha loja'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {paymentResult && (
              <div className="mt-6 bg-green-50 border border-green-100 rounded-2xl p-4 space-y-2">
                <p className="text-green-800 font-semibold">Pedido criado. Aguardando pagamento.</p>
                <p className="text-sm text-green-700">Status da assinatura: {paymentResult.subscriptionStatus}</p>
                {(() => {
                  const methodMeta = getPaymentMethodMeta(paymentResult.payment?.method);
                  return (
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      Forma de pagamento:
                      {methodMeta.icon && (
                        <img
                          src={methodMeta.icon}
                          alt={methodMeta.label}
                          className="h-4 w-4 object-contain"
                        />
                      )}
                      <span>{methodMeta.label}</span>
                    </p>
                  );
                })()}
                {paymentResult.payment?.method === 'PIX' && paymentResult.payment?.qrCodeBase64 && (
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      {getPaymentProviderMeta(paymentResult.payment?.provider || 'MERCADO_PAGO').icon && (
                        <img
                          src={getPaymentProviderMeta(paymentResult.payment?.provider || 'MERCADO_PAGO').icon}
                          alt={getPaymentProviderMeta(paymentResult.payment?.provider || 'MERCADO_PAGO').label}
                          className="h-5"
                        />
                      )}
                      <span>Escaneie o QR Code PIX para pagar</span>
                    </div>
                    <img src={paymentResult.payment.qrCodeBase64} alt="QR Code PIX" className="w-48 h-48" />
                    {paymentResult.payment?.qrCodeText && (
                      <div className="rounded-xl border border-emerald-200 bg-white p-3 space-y-2">
                        <p className="text-xs text-gray-500">Código copia e cola</p>
                        <p className="text-xs text-gray-700 break-all">
                          {paymentResult.payment.qrCodeText}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCopyPix(paymentResult.payment.qrCodeText)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:opacity-90"
                        >
                          {pixCopied ? 'Copiado!' : 'Copiar código'}
                        </button>
                      </div>
                    )}
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
              Ao criar sua conta, você confirma a veracidade dos dados fornecidos.
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
                  <img src={platformLogo} alt="Já no Caminho" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">Termos de uso</p>
                  <p className="text-xs text-slate-500">LGPD e política de privacidade</p>
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
                  A plataforma Já no Caminho fornece ferramentas para criar, publicar e gerir lojas digitais.
                  O usuário é responsável pelo conteúdo, preços, ofertas e atendimento.
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">2. Cadastro e veracidade</h3>
                <p>
                  Informações fornecidas devem ser verdadeiras e atualizadas. Dados incorretos podem impedir
                  a ativação da loja e o recebimento de pagamentos.
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">3. Pagamentos e acesso</h3>
                <p>
                  A ativação completa depende da confirmação do pagamento do plano escolhido. Boletos podem
                  levar até 3 dias úteis para compensar.
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">4. LGPD e privacidade</h3>
                <p>
                  Os dados pessoais são tratados para cadastro, autenticação, cobrança e suporte, conforme a
                  LGPD. O usuário pode solicitar atualização ou exclusão quando aplicável.
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">5. Uso adequado</h3>
                <p>
                  É proibido utilizar a plataforma para fins ilegais ou fraudulentos. Contas em desacordo
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
                <p className="text-base font-semibold text-slate-900">Falta uma confirmação</p>
                <p className="text-xs text-slate-500">Verifique os dados abaixo.</p>
              </div>
            </div>
            <div className="px-5 py-4 text-sm text-slate-600">
              {validationMessage || 'Confira os campos obrigatórios antes de continuar.'}
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


