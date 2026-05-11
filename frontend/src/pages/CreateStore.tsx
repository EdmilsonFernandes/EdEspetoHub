// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { storeService } from '../services/storeService';
import { addressLookupService } from '../services/addressLookupService';
import { authService } from '../services/authService';
import { planService } from '../services/planService';
import { BILLING_OPTIONS, PLAN_TIERS, getPlanName, resolveAnnualPromoTotal, resolveMonthlyEquivalent } from '../constants/planCatalog';
import { getPaymentMethodMeta, getPaymentProviderMeta } from '../utils/paymentAssets';
import { formatPhoneInput } from '../utils/format';
import { normalizePixCode } from '../utils/pixPayload';
import { FormSection } from '../components/common/FormSection';
import { Buildings, CheckCircle, CopySimple, CreditCard, EnvelopeSimple, GlobeHemisphereWest, MapPinLine, RocketLaunch, Storefront, UserCircle, WarningCircle } from '@phosphor-icons/react';

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

const SOCIAL_NETWORK_OPTIONS = [
  { type: 'instagram', label: 'Instagram', placeholder: '@usuario ou URL do perfil' },
  { type: 'facebook', label: 'Facebook', placeholder: 'URL da página no Facebook' },
  { type: 'twitter', label: 'Twitter/X', placeholder: '@usuario ou URL do perfil' },
  { type: 'tiktok', label: 'TikTok', placeholder: '@usuario ou URL do perfil' },
  { type: 'youtube', label: 'YouTube', placeholder: 'URL do canal' },
  { type: 'linkedin', label: 'LinkedIn', placeholder: 'URL do perfil/empresa' },
];

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

const normalizeClaimPhone = (value = '') => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }
  return formatPhoneInput(digits);
};

const resolveClaimSegment = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  return STORE_SEGMENT_PRESETS[normalized] ? normalized : 'outros';
};

export function CreateStore() {
  const ATTRIBUTION_KEY = 'jnk_attribution_v1';
  const isNativePlatform = Capacitor.isNativePlatform();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planIdFromUrl = searchParams.get('planId');
  const planFromUrl = String(searchParams.get('plan') || '').toLowerCase();
  const billingFromUrl = String(searchParams.get('billing') || '').toLowerCase();
  const destinationClaim = React.useMemo(() => {
    if (String(searchParams.get('source') || '').trim() !== 'destination_listing_claim') return null;
    const read = (key: string) => String(searchParams.get(key) || '').trim();
    const destinationListingId = read('destinationListingId');
    if (!destinationListingId) return null;
    return {
      source: 'destination_listing_claim',
      destinationListingId,
      destinationId: read('destinationId'),
      destinationSlug: read('destinationSlug'),
      destinationName: read('destinationName'),
      listingTitle: read('listingTitle') || read('storeName'),
      storeName: read('storeName') || read('listingTitle'),
      description: read('description'),
      address: read('address'),
      city: read('city'),
      state: read('state').toUpperCase(),
      phone: read('phone'),
      segment: resolveClaimSegment(read('segment')),
    };
  }, [searchParams]);
  const [storeError, setStoreError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isPreflightingOwner, setIsPreflightingOwner] = useState(false);
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
  const [validationItems, setValidationItems] = useState<string[]>([]);
  const [missingFields, setMissingFields] = useState<Record<string, boolean>>({});
  const [storeVerifyPrompt, setStoreVerifyPrompt] = useState<any | null>(null);
  const [storeCodeDigits, setStoreCodeDigits] = useState(['', '', '', '']);
  const [storeCodeLoading, setStoreCodeLoading] = useState(false);
  const [storeResendLoading, setStoreResendLoading] = useState(false);
  const [storeResendCooldown, setStoreResendCooldown] = useState(0);
  const [storeVerifyMessage, setStoreVerifyMessage] = useState('');
  const [storeVerifyError, setStoreVerifyError] = useState('');
  const [lastAutoSubmittedStoreCode, setLastAutoSubmittedStoreCode] = useState('');
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
  const destinationClaimAppliedRef = useRef('');
  const personalSectionRef = useRef<HTMLDivElement | null>(null);
  const addressSectionRef = useRef<HTMLDivElement | null>(null);
  const storeSectionRef = useRef<HTMLDivElement | null>(null);
  const planSectionRef = useRef<HTMLDivElement | null>(null);
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
    lat: null,
    lng: null,
    storeName: '',
    segment: 'outros',
    storeDescription: '',
    deliveryRadiusKm: '',
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

  const pickNativeStoreImage = async (target: 'logo' | 'banner') => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Camera')) {
      setStoreError('Galeria do celular indisponível neste dispositivo.');
      return;
    }

    try {
      setStoreError('');
      const image = await CapCamera.getPhoto({
        quality: target === 'logo' ? 82 : 78,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        promptLabelHeader: target === 'logo' ? 'Logo da loja' : 'Banner da loja',
        promptLabelPhoto: 'Escolher da galeria',
        promptLabelPicture: 'Tirar foto',
      });

      if (!image.base64String) return;
      const dataUrl = `data:image/${image.format || 'jpeg'};base64,${image.base64String}`;
      if (target === 'logo') {
        if (logoObjectUrlRef.current) {
          URL.revokeObjectURL(logoObjectUrlRef.current);
          logoObjectUrlRef.current = '';
        }
        setLogoPreviewUrl(dataUrl);
        setRegisterForm((prev) => ({ ...prev, logoFile: dataUrl }));
        return;
      }
      if (bannerObjectUrlRef.current) {
        URL.revokeObjectURL(bannerObjectUrlRef.current);
        bannerObjectUrlRef.current = '';
      }
      setBannerPreviewUrl(dataUrl);
      setRegisterForm((prev) => ({ ...prev, bannerFile: dataUrl }));
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();
      if (message.includes('cancel')) return;
      console.error('Falha ao abrir galeria no app', error);
      setStoreError('Não foi possível abrir o seletor de imagem agora. Se você tentou tirar uma foto, confira a permissão de câmera do aplicativo.');
    }
  };

  const handleCopyPix = async (value: string) => {
    const normalizedValue = normalizePixCode(value);
    if (!normalizedValue) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalizedValue);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = normalizedValue;
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
    if (!destinationClaim || destinationClaimAppliedRef.current === destinationClaim.destinationListingId) return;
    destinationClaimAppliedRef.current = destinationClaim.destinationListingId;
    setRegisterForm((prev) => ({
      ...prev,
      storeName: prev.storeName || destinationClaim.storeName,
      storeDescription:
        prev.storeDescription ||
        destinationClaim.description ||
        STORE_SEGMENT_PRESETS[destinationClaim.segment || 'outros']?.description ||
        '',
      city: prev.city || destinationClaim.city,
      state: prev.state || destinationClaim.state,
      phone: prev.phone || normalizeClaimPhone(destinationClaim.phone),
      segment: prev.segment === 'outros' ? destinationClaim.segment : prev.segment,
    }));
  }, [destinationClaim]);

  useEffect(() => {
    if (storeResendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setStoreResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [storeResendCooldown]);

  useEffect(() => {
    if (destinationClaim) return;
    if (registerForm.storeDescription) return;
    setRegisterForm((prev) => ({
      ...prev,
      storeDescription: STORE_SEGMENT_PRESETS[prev.segment || 'outros']?.description || '',
    }));
  }, [destinationClaim, registerForm.storeDescription, registerForm.segment]);

  const socialLinksMap = React.useMemo(
    () =>
      new Map(
        (registerForm.socialLinks || []).map((link) => [
          normalizeSocialNetworkType(link?.type),
          String(link?.value || ''),
        ]),
      ),
    [registerForm.socialLinks],
  );

  const isSocialSelected = (type: string) => socialLinksMap.has(normalizeSocialNetworkType(type));
  const getSocialValue = (type: string) => socialLinksMap.get(normalizeSocialNetworkType(type)) || '';

  const toggleSocialLink = (type: string, selected: boolean) => {
    const normalizedType = normalizeSocialNetworkType(type);
    setRegisterForm((prev) => {
      const current = Array.isArray(prev.socialLinks) ? prev.socialLinks : [];
      const alreadyExists = current.some((link) => normalizeSocialNetworkType(link.type) === normalizedType);
      if (selected) {
        if (alreadyExists) return prev;
        return {
          ...prev,
          socialLinks: [...current, { type: normalizedType, value: '' }],
        };
      }
      return {
        ...prev,
        socialLinks: current.filter((link) => normalizeSocialNetworkType(link.type) !== normalizedType),
      };
    });
  };

  const updateSocialValue = (type: string, value: string) => {
    const normalizedType = normalizeSocialNetworkType(type);
    setRegisterForm((prev) => {
      const current = Array.isArray(prev.socialLinks) ? prev.socialLinks : [];
      const next = current.map((link) =>
        normalizeSocialNetworkType(link.type) === normalizedType
          ? { ...link, value }
          : link,
      );
      return { ...prev, socialLinks: next };
    });
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
      const data = await addressLookupService.lookupZipCode(rawCep);
      setRegisterForm((prev) => ({
        ...prev,
        cep: normalizeCep(rawCep),
        street: data.street || '',
        neighborhood: data.district || '',
        city: data.city || '',
        state: String(data.state || '').toUpperCase(),
        lat: data.latitude ?? prev.lat ?? null,
        lng: data.longitude ?? prev.lng ?? null,
      }));
      setCepAutofilled(true);
    } catch (error: any) {
      setCepError(error?.message || 'Não foi possível consultar o CEP agora.');
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
          const resolvedBilling = 'monthly';
          const planName = getPlanName(planFromUrl, resolvedBilling);
          const matchedPlan = response.find((plan) => plan.name === planName);
          if (matchedPlan?.id) {
            setSelectedPlanId(matchedPlan.id);
            setIsAnnual(false);
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

  const billingKey = 'monthly';
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
      const effectivePlanId = resolveEffectivePlanId();
      if (!plans.length || effectivePlanId === 'test-plan-7days') {
        setStoreError('');
        showValidationFeedback({
          message: 'Aguarde carregar os planos disponíveis antes de criar sua loja.',
          fields: { plan: true },
          items: ['Esperar os planos carregarem para concluir a publicação.'],
        });
        return;
      }
      if (!termsAccepted || !lgpdAccepted) {
        setStoreError('');
        const fields: Record<string, boolean> = {};
        const items: string[] = [];
        if (!termsAccepted) {
          fields.termsAccepted = true;
          items.push('Aceitar os termos de uso da plataforma.');
        }
        if (!lgpdAccepted) {
          fields.lgpdAccepted = true;
          items.push('Aceitar a política de privacidade e LGPD.');
        }
        showValidationFeedback({
          message: 'Marque os termos de uso e a política de privacidade para concluir a criação da loja.',
          fields,
          items,
        });
        if (termsRef.current) {
          termsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (termsCheckboxRef.current) {
          termsCheckboxRef.current.focus();
        }
        return;
      }
      setIsRegistering(true);

      let acquisitionAttribution = null;
      try {
        const rawAttribution = localStorage.getItem(ATTRIBUTION_KEY);
        const parsedAttribution = rawAttribution ? JSON.parse(rawAttribution) : null;
        acquisitionAttribution = parsedAttribution && typeof parsedAttribution === 'object' ? parsedAttribution : null;
      } catch {
        acquisitionAttribution = null;
      }
      const destinationClaimAttribution = destinationClaim
        ? {
            source: 'destination_listing_claim',
            destinationListingId: destinationClaim.destinationListingId,
            destinationId: destinationClaim.destinationId || null,
            destinationSlug: destinationClaim.destinationSlug || null,
            destinationName: destinationClaim.destinationName || null,
            listingTitle: destinationClaim.listingTitle || destinationClaim.storeName || null,
            landingPath: `${window.location.pathname}${window.location.search}`,
            ts: Date.now(),
          }
        : null;
      const resolvedAcquisitionAttribution = (acquisitionAttribution || destinationClaimAttribution)
        ? { ...(acquisitionAttribution || {}), ...(destinationClaimAttribution || {}) }
        : null;

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
          lat: registerForm.lat,
          lng: registerForm.lng,
          deliveryRadiusKm: registerForm.deliveryRadiusKm,
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
        acquisitionAttribution: resolvedAcquisitionAttribution,
        destinationListingId: destinationClaim?.destinationListingId || undefined,
      };

      const result = await storeService.create(payload);
      setPaymentResult(result);
      if (registerForm.email) {
        localStorage.setItem('signupEmail', registerForm.email.trim());
      }

      if (result?.next === 'VERIFY_EMAIL_CODE') {
        const targetEmail = result.email || registerForm.email.trim().toLowerCase();
        setStoreVerifyPrompt({
          email: targetEmail,
          emailMasked: result.emailMasked,
          redirectUrl: result.redirectUrl,
        });
        setStoreCodeDigits(['', '', '', '']);
        setLastAutoSubmittedStoreCode('');
        setStoreVerifyError('');
        setStoreVerifyMessage(`Enviamos um código de 4 dígitos no e-mail ${result.emailMasked || targetEmail} para ativar sua loja.`);
        setStoreResendCooldown(60);
        return;
      }

      if (result.payment?.method === 'CREDIT_CARD' && result.payment.paymentLink) {
        window.location.href = result.payment.paymentLink;
        return;
      }

      if (result.redirectUrl) {
        navigate(result.redirectUrl);
      }
    } catch (error: any) {
      const resolvedError = resolveCreateStoreError(error);
      const code = String(error?.code || '').trim();
      setStoreError(resolvedError);
      if (code === 'AUTH-011' || /e-?mail/i.test(resolvedError)) {
        updateFieldError('email', resolvedError);
        setMissingFields({ email: true });
        focusCreateStoreField('email');
      } else if (code === 'AUTH-010' || /cpf|cnpj|documento/i.test(resolvedError)) {
        updateFieldError('document', resolvedError);
        setMissingFields({ document: true });
        focusCreateStoreField('document');
      }
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

  const clearMissingField = (key: string) => {
    setMissingFields((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const showValidationFeedback = ({
    message,
    fields = {},
    items = [],
  }: {
    message: string;
    fields?: Record<string, boolean>;
    items?: string[];
  }) => {
    setMissingFields(fields);
    setValidationItems(items);
    setValidationMessage(message);
    setShowValidationModal(true);
  };

  const getMissingFieldClass = (key: string) =>
    missingFields[key]
      ? '!border-amber-400 !bg-amber-50/80 ring-4 ring-amber-200/50 shadow-[0_18px_38px_-28px_rgba(245,158,11,0.65)]'
      : '';

  const resolveCreateStoreStepForField = (key: string) => {
    if (['fullName', 'email', 'phone', 'document', 'password'].includes(key)) return 1;
    if (['cep', 'state', 'city', 'street', 'neighborhood', 'number'].includes(key)) return 2;
    if (['storeName', 'segment'].includes(key)) return 3;
    if (['plan', 'termsAccepted', 'lgpdAccepted'].includes(key)) return 4;
    return null;
  };

  const focusCreateStoreField = (key: string) => {
    const targetStep = resolveCreateStoreStepForField(key);
    if (targetStep) {
      setCurrentStep(targetStep);
    }
    window.setTimeout(() => {
      const target = document.querySelector(`[data-create-field="${key}"]`) as HTMLElement | null;
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus?.();
    }, 120);
  };

  const resolveCreateStoreError = (error: any) => {
    const code = String(error?.code || '').trim();
    const message = String(error?.message || '').trim();
    if (code === 'AUTH-011' || /e-?mail.*cadastrado|email.*cadastrado/i.test(message)) {
      return 'Este e-mail já está cadastrado. Use outro e-mail ou entre na conta existente.';
    }
    if (code === 'AUTH-010' || /cpf|cnpj/i.test(message)) {
      return message || 'Este CPF/CNPJ já está cadastrado.';
    }
    if (code === 'AUTH-016' || /telefone/i.test(message)) {
      return message || 'Este telefone já está cadastrado.';
    }
    if (code === 'NETWORK_ERROR' || /failed to fetch|networkerror|falha na conexão/i.test(message)) {
      return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
    }
    return message || 'Não foi possível criar sua loja agora. Revise os dados e tente novamente.';
  };

  const validateOwnerPreflight = async () => {
    const emailMessage = validateEmail(registerForm.email);
    const documentMessage = validateDocument(registerForm.document, registerForm.documentType);
    if (emailMessage || documentMessage) {
      const fields: Record<string, boolean> = {};
      const items: string[] = [];
      if (emailMessage) {
        fields.email = true;
        items.push(emailMessage);
      }
      if (documentMessage) {
        fields.document = true;
        items.push(documentMessage);
      }
      setFieldErrors((prev) => ({
        ...prev,
        email: emailMessage,
        document: documentMessage,
      }));
      showValidationFeedback({
        message: emailMessage || documentMessage,
        fields,
        items,
      });
      return false;
    }

    setIsPreflightingOwner(true);
    try {
      await storeService.preflightOwner({
        email: registerForm.email,
        document: registerForm.document,
        documentType: registerForm.documentType,
        phone: registerForm.phone,
      });
      setFieldErrors((prev) => ({ ...prev, email: '', document: '' }));
      return true;
    } catch (error: any) {
      const message = resolveCreateStoreError(error);
      const code = String(error?.code || '');
      const fields: Record<string, boolean> = {};
      const items: string[] = [];
      if (code === 'AUTH-011' || /e-?mail/i.test(message)) {
        updateFieldError('email', message);
        fields.email = true;
        items.push('Use outro e-mail ou entre na conta existente.');
      }
      if (code === 'AUTH-010' || /cpf|cnpj|documento/i.test(message)) {
        updateFieldError('document', message);
        fields.document = true;
        items.push('Corrija o CPF ou CNPJ informado.');
      }
      showValidationFeedback({
        message,
        fields,
        items,
      });
      return false;
    } finally {
      setIsPreflightingOwner(false);
    }
  };

  const storeVerificationCode = storeCodeDigits.join('');

  const normalizeStoreOtpError = (error: any) => {
    const rawMessage = String(error?.message || '').trim();
    const normalized = rawMessage
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (normalized.includes('expir')) return 'Código expirado. Reenvie um novo código e tente novamente.';
    if (!rawMessage || normalized.includes('parametro') || normalized.includes('token') || normalized.includes('codigo')) {
      return 'Código inválido. Confira os 4 dígitos recebidos no e-mail e tente novamente.';
    }
    return rawMessage;
  };

  const handleStoreCodeDigitChange = (index: number, value: string) => {
    const digitsOnly = String(value || '').replace(/\D/g, '');
    if (!digitsOnly) {
      setStoreCodeDigits((prev) => prev.map((digit, i) => (i === index ? '' : digit)));
      setLastAutoSubmittedStoreCode('');
      return;
    }
    const nextDigits = digitsOnly.slice(0, 4 - index).split('');
    setStoreCodeDigits((prev) => {
      const next = [...prev];
      nextDigits.forEach((digit, offset) => {
        next[index + offset] = digit;
      });
      return next;
    });
    setLastAutoSubmittedStoreCode('');
    const nextIndex = Math.min(index + nextDigits.length, 3);
    window.setTimeout(() => {
      const input = document.getElementById(`store-otp-${nextIndex}`) as HTMLInputElement | null;
      input?.focus();
      input?.select?.();
    }, 0);
    if (storeVerifyError) setStoreVerifyError('');
  };

  const handleStoreCodeKeyDown = (index: number, event: any) => {
    if (event.key === 'Backspace' && !storeCodeDigits[index] && index > 0) {
      event.preventDefault();
      const input = document.getElementById(`store-otp-${index - 1}`) as HTMLInputElement | null;
      input?.focus();
      input?.select?.();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      (document.getElementById(`store-otp-${index - 1}`) as HTMLInputElement | null)?.focus();
    }
    if (event.key === 'ArrowRight' && index < 3) {
      event.preventDefault();
      (document.getElementById(`store-otp-${index + 1}`) as HTMLInputElement | null)?.focus();
    }
  };

  const handleStoreCodePaste = (event: any) => {
    const pasted = String(event.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    event.preventDefault();
    setStoreCodeDigits([pasted[0] || '', pasted[1] || '', pasted[2] || '', pasted[3] || '']);
    setLastAutoSubmittedStoreCode('');
    const targetIndex = Math.min(Math.max(pasted.length - 1, 0), 3);
    window.setTimeout(() => (document.getElementById(`store-otp-${targetIndex}`) as HTMLInputElement | null)?.focus(), 0);
    if (storeVerifyError) setStoreVerifyError('');
  };

  const handleVerifyStoreCode = async () => {
    const email = String(storeVerifyPrompt?.email || registerForm.email || '').trim().toLowerCase();
    if (!email || storeVerificationCode.length !== 4 || storeCodeLoading) return;
    setStoreCodeLoading(true);
    setStoreVerifyError('');
    setStoreVerifyMessage('');
    try {
      const result = await authService.verifyEmail({ email, token: storeVerificationCode });
      setStoreVerifyMessage('Loja confirmada com sucesso. Redirecionando...');
      setStoreVerifyPrompt(null);
      if (result?.redirectUrl) {
        try {
          localStorage.setItem('auth:last-admin-identifier', email);
          localStorage.setItem('signupEmail', email);
        } catch {
          // no-op: login prefill is only a convenience.
        }
        const redirectTarget = String(result.redirectUrl).startsWith('/admin')
          ? `/admin?identifier=${encodeURIComponent(email)}&verified=1`
          : result.redirectUrl;
        window.setTimeout(() => navigate(redirectTarget), 800);
      }
    } catch (error: any) {
      try {
        window.navigator?.vibrate?.(120);
      } catch {
        // no-op
      }
      setStoreVerifyError(normalizeStoreOtpError(error));
    } finally {
      setStoreCodeLoading(false);
    }
  };

  useEffect(() => {
    if (!storeVerifyPrompt) return;
    if (storeVerificationCode.length !== 4 || storeCodeLoading) return;
    if (storeVerificationCode === lastAutoSubmittedStoreCode) return;
    const codeToSubmit = storeVerificationCode;
    const timer = window.setTimeout(() => {
      setLastAutoSubmittedStoreCode(codeToSubmit);
      void handleVerifyStoreCode();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [storeVerificationCode, storeCodeLoading, storeVerifyPrompt, lastAutoSubmittedStoreCode]);

  const handleResendStoreCode = async () => {
    const email = String(storeVerifyPrompt?.email || registerForm.email || '').trim().toLowerCase();
    if (!email || storeResendLoading || storeResendCooldown > 0) return;
    setStoreResendLoading(true);
    setStoreVerifyError('');
    try {
      const result = await authService.resendVerification(email);
      setStoreVerifyMessage(`Novo código enviado para ${storeVerifyPrompt?.emailMasked || email}.`);
      setStoreResendCooldown(Number(result?.cooldownSec || 60));
    } catch (error: any) {
      setStoreVerifyError(error?.message || 'Não foi possível reenviar o código agora.');
    } finally {
      setStoreResendLoading(false);
    }
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
    { id: 1, title: 'Dados', done: Boolean(registerForm.fullName && registerForm.email && registerForm.phone && registerForm.document && registerForm.password) },
    { id: 2, title: 'Endereço', done: Boolean(registerForm.cep && registerForm.city && registerForm.state && registerForm.street && registerForm.number && registerForm.neighborhood) },
    { id: 3, title: 'Loja', done: Boolean(registerForm.storeName && registerForm.segment) },
    { id: 4, title: 'Plano', done: Boolean(termsAccepted && lgpdAccepted) },
  ];
  const progressPercent = Math.max(0, Math.min(100, (currentStep / steps.length) * 100));
  const stepMeta: Record<number, { icon: any; hint: string }> = {
    1: { icon: UserCircle, hint: 'Seus dados' },
    2: { icon: MapPinLine, hint: 'Onde você está' },
    3: { icon: Storefront, hint: 'Sua marca' },
    4: { icon: CreditCard, hint: 'Ativar grátis' },
  };
  const finalReviewBlockingItems = [
    missingFields.plan ? 'Escolha um plano disponível para liberar a criação da loja.' : '',
    missingFields.termsAccepted ? 'Aceite os termos de uso antes de publicar.' : '',
    missingFields.lgpdAccepted ? 'Confirme a política de privacidade e LGPD para concluir.' : '',
  ].filter(Boolean);
  const hasFinalReviewBlockingItems = finalReviewBlockingItems.length > 0;
  const isEmailConflictError = /e-?mail.*cadastrado|entre na conta existente/i.test(storeError);

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
    if (stepId === 3) {
      return Boolean(registerForm.storeName && registerForm.segment);
    }
    if (stepId === 4) {
      return Boolean(plans.length && resolveEffectivePlanId() !== 'test-plan-7days' && termsAccepted && lgpdAccepted);
    }
    return true;
  };

  const getStepValidationDetails = (stepId: number) => {
    const fields: Record<string, boolean> = {};
    const items: string[] = [];
    const add = (key: string, label: string) => {
      fields[key] = true;
      items.push(label);
    };
    const emailMessage = validateEmail(registerForm.email);
    const documentMessage = validateDocument(registerForm.document, registerForm.documentType);
    const storeNameMessage = validateStoreName(registerForm.storeName);
    const phoneReady = Boolean(storePhoneParts.ddd && storePhoneParts.localNumber && storePhoneParts.localNumber.length >= 8);

    if (stepId === 1) {
      if (!registerForm.fullName?.trim()) add('fullName', 'Nome completo');
      if (!registerForm.email?.trim() || emailMessage) add('email', emailMessage || 'E-mail');
      if (!phoneReady) add('phone', 'Telefone com DDD');
      if (!registerForm.document?.trim() || documentMessage) add('document', documentMessage || registerForm.documentType);
      if (!registerForm.password?.trim() || registerForm.password.length < 6) add('password', 'Senha com no mínimo 6 caracteres');
      return {
        fields,
        items,
        message: items.length
          ? 'Complete os dados de acesso antes de avançar. Destacamos na tela o que precisa de atenção.'
          : '',
      };
    }

    if (stepId === 2) {
      if (!registerForm.cep?.trim()) add('cep', 'CEP');
      if (!registerForm.state?.trim()) add('state', 'UF');
      if (!registerForm.city?.trim()) add('city', 'Cidade');
      if (!registerForm.street?.trim()) add('street', 'Rua ou avenida');
      if (!registerForm.neighborhood?.trim()) add('neighborhood', 'Bairro');
      if (!registerForm.number?.trim()) add('number', 'Número');
      return {
        fields,
        items,
        message: items.length
          ? 'Complete o endereço de operação para sua loja aparecer corretamente na vitrine.'
          : '',
      };
    }

    if (stepId === 3) {
      if (!registerForm.storeName?.trim() || storeNameMessage) add('storeName', storeNameMessage || 'Nome da loja');
      if (!registerForm.segment?.trim()) add('segment', 'Ramo da loja');
      return {
        fields,
        items,
        message: items.length
          ? 'Complete a identidade principal da loja para continuar.'
          : '',
      };
    }

    if (stepId === 4) {
      if (!plans.length || resolveEffectivePlanId() === 'test-plan-7days') add('plan', 'Aguardar carregamento dos planos');
      if (!termsAccepted) add('termsAccepted', 'Aceitar termos de uso');
      if (!lgpdAccepted) add('lgpdAccepted', 'Aceitar política de privacidade e LGPD');
      return {
        fields,
        items,
        message: items.length
          ? 'Revise as confirmações finais antes de criar a loja.'
          : '',
      };
    }

    return { fields, items, message: '' };
  };

  const showStepValidation = (stepId: number) => {
    const details = getStepValidationDetails(stepId);
    showValidationFeedback({
      message: details.message || getStepValidationMessage(stepId),
      fields: details.fields,
      items: details.items,
    });
    const firstField = Object.keys(details.fields)[0];
    if (firstField) focusCreateStoreField(firstField);
  };

  const getStepValidationMessage = (stepId: number) => {
    if (stepId === 1) return 'Preencha os dados pessoais obrigatórios para continuar.';
    if (stepId === 2) return 'Preencha o endereço completo para continuar.';
    if (stepId === 3) return 'Complete as informações da loja para continuar.';
    if (stepId === 4) return 'Selecione um plano carregado e marque os termos para concluir.';
    return 'Confira os dados obrigatórios antes de continuar.';
  };

  const scrollToStep = (stepId: number) => {
    if (stepId > currentStep) {
      for (let s = currentStep; s < stepId; s++) {
        if (!canAdvanceFromStep(s)) { showStepValidation(s); return; }
      }
    }
    const target =
      stepId === 1
        ? personalSectionRef.current
        : stepId === 2
        ? addressSectionRef.current
        : stepId === 3
        ? storeSectionRef.current
        : planSectionRef.current;
    if (!target) return;
    setCurrentStep(stepId);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleNextStep = async () => {
    if (!canAdvanceFromStep(currentStep)) {
      showStepValidation(currentStep);
      return;
    }
    if (currentStep === 1) {
      const ok = await validateOwnerPreflight();
      if (!ok) return;
    }
    scrollToStep(Math.min(4, currentStep + 1));
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
          Sem comissão por pedido — só mensalidade acessível.
        </p>
        <p className="inline-flex items-start gap-2">
          <Buildings className="mt-0.5" size={13} weight="duotone" />
          Receba pagamentos direto na sua conta Mercado Pago.
        </p>
        <p className="inline-flex items-start gap-2">
          <GlobeHemisphereWest className="mt-0.5" size={13} weight="duotone" />
          App na Play Store + link exclusivo para divulgar.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-[0.18em]">Checklist do cadastro</p>
        <div className="space-y-1.5">
          {steps.map((step) => {
            const Icon = stepMeta[step.id]?.icon || Buildings;
            const done = Boolean(step.done);
            const active = currentStep === step.id;
            return (
              <div key={`preview-step-${step.id}`} className="flex items-center justify-between gap-2 text-xs">
                <span className={`inline-flex items-center gap-2 ${active ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>
                  <Icon size={13} weight="duotone" />
                  {step.title}
                </span>
                {done ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                    <CheckCircle size={13} weight="fill" />
                    OK
                  </span>
                ) : (
                  <span className="text-slate-400">Pendente</span>
                )}
              </div>
            );
          })}
        </div>
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
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl shadow-[0_18px_36px_-28px_rgba(15,23,42,0.5)]">
        <div className="h-1 bg-[linear-gradient(90deg,#ef4444,#f97316,#f59e0b)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 sm:py-4">
            <button onClick={() => navigate('/hub')} className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full overflow-hidden bg-[#0b2447] shadow-[0_14px_26px_-18px_rgba(15,59,83,0.55)] ring-2 ring-white/80 flex items-center justify-center">
                <img src={platformLogo} alt="Já no Caminho" className="h-full w-full object-cover" />
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-lg font-black text-gray-900">Já no Caminho</p>
                <p className="text-xs text-gray-500 uppercase tracking-[0.25em] text-left">Criar nova loja</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/hub')}
              className="rounded-full border border-[#0d4f66]/15 bg-[linear-gradient(135deg,rgba(13,79,102,0.08),rgba(44,140,159,0.12))] px-4 py-2 text-sm font-black text-[#0d4f66] shadow-[0_14px_28px_-22px_rgba(15,59,83,0.45)] transition hover:bg-[#0d4f66]/10 active:scale-[0.98]"
            >
              Cancelar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-6 md:p-10 shadow-sm">
          <div className="mb-5 flex flex-col items-center text-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">Abra sua loja em minutos</h1>
            <p className="text-sm sm:text-base text-slate-600">Sem comissão por pedido · 7 dias grátis · Pronto para vender em minutos</p>
          </div>

          {destinationClaim ? (
            <div className="mb-6 overflow-hidden rounded-[1.7rem] border border-[#153A4C]/12 bg-[radial-gradient(circle_at_10%_0%,rgba(51,104,134,0.16),transparent_36%),linear-gradient(135deg,#ffffff,#f3f7f5)] p-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.42)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#153A4C] text-white shadow-[0_18px_30px_-22px_rgba(21,58,76,0.75)]">
                    <Storefront size={24} weight="duotone" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#336886]">Ativar pedidos no destino</p>
                    <h2 className="mt-1 text-lg font-black leading-tight text-slate-950">
                      {destinationClaim.storeName || 'Seu serviço'} em {destinationClaim.destinationName || destinationClaim.city || 'um destino turístico'}
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
                      Preenchi os dados públicos do card. Ao concluir o cadastro, esse serviço deixa de ser só informativo e passa a abrir sua loja real no Já no Caminho.
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700">
                  Pré-cadastro identificado
                </span>
              </div>
            </div>
          ) : null}

          <div className="sticky top-[72px] sm:top-[84px] z-20 mb-6 rounded-2xl border border-slate-200 bg-white/95 p-3 sm:p-4 backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold text-slate-500">Progresso</p>
            <span className="text-[11px] text-slate-500 font-semibold">{currentStep} de 4 — falta pouco!</span>
          </div>
          <div className="mb-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a,#334155)] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between w-full relative mb-2">
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-100 -z-10 -translate-y-1/2" />
              {steps.map((step) => (
                <button
                  type="button"
                  key={step.id}
                  onClick={() => scrollToStep(step.id)}
                className="flex flex-col items-center gap-2 bg-white px-2 py-1 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                >
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      currentStep === step.id || step.done
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle size={16} weight="fill" />
                    ) : (
                      React.createElement(stepMeta[step.id]?.icon || Buildings, { size: 16, weight: 'duotone' })
                    )}
                  </span>
                  <span
                    className={`text-[11px] uppercase tracking-wider font-bold ${
                      currentStep === step.id ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="hidden sm:block text-[10px] text-slate-400 -mt-1">{stepMeta[step.id]?.hint || ''}</span>
                </button>
              ))}
            </div>
          </div>

          {storeError && (
            <div className="mb-6 rounded-[1.6rem] border border-rose-200 bg-[linear-gradient(180deg,rgba(255,241,242,0.98),rgba(255,255,255,0.96))] p-4 shadow-[0_24px_48px_-34px_rgba(225,29,72,0.45)]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                  <WarningCircle size={22} weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-500">Cadastro bloqueado</p>
                  <p className="mt-1 text-sm font-black leading-relaxed text-rose-900">{storeError}</p>
                  {isEmailConflictError ? (
                    <div className="mt-3 inline-flex rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-rose-700">
                      Troque o e-mail ou entre na conta existente
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          <form className={`create-store-form space-y-6 md:pb-0 [&_label]:text-xs [&_label]:font-bold [&_label]:text-slate-500 [&_label]:uppercase [&_label]:tracking-wider ${isNativePlatform ? 'ds-native-nav-content-lg' : 'pb-24'}`} onSubmit={handleCreateStore}>
            <div ref={personalSectionRef} className={`scroll-mt-36 ${currentStep === 1 || currentStep === 2 ? '' : 'hidden'}`} onFocusCapture={() => setCurrentStep(currentStep <= 2 ? currentStep : 1)}>
            <FormSection
              title={currentStep === 2 ? 'Endereço da operação' : 'Informações pessoais'}
              subtitle={currentStep === 2 ? 'Preencha o CEP e o resto é automático.' : 'Rápido e seguro. Só precisamos do básico para começar.'}
              variant="primary"
              className="create-store-section"
              contentClassName="space-y-4"
            >
              <div className={currentStep === 1 ? 'space-y-4 motion-safe:animate-[createStoreStepIn_.26s_ease-out]' : 'hidden'}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Nome completo</label>
                  <input
                    required
                    data-create-field="fullName"
                    value={registerForm.fullName}
                    onChange={(e) => {
                      clearMissingField('fullName');
                      setRegisterForm((prev) => ({ ...prev, fullName: e.target.value }));
                    }}
                    className={`ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all ${getMissingFieldClass('fullName')}`}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Email</label>
                    <input
                      required
                      type="email"
                      data-create-field="email"
                      value={registerForm.email}
                      onChange={(e) => {
                        const next = e.target.value;
                        setRegisterForm((prev) => ({ ...prev, email: next }));
                        clearMissingField('email');
                        if (storeError) {
                          setStoreError('');
                        }
                        if (fieldErrors.email) {
                          updateFieldError('email', '');
                        }
                      }}
                      onBlur={() => updateFieldError('email', validateEmail(registerForm.email))}
                      className={`ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all ${
                        fieldErrors.email ? 'border-red-400' : 'border-gray-200'
                      } ${getMissingFieldClass('email')}`}
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
                        data-create-field="phone"
                        value={storePhoneParts.ddd || ''}
                        onChange={(e) => {
                          clearMissingField('phone');
                          handleCreateStorePhoneDddChange(e.target.value);
                        }}
                        className={`ds-select ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all w-full min-w-0 text-sm font-semibold ${getMissingFieldClass('phone')}`}
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
                        onChange={(e) => {
                          clearMissingField('phone');
                          handleCreateStorePhoneLocalChange(e.target.value);
                        }}
                        placeholder={storePhoneParts.ddd ? '99999-9999' : 'Selecione o DDD'}
                        disabled={!storePhoneParts.ddd}
                        className={`ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all w-full min-w-0 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${getMissingFieldClass('phone')}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Documento</label>
                    <div className="grid grid-cols-[92px_1fr] gap-2 min-w-0">
                      <select
                        data-create-field="document"
                        value={registerForm.documentType}
                        onChange={(e) => {
                          const nextType = e.target.value;
                          setRegisterForm((prev) => ({ ...prev, documentType: nextType }));
                          clearMissingField('document');
                          if (storeError) {
                            setStoreError('');
                          }
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
                        data-create-field="document"
                        value={registerForm.document}
                        onChange={(e) => {
                          const next = e.target.value;
                          setRegisterForm((prev) => ({ ...prev, document: next }));
                          clearMissingField('document');
                          if (storeError) {
                            setStoreError('');
                          }
                          if (fieldErrors.document) {
                            updateFieldError('document', '');
                          }
                        }}
                        onBlur={() => updateFieldError('document', validateDocument(registerForm.document, registerForm.documentType))}
                        className={`ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 ${
                          fieldErrors.document ? 'border-red-400' : 'border-gray-200'
                        } ${getMissingFieldClass('document')}`}
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
                        data-create-field="password"
                        type={showPassword ? 'text' : 'password'}
                        value={registerForm.password}
                        onChange={(e) => {
                          clearMissingField('password');
                          setRegisterForm((prev) => ({ ...prev, password: e.target.value }));
                        }}
                        className={`ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all w-full pr-10 ${getMissingFieldClass('password')}`}
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
              </div>

                <div ref={addressSectionRef} className={`pt-4 border-t border-gray-200 scroll-mt-36 ${currentStep === 2 ? 'motion-safe:animate-[createStoreStepIn_.26s_ease-out]' : 'hidden'}`} onFocusCapture={() => setCurrentStep(2)}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
                      <div className="space-y-2 min-w-0">
                        <label className="text-sm font-semibold text-gray-700">CEP</label>
                        <input
                          required
                          data-create-field="cep"
                          value={registerForm.cep}
                          onChange={(e) => {
                            setCepAutofilled(false);
                            clearMissingField('cep');
                            setRegisterForm((prev) => ({ ...prev, cep: normalizeCep(e.target.value) }));
                          }}
                          onBlur={(e) => handleCepLookup(e.target.value)}
                          disabled={isCepLoading}
                          className={`ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 disabled:bg-gray-100 disabled:cursor-not-allowed ${getMissingFieldClass('cep')}`}
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
                          data-create-field="state"
                          value={registerForm.state}
                          onChange={(e) => {
                            clearMissingField('state');
                            clearMissingField('city');
                            setRegisterForm((prev) => ({
                              ...prev,
                              state: String(e.target.value || '').toUpperCase(),
                              city: '',
                            }));
                          }}
                          disabled={isCepLoading}
                          className={`ds-select ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 disabled:bg-gray-100 disabled:cursor-not-allowed ${getMissingFieldClass('state')}`}
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
                          data-create-field="city"
                          list={registerForm.state ? `cities-${registerForm.state}` : undefined}
                          value={registerForm.city}
                          onChange={(e) => {
                            setCepAutofilled(false);
                            clearMissingField('city');
                            setRegisterForm((prev) => ({ ...prev, city: e.target.value }));
                          }}
                          disabled={isCepLoading}
                          className={`ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 disabled:bg-gray-100 disabled:cursor-not-allowed ${getMissingFieldClass('city')}`}
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
                          data-create-field="street"
                          value={registerForm.street}
                          onChange={(e) => {
                            setCepAutofilled(false);
                            clearMissingField('street');
                            setRegisterForm((prev) => ({ ...prev, street: e.target.value }));
                          }}
                          disabled={isCepLoading}
                          className={`ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 disabled:bg-gray-100 disabled:cursor-not-allowed ${getMissingFieldClass('street')}`}
                          placeholder="Nome da rua"
                        />
                      </div>
                      <div className="space-y-2 min-w-0">
                        <label className="text-sm font-semibold text-gray-700">Bairro</label>
                        <input
                          required
                          data-create-field="neighborhood"
                          value={registerForm.neighborhood}
                          onChange={(e) => {
                            setCepAutofilled(false);
                            clearMissingField('neighborhood');
                            setRegisterForm((prev) => ({ ...prev, neighborhood: e.target.value }));
                          }}
                          disabled={isCepLoading}
                          className={`ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 disabled:bg-gray-100 disabled:cursor-not-allowed ${getMissingFieldClass('neighborhood')}`}
                          placeholder="Bairro"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                      <div className="space-y-2 min-w-0">
                        <label className="text-sm font-semibold text-gray-700">Número</label>
                        <input
                          required
                          data-create-field="number"
                          value={registerForm.number}
                          onChange={(e) => {
                            clearMissingField('number');
                            setRegisterForm((prev) => ({ ...prev, number: e.target.value }));
                          }}
                          disabled={isCepLoading}
                          className={`ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all min-w-0 disabled:bg-gray-100 disabled:cursor-not-allowed ${getMissingFieldClass('number')}`}
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

            <div ref={storeSectionRef} className={`pt-6 border-t border-gray-100 scroll-mt-36 ${currentStep === 3 ? 'motion-safe:animate-[createStoreStepIn_.26s_ease-out]' : 'hidden'}`} onFocusCapture={() => setCurrentStep(3)}>
              <FormSection
                title="Configurações da loja"
                subtitle="Dê personalidade à sua loja. O cliente vai adorar."
                variant="warning"
                className="create-store-section"
                contentClassName="space-y-4"
              >
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Nome da loja</label>
              <input
                required
                data-create-field="storeName"
                value={registerForm.storeName}
                onChange={(e) => {
                  const next = e.target.value;
                  setRegisterForm((prev) => ({ ...prev, storeName: next }));
                  clearMissingField('storeName');
                  if (fieldErrors.storeName) {
                    updateFieldError('storeName', '');
                  }
                }}
                onBlur={() => updateFieldError('storeName', validateStoreName(registerForm.storeName))}
                className={`ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all ${
                  fieldErrors.storeName ? 'border-red-400' : 'border-gray-200'
                } ${getMissingFieldClass('storeName')}`}
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
                data-create-field="segment"
                value={registerForm.segment}
                onChange={(e) => {
                  clearMissingField('segment');
                  handleStoreSegmentChange(e.target.value);
                }}
                className={`ds-select ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all ${getMissingFieldClass('segment')}`}
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

            {selectedSegmentPreset.orderTypes.includes('delivery') && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Até quantos km você entrega?</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  step="0.1"
                  value={registerForm.deliveryRadiusKm}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, deliveryRadiusKm: e.target.value }))}
                  className="ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                  placeholder="Ex: 5"
                />
                <p className="text-xs text-gray-500">Usaremos essa distância para mostrar sua loja para clientes próximos.</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 block">Logo da loja (opcional)</label>
              <div className="flex items-start gap-4">
                <label
                  className="flex-1 cursor-pointer"
                  onClick={(event) => {
                    if (!isNativePlatform) return;
                    event.preventDefault();
                    void pickNativeStoreImage('logo');
                  }}
                >
                  <div className="create-store-upload-card">
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
                    disabled={isNativePlatform}
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
                <label
                  className="flex-1 cursor-pointer"
                  onClick={(event) => {
                    if (!isNativePlatform) return;
                    event.preventDefault();
                    void pickNativeStoreImage('banner');
                  }}
                >
                  <div className="create-store-upload-card">
                    <p className="text-sm text-gray-600 mb-1">Clique para enviar</p>
                    <p className="text-xs text-gray-500">Imagem horizontal para destaque da vitrine</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleBannerUpload} disabled={isNativePlatform} className="hidden" />
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
              <div className="space-y-2">
                {SOCIAL_NETWORK_OPTIONS.map((network) => {
                  const checked = isSocialSelected(network.type);
                  return (
                    <div key={network.type} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleSocialLink(network.type, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-sm font-semibold text-slate-700">{network.label}</span>
                      </label>
                      {checked && (
                        <input
                          value={getSocialValue(network.type)}
                          onChange={(e) => updateSocialValue(network.type, e.target.value)}
                          className="mt-2 ds-input ds-focus-ring rounded-xl border-0 bg-slate-100 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all w-full"
                          placeholder={network.placeholder}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">Marque a rede e preencha apenas as que quiser exibir.</p>
            </div>
              </FormSection>
            </div>

            <div ref={planSectionRef} className={`pt-6 border-t border-gray-100 ${currentStep === 4 ? 'motion-safe:animate-[createStoreStepIn_.26s_ease-out]' : 'hidden'}`} onFocusCapture={() => setCurrentStep(4)}>
              <FormSection
                title="Selecione um plano"
                subtitle="Comece vendendo hoje. Sem cartão, sem compromisso."
                variant="success"
                className="create-store-section"
                contentClassName="space-y-6"
                actions={
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    7 dias grátis
                  </span>
                }
              >
              <div className="mb-6 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-emerald-100 bg-white/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <span className="text-sm font-black text-gray-900">Plano mensal ativo</span>
                <span className="inline-block rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
                  Cobrança mensal
                </span>
              </div>
              <div data-create-field="plan" className={`grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-[1.5rem] ${getMissingFieldClass('plan')}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedPlanId('test-plan-7days')}
                    className={`create-store-plan-card ${selectedPlanId === 'test-plan-7days'
                    ? 'create-store-plan-card-active'
                    : ''
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
                    className={`create-store-plan-card ${isSelected ? 'create-store-plan-card-active' : ''} ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
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

            <div ref={termsRef} className={`pt-6 border-t border-gray-100 space-y-3 ${currentStep === 4 ? '' : 'hidden'}`}>
              {hasFinalReviewBlockingItems ? (
                <div className="rounded-[1.7rem] border border-rose-200 bg-[linear-gradient(180deg,rgba(255,241,242,0.98),rgba(255,255,255,0.96))] p-4 shadow-[0_28px_56px_-36px_rgba(225,29,72,0.45)]">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                      <WarningCircle size={22} weight="fill" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-500">O que falta para publicar</p>
                      <p className="mt-1 text-sm font-black leading-relaxed text-rose-950">
                        Sua loja só é criada depois que estes pontos forem concluídos.
                      </p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {finalReviewBlockingItems.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 rounded-2xl border border-rose-200/70 bg-white/88 px-3 py-3 text-sm font-semibold leading-relaxed text-rose-900"
                      >
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div
                className={`rounded-[1.6rem] border p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)] ${
                  hasFinalReviewBlockingItems
                    ? 'border-amber-200 bg-amber-50/90'
                    : 'border-slate-200 bg-white/88'
                }`}
              >
                <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${
                  hasFinalReviewBlockingItems ? 'text-amber-700' : 'text-slate-400'
                }`}>
                  Confirmação final
                </p>
                <p className={`mt-1 text-sm font-bold ${
                  hasFinalReviewBlockingItems ? 'text-amber-950' : 'text-slate-800'
                }`}>
                  {hasFinalReviewBlockingItems
                    ? 'Aceite as confirmações abaixo para liberar a criação da loja.'
                    : 'Revise e aceite para receber o código no e-mail.'}
                </p>
              </div>
              <label
                className={`create-store-check-card ${
                  missingFields.termsAccepted
                    ? '!border-rose-300 !bg-rose-50/92 ring-4 ring-rose-200/60 shadow-[0_20px_42px_-30px_rgba(225,29,72,0.45)]'
                    : ''
                }`}
              >
                <input
                  type="checkbox"
                  data-create-field="termsAccepted"
                  checked={termsAccepted}
                  onChange={(e) => {
                    clearMissingField('termsAccepted');
                    setTermsAccepted(e.target.checked);
                  }}
                  ref={termsCheckboxRef}
                  className="mt-1 h-5 w-5 accent-[#0d4f66]"
                />
                <span className="space-y-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-black text-slate-900">
                    Aceitar os termos de uso
                    {missingFields.termsAccepted ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-rose-700">
                        Obrigatório
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-sm font-medium leading-relaxed text-slate-600">
                    Li e aceito os{' '}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="text-[#0d4f66] font-black hover:underline"
                  >
                    termos de uso
                  </button>{' '}
                  da plataforma.
                  </span>
                </span>
              </label>
              <label
                className={`create-store-check-card ${
                  missingFields.lgpdAccepted
                    ? '!border-rose-300 !bg-rose-50/92 ring-4 ring-rose-200/60 shadow-[0_20px_42px_-30px_rgba(225,29,72,0.45)]'
                    : ''
                }`}
              >
                <input
                  type="checkbox"
                  data-create-field="lgpdAccepted"
                  checked={lgpdAccepted}
                  onChange={(e) => {
                    clearMissingField('lgpdAccepted');
                    setLgpdAccepted(e.target.checked);
                  }}
                  className="mt-1 h-5 w-5 accent-[#0d4f66]"
                />
                <span className="space-y-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-black text-slate-900">
                    Aceitar a política de privacidade
                    {missingFields.lgpdAccepted ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-rose-700">
                        Obrigatório
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-sm font-medium leading-relaxed text-slate-600">
                    Concordo com o tratamento de dados pessoais conforme a LGPD e a{' '}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="text-[#0d4f66] font-black hover:underline"
                  >
                    política de privacidade
                  </button>
                  .
                </span>
                </span>
              </label>
            </div>

            <div className="fixed bottom-0 left-0 z-50 w-full rounded-t-[1.6rem] border border-b-0 border-white/70 bg-white/92 p-2.5 pb-[max(env(safe-area-inset-bottom),0.25rem)] shadow-[0_-24px_70px_-34px_rgba(15,23,42,0.6)] backdrop-blur-xl md:static md:rounded-2xl md:border md:border-slate-200/90 md:p-3 md:shadow-[0_24px_46px_-30px_rgba(15,23,42,0.55)]">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="hidden sm:block text-[11px] text-slate-500">
                  Passo <span className="font-semibold text-slate-700">{currentStep}/4</span> — quase lá!
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollToStep(Math.max(1, currentStep - 1))}
                    disabled={currentStep === 1}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.55)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed sm:flex-none"
                  >
                    Voltar
                  </button>
                  {currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={isPreflightingOwner}
                      className="flex-[1.4] rounded-2xl bg-[linear-gradient(135deg,#0f3b53,#0d4f66,#2c8c9f)] px-4 py-3 text-sm font-black text-white shadow-[0_22px_42px_-24px_rgba(15,59,83,0.65)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed sm:flex-none"
                    >
                      {isPreflightingOwner ? 'Validando...' : 'Continuar →'}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="flex-[1.4] rounded-2xl bg-[linear-gradient(135deg,#0f3b53,#0d4f66,#2c8c9f)] px-4 py-3 text-sm font-black text-white shadow-[0_22px_42px_-24px_rgba(15,59,83,0.65)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed sm:flex-none"
                    >
                      {isRegistering ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Criando loja...
                        </span>
                      ) : (
                        'Ativar minha loja grátis'
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
        <aside className="hidden xl:block sticky top-28">
          {previewPanel}
        </aside>
        </div>
      </main>
      {storeVerifyPrompt ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:px-4 sm:py-6">
          <div className="flex max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] w-full max-w-md flex-col overflow-hidden rounded-[2rem] border border-white/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] shadow-[0_36px_120px_-28px_rgba(15,23,42,0.55)]">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0f3b53_0%,#0d4f66_55%,#2c8c9f_100%)] px-6 pb-6 pt-6 text-white">
              <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_68%)]" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/12 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.75)]">
                    <EnvelopeSimple size={23} weight="duotone" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/65">Ativação da loja</p>
                    <h3 className="mt-1 text-2xl font-black leading-tight tracking-[-0.03em]">Confirme seu e-mail</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/80">
                      Enviamos um código de 4 dígitos no e-mail{' '}
                      <span className="font-black text-white">{storeVerifyPrompt.emailMasked || storeVerifyPrompt.email}</span>
                      {' '}para ativar sua loja.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStoreVerifyPrompt(null)}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80 transition hover:bg-white/16"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="space-y-5 overflow-y-auto px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5">
              <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex items-center justify-between gap-2">
                  {storeCodeDigits.map((digit, index) => (
                    <input
                      key={index}
                      id={`store-otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      value={digit}
                      onChange={(e) => handleStoreCodeDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleStoreCodeKeyDown(index, e)}
                      onPaste={handleStoreCodePaste}
                      className="h-16 w-14 rounded-2xl border border-slate-200 bg-slate-50 text-center text-2xl font-black tracking-[0.1em] text-slate-900 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.5)] outline-none transition focus:border-[#0d4f66] focus:bg-white focus:ring-4 focus:ring-[#0d4f66]/10 sm:w-16"
                    />
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2.5 text-[11px] font-semibold leading-relaxed text-slate-500">
                  O código expira em 30 minutos. Se não recebeu, toque em <span className="font-black text-slate-700">Reenviar código</span>.
                </div>
              </div>

              {storeVerifyError ? (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700 shadow-[0_12px_30px_-24px_rgba(225,29,72,0.65)] animate-in fade-in slide-in-from-top-1 duration-150">
                  <WarningCircle size={18} weight="fill" />
                  <span>{storeVerifyError}</span>
                </div>
              ) : null}
              {storeVerifyMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">
                  {storeVerifyMessage}
                </div>
              ) : null}

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={handleVerifyStoreCode}
                  disabled={storeVerificationCode.length !== 4 || storeCodeLoading}
                  className="rounded-2xl bg-[linear-gradient(135deg,#0f3b53,#0d4f66,#2c8c9f)] px-4 py-3.5 text-sm font-black text-white shadow-[0_24px_50px_-24px_rgba(15,59,83,0.55)] transition active:scale-[0.99] disabled:opacity-60"
                >
                  {storeCodeLoading ? 'Validando código...' : 'Confirmar agora'}
                </button>
                <button
                  type="button"
                  onClick={handleResendStoreCode}
                  disabled={storeResendLoading || storeResendCooldown > 0 || !storeVerifyPrompt.email}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {storeResendLoading ? 'Reenviando...' : storeResendCooldown > 0 ? `Reenviar em ${storeResendCooldown}s` : 'Reenviar código'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {showTerms && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <img src={platformLogo} alt="Já no Caminho" className="w-full h-full object-contain p-1" />
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
                <h3 className="text-base font-semibold text-slate-900">1. Natureza do Serviço</h3>
                <p>A Plataforma atua como intermediador tecnológico, disponibilizando ferramentas para que estabelecimentos ofereçam seus produtos e serviços. Não preparamos, vendemos, entregamos nem somos responsáveis pelos produtos comercializados pelas Lojas.</p>
              </section>
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">2. Responsabilidade do Estabelecimento</h3>
                <p>As Lojas parceiras são independentes e únicas responsáveis pelos produtos, qualidade do atendimento, cumprimento de normas sanitárias, fiscais e legais. A relação com a Plataforma é de prestação de serviço tecnológico, sem vínculo trabalhista ou societário.</p>
              </section>
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">3. Entregadores e Operação de Entrega</h3>
                <p>Entregadores cadastrados são profissionais independentes vinculados a estabelecimentos mediante aprovação do próprio estabelecimento. A plataforma disponibiliza ferramentas de cadastro e validação inicial de apoio. Não existe vínculo empregatício entre a plataforma e os entregadores.</p>
              </section>
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">4. Pagamentos e Reembolsos</h3>
                <p>A Plataforma utiliza gateways de terceiros (Mercado Pago). O lojista conecta sua própria conta e recebe diretamente. A plataforma não cobra comissão por pedido — apenas mensalidade. Reembolsos são processados pelo estabelecimento quando aplicável.</p>
              </section>
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">5. LGPD e Privacidade</h3>
                <p>Dados pessoais são tratados para cadastro, autenticação, cobrança e suporte, conforme a LGPD. Para entregadores, coletamos adicionalmente documentos (CNH, selfie, CRLV) com base no consentimento do titular. O usuário pode solicitar exclusão de dados a qualquer momento.</p>
              </section>
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">6. Cadastro e Uso Adequado</h3>
                <p>Informações fornecidas devem ser verdadeiras e atualizadas. É proibido utilizar a plataforma para fins ilegais ou fraudulentos. Contas em desacordo podem ser suspensas sem aviso prévio.</p>
              </section>
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">7. Termos Completos</h3>
                <p>Estes são os pontos principais. Os termos completos, incluindo isenção de responsabilidade, foro e modificações, estão disponíveis em <a href="/terms" target="_blank" className="text-brand-primary underline font-semibold">janocaminho.com.br/terms</a>.</p>
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
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/55 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:py-6">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] shadow-[0_36px_100px_-30px_rgba(15,23,42,0.6)]">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0f3b53_0%,#0d4f66_58%,#2c8c9f_100%)] px-6 pb-6 pt-6 text-white">
              <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_68%)]" />
              <div className="relative flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/12 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.75)]">
                  <WarningCircle size={28} weight="duotone" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/65">Revisão final</p>
                  <h3 className="mt-2 text-xl font-black leading-tight tracking-[-0.03em]">
                    Falta pouco para publicar
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/78">
                    {validationMessage || 'Confira os campos obrigatórios antes de continuar.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div
                className={`rounded-2xl border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${
                  validationItems.length
                    ? 'border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,255,255,0.96))]'
                    : 'border-slate-200 bg-white/82'
                }`}
              >
                <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${
                  validationItems.length ? 'text-amber-700' : 'text-slate-500'
                }`}>
                  {validationItems.length ? 'Ação obrigatória' : 'Antes de continuar'}
                </p>
                <p className={`mt-1 text-sm font-semibold leading-relaxed ${
                  validationItems.length ? 'text-amber-950' : 'text-slate-700'
                }`}>
                  {currentStep === 4
                    ? 'Sua loja só é criada depois que essas confirmações forem aceitas.'
                    : 'Corrija os pontos abaixo para continuar no cadastro.'}
                </p>
                {validationItems.length ? (
                  <ul className="mt-3 space-y-2">
                    {validationItems.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-white/92 px-3 py-3 text-sm font-semibold leading-relaxed text-amber-950"
                      >
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {(currentStep === 4 || missingFields.termsAccepted || missingFields.lgpdAccepted || missingFields.plan) ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm font-semibold leading-relaxed text-rose-800 shadow-[0_18px_36px_-30px_rgba(225,29,72,0.45)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-600">Publicação bloqueada</p>
                  <p className="mt-1">
                    Se estiver no passo de plano, marque os termos de uso e a política de privacidade. O cadastro só cria a loja depois dessa confirmação.
                  </p>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setShowValidationModal(false);
                  const priorityField =
                    Object.keys(missingFields)[0] ||
                    (currentStep === 4 ? 'termsAccepted' : '');
                  if (priorityField) {
                    focusCreateStoreField(priorityField);
                    return;
                  }
                  if (currentStep === 4 && termsRef.current) {
                    window.setTimeout(() => termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
                  }
                }}
                className="w-full rounded-2xl bg-[linear-gradient(135deg,#0f3b53,#0d4f66,#2c8c9f)] px-4 py-3.5 text-sm font-black text-white shadow-[0_22px_44px_-24px_rgba(15,59,83,0.65)] transition active:scale-[0.99]"
              >
                Corrigir agora
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes createStoreStepIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}



