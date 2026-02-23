import { useEffect, useMemo, useState } from 'react';
import { LinkSimpleHorizontal, Storefront, ClockClockwise, CheckCircle, ShieldCheck, ShieldWarning, Clock, Info, IdentificationCard, Camera, Car } from '@phosphor-icons/react';
import { motoboyService } from '../services/motoboyService';
import { storeService } from '../services/storeService';
import { orderService } from '../services/orderService';
import { useToast } from '../contexts/ToastContext';
import { MotoboyHeader } from '../components/Motoboy/MotoboyHeader';
import { CameraCaptureModal } from '../components/Motoboy/CameraCaptureModal';
import { DocPreviewModal } from '../components/Motoboy/DocPreviewModal';
import { formatMotoboyAccountStatus } from '../utils/motoboyStatus';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { AdaptiveAvatar } from '../components/common/AdaptiveAvatar';
import { PremiumTabs } from '../components/common/PremiumTabs';
import { FormSection } from '../components/common/FormSection';

const faceReasonLabel = (reason?: string | null) => {
  const code = String(reason || '').trim().toLowerCase();
  if (!code) return null;
  if (code === 'no_face_selfie') return 'Não foi possível detectar seu rosto na selfie.';
  if (code === 'multi_face_selfie') return 'Detectamos mais de um rosto na selfie. Tire a foto sozinho.';
  if (code === 'no_face_doc') return 'Não foi possível detectar o rosto na CNH. Aproxime o documento e evite reflexo.';
  if (code === 'low_match') return 'A selfie não conferiu com a foto da CNH.';
  if (code === 'medium_match') return 'Conferência parcial entre selfie e CNH. Envie uma foto mais nítida.';
  if (code === 'timeout') return 'A validação demorou demais. Tente reenviar.';
  if (code === 'fetch failed' || code === 'fetch_failed') return 'Falha de conexão na validação. Tente novamente.';
  if (code === 'rate_limited') return 'Limite de tentativas atingido. Aguarde para tentar de novo.';
  return 'Não foi possível validar automaticamente. Reenvie uma foto mais nítida.';
};

export function MotoboyProfile() {
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [refreshingDocs, setRefreshingDocs] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState('');
  const [profileDraft, setProfileDraft] = useState<any>({
    vehicleType: '',
    vehiclePlate: '',
    vehicleModel: '',
    vehicleColor: '',
    cnhNumber: '',
    cnhCategory: '',
    cnhExpiresAt: '',
    city: '',
    state: '',
    address: '',
    pixKey: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraDocType, setCameraDocType] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ title: string; src: string | null } | null>(null);
  const [showRequestBlockedModal, setShowRequestBlockedModal] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'documents' | 'stores' | 'notifications' | 'payouts'>('profile');
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewStats, setReviewStats] = useState<{
    avgDeliveryRating: number;
    totalReviews: number;
    totalTips: number;
    storesMeasured: number;
  }>({
    avgDeliveryRating: 0,
    totalReviews: 0,
    totalTips: 0,
    storesMeasured: 0,
  });
  const [tipPayouts, setTipPayouts] = useState<any[]>([]);
  const [tipPayoutsLoading, setTipPayoutsLoading] = useState(false);
  // Face verification is an internal signal; keep UI friendly (no raw status/reason for motoboys).
  const [notifyOrders, setNotifyOrders] = useState(() => {
    const raw = localStorage.getItem('motoboy:notify_orders');
    if (raw === null) return true;
    return raw === '1';
  });
  const { showToast } = useToast();

  const BRAZIL_UF: Array<{ uf: string; name: string }> = [
    { uf: 'AC', name: 'Acre' },
    { uf: 'AL', name: 'Alagoas' },
    { uf: 'AP', name: 'Amapá' },
    { uf: 'AM', name: 'Amazonas' },
    { uf: 'BA', name: 'Bahia' },
    { uf: 'CE', name: 'Ceará' },
    { uf: 'DF', name: 'Distrito Federal' },
    { uf: 'ES', name: 'Espírito Santo' },
    { uf: 'GO', name: 'Goiás' },
    { uf: 'MA', name: 'Maranhão' },
    { uf: 'MT', name: 'Mato Grosso' },
    { uf: 'MS', name: 'Mato Grosso do Sul' },
    { uf: 'MG', name: 'Minas Gerais' },
    { uf: 'PA', name: 'Pará' },
    { uf: 'PB', name: 'Paraíba' },
    { uf: 'PR', name: 'Paraná' },
    { uf: 'PE', name: 'Pernambuco' },
    { uf: 'PI', name: 'Piauí' },
    { uf: 'RJ', name: 'Rio de Janeiro' },
    { uf: 'RN', name: 'Rio Grande do Norte' },
    { uf: 'RS', name: 'Rio Grande do Sul' },
    { uf: 'RO', name: 'Rondônia' },
    { uf: 'RR', name: 'Roraima' },
    { uf: 'SC', name: 'Santa Catarina' },
    { uf: 'SP', name: 'São Paulo' },
    { uf: 'SE', name: 'Sergipe' },
    { uf: 'TO', name: 'Tocantins' },
  ];

  const VEHICLE_COLORS = [
    'Preta',
    'Branca',
    'Prata',
    'Cinza',
    'Vermelha',
    'Azul',
    'Verde',
    'Amarela',
    'Marrom',
    'Outra',
  ];

  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesByUf, setCitiesByUf] = useState<Record<string, string[]>>({});
  const [citiesFetchError, setCitiesFetchError] = useState<string | null>(null);

  const documentTypes = useMemo(() => {
    const v = String(profileDraft.vehicleType || profile?.vehicleType || '').toUpperCase();
    const crlvHelp =
      v === 'MOTO' || v === 'CARRO' || v === 'OUTRO'
        ? 'Obrigatório para validar o veículo.'
        : 'Opcional.';
    return [
      { key: 'CNH', label: 'CNH', help: 'Foto frente e verso em um único arquivo.' },
      { key: 'SELFIE', label: 'Selfie segurando a CNH', help: 'Foto clara do rosto com o documento.' },
      { key: 'CRLV', label: 'Documento do veículo (CRLV)', help: crlvHelp },
    ];
  }, [profileDraft.vehicleType, profile?.vehicleType]);
  const requiredDocs = useMemo(() => {
    const v = String(profileDraft.vehicleType || profile?.vehicleType || '').toUpperCase();
    const base = [ 'CNH', 'SELFIE' ];
    if (v === 'MOTO' || v === 'CARRO' || v === 'OUTRO') return [ ...base, 'CRLV' ];
    return base;
  }, [profileDraft.vehicleType, profile?.vehicleType]);

  useEffect(() => {
    const loadStores = async () => {
      try {
        const data = await storeService.listPortfolio();
        setStores(Array.isArray(data) ? data : []);
      } catch (error: any) {
        showToast(error?.message || 'Não foi possível carregar lojas.', 'error');
      }
    };
    loadStores();
  }, [showToast]);

  const loadRequests = async () => {
    try {
      const data = await motoboyService.listStoreRequests();
      setRequests(Array.isArray(data) ? data : []);
      setBlocked(false);
    } catch (error: any) {
      if (error?.status === 403) setBlocked(true);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    // initial load
    (async () => {
      try {
        const data = await motoboyService.listDocuments();
        setDocuments(Array.isArray(data) ? data : []);
      } catch {
        // ignore
      }
    })();
  }, []);

  const refreshDocuments = async () => {
    setRefreshingDocs(true);
    try {
      const data = await motoboyService.listDocuments();
      setDocuments(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setRefreshingDocs(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await motoboyService.getProfile();
        setProfile(data || null);
        const profileImageUrl = String(data?.user?.profileImageUrl || '').trim();
        setProfileImagePreview(profileImageUrl ? resolveAssetUrl(profileImageUrl) || '' : '');
        setProfileDraft({
          vehicleType: data?.vehicleType || '',
          vehiclePlate: data?.vehiclePlate || '',
          vehicleModel: data?.vehicleModel || '',
          vehicleColor: data?.vehicleColor || '',
          cnhNumber: data?.cnhNumber || '',
          cnhCategory: data?.cnhCategory || '',
          cnhExpiresAt: data?.cnhExpiresAt || '',
          city: data?.city || '',
          state: data?.state || '',
          address: data?.address || '',
          pixKey: data?.pixKey || '',
        });
      } catch {
        // ignore
      }
    };
    loadProfile();
  }, []);

  const documentsByType = useMemo(() => {
    const map = new Map<string, any>();
    documents.forEach((doc) => {
      const key = (doc.docType || '').toUpperCase();
      if (!map.has(key)) map.set(key, doc);
    });
    return map;
  }, [documents]);

  const shouldPollDocs = useMemo(() => {
    if (!Array.isArray(documents) || documents.length === 0) return false;
    const anyPending = documents.some((d) => String(d?.status || '').toUpperCase() === 'PENDING');
    if (anyPending) return true;
    const selfie = documentsByType.get('SELFIE');
    const faceStatus = String(selfie?.metadata?.face?.status || '').toLowerCase();
    return faceStatus === 'pending' || faceStatus === 'processing';
  }, [documents, documentsByType]);

  const selectedUf = useMemo(() => String(profileDraft.state || profile?.state || '').trim().toUpperCase(), [profileDraft.state, profile?.state]);
  const availableCities = useMemo(() => {
    if (!selectedUf) return [];
    return citiesByUf[selectedUf] || [];
  }, [citiesByUf, selectedUf]);

  useEffect(() => {
    if (!selectedUf) return;
    if (citiesByUf[selectedUf]?.length) return;

    const controller = new AbortController();
    (async () => {
      setCitiesLoading(true);
      setCitiesFetchError(null);
      try {
        const resp = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUf}/municipios?orderBy=nome`,
          { signal: controller.signal }
        );
        if (!resp.ok) throw new Error('fetch_failed');
        const data = await resp.json();
        const list = Array.isArray(data) ? data.map((x: any) => String(x?.nome || '').trim()).filter(Boolean) : [];
        setCitiesByUf((prev) => ({ ...prev, [selectedUf]: list }));
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setCitiesFetchError('Não foi possível carregar a lista de cidades agora.');
      } finally {
        setCitiesLoading(false);
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUf]);

  useEffect(() => {
    if (!shouldPollDocs) return;
    const id = window.setInterval(() => {
      refreshDocuments().catch(() => null);
    }, 10000);
    return () => window.clearInterval(id);
  }, [shouldPollDocs]);

  const requiredDocStatus = useMemo(() => {
    const missing: string[] = [];
    const rejected: string[] = [];
    const pending: string[] = [];
    const approved: string[] = [];
    for (const key of requiredDocs) {
      const doc = documentsByType.get(key);
      if (!doc) {
        missing.push(key);
        continue;
      }
      const st = String(doc?.status || '').toUpperCase();
      if (st === 'REJECTED') rejected.push(key);
      else if (st === 'PENDING') pending.push(key);
      else if (st === 'APPROVED') approved.push(key);
      else pending.push(key);
    }
    return { missing, rejected, pending, approved };
  }, [documentsByType, requiredDocs]);

  const docsProgress = useMemo(() => {
    const total = requiredDocs.length;
    const approved = requiredDocStatus.approved.length;
    const pending = requiredDocStatus.pending.length;
    const rejected = requiredDocStatus.rejected.length;
    const missing = requiredDocStatus.missing.length;
    return { total, approved, pending, rejected, missing };
  }, [requiredDocs.length, requiredDocStatus]);

  const hasAllRequiredDocs = useMemo(() => requiredDocStatus.missing.length === 0, [requiredDocStatus.missing.length]);

  const hasAnyPendingRequiredDocs = useMemo(() => {
    return requiredDocStatus.pending.length > 0;
  }, [requiredDocStatus.pending.length]);

  const hasAnyRejectedRequiredDocs = useMemo(() => requiredDocStatus.rejected.length > 0, [requiredDocStatus.rejected.length]);

  const hasCompleteProfile = useMemo(() => {
    const v = String(profileDraft.vehicleType || profile?.vehicleType || '').toUpperCase();
    const plate = String(profileDraft.vehiclePlate || profile?.vehiclePlate || '').trim();
    const model = String(profileDraft.vehicleModel || profile?.vehicleModel || '').trim();
    const color = String(profileDraft.vehicleColor || profile?.vehicleColor || '').trim();
    const cnhCategory = String(profileDraft.cnhCategory || profile?.cnhCategory || '').toUpperCase().replace(/[^A-Z]/g, '');
    const city = String(profileDraft.city || profile?.city || '').trim();
    const state = String(profileDraft.state || profile?.state || '').trim();
    const address = String(profileDraft.address || profile?.address || '').trim();
    if (!v) return false;
    if ((v === 'MOTO' || v === 'CARRO' || v === 'OUTRO') && plate.length < 7) return false;
    if (v === 'MOTO' || v === 'CARRO' || v === 'OUTRO') {
      if (!model) return false;
      if (!color) return false;
    }
    if (v === 'MOTO' && !cnhCategory.includes('A')) return false;
    if (!city || !state || state.length !== 2 || !address) return false;
    return true;
  }, [profileDraft, profile]);

  const requiredDocsPending = useMemo(() => {
    return requiredDocs.filter((key) => {
      const doc = documentsByType.get(key);
      return !doc || String(doc.status || '').toUpperCase() !== 'APPROVED';
    });
  }, [documentsByType, requiredDocs]);

  const faceBanner = useMemo(() => {
    const selfie = documentsByType.get('SELFIE');
    const selfieDocStatus = String(selfie?.status || '').toUpperCase();
    const face = selfie?.metadata?.face;

    // Source of truth: document status approved by platform.
    // If approved, do not keep showing "processing" from stale metadata.
    if (selfieDocStatus === 'APPROVED') {
      return {
        tone: 'emerald' as const,
        icon: <ShieldCheck size={18} weight="duotone" />,
        title: 'Verificação concluída',
        subtitle: 'Sua selfie foi aprovada pela plataforma.',
      };
    }

    if (selfieDocStatus === 'REJECTED') {
      return {
        tone: 'rose' as const,
        icon: <ShieldWarning size={18} weight="duotone" />,
        title: 'Verificação recusada',
        subtitle: 'Reenvie uma selfie nítida segurando a CNH.',
      };
    }

    if (!face) return null;
    const status = String(face.status || '').toLowerCase();
    const label = String(face.scoreLabel || '').toLowerCase();
    // Do not expose raw reason/status to end users.

    if (status === 'processing' || status === 'pending') {
      return {
        tone: 'amber' as const,
        icon: <Clock size={18} weight="duotone" />,
        title: 'Verificação automática em andamento',
        subtitle: 'Estamos conferindo sua selfie com o documento.',
        // details intentionally omitted
      };
    }

    if (label === 'alto') {
      return {
        tone: 'emerald' as const,
        icon: <ShieldCheck size={18} weight="duotone" />,
        title: 'Identidade conferida',
        subtitle: 'Sua selfie bate com o documento.',
        // details intentionally omitted
      };
    }

    if (label === 'medio') {
      return {
        tone: 'amber' as const,
        icon: <Info size={18} weight="duotone" />,
        title: 'Identidade provável',
        subtitle: 'Se a foto estiver boa, a plataforma deve aprovar em breve.',
        // details intentionally omitted
      };
    }

    if (label === 'baixo') {
      return {
        tone: 'rose' as const,
        icon: <ShieldWarning size={18} weight="duotone" />,
        title: 'Precisa de revisão',
        subtitle: 'A selfie pode estar ruim ou não conferir. Se for o caso, reenvie uma foto melhor.',
        // details intentionally omitted
      };
    }

    if (status) {
      return {
        tone: 'slate' as const,
        icon: <Info size={18} weight="duotone" />,
        title: 'Verificação automática em pausa',
        subtitle: 'Sem problemas: a equipe da plataforma vai revisar seus documentos.',
        // details intentionally omitted
      };
    }

    return null;
  }, [documentsByType]);

  const requestByStoreId = useMemo(() => {
    // Backend is expected to return latest first; keep first request per store to avoid duplicates.
    const map = new Map<string, any>();
    (requests || []).forEach((r: any) => {
      const storeId = String(r?.storeId || r?.store?.id || '');
      if (!storeId) return;
      if (map.has(storeId)) return;
      map.set(storeId, r);
    });
    return map;
  }, [requests]);

  const storeById = useMemo(() => {
    const map = new Map<string, any>();
    (stores || []).forEach((s: any) => {
      if (!s?.id) return;
      map.set(String(s.id), s);
    });
    return map;
  }, [stores]);

  const linkedStoreIds = useMemo(() => {
    const ids: string[] = [];
    requestByStoreId.forEach((req, storeId) => {
      const st = String(req?.status || '').toUpperCase();
      if (st === 'APPROVED' && Boolean(req?.linkActive)) ids.push(storeId);
    });
    return ids;
  }, [requestByStoreId]);

  const pendingStoreIds = useMemo(() => {
    const ids: string[] = [];
    requestByStoreId.forEach((req, storeId) => {
      const st = String(req?.status || '').toUpperCase();
      if (st === 'PENDING') ids.push(storeId);
    });
    return ids;
  }, [requestByStoreId]);

  const rejectedOrInactiveStoreIds = useMemo(() => {
    const ids: string[] = [];
    requestByStoreId.forEach((req, storeId) => {
      const st = String(req?.status || '').toUpperCase();
      const inactive = st === 'APPROVED' && !Boolean(req?.linkActive);
      if (st === 'REJECTED' || inactive) ids.push(storeId);
    });
    return ids;
  }, [requestByStoreId]);

  const requestableStores = useMemo(() => {
    return (stores || []).filter((s: any) => {
      const storeId = String(s?.id || '');
      if (!storeId) return false;
      if (linkedStoreIds.includes(storeId)) return false;
      if (pendingStoreIds.includes(storeId)) return false;
      return true;
    });
  }, [stores, linkedStoreIds, pendingStoreIds]);

  const resolveStoreLogo = (store: any, fallbackStore?: any) => {
    const raw =
      String(store?.settings?.logoUrl || '') ||
      String(store?.logoUrl || '') ||
      String(fallbackStore?.settings?.logoUrl || '') ||
      String(fallbackStore?.logoUrl || '');
    if (!raw) return '';
    return resolveAssetUrl(raw) || raw;
  };

  const getStoreInitials = (store: any, fallbackStore?: any) => {
    const baseName = String(store?.name || store?.slug || fallbackStore?.name || fallbackStore?.slug || 'Loja');
    const initials = baseName
      .split(' ')
      .map((part) => part.trim()[0] || '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return initials || 'LJ';
  };

  const motoboyIdentity = useMemo(() => {
    const ids = [
      profile?.id,
      profile?.motoboyId,
      profile?.userId,
      profile?.user?.id,
    ]
      .map((v) => String(v || '').trim())
      .filter(Boolean);
    return new Set(ids);
  }, [profile?.id, profile?.motoboyId, profile?.userId, profile?.user?.id]);

  const loadReviewStats = async () => {
    if (!linkedStoreIds.length || motoboyIdentity.size === 0) {
      setReviewStats({
        avgDeliveryRating: 0,
        totalReviews: 0,
        totalTips: 0,
        storesMeasured: 0,
      });
      return;
    }
    setReviewsLoading(true);
    try {
      const summaries = await Promise.all(
        linkedStoreIds.map(async (storeId) => {
          try {
            const data = await orderService.getReviewSummaryByStore(storeId);
            const rows = Array.isArray(data?.motoboy) ? data.motoboy : [];
            const byIdentity = rows.find((row: any) => {
              const rowIds = [
                row?.motoboyId,
                row?.motoboyUserId,
                row?.userId,
                row?.id,
              ]
                .map((v: any) => String(v || '').trim())
                .filter(Boolean);
              return rowIds.some((id: string) => motoboyIdentity.has(id));
            });
            return byIdentity || null;
          } catch {
            return null;
          }
        })
      );

      const validRows = summaries.filter(Boolean) as any[];
      const totalReviews = validRows.reduce(
        (acc, row) => acc + Number(row?.totalReviews || row?.total_reviews || 0),
        0
      );
      const weightedRatingSum = validRows.reduce((acc, row) => {
        const avg = Number(row?.avgDeliveryRating || row?.delivery_avg_rating || 0);
        const qty = Number(row?.totalReviews || row?.total_reviews || 0);
        return acc + avg * qty;
      }, 0);
      const totalTips = validRows.reduce(
        (acc, row) => acc + Number(row?.totalTips || row?.total_tips || 0),
        0
      );
      const avgDeliveryRating = totalReviews > 0 ? weightedRatingSum / totalReviews : 0;

      setReviewStats({
        avgDeliveryRating,
        totalReviews,
        totalTips,
        storesMeasured: validRows.length,
      });
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    loadReviewStats();
  }, [linkedStoreIds.join('|'), profile?.id, profile?.motoboyId, profile?.user?.id]);

  const loadTipPayouts = async () => {
    setTipPayoutsLoading(true);
    try {
      const rows = await motoboyService.listTipPayouts(300);
      setTipPayouts(Array.isArray(rows) ? rows : []);
    } catch {
      setTipPayouts([]);
    } finally {
      setTipPayoutsLoading(false);
    }
  };

  const formatCurrency = (value: any) =>
    Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDateTime = (value: any) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('pt-BR');
  };

  const payoutStats = useMemo(() => {
    const rows = Array.isArray(tipPayouts) ? tipPayouts : [];
    const paid = rows.filter((row: any) => String(row?.tipPayoutStatus || '').toUpperCase() === 'PAID');
    const pending = rows.filter((row: any) => String(row?.tipPayoutStatus || '').toUpperCase() !== 'PAID');
    const paidAmount = paid.reduce((acc: number, row: any) => acc + Number(row?.tipAmount || 0), 0);
    const pendingAmount = pending.reduce((acc: number, row: any) => acc + Number(row?.tipAmount || 0), 0);
    return {
      total: rows.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      paidAmount,
      pendingAmount,
    };
  }, [tipPayouts]);

  useEffect(() => {
    loadTipPayouts();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      loadTipPayouts().catch(() => null);
    }, 15000);
    return () => window.clearInterval(id);
  }, []);

  const vehicleIcon = useMemo(() => {
    const type = String(profileDraft.vehicleType || profile?.vehicleType || '').toUpperCase();
    if (type === 'MOTO') return '🛵';
    if (type === 'BIKE') return '🚲';
    if (type === 'CARRO') return '🚗';
    if (type === 'OUTRO') return '🚚';
    return '🧭';
  }, [profileDraft.vehicleType, profile?.vehicleType]);

	  const canStartUpload = (docType: string) => {
	    const normalized = String(docType || '').toUpperCase();
	    const currentDoc = documentsByType.get(normalized);
	    const currentStatus = String(currentDoc?.status || '').toUpperCase();
	    const cnhDoc = documentsByType.get('CNH');
	    const cnhStatus = String(cnhDoc?.status || '').toUpperCase();
	    const storeReuploadRequests = currentDoc?.metadata?.review?.storeReuploadRequests || null;
	    const reuploadRequested =
	      Boolean(storeReuploadRequests) &&
	      typeof storeReuploadRequests === 'object' &&
	      Object.keys(storeReuploadRequests).length > 0;

	    if (normalized === 'SELFIE' && (!cnhDoc || cnhStatus === 'REJECTED')) return false;
	    if (currentDoc && (currentStatus === 'PENDING' || (currentStatus === 'APPROVED' && !reuploadRequested))) return false;
	    return true;
	  };

  const uploadDocumentBase64 = async (docType: string, fileBase64: string) => {
    setUploading(true);
    try {
      await motoboyService.uploadDocument({ docType, fileBase64 });
      showToast(`${docType} enviado. Aguarde aprovação.`, 'success');
      setDocFiles((prev) => ({ ...prev, [docType]: null }));
      const data = await motoboyService.listDocuments();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível enviar o documento.', 'error');
    } finally {
      setUploading(false);
    }
  };

	  const handleUploadDocument = async (docType: string) => {
	    const normalized = String(docType || '').toUpperCase();
	    const currentDoc = documentsByType.get(normalized);
	    const currentStatus = String(currentDoc?.status || '').toUpperCase();
	    const cnhDoc = documentsByType.get('CNH');
	    const cnhStatus = String(cnhDoc?.status || '').toUpperCase();
	    const storeReuploadRequests = currentDoc?.metadata?.review?.storeReuploadRequests || null;
	    const reuploadRequested =
	      Boolean(storeReuploadRequests) &&
	      typeof storeReuploadRequests === 'object' &&
	      Object.keys(storeReuploadRequests).length > 0;

    // Enforce order: CNH first, then SELFIE. Also lock uploads once sent (pending/approved).
    if (normalized === 'SELFIE' && (!cnhDoc || cnhStatus === 'REJECTED')) {
      showToast('Envie a CNH primeiro e depois envie a selfie segurando a CNH.', 'error');
      return;
    }
	    if (currentDoc && (currentStatus === 'PENDING' || (currentStatus === 'APPROVED' && !reuploadRequested))) {
	      showToast('Documento já enviado. Aguarde a validação.', 'info');
	      return;
	    }

    const file = docFiles[docType];
    if (!file) {
      showToast('Selecione um arquivo para enviar.', 'error');
      return;
    }

    const label = documentTypes.find((d) => d.key === normalized)?.label || normalized;
    if (!window.confirm(`Confirma que este arquivo é: ${label}?`)) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      const fileBase64: string = await new Promise((resolve, reject) => {
        reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(file);
      });
      await uploadDocumentBase64(docType, fileBase64);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível enviar o documento.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const openCamera = (docType: string) => {
    if (!canStartUpload(docType)) {
      showToast('Documento já enviado. Aguarde a validação.', 'info');
      return;
    }
    const normalized = String(docType || '').toUpperCase();
    const cnhDoc = documentsByType.get('CNH');
    const cnhStatus = String(cnhDoc?.status || '').toUpperCase();
    if (normalized === 'SELFIE' && (!cnhDoc || cnhStatus === 'REJECTED')) {
      showToast('Envie a CNH primeiro e depois envie a selfie segurando a CNH.', 'error');
      return;
    }
    setCameraDocType(docType);
    setCameraOpen(true);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      let profileImageFileBase64: string | null = null;
      if (profileImageFile) {
        const reader = new FileReader();
        profileImageFileBase64 = await new Promise((resolve, reject) => {
          reader.onerror = () => reject(new Error('Falha ao ler a foto do perfil.'));
          reader.onload = () => resolve(String(reader.result || ''));
          reader.readAsDataURL(profileImageFile);
        });
      }
      const updated = await motoboyService.updateProfile({
        vehicleType: profileDraft.vehicleType || null,
        vehiclePlate: profileDraft.vehiclePlate || null,
        vehicleModel: profileDraft.vehicleModel || null,
        vehicleColor: profileDraft.vehicleColor || null,
        cnhNumber: profileDraft.cnhNumber || null,
        cnhCategory: profileDraft.cnhCategory || null,
        cnhExpiresAt: profileDraft.cnhExpiresAt || null,
        city: profileDraft.city || null,
        state: profileDraft.state || null,
        address: profileDraft.address || null,
        pixKey: profileDraft.pixKey || null,
        profileImageFile: profileImageFileBase64,
      });
      setProfile(updated || null);
      const updatedProfileImageUrl = String(updated?.user?.profileImageUrl || '').trim();
      if (updatedProfileImageUrl) {
        setProfileImagePreview(resolveAssetUrl(updatedProfileImageUrl) || '');
      }
      setProfileImageFile(null);
      showToast('Perfil atualizado.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível salvar o perfil.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleProfilePhotoUpload = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => {
      showToast('Não foi possível ler a foto do perfil.', 'error');
    };
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl.startsWith('data:image/')) {
        showToast('Selecione uma imagem valida.', 'error');
        return;
      }
      setProfileImageFile(file);
      setProfileImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const toggleStore = (storeId: string) => {
    if (!canRequestAnyStore) {
      explainBlockedRequest();
      return;
    }
    setSelectedStores((prev) => {
      if (prev.includes(storeId)) return prev.filter((id) => id !== storeId);
      return [ ...prev, storeId ];
    });
  };

  const handleRequestStores = async () => {
    if (!selectedStores.length) {
      showToast('Selecione ao menos uma loja.', 'error');
      return;
    }
    setRequesting(true);
    try {
      await motoboyService.createStoreRequests(selectedStores);
      showToast('Solicitação enviada. Aguarde aprovação.', 'success');
      setSelectedStores([]);
      await loadRequests();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível enviar solicitação.', 'error');
    } finally {
      setRequesting(false);
    }
  };

  const canRequestAnyStore = useMemo(() => {
    if (!hasCompleteProfile) return false;
    if (!hasAllRequiredDocs) return false;
    if (hasAnyPendingRequiredDocs) return false;
    if (hasAnyRejectedRequiredDocs) return false;
    return true;
  }, [hasAllRequiredDocs, hasAnyPendingRequiredDocs, hasAnyRejectedRequiredDocs, hasCompleteProfile]);

  const requestBlockReasons = useMemo(() => {
    const reasons: string[] = [];
    if (!hasCompleteProfile) reasons.push('Complete os dados do perfil e veículo.');
    if (requiredDocStatus.missing.length > 0) reasons.push(`Envie os documentos faltantes: ${requiredDocStatus.missing.join(', ')}.`);
    if (requiredDocStatus.pending.length > 0) reasons.push(`Aguarde aprovação da plataforma: ${requiredDocStatus.pending.join(', ')}.`);
    if (requiredDocStatus.rejected.length > 0) reasons.push(`Reenvie os documentos recusados: ${requiredDocStatus.rejected.join(', ')}.`);
    return reasons;
  }, [hasCompleteProfile, requiredDocStatus]);

  const explainBlockedRequest = () => {
    setShowRequestBlockedModal(true);
    if (requestBlockReasons[0]) showToast(requestBlockReasons[0], 'error');
  };

  const handleRequestSingle = async (storeId: string) => {
    if (!storeId) return;
    if (!canRequestAnyStore) {
      explainBlockedRequest();
      return;
    }
    setRequesting(true);
    try {
      await motoboyService.createStoreRequests([storeId]);
      showToast('Solicitação enviada. Aguarde aprovação.', 'success');
      await loadRequests();
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível enviar solicitação.', 'error');
    } finally {
      setRequesting(false);
    }
  };

  const StoreSectionHeader = ({
    icon,
    eyebrow,
    title,
    right,
    tone,
  }: {
    icon: React.ReactNode;
    eyebrow: string;
    title: string;
    right?: React.ReactNode;
    tone: 'emerald' | 'amber' | 'slate';
  }) => {
    const bar =
      tone === 'emerald'
        ? 'from-emerald-50 via-white to-white border-emerald-200/60'
        : tone === 'amber'
        ? 'from-amber-50 via-white to-white border-amber-200/60'
        : 'from-slate-50 via-white to-white border-slate-200/60';
    const eyebrowCls = tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-600';
    return (
      <div className={`rounded-2xl border bg-gradient-to-r ${bar} px-3 py-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 overflow-hidden`}>
        <div className="min-w-0">
          <div className={`text-[10px] uppercase tracking-[0.28em] font-extrabold flex items-center gap-2 ${eyebrowCls}`}>
            <span className="opacity-90">{icon}</span>
            <span>{eyebrow}</span>
          </div>
          <div className="text-sm font-black text-slate-900">{title}</div>
        </div>
        {right ? <div className="w-full sm:w-auto sm:shrink-0">{right}</div> : null}
      </div>
    );
  };

  const EmptyHint = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl border border-slate-200 bg-white grid place-items-center text-slate-700 shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-slate-900">{title}</div>
          <div className="text-xs text-slate-600 mt-0.5">{subtitle}</div>
        </div>
      </div>
    );
  };

  const DocCard = ({
    step,
    title,
    subtitle,
    icon,
    status,
    uploadedAt,
    fileKey,
    tone,
    banner,
    primaryAction,
    secondaryAction,
    rejectedReason,
  }: {
    step: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'MISSING';
    uploadedAt?: string | null;
    fileKey?: string | null;
    tone: 'emerald' | 'amber' | 'rose' | 'slate';
    banner?: React.ReactNode;
    primaryAction?: React.ReactNode;
    secondaryAction?: React.ReactNode;
    rejectedReason?: string | null;
  }) => {
    const toneCls =
      tone === 'emerald'
        ? 'border-emerald-300 bg-emerald-50/90 shadow-[0_22px_52px_-40px_rgba(16,185,129,0.5)]'
        : tone === 'amber'
        ? 'border-amber-200 bg-amber-50/40'
        : tone === 'rose'
        ? 'border-rose-200 bg-rose-50/40'
        : 'border-slate-200 bg-slate-50/50';

    const statusPillCls =
      status === 'APPROVED'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : status === 'REJECTED'
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : status === 'PENDING'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-slate-200 bg-slate-50 text-slate-700';

    const statusLabel =
      status === 'APPROVED' ? 'Aprovado' : status === 'REJECTED' ? 'Recusado' : status === 'PENDING' ? 'Em análise' : 'Não enviado';

    return (
      <div className={`rounded-3xl border ${toneCls} p-3 sm:p-4 overflow-hidden`}>
        {status === 'APPROVED' ? <div className="h-1 w-full rounded-full bg-emerald-500/90 mb-3" /> : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl border border-slate-200 bg-white grid place-items-center shrink-0">
              {icon}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/70 border border-slate-200 text-slate-700">
                  {step}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusPillCls}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="mt-2 text-sm font-black text-slate-900">{title}</div>
              <div className="text-xs text-slate-600 mt-0.5">{subtitle}</div>
              {uploadedAt ? (
                <div className="text-[11px] text-slate-500 mt-2">
                  Enviado em {new Date(uploadedAt).toLocaleString('pt-BR')}
                </div>
              ) : null}
            </div>
          </div>
          {fileKey ? (
            <button
              type="button"
              onClick={() => setPreview({ title, src: String(fileKey || '') || null })}
              className="btn-press rounded-2xl border border-slate-200 bg-white overflow-hidden h-14 w-14 shrink-0"
              title="Abrir prévia"
            >
              <img src={fileKey} alt={title} className="h-full w-full object-cover" loading="lazy" />
            </button>
          ) : null}
        </div>

        {banner ? <div className="mt-3">{banner}</div> : null}

        {rejectedReason ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            <span className="font-extrabold">Motivo:</span> {rejectedReason}
          </div>
        ) : null}

        <div className="mt-3 grid gap-2">
          {primaryAction ? <div>{primaryAction}</div> : null}
          {secondaryAction ? <div>{secondaryAction}</div> : null}
          {fileKey ? (
            <a
              href={fileKey}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-extrabold text-brand-primary underline"
            >
              Abrir em nova aba
            </a>
          ) : null}
        </div>
      </div>
    );
  };

  const profileAccountStatus = formatMotoboyAccountStatus(profile?.status);
  const tabItems = [
    { id: 'profile', label: 'Perfil', icon: <ShieldCheck size={16} weight="duotone" /> },
    {
      id: 'documents',
      label: 'Documentos',
      icon: <IdentificationCard size={16} weight="duotone" />,
      badge:
        docsProgress.pending + docsProgress.rejected + docsProgress.missing > 0 ? (
          <span className="absolute -top-1.5 -right-1 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-black grid place-items-center">
            {docsProgress.pending + docsProgress.rejected + docsProgress.missing}
          </span>
        ) : null,
    },
    {
      id: 'stores',
      label: 'Lojas',
      icon: <Storefront size={16} weight="duotone" />,
      badge:
        pendingStoreIds.length > 0 ? (
          <span className="absolute -top-1.5 -right-1 h-4 min-w-4 px-1 rounded-full bg-sky-500 text-white text-[9px] font-black grid place-items-center">
            {pendingStoreIds.length}
          </span>
        ) : null,
    },
    {
      id: 'payouts',
      label: 'Repasses',
      icon: <ClockClockwise size={16} weight="duotone" />,
      badge:
        payoutStats.pendingCount > 0 ? (
          <span className="absolute -top-1.5 -right-1 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-black grid place-items-center">
            {payoutStats.pendingCount}
          </span>
        ) : null,
    },
    { id: 'notifications', label: 'Notificações', icon: <Info size={16} weight="duotone" /> },
  ];

  return (
    <div className="min-h-screen motoboy-screen space-y-4 overflow-x-hidden no-x-scroll">
      <MotoboyHeader title="Perfil" subtitle="Documentos, vínculo e dados do entregador." />

      <DocPreviewModal
        open={Boolean(preview)}
        title={preview?.title || 'Documento'}
        src={preview?.src || null}
        onClose={() => setPreview(null)}
      />

      {showRequestBlockedModal ? (
        <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500 font-extrabold">Solicitação bloqueada</p>
            <h3 className="mt-1 text-lg font-black text-slate-900">Ainda não é possível solicitar vínculo</h3>
            <p className="mt-1 text-sm text-slate-600">Para enviar solicitação para loja, finalize estes passos:</p>
            <div className="mt-3 space-y-2">
              {requestBlockReasons.map((reason, idx) => (
                <div key={`${idx}-${reason}`} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 font-semibold">
                  {reason}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRequestBlockedModal(false)}
                className="btn-press rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-800"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CameraCaptureModal
        open={cameraOpen}
        title={cameraDocType === 'SELFIE' ? 'Selfie segurando a CNH' : 'Foto da CNH'}
        subtitle={
          cameraDocType === 'SELFIE'
            ? 'Enquadre bem o rosto e o documento. Evite sombra e reflexo.'
            : 'Tire a FRENTE e o VERSO (o sistema junta em uma imagem só).'
        }
        mode={cameraDocType === 'CNH' ? 'cnh' : 'single'}
        initialFacingMode={cameraDocType === 'SELFIE' ? 'user' : 'environment'}
        onClose={() => {
          setCameraOpen(false);
          setCameraDocType(null);
        }}
        onDone={async (dataUrl) => {
          if (!cameraDocType) return;
          const docType = cameraDocType;
          setCameraOpen(false);
          setCameraDocType(null);
          await uploadDocumentBase64(docType, dataUrl);
        }}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-[0_22px_48px_-40px_rgba(15,23,42,0.45)] motoboy-fade-up">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Conta</p>
            <div className="mt-1">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${profileAccountStatus.tone}`}>
                {profileAccountStatus.label}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Documentos</p>
            <p className="text-sm font-black text-slate-900 mt-1">
              {docsProgress.approved}/{docsProgress.total} aprovados
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Lojas vinculadas</p>
            <p className="text-sm font-black text-slate-900 mt-1">{linkedStoreIds.length} ativa(s)</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Repasses</p>
            <p className="text-sm font-black text-slate-900 mt-1">{payoutStats.pendingCount} pendente(s)</p>
          </div>
        </div>
      </div>

      <PremiumTabs
        items={tabItems}
        activeId={activeSection}
        onChange={(id) => setActiveSection(id as any)}
        listClassName="grid grid-cols-2 sm:grid-cols-5 gap-2"
        containerClassName="bg-white/90 backdrop-blur-sm shadow-[0_22px_48px_-40px_rgba(15,23,42,0.45)] border-slate-200 sticky top-[10px] z-20"
        buttonClassName="btn-press"
      />

      {activeSection === 'notifications' && (
      <div className="motoboy-fade-up" style={{ animationDelay: '40ms' }}>
        <FormSection
          title="Notificações"
          subtitle="Quando entra pedido novo na fila (som e vibração)."
          variant="neutral"
          className="premium-card-glass"
          contentClassName="space-y-3"
        >
        <button
          type="button"
          onClick={() => {
            setNotifyOrders((prev) => {
              const next = !prev;
              localStorage.setItem('motoboy:notify_orders', next ? '1' : '0');
              return next;
            });
          }}
          className={[
            'btn-press w-full rounded-xl px-4 py-3 text-sm font-extrabold flex items-center justify-between border',
            notifyOrders
              ? 'bg-emerald-50/70 text-emerald-900 border-emerald-200 shadow-[0_18px_40px_-32px_rgba(5,150,105,0.35)]'
              : 'bg-white/70 text-slate-800 border-slate-200 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)]',
          ].join(' ')}
        >
          <span>{notifyOrders ? 'Ativadas' : 'Desativadas'}</span>
          <span
            className={[
              'relative inline-flex h-7 w-12 rounded-full transition',
              notifyOrders ? 'bg-emerald-500' : 'bg-slate-300',
            ].join(' ')}
            aria-hidden="true"
          >
            <span
              className={[
                'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition',
                notifyOrders ? 'left-6' : 'left-1',
              ].join(' ')}
            />
          </span>
        </button>
        </FormSection>
      </div>
      )}

      {blocked && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Seu cadastro está em análise. Envie os documentos obrigatórios e aguarde a validação da plataforma.
        </div>
      )}

      {activeSection === 'documents' && (
      <FormSection
        title="Documentos (KYC)"
        subtitle="Envie e acompanhe"
        variant="warning"
        contentClassName="space-y-3"
        actions={
          <button
            type="button"
            onClick={refreshDocuments}
            disabled={refreshingDocs}
            className="btn-press rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 disabled:opacity-60"
          >
            {refreshingDocs ? 'Atualizando...' : 'Atualizar'}
          </button>
        }
      >
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-slate-200 bg-slate-50 text-slate-700">
            {docsProgress.approved}/{docsProgress.total} completos
          </span>
          {docsProgress.rejected > 0 ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-rose-200 bg-rose-50 text-rose-800">
              {docsProgress.rejected} recusado{docsProgress.rejected === 1 ? '' : 's'}
            </span>
          ) : null}
          {docsProgress.pending > 0 ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-amber-200 bg-amber-50 text-amber-800">
              {docsProgress.pending} em análise
            </span>
          ) : null}
        </div>
        {faceBanner && (
          <div
            className={[
              'rounded-2xl border px-3 py-3 text-sm',
              faceBanner.tone === 'emerald'
                ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950'
                : faceBanner.tone === 'amber'
                ? 'border-amber-200 bg-amber-50/60 text-amber-950'
                : faceBanner.tone === 'rose'
                ? 'border-rose-200 bg-rose-50/60 text-rose-950'
                : 'border-slate-200 bg-slate-50 text-slate-900',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl border border-slate-200 bg-white grid place-items-center shrink-0">
                  {faceBanner.icon}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold leading-tight">{faceBanner.title}</div>
                  <div className="text-xs text-slate-700 mt-0.5">{faceBanner.subtitle}</div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="grid gap-3">
	          {documentTypes.map((doc) => {
	            const current = documentsByType.get(doc.key);
	            const currentStatus = String(current?.status || '').toUpperCase();
	            const isApproved = currentStatus === 'APPROVED';
	            const isPending = currentStatus === 'PENDING';
	            const isRejected = currentStatus === 'REJECTED';
	            const storeReuploadRequests = (current?.metadata?.review?.storeReuploadRequests || null) as any;
	            const reuploadRequest =
	              storeReuploadRequests && typeof storeReuploadRequests === 'object'
	                ? (Object.values(storeReuploadRequests as any) as any[])
	                    .filter(Boolean)
	                    .sort((a: any, b: any) => {
	                      const atA = a?.requestedAt ? new Date(String(a.requestedAt)).getTime() : 0;
	                      const atB = b?.requestedAt ? new Date(String(b.requestedAt)).getTime() : 0;
	                      return atB - atA;
	                    })[0] || null
	                : null;
	            const reuploadStoreId = reuploadRequest?.storeId ? String(reuploadRequest.storeId) : null;
	            const reuploadStoreName =
	              (reuploadStoreId && (storeById.get(reuploadStoreId)?.name || requestByStoreId.get(reuploadStoreId)?.store?.name)) || null;
            const cnhDoc = documentsByType.get('CNH');
            const cnhStatus = String(cnhDoc?.status || '').toUpperCase();
            const blockedByOrder = doc.key === 'SELFIE' && (!cnhDoc || cnhStatus === 'REJECTED');
            const stepLabel = doc.key === 'CNH' ? '1/2' : doc.key === 'SELFIE' ? '2/2' : 'Opcional';
            const prefersCamera = doc.key === 'CNH' || doc.key === 'SELFIE';
            const status: any = current ? (currentStatus === 'APPROVED' ? 'APPROVED' : currentStatus === 'REJECTED' ? 'REJECTED' : 'PENDING') : 'MISSING';
            const tone: any = status === 'APPROVED' ? 'emerald' : status === 'REJECTED' ? 'rose' : status === 'PENDING' ? 'amber' : 'slate';
            const canUpload = canStartUpload(doc.key) && !uploading;
            const lockUpload = Boolean(current) && (isPending || (isApproved && !reuploadRequest));
            const selectedFile = docFiles[doc.key] || null;

            const blockedSelfieBanner = blockedByOrder ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Envie a CNH primeiro para liberar o envio da selfie.
              </div>
            ) : null;

            const storeReuploadBanner = reuploadRequest && isApproved ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <div className="font-extrabold">Reenvio solicitado por uma loja</div>
                <div className="text-amber-800 mt-0.5">
                  {reuploadStoreName ? `Loja: ${reuploadStoreName}. ` : ''}
                  {reuploadRequest?.reason ? `Motivo: ${String(reuploadRequest.reason)}` : 'Envie uma foto mais nítida.'}
                </div>
              </div>
            ) : null;

            const lockedBanner = lockUpload ? (
              <div
                className={`rounded-2xl border px-3 py-2 text-xs ${
                  isApproved ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
              >
                {isApproved ? 'Aprovado pela plataforma. Documento pronto para solicitação de lojas.' : 'Enviado para análise da plataforma.'}
              </div>
            ) : null;

            const primaryAction = !lockUpload ? (
              prefersCamera ? (
                <button
                  type="button"
                  onClick={() => openCamera(doc.key)}
                  disabled={!canUpload}
                  className="btn-press w-full rounded-2xl bg-brand-primary px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50 shadow-[0_22px_48px_-34px_rgba(234,88,12,0.55)]"
                >
                  Tirar foto
                </button>
              ) : (
                <div className="text-xs text-slate-600">
                  Envie uma foto nítida do documento do veículo.
                </div>
              )
            ) : null;

            const secondaryAction = !lockUpload ? (
              <div className="space-y-2">
                <details className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="cursor-pointer select-none px-3 py-2 text-xs font-extrabold text-slate-800 bg-slate-50">
                    {prefersCamera ? 'Ou enviar imagem da galeria' : 'Enviar imagem'}
                  </summary>
                  <div className="p-3 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!canUpload}
                      onChange={(event) =>
                        setDocFiles((prev) => ({ ...prev, [doc.key]: event.target.files?.[0] || null }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:opacity-60"
                    />
                  </div>
                </details>

                {selectedFile ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    Arquivo selecionado: <span className="font-semibold">{selectedFile.name}</span>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => handleUploadDocument(doc.key)}
                  disabled={!canUpload || !selectedFile}
                  className="btn-press w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50 shadow-[0_22px_48px_-34px_rgba(15,23,42,0.55)]"
                >
                  {uploading ? 'Enviando...' : isRejected ? 'Reenviar documento' : 'Enviar documento'}
                </button>
              </div>
            ) : null;

            const rejectedReason = isRejected
              ? String(current?.metadata?.review?.reason || '').trim() ||
                faceReasonLabel(current?.metadata?.face?.reason) ||
                'Documento recusado. Reenvie uma foto mais nítida.'
              : null;
            const awaitingReuploadByPlatform = isRejected && Boolean(current?.metadata?.review?.awaitingReupload);
            const rejectedWaitBanner = awaitingReuploadByPlatform ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
                <div className="font-extrabold">Aguardando novo envio</div>
                <div className="mt-0.5 text-rose-800">
                  Este documento foi recusado pela plataforma. Envie uma nova foto nítida para continuar.
                </div>
              </div>
            ) : null;

	            return (
              <DocCard
                key={doc.key}
                step={stepLabel}
                title={doc.label}
                subtitle={doc.help}
                icon={
                  doc.key === 'CNH' ? (
                    <IdentificationCard size={20} weight="duotone" className="text-slate-700" />
                  ) : doc.key === 'SELFIE' ? (
                    <Camera size={20} weight="duotone" className="text-slate-700" />
                  ) : (
                    <Car size={20} weight="duotone" className="text-slate-700" />
                  )
                }
                status={status}
                uploadedAt={current?.uploadedAt || null}
                fileKey={current?.fileKey || null}
                tone={tone}
                banner={
                  blockedSelfieBanner ||
                  storeReuploadBanner ||
                  rejectedWaitBanner ||
                  lockedBanner ||
                  null
                }
                primaryAction={primaryAction}
                secondaryAction={secondaryAction}
                rejectedReason={rejectedReason}
              />
            );
          })}
        </div>
        {(requiredDocStatus.missing.length > 0 || requiredDocStatus.rejected.length > 0) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {requiredDocStatus.missing.length > 0 ? (
              <div className="font-semibold">Faltando: {requiredDocStatus.missing.join(', ')}.</div>
            ) : null}
            {requiredDocStatus.rejected.length > 0 ? (
              <div className="mt-1 font-semibold text-rose-800">
                Recusado(s): {requiredDocStatus.rejected.join(', ')}. Reenvie o(s) documento(s) corrigido(s).
              </div>
            ) : null}
          </div>
        )}
      </FormSection>
      )}

      {activeSection === 'profile' && (
      <FormSection title="Perfil do entregador" subtitle="Dados do veículo e região." variant="primary" contentClassName="space-y-3">
        <FormSection
          title="Desempenho"
          subtitle="Sua reputação e gorjetas nas lojas vinculadas."
          variant="success"
          actions={
            <button
              type="button"
              onClick={loadReviewStats}
              disabled={reviewsLoading}
              className="btn-press rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 disabled:opacity-60"
            >
              {reviewsLoading ? 'Atualizando...' : 'Atualizar'}
            </button>
          }
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Nota média (entrega)</p>
              <p className="text-lg font-black text-slate-900">{Number(reviewStats.avgDeliveryRating || 0).toFixed(1)} ★</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Avaliações</p>
              <p className="text-lg font-black text-slate-900">{Number(reviewStats.totalReviews || 0)}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Gorjetas confirmadas (cliente)</p>
              <p className="text-lg font-black text-emerald-800">
                {Number(reviewStats.totalTips || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Base: {reviewStats.storesMeasured} loja{reviewStats.storesMeasured === 1 ? '' : 's'} vinculada{reviewStats.storesMeasured === 1 ? '' : 's'} com avaliações e gorjetas confirmadas.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">Repasses pendentes</p>
              <p className="text-lg font-black text-amber-800">{formatCurrency(payoutStats.pendingAmount)}</p>
              <p className="text-[11px] text-amber-800/80">{payoutStats.pendingCount} gorjeta(s) aguardando repasse</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Repasses concluídos</p>
              <p className="text-lg font-black text-emerald-800">{formatCurrency(payoutStats.paidAmount)}</p>
              <p className="text-[11px] text-emerald-800/80">{payoutStats.paidCount} gorjeta(s) repassada(s)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveSection('payouts')}
            className="btn-press w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800"
          >
            Ver aba de repasses
          </button>
        </FormSection>

        <FormSection title="Dados da conta" variant="neutral" contentClassName="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Nome</p>
              <p className="text-sm font-semibold text-slate-900 break-words">{profile?.user?.fullName || '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">E-mail</p>
              <p className="text-sm font-semibold text-slate-900 break-all">{profile?.user?.email || '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Telefone</p>
              <p className="text-sm font-semibold text-slate-900">{profile?.user?.phone || '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Documento</p>
              <p className="text-sm font-semibold text-slate-900">
                {profile?.user?.documentType ? `${String(profile.user.documentType)}: ` : ''}
                {profile?.user?.document || '-'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Endereço da conta</p>
              <p className="text-sm font-semibold text-slate-900 break-words">{profile?.user?.address || '-'}</p>
            </div>
          </div>
        </FormSection>
        <FormSection title="Dados do entregador" variant="neutral" contentClassName="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Tipo de veículo</p>
              <p className="text-sm font-semibold text-slate-900">{profileDraft?.vehicleType || '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Placa</p>
              <p className="text-sm font-semibold text-slate-900">{profileDraft?.vehiclePlate || '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Cidade/UF</p>
              <p className="text-sm font-semibold text-slate-900">
                {profileDraft?.city || '-'}{profileDraft?.state ? ` / ${profileDraft.state}` : ''}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Categoria CNH</p>
              <p className="text-sm font-semibold text-slate-900">{profileDraft?.cnhCategory || '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Endereço operacional</p>
              <p className="text-sm font-semibold text-slate-900 break-words">{profileDraft?.address || '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">PIX para repasse</p>
              <p className="text-sm font-semibold text-slate-900 break-all">{profileDraft?.pixKey || '-'}</p>
            </div>
          </div>
        </FormSection>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 px-3 py-3 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)]">
          <div className="flex items-center gap-3">
            <AdaptiveAvatar
              src={profileImagePreview}
              alt="Foto do entregador"
              fallbackText={String(profile?.user?.fullName || 'E')}
              sizeClassName="h-20 w-20"
              onClick={() => profileImagePreview && setPreview({ title: 'Foto do entregador', src: profileImagePreview })}
              title={profileImagePreview ? 'Ampliar foto' : 'Sem foto cadastrada'}
              containerClassName="text-lg shadow-[0_18px_32px_-22px_rgba(15,23,42,0.55)]"
            />
            <label className="text-xs text-slate-600 font-semibold">
              Foto do perfil (opcional)
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleProfilePhotoUpload(event.target.files?.[0])}
                className="mt-1 block text-[11px] text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-900 file:px-2.5 file:py-1.5 file:text-[11px] file:font-semibold file:text-white"
              />
              {profileImagePreview ? <span className="mt-1 block text-[10px] text-slate-500">Clique na foto para ampliar.</span> : null}
            </label>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 flex items-center gap-2 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.45)]">
          <span className="text-base">{vehicleIcon}</span>
          <span>Complete seus dados para ganhar confiança das lojas.</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={profileDraft.vehicleType}
            onChange={(event) => {
              const next = String(event.target.value || '').toUpperCase();
              setProfileDraft((prev: any) => ({ ...prev, vehicleType: next }));
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Tipo de veículo</option>
            <option value="MOTO">Moto</option>
            <option value="BIKE">Bicicleta</option>
            <option value="CARRO">Carro</option>
            <option value="OUTRO">Outro</option>
          </select>
          <input
            value={profileDraft.vehiclePlate}
            onChange={(event) => {
              const next = String(event.target.value || '')
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, 7);
              setProfileDraft((prev: any) => ({ ...prev, vehiclePlate: next }));
            }}
            placeholder="Placa (ABC1D23)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            inputMode="text"
            autoCapitalize="characters"
          />
          <input
            value={profileDraft.vehicleModel}
            onChange={(event) => setProfileDraft((prev: any) => ({ ...prev, vehicleModel: event.target.value }))}
            placeholder="Modelo (ex: CG 160)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={profileDraft.vehicleColor}
            onChange={(event) => setProfileDraft((prev: any) => ({ ...prev, vehicleColor: event.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Cor</option>
            {VEHICLE_COLORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {(String(profileDraft.vehicleType || '').toUpperCase() === 'MOTO' ||
            String(profileDraft.vehicleType || '').toUpperCase() === 'CARRO' ||
            String(profileDraft.vehicleType || '').toUpperCase() === 'OUTRO') && (
            <>
              <input
                value={profileDraft.cnhNumber}
                onChange={(event) =>
                  setProfileDraft((prev: any) => ({
                    ...prev,
                    cnhNumber: String(event.target.value || '').replace(/\D/g, '').slice(0, 11),
                  }))
                }
                placeholder="Nº CNH"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                inputMode="numeric"
              />
              <input
                value={profileDraft.cnhCategory}
                onChange={(event) =>
                  setProfileDraft((prev: any) => ({
                    ...prev,
                    cnhCategory: String(event.target.value || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4),
                  }))
                }
                placeholder="Categoria CNH (ex: A, AB)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                autoCapitalize="characters"
              />
              <input
                type="date"
                value={profileDraft.cnhExpiresAt || ''}
                onChange={(event) => setProfileDraft((prev: any) => ({ ...prev, cnhExpiresAt: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              {String(profileDraft.vehicleType || '').toUpperCase() === 'MOTO' &&
              !String(profileDraft.cnhCategory || '').toUpperCase().includes('A') ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:col-span-2">
                  Para moto, a categoria da CNH precisa incluir a letra A.
                </div>
              ) : null}
            </>
          )}

          <select
            value={String(profileDraft.state || '').toUpperCase()}
            onChange={(event) => {
              const nextUf = String(event.target.value || '').toUpperCase();
              setProfileDraft((prev: any) => ({ ...prev, state: nextUf, city: '' }));
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">UF</option>
            {BRAZIL_UF.map((s) => (
              <option key={s.uf} value={s.uf}>
                {s.uf} - {s.name}
              </option>
            ))}
          </select>

          {selectedUf && !citiesFetchError ? (
            <select
              value={profileDraft.city}
              onChange={(event) => setProfileDraft((prev: any) => ({ ...prev, city: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              disabled={citiesLoading}
              title={citiesLoading ? 'Carregando cidades...' : undefined}
            >
              <option value="">{citiesLoading ? 'Carregando cidades...' : 'Cidade'}</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={profileDraft.city}
              onChange={(event) => setProfileDraft((prev: any) => ({ ...prev, city: event.target.value }))}
              placeholder="Cidade"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          )}
          <input
            value={profileDraft.pixKey}
            onChange={(event) => setProfileDraft((prev: any) => ({ ...prev, pixKey: event.target.value }))}
            placeholder="Chave PIX CPF (somente números)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
            inputMode="numeric"
          />
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 sm:col-span-2">
            Para repasse da gorjeta, use a chave PIX CPF do próprio entregador.
          </div>
          <input
            value={profileDraft.address}
            onChange={(event) => setProfileDraft((prev: any) => ({ ...prev, address: event.target.value }))}
            placeholder="Endereço"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
          />
        </div>
        {citiesFetchError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {citiesFetchError} Você ainda pode digitar a cidade manualmente.
          </div>
        ) : null}
        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {savingProfile ? 'Salvando...' : 'Salvar perfil'}
        </button>
        {profile?.status && (
          <div className="pt-1">
            {(() => {
              const st = formatMotoboyAccountStatus(profile.status);
              return (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-semibold">Status do cadastro:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${st.tone}`}>
                    {st.label}
                  </span>
                </div>
              );
            })()}
          </div>
        )}
      </FormSection>
      )}

      {activeSection === 'payouts' && (
      <FormSection
        title="Repasses de gorjeta"
        subtitle="Acompanhe pendentes e pagos com comprovante."
        variant="warning"
        contentClassName="space-y-3"
        actions={
          <button
            type="button"
            onClick={loadTipPayouts}
            className="btn-press rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700"
          >
            {tipPayoutsLoading ? 'Atualizando...' : 'Atualizar'}
          </button>
        }
      >
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">Pendente</p>
            <p className="text-lg font-black text-amber-800">{formatCurrency(payoutStats.pendingAmount)}</p>
            <p className="text-[11px] text-amber-800/80">{payoutStats.pendingCount} repasse(s)</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Repassado</p>
            <p className="text-lg font-black text-emerald-800">{formatCurrency(payoutStats.paidAmount)}</p>
            <p className="text-[11px] text-emerald-800/80">{payoutStats.paidCount} repasse(s)</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Total histórico</p>
            <p className="text-lg font-black text-slate-900">{payoutStats.total}</p>
            <p className="text-[11px] text-slate-500">gorjeta(s) com pagamento confirmado</p>
          </div>
        </div>

        {tipPayoutsLoading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">Carregando repasses...</div>
        ) : tipPayouts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">Sem repasses registrados ainda.</div>
        ) : (
          <div className="grid gap-2">
            {tipPayouts.slice(0, 40).map((row: any, idx: number) => {
              const payoutStatus = String(row?.tipPayoutStatus || '').toUpperCase() === 'PAID' ? 'PAID' : 'PENDING';
              const logo = resolveAssetUrl(String(row?.storeLogoUrl || '')) || String(row?.storeLogoUrl || '');
              return (
                <div key={String(row?.id || `tip-row-${idx}`)} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0">
                      {logo ? <img src={logo} alt={row?.storeName || 'Loja'} className="h-full w-full object-cover" loading="lazy" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-black text-slate-900 break-words">{row?.storeName || row?.storeSlug || 'Loja'}</div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            payoutStatus === 'PAID'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-amber-200 bg-amber-50 text-amber-800'
                          }`}
                        >
                          {payoutStatus === 'PAID' ? 'Repassado' : 'Pendente'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Pedido #{String(row?.orderId || '').slice(0, 8)} · Gorjeta paga em {formatDateTime(row?.tipPaidAt)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {payoutStatus === 'PAID' ? `Repasse confirmado em ${formatDateTime(row?.tipPayoutAt)}` : 'Aguardando repasse do lojista'}
                      </div>
                      {row?.tipPayoutNotes ? (
                        <div className="text-[11px] text-slate-600 break-words">
                          <span className="font-semibold">Obs:</span> {String(row.tipPayoutNotes)}
                        </div>
                      ) : null}
                      {row?.tipPayoutProofUrl ? (
                        <a
                          href={resolveAssetUrl(String(row.tipPayoutProofUrl)) || String(row.tipPayoutProofUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex text-[11px] font-extrabold text-brand-primary underline"
                        >
                          Ver comprovante
                        </a>
                      ) : null}
                    </div>
                    <div className="text-sm font-black text-slate-900 shrink-0">{formatCurrency(row?.tipAmount || 0)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FormSection>
      )}

      {activeSection === 'stores' && (
      <FormSection
        title="Lojas"
        subtitle="Vínculos e solicitações. Aqui você vê onde já atende, o que está pendente e novas lojas para solicitar."
        variant="primary"
        contentClassName="space-y-3"
      >

        {!hasCompleteProfile && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Complete seus dados do veículo e endereço para solicitar vínculo com lojas.
          </div>
        )}
        {!hasAllRequiredDocs && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Envie os documentos obrigatórios ({requiredDocs.join(', ')}) antes de solicitar vínculo.
            {requiredDocStatus.missing.length > 0 ? (
              <span className="block mt-1 text-amber-800 font-semibold">Faltando: {requiredDocStatus.missing.join(', ')}.</span>
            ) : null}
            {requiredDocStatus.rejected.length > 0 ? (
              <span className="block mt-1 text-rose-800 font-semibold">
                Recusado(s): {requiredDocStatus.rejected.join(', ')}. Reenvie o(s) documento(s).
              </span>
            ) : null}
            {requiredDocsPending.length > 0 ? (
              <span className="block mt-1 text-amber-800 font-semibold">Pendências: {requiredDocsPending.join(', ')}.</span>
            ) : null}
          </div>
        )}
        {hasAllRequiredDocs && !hasAnyRejectedRequiredDocs && hasAnyPendingRequiredDocs && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Seus documentos estão em análise da plataforma. A solicitação de vínculo será liberada após aprovação de todos os documentos obrigatórios.
          </div>
        )}

        <div className="grid gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3 motoboy-fade-up" style={{ animationDelay: '40ms' }}>
            <StoreSectionHeader
              icon={<CheckCircle size={18} weight="duotone" />}
              eyebrow="Vínculos"
              title="Lojas que você já atende"
              tone="emerald"
              right={
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-emerald-200 bg-emerald-50 text-emerald-800">
                  {linkedStoreIds.length} ativo{linkedStoreIds.length === 1 ? '' : 's'}
                </span>
              }
            />
            {linkedStoreIds.length === 0 ? (
              <EmptyHint icon={<Storefront size={18} weight="duotone" />} title="Nenhum vínculo ativo" subtitle="Quando uma loja aprovar seu vínculo, ela aparece aqui." />
            ) : (
              <div className="grid gap-2">
                {linkedStoreIds.map((storeId) => {
                  const store = storeById.get(storeId) || requestByStoreId.get(storeId)?.store || null;
                  const logo = resolveStoreLogo(store, requestByStoreId.get(storeId)?.store);
                  const desc = store?.settings?.description || store?.description || null;
                  const openFlag = store?.open;
                  const openNow = store?.openNow;
                  const storeStatus =
                    openFlag === false ? 'Loja desativada' : openNow === false ? 'Fora do horário' : openFlag === true || openNow === true ? 'Ativa agora' : 'Ativa';
                  return (
                    <div key={storeId} className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-3 flex flex-col sm:flex-row sm:items-center gap-3 shadow-[0_22px_48px_-40px_rgba(5,150,105,0.35)]">
                      <div className="h-12 w-12 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0">
                        {logo ? (
                          <img src={logo} alt={store?.name || 'Loja'} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-[10px] font-black text-slate-500">
                            {getStoreInitials(store, requestByStoreId.get(storeId)?.store)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-extrabold text-slate-900 truncate">{store?.name || store?.slug || 'Loja'}</div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold border border-emerald-200 bg-emerald-50 text-emerald-800">
                            Vínculo ativo
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 break-words">{desc ? String(desc) : storeStatus}</div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Deseja desfazer o vínculo com ${store?.name || store?.slug || 'a loja'}?`)) return;
                          try {
                            await motoboyService.leaveStore(storeId);
                            showToast('Vinculo removido.', 'success');
                            await loadRequests();
                          } catch (error: any) {
                            showToast(error?.message || 'Não foi possível desfazer o vínculo.', 'error');
                          }
                        }}
                        className="btn-press w-full sm:w-auto rounded-xl border border-emerald-200 bg-white px-3 py-2 text-[11px] font-extrabold text-emerald-800"
                        title="Sair da loja"
                      >
                        Sair
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3 motoboy-fade-up" style={{ animationDelay: '70ms' }}>
            <StoreSectionHeader
              icon={<ClockClockwise size={18} weight="duotone" />}
              eyebrow="Solicitações"
              title="Pendentes ou recusadas"
              tone="amber"
              right={
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-slate-200 bg-slate-50 text-slate-700">
                  {pendingStoreIds.length} pendente{pendingStoreIds.length === 1 ? '' : 's'} | {rejectedOrInactiveStoreIds.length} recusada{rejectedOrInactiveStoreIds.length === 1 ? '' : 's'}
                </span>
              }
            />
            {pendingStoreIds.length === 0 && rejectedOrInactiveStoreIds.length === 0 ? (
              <EmptyHint icon={<LinkSimpleHorizontal size={18} weight="duotone" />} title="Nenhuma solicitação" subtitle="Selecione uma loja abaixo e envie sua solicitação." />
            ) : (
              <div className="grid gap-2">
                {[...pendingStoreIds, ...rejectedOrInactiveStoreIds].map((storeId) => {
                  const req = requestByStoreId.get(storeId);
                  const store = storeById.get(storeId) || req?.store || null;
                  const logo = resolveStoreLogo(store, req?.store);
                  const desc = store?.settings?.description || store?.description || null;
                  const status = String(req?.status || '').toUpperCase();
                  const isPending = status === 'PENDING';
                  const isRejected = status === 'REJECTED';
                  const isInactive = status === 'APPROVED' && !Boolean(req?.linkActive);
                  const reason = req?.reason ? String(req.reason) : null;

                  const pill =
                    isPending
                      ? { cls: 'border-amber-200 bg-amber-50 text-amber-800', text: 'Pendente' }
                      : isInactive
                      ? { cls: 'border-rose-200 bg-rose-50 text-rose-800', text: 'Vínculo inativo' }
                      : { cls: 'border-rose-200 bg-rose-50 text-rose-800', text: 'Recusado' };

                  return (
                    <div key={storeId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="h-12 w-12 rounded-2xl border border-slate-200 bg-white overflow-hidden shrink-0">
                        {logo ? (
                          <img src={logo} alt={store?.name || 'Loja'} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-[10px] font-black text-slate-500">
                            {getStoreInitials(store, req?.store)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-extrabold text-slate-900 truncate">{store?.name || store?.slug || 'Loja'}</div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${pill.cls}`}>{pill.text}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 break-words">{desc ? String(desc) : null}</div>
                        {isRejected && reason ? (
                          <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">
                            <span className="font-extrabold">Motivo:</span> {reason}
                          </div>
                        ) : null}
                      </div>
                      {!isPending ? (
                        <button
                          type="button"
                          onClick={() => handleRequestSingle(storeId)}
                          disabled={requesting || !canRequestAnyStore}
                          className="btn-press w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 disabled:opacity-50"
                          title={!canRequestAnyStore ? 'Complete perfil e documentos para solicitar.' : 'Solicitar novamente'}
                        >
                          Solicitar novamente
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3 motoboy-fade-up" style={{ animationDelay: '100ms' }}>
            <StoreSectionHeader
              icon={<Storefront size={18} weight="duotone" />}
              eyebrow="Solicitar"
              title="Escolha novas lojas"
              tone="slate"
            />
            <div className="text-xs text-slate-600 -mt-1">Selecione uma ou mais lojas e envie sua solicitação.</div>

            <div className="mt-3 grid gap-2">
              {requestableStores.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
                  Nenhuma loja nova disponível para solicitar agora.
                </div>
              ) : (
                requestableStores.map((store: any) => {
                    const storeId = String(store.id);
                    const isSelected = selectedStores.includes(storeId);
                    const req = requestByStoreId.get(storeId);
                    const status = String(req?.status || '').toUpperCase();
                    const wasRejectedOrInactive = status === 'REJECTED' || (status === 'APPROVED' && !Boolean(req?.linkActive));
                    const logo = resolveStoreLogo(store);
                    const desc = store?.settings?.description || null;
                    const openFlag = store?.open;
                    const openNow = store?.openNow;
                    const storeStatus =
                      openFlag === false ? 'Loja desativada' : openNow === false ? 'Fora do horário' : openFlag === true || openNow === true ? 'Ativa agora' : 'Ativa';

                    return (
                      <button
                        type="button"
                        key={storeId}
                        onClick={() => toggleStore(storeId)}
                        disabled={Boolean(req) && !wasRejectedOrInactive}
                        className={[
                          'btn-press rounded-2xl border p-3 text-left flex flex-col items-start gap-3 sm:flex-row sm:items-center',
                          isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800',
                          Boolean(req) && !wasRejectedOrInactive ? 'opacity-60 cursor-not-allowed' : '',
                        ].join(' ')}
                      >
                        <div className="h-12 w-12 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0">
                          {logo ? (
                            <img src={logo} alt={store.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="h-full w-full grid place-items-center text-[10px] font-black text-slate-500">
                              {getStoreInitials(store)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-extrabold truncate">{store.name}</div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${isSelected ? 'border-white/30 bg-white/15 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                              {storeStatus}
                            </span>
                            {wasRejectedOrInactive ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${isSelected ? 'border-rose-200/40 bg-rose-500/10 text-white' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                                Reenvio
                              </span>
                            ) : null}
                          </div>
                          <div className={`text-[11px] break-words ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                            {desc ? String(desc) : null}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs font-extrabold">
                          {isSelected ? 'Selecionado' : 'Selecionar'}
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-white p-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={loadRequests}
            className="btn-press w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-800"
          >
            Atualizar status
          </button>
          {requestableStores.length > 0 && selectedStores.length > 0 ? (
            <button
              type="button"
              onClick={handleRequestStores}
              disabled={requesting || !canRequestAnyStore}
              className="btn-press w-full rounded-xl bg-brand-primary px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50 shadow-[0_22px_48px_-34px_rgba(234,88,12,0.55)]"
            >
              {requesting ? 'Enviando...' : 'Enviar solicitação'}
            </button>
          ) : null}
        </div>
      </FormSection>
      )}
    </div>
  );
}
