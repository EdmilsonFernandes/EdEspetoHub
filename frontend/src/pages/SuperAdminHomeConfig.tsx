import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowClockwise,
  ArrowDown,
  ArrowUp,
  Eye,
  EyeSlash,
  FloppyDisk,
  ImageSquare,
  LinkSimpleHorizontal,
  Plus,
  Sparkle,
  Trash,
} from '@phosphor-icons/react';
import { AdminLayout } from '../layouts/AdminLayout';
import {
  DEFAULT_HOME_CONFIG,
  HomeBannerDraft,
  HomeConfigPayload,
  homeConfigService,
} from '../services/homeConfigService';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { SegmentPromoCarousel, PromoSlide } from '../components/common/SegmentPromoCarousel';
import { useToast } from '../contexts/ToastContext';

const MAX_HOME_BANNERS = 4;

const PREVIEW_STORES = [
  { id: 'store-1', name: 'Espetinho do Lago', subtitle: 'Entrega e retirada', accent: 'from-[#153A4C] to-[#336886]' },
  { id: 'store-2', name: 'Adega do Bairro', subtitle: 'Bebidas geladas', accent: 'from-emerald-500 to-emerald-700' },
  { id: 'store-3', name: 'Hamburgueria Prime', subtitle: 'Smash e combos', accent: 'from-amber-500 to-orange-600' },
];

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('file_read_error'));
    reader.readAsDataURL(file);
  });

const compressImageFileToDataUrl = (file: File, maxEdge = 1600) =>
  new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const width = Number(image.width || 0);
        const height = Number(image.height || 0);
        if (!width || !height) throw new Error('invalid_image');

        const ratio = Math.min(1, maxEdge / Math.max(width, height));
        const targetWidth = Math.max(1, Math.round(width * ratio));
        const targetHeight = Math.max(1, Math.round(height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas_error');
        ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

        let quality = 0.88;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 1_200_000 && quality > 0.6) {
          quality -= 0.06;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('image_load_error'));
    };
    image.src = objectUrl;
  });

const createEmptyBanner = (index: number): HomeBannerDraft => ({
  id: `banner-${Date.now()}-${index + 1}`,
  imageUrl: '',
  imageFile: '',
  title: '',
  description: '',
  actionUrl: '',
  order: index + 1,
  active: true,
  fit: 'cover',
});

const buildPreviewSlides = (config: HomeConfigPayload): PromoSlide[] =>
  config.homeBanners
    .filter((banner) => banner.active && String(banner.imageUrl || '').trim())
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_HOME_BANNERS)
    .map((banner) => ({
      id: banner.id,
      image: resolveAssetUrl(banner.imageUrl) || '',
      imageAlt: banner.title || 'Banner da home',
      actionUrl: banner.actionUrl || '/create?plan=trial',
      fit: banner.fit || 'cover',
    }));

const sanitizeConfigBeforeSave = (config: HomeConfigPayload): HomeConfigPayload => ({
  homeBanners: config.homeBanners
    .slice(0, MAX_HOME_BANNERS)
    .map((banner, index) => ({
      ...banner,
      title: String(banner.title || '').trim(),
      description: String(banner.description || '').trim(),
      actionUrl: String(banner.actionUrl || '').trim(),
      imageUrl: String(banner.imageUrl || '').trim(),
      imageFile: String(banner.imageFile || '').trim(),
      order: index + 1,
    })),
  marketingPopup: {
    ...config.marketingPopup,
    title: String(config.marketingPopup.title || '').trim(),
    description: String(config.marketingPopup.description || '').trim(),
    actionUrl: String(config.marketingPopup.actionUrl || '').trim(),
    imageUrl: String(config.marketingPopup.imageUrl || '').trim(),
    imageFile: String(config.marketingPopup.imageFile || '').trim(),
  },
  usesFallback: config.usesFallback,
});

export function SuperAdminHomeConfig() {
  const { showToast } = useToast();
  const [token] = useState(() => localStorage.getItem('superAdminToken') || '');
  const [config, setConfig] = useState<HomeConfigPayload>(DEFAULT_HOME_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPopupPreview, setShowPopupPreview] = useState(true);

  useEffect(() => {
    if (!token) {
      window.location.href = '/superadmin';
      return;
    }
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const payload = await homeConfigService.getAdminConfig(token);
        setConfig(payload);
      } catch (err: any) {
        setError(err?.message || 'Não foi possível carregar a configuração da home.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const previewSlides = useMemo(() => buildPreviewSlides(config), [config]);
  const popupPreviewVisible =
    showPopupPreview &&
    Boolean(config.marketingPopup.active) &&
    Boolean(String(config.marketingPopup.imageUrl || '').trim());

  const activeBannerCount = useMemo(
    () => config.homeBanners.filter((banner) => banner.active && String(banner.imageUrl || '').trim()).length,
    [config.homeBanners]
  );

  const handleBannerChange = (index: number, key: keyof HomeBannerDraft, value: string | boolean) => {
    setConfig((prev) => {
      const nextBanners = prev.homeBanners.map((banner, bannerIndex) => {
        if (bannerIndex !== index) return banner;
        return {
          ...banner,
          [key]: value,
        };
      });
      return {
        ...prev,
        homeBanners: nextBanners,
      };
    });
  };

  const handlePopupChange = (key: keyof typeof config.marketingPopup, value: string | boolean) => {
    setConfig((prev) => ({
      ...prev,
      marketingPopup: {
        ...prev.marketingPopup,
        [key]: value,
      },
    }));
  };

  const handleBannerFile = async (index: number, file?: File | null) => {
    if (!file) return;
    try {
      const base64 = file.size > 1_500_000 ? await compressImageFileToDataUrl(file) : await readFileAsDataUrl(file);
      setConfig((prev) => ({
        ...prev,
        homeBanners: prev.homeBanners.map((banner, bannerIndex) =>
          bannerIndex === index
            ? {
                ...banner,
                imageFile: base64,
                imageUrl: base64,
              }
            : banner
        ),
      }));
    } catch {
      showToast('Não foi possível processar a imagem do banner agora.', 'error');
    }
  };

  const handlePopupFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const base64 = file.size > 1_500_000 ? await compressImageFileToDataUrl(file) : await readFileAsDataUrl(file);
      setConfig((prev) => ({
        ...prev,
        marketingPopup: {
          ...prev.marketingPopup,
          imageFile: base64,
          imageUrl: base64,
        },
      }));
    } catch {
      showToast('Não foi possível processar a imagem do popup agora.', 'error');
    }
  };

  const moveBanner = (index: number, direction: -1 | 1) => {
    setConfig((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.homeBanners.length) return prev;
      const nextBanners = [...prev.homeBanners];
      const [current] = nextBanners.splice(index, 1);
      nextBanners.splice(targetIndex, 0, current);
      return {
        ...prev,
        homeBanners: nextBanners.map((banner, bannerIndex) => ({
          ...banner,
          order: bannerIndex + 1,
        })),
      };
    });
  };

  const addBanner = () => {
    if (config.homeBanners.length >= MAX_HOME_BANNERS) {
      showToast('Você pode cadastrar no máximo 4 banners.', 'error');
      return;
    }
    setConfig((prev) => ({
      ...prev,
      homeBanners: [...prev.homeBanners, createEmptyBanner(prev.homeBanners.length)],
    }));
  };

  const removeBanner = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      homeBanners: prev.homeBanners
        .filter((_, bannerIndex) => bannerIndex !== index)
        .map((banner, bannerIndex) => ({
          ...banner,
          order: bannerIndex + 1,
        })),
    }));
  };

  const save = async () => {
    const payload = sanitizeConfigBeforeSave(config);
    const missingImage = payload.homeBanners.find((banner) => !String(banner.imageUrl || '').trim());
    if (missingImage) {
      showToast('Todo banner de destaque precisa de imagem antes de salvar.', 'error');
      return;
    }
    if (payload.homeBanners.length > MAX_HOME_BANNERS) {
      showToast('Você pode cadastrar no máximo 4 banners.', 'error');
      return;
    }
    if (payload.marketingPopup.active && !String(payload.marketingPopup.imageUrl || '').trim()) {
      showToast('O popup ativo precisa de imagem.', 'error');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const saved = await homeConfigService.saveAdminConfig(token, payload);
      setConfig(saved);
      showToast('Configuração da home salva com sucesso.', 'success');
    } catch (err: any) {
      const message = err?.message || 'Não foi possível salvar a configuração da home.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout contextLabel="Super Admin" showHeader={false}>
        <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Carregando configuração da home...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout contextLabel="Super Admin" showHeader={false}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white/92 px-5 py-5 shadow-[0_24px_54px_-34px_rgba(15,23,42,0.18)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link to="/superadmin" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#336886]">
              <Sparkle size={14} weight="duotone" />
              Voltar ao Super Admin
            </Link>
            <h1 className="mt-2 text-2xl font-black text-slate-900">Configuração da Home</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Gerencie os banners de destaque e o popup inicial do app sem mexer no código da home.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${config.usesFallback ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
              {config.usesFallback ? 'Fallback ativo' : 'Configuração salva'}
            </span>
            <button
              type="button"
              onClick={() => setShowPopupPreview((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm"
            >
              {showPopupPreview ? <EyeSlash size={16} weight="duotone" /> : <Eye size={16} weight="duotone" />}
              {showPopupPreview ? 'Ocultar popup' : 'Mostrar popup'}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#153A4C,#336886)] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_18px_38px_-22px_rgba(21,58,76,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <ArrowClockwise size={16} className="animate-spin" /> : <FloppyDisk size={16} weight="duotone" />}
              {saving ? 'Salvando...' : 'Salvar configuração'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_420px]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Banners de Destaque</p>
                  <h2 className="mt-1 text-lg font-black text-slate-900">Carrossel principal da home</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Até 4 banners. Hoje há <span className="font-black text-slate-900">{activeBannerCount}</span> ativos com imagem.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addBanner}
                  disabled={config.homeBanners.length >= MAX_HOME_BANNERS}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={16} weight="bold" />
                  Adicionar banner
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {config.homeBanners.map((banner, index) => {
                  const previewImage = resolveAssetUrl(banner.imageUrl) || '';
                  return (
                    <div key={banner.id} className="rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Banner {index + 1}</p>
                          <p className="text-sm font-black text-slate-900">{banner.title || 'Sem título'}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" onClick={() => moveBanner(index, -1)} className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 disabled:opacity-35" disabled={index === 0} aria-label="Subir banner">
                            <ArrowUp size={15} weight="bold" />
                          </button>
                          <button type="button" onClick={() => moveBanner(index, 1)} className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 disabled:opacity-35" disabled={index === config.homeBanners.length - 1} aria-label="Descer banner">
                            <ArrowDown size={15} weight="bold" />
                          </button>
                          <button type="button" onClick={() => removeBanner(index)} className="rounded-full border border-rose-200 bg-white p-2 text-rose-600" aria-label="Remover banner">
                            <Trash size={15} weight="bold" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <div className="space-y-3">
                          <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white">
                            <div className="aspect-[16/9] bg-slate-100">
                              {previewImage ? (
                                <img src={previewImage} alt={banner.title || `Banner ${index + 1}`} className={`h-full w-full ${banner.fit === 'contain' ? 'object-contain bg-slate-900/5' : 'object-cover'}`} />
                              ) : (
                                <div className="flex h-full items-center justify-center text-slate-400">
                                  <ImageSquare size={28} weight="duotone" />
                                </div>
                              )}
                            </div>
                          </div>
                          <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-700">
                            <ImageSquare size={16} weight="duotone" />
                            Upload da imagem
                            <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleBannerFile(index, event.target.files?.[0])} />
                          </label>
                          {banner.imageUrl ? (
                            <button
                              type="button"
                              onClick={() => {
                                handleBannerChange(index, 'imageUrl', '');
                                handleBannerChange(index, 'imageFile', '');
                                handleBannerChange(index, 'active', false);
                              }}
                              className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600"
                            >
                              Limpar imagem
                            </button>
                          ) : null}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="block md:col-span-2">
                            <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Título opcional</span>
                            <input value={banner.title} onChange={(event) => handleBannerChange(index, 'title', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#336886]" />
                          </label>
                          <label className="block md:col-span-2">
                            <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Descrição opcional</span>
                            <textarea value={banner.description} onChange={(event) => handleBannerChange(index, 'description', event.target.value)} className="min-h-[96px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#336886]" />
                          </label>
                          <label className="block md:col-span-2">
                            <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Link ou ação opcional</span>
                            <div className="relative">
                              <LinkSimpleHorizontal size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input value={banner.actionUrl} onChange={(event) => handleBannerChange(index, 'actionUrl', event.target.value)} placeholder="/create?plan=trial ou https://..." className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-[#336886]" />
                            </div>
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Ajuste da imagem</span>
                            <select value={banner.fit} onChange={(event) => handleBannerChange(index, 'fit', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#336886]">
                              <option value="cover">Preencher card</option>
                              <option value="contain">Conter imagem</option>
                            </select>
                          </label>
                          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <span className="text-sm font-black text-slate-800">Banner ativo</span>
                            <input type="checkbox" checked={banner.active} onChange={(event) => handleBannerChange(index, 'active', event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-[#336886]" />
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Popup de Marketing</p>
                <h2 className="mt-1 text-lg font-black text-slate-900">Abertura inicial do app</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Se estiver ativo e com imagem, o app mostra o popup depois da entrada do usuário.
                </p>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white">
                    <div className="aspect-[3/4] bg-slate-100">
                      {config.marketingPopup.imageUrl ? (
                        <img src={resolveAssetUrl(config.marketingPopup.imageUrl) || ''} alt={config.marketingPopup.title || 'Popup de marketing'} className={`h-full w-full ${config.marketingPopup.fit === 'contain' ? 'object-contain bg-slate-900/5' : 'object-cover'}`} />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          <ImageSquare size={28} weight="duotone" />
                        </div>
                      )}
                    </div>
                  </div>
                  <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-700">
                    <ImageSquare size={16} weight="duotone" />
                    Upload do popup
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => void handlePopupFile(event.target.files?.[0])} />
                  </label>
                  {config.marketingPopup.imageUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          marketingPopup: {
                            ...prev.marketingPopup,
                            imageUrl: '',
                            imageFile: '',
                            active: false,
                          },
                        }))
                      }
                      className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600"
                    >
                      Limpar imagem
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Título opcional</span>
                    <input value={config.marketingPopup.title} onChange={(event) => handlePopupChange('title', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#336886]" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Descrição opcional</span>
                    <textarea value={config.marketingPopup.description} onChange={(event) => handlePopupChange('description', event.target.value)} className="min-h-[96px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#336886]" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Link ou ação opcional</span>
                    <div className="relative">
                      <LinkSimpleHorizontal size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={config.marketingPopup.actionUrl} onChange={(event) => handlePopupChange('actionUrl', event.target.value)} placeholder="/create?plan=trial ou https://..." className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-[#336886]" />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Ajuste da imagem</span>
                    <select value={config.marketingPopup.fit} onChange={(event) => handlePopupChange('fit', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#336886]">
                      <option value="cover">Preencher card</option>
                      <option value="contain">Conter imagem</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <span className="text-sm font-black text-slate-800">Popup ativo</span>
                    <input type="checkbox" checked={config.marketingPopup.active} onChange={(event) => handlePopupChange('active', event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-[#336886]" />
                  </label>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#0f172a_0%,#153A4C_100%)] p-5 text-white shadow-[0_28px_60px_-32px_rgba(15,23,42,0.65)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/65">Preview</p>
                  <h2 className="mt-1 text-lg font-black">Simulação do app</h2>
                  <p className="mt-1 text-sm text-white/70">Mock visual da home com os banners e o popup que você está configurando.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPopupPreview((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white"
                >
                  {showPopupPreview ? <EyeSlash size={14} weight="duotone" /> : <Eye size={14} weight="duotone" />}
                  Popup
                </button>
              </div>

              <div className="relative mt-5 rounded-[2.2rem] border border-white/10 bg-[#EEF2F7] p-3 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
                <div className="rounded-[1.8rem] bg-[linear-gradient(180deg,#EEF2F7_0%,#F7FAFC_100%)] p-3">
                  <div className="flex items-center justify-between rounded-[1.4rem] border border-white/85 bg-white px-3 py-2 shadow-sm">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Já no Caminho</p>
                      <p className="text-sm font-black text-slate-900">O que vai pedir hoje?</p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Hub</div>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-[1.65rem] border border-white bg-white shadow-[0_18px_42px_-28px_rgba(15,23,42,0.32)]">
                    <SegmentPromoCarousel mode="hub" slides={previewSlides} className="shadow-none" />
                  </div>

                  <div className="mt-4 space-y-3">
                    {PREVIEW_STORES.map((store) => (
                      <div key={store.id} className="rounded-[1.35rem] border border-white/80 bg-white px-3 py-3 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${store.accent}`} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900">{store.name}</p>
                            <p className="text-xs font-semibold text-slate-500">{store.subtitle}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {popupPreviewVisible ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[2rem] bg-slate-950/42 px-5 py-6 backdrop-blur-sm">
                    <div className="w-full max-w-[280px] overflow-hidden rounded-[1.8rem] border border-white/80 bg-white shadow-[0_26px_60px_-28px_rgba(15,23,42,0.68)]">
                      <div className="aspect-[3/4] bg-slate-950">
                        <img src={resolveAssetUrl(config.marketingPopup.imageUrl) || ''} alt={config.marketingPopup.title || 'Popup de marketing'} className={`h-full w-full ${config.marketingPopup.fit === 'contain' ? 'object-contain bg-slate-900/5' : 'object-cover'}`} />
                      </div>
                      {(config.marketingPopup.title || config.marketingPopup.description) ? (
                        <div className="border-t border-slate-100 px-4 py-3">
                          {config.marketingPopup.title ? <p className="text-sm font-black text-slate-900">{config.marketingPopup.title}</p> : null}
                          {config.marketingPopup.description ? <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{config.marketingPopup.description}</p> : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#336886]">Regras rápidas</p>
              <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
                <li>Máximo de 4 banners na home.</li>
                <li>O preview usa dados mockados para você enxergar o resultado no app.</li>
                <li>O popup só aparece no app se estiver ativo e com imagem.</li>
                <li>Sem configuração salva no banco, a home continua usando o fallback atual.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}
