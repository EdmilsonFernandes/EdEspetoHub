// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image as ImageIcon,
  PencilSimple,
  Trash,
  FloppyDisk,
  Plus,
  Fire,
  Wine,
  Package,
  DotsThree,
  X
} from '@phosphor-icons/react';
import { productService } from '../../services/productService';
import { formatCurrency } from '../../utils/format';
import { useToast } from '../../contexts/ToastContext';
import { normalizeProductModifiers } from '../../utils/productModifiers';
import { resolveAssetUrl } from '../../utils/resolveAssetUrl';

const WEEK_DAYS = [
  { key: 'mon', label: 'Seg' },
  { key: 'tue', label: 'Ter' },
  { key: 'wed', label: 'Qua' },
  { key: 'thu', label: 'Qui' },
  { key: 'fri', label: 'Sex' },
  { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
];
const defaultAvailability = WEEK_DAYS.reduce((acc, day) => {
  acc[day.key] = false;
  return acc;
}, {});
const initialForm = {
  name: '',
  price: '',
  promoPrice: '',
  promoActive: false,
  bundlePromoActive: false,
  bundlePromoQty: '',
  bundlePromoPrice: '',
  category: 'espetos',
  imageUrl: '',
  imageFile: '',
  description: '',
  isFeatured: false,
  active: true,
  availabilityDays: { ...defaultAvailability },
  modifiers: [],
};
const defaultCategories = [
  { id: 'espetos', label: 'Espetos', icon: Fire },
  { id: 'bebidas', label: 'Bebidas', icon: Wine },
  { id: 'porcoes', label: 'Porções', icon: Package },
  { id: 'outros', label: 'Outros', icon: DotsThree },
];

const SEGMENT_CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  restaurante: ['entradas', 'pratos', 'bebidas', 'sobremesas'],
  hamburgueria: ['hamburgueres', 'combos', 'porcoes', 'bebidas'],
  lanchonete: ['lanches', 'salgados', 'sucos', 'bebidas'],
  pizzaria: ['pizzas', 'broto', 'bordas', 'bebidas'],
  adega: ['cervejas', 'destilados', 'vinhos', 'gelo'],
  mercado: ['mercearia', 'higiene', 'bebidas', 'limpeza'],
  hortifruti: ['frutas', 'verduras', 'legumes', 'promocoes'],
  farmacia: ['medicamentos', 'higiene', 'beleza', 'infantil'],
  confeitaria: ['bolos', 'doces', 'tortas', 'bebidas'],
  outros: ['destaques', 'mais vendidos', 'promocoes', 'novidades'],
};

const categoryAccentClasses: Record<string, string> = {
  espetos: 'border-l-rose-400',
  bebidas: 'border-l-sky-400',
  porcoes: 'border-l-amber-400',
  outros: 'border-l-slate-300',
};
const categoryDotClasses: Record<string, string> = {
  espetos: 'bg-rose-400',
  bebidas: 'bg-sky-400',
  porcoes: 'bg-amber-400',
  outros: 'bg-slate-400',
};

const resolveCategoryAccent = (value = '') =>
  categoryAccentClasses[normalizeCategory(value)] || 'border-l-slate-300';
const resolveCategoryDot = (value = '') =>
  categoryDotClasses[normalizeCategory(value)] || 'bg-slate-400';

const normalizeCategory = (value = '') => value.toString().trim().toLowerCase();
const formatCategoryLabel = (value = '') => {
  const normalized = normalizeCategory(value);
  const known = defaultCategories.find((entry) => entry.id === normalized);
  if (known) return known.label;
  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getCategoryIcon = (categoryId = '') => {
  const normalized = normalizeCategory(categoryId);
  const known = defaultCategories.find((entry) => entry.id === normalized);
  return known?.icon || DotsThree;
};

const dayLabels: Record<string, string> = {
  mon: 'Seg',
  tue: 'Ter',
  wed: 'Qua',
  thu: 'Qui',
  fri: 'Sex',
  sat: 'Sáb',
  sun: 'Dom',
};

const formatAvailabilityDays = (availabilityDays?: Record<string, boolean> | null) => {
  if (!availabilityDays || Object.keys(availabilityDays).length === 0) {
    return 'Todos os dias';
  }
  const activeDays = Object.entries(availabilityDays)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => dayLabels[key] || key);
  if (!activeDays.length) {
    return 'Todos os dias';
  }
  return activeDays.join(', ');
};

const availabilityDayMeta = [
  { key: 'mon', label: 'Seg', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'tue', label: 'Ter', tone: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'wed', label: 'Qua', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'thu', label: 'Qui', tone: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
  { key: 'fri', label: 'Sex', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'sat', label: 'Sáb', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'sun', label: 'Dom', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

const renderAvailabilityBadges = (availabilityDays?: Record<string, boolean> | null) => {
  if (!availabilityDays || Object.keys(availabilityDays).length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
        Todos os dias
      </span>
    );
  }
  const active = availabilityDayMeta.filter((day) => availabilityDays?.[day.key]);
  if (!active.length) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
        Nenhum dia
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {active.map((day) => (
        <span
          key={day.key}
          className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold ${day.tone}`}
        >
          {day.label}
        </span>
      ))}
    </div>
  );
};

const normalizeAvailabilityState = (value) => {
  if (!value || typeof value !== 'object') return { ...defaultAvailability };
  return WEEK_DAYS.reduce((acc, day) => {
    acc[day.key] = Boolean(value[day.key]);
    return acc;
  }, {});
};

const buildAvailabilityPayload = (value) => {
  const normalized = normalizeAvailabilityState(value);
  const hasAny = Object.values(normalized).some(Boolean);
  if (!hasAny) return null;
  return normalized;
};

const getBundleEconomyPreview = ({
  unitPrice,
  promoActive,
  promoPrice,
  bundlePromoActive,
  bundlePromoQty,
  bundlePromoPrice,
}: any) => {
  if (!bundlePromoActive) return null;
  const qty = Math.floor(Number(bundlePromoQty || 0));
  const groupPrice = Number(bundlePromoPrice || 0);
  if (!(qty >= 2) || !(groupPrice > 0)) return null;
  const saleBase = promoActive && Number(promoPrice || 0) > 0 ? Number(promoPrice) : Number(unitPrice || 0);
  if (!(saleBase > 0)) return null;
  const regular = saleBase * qty;
  const economy = regular - groupPrice;
  if (!(economy > 0)) return null;
  return {
    regular,
    economy,
  };
};

const getBundleEconomyLabel = (product: any) => {
  const preview = getBundleEconomyPreview({
    unitPrice: product?.price,
    promoActive: product?.promoActive,
    promoPrice: product?.promoPrice,
    bundlePromoActive: product?.bundlePromoActive,
    bundlePromoQty: product?.bundlePromoQty,
    bundlePromoPrice: product?.bundlePromoPrice,
  });
  if (!preview) return '';
  return `Economia por combo: ${formatCurrency(preview.economy)}`;
};

const createEmptyModifier = (index = 0) => ({
  id: `modifier-${Date.now()}-${index}`,
  name: '',
  price: '',
  active: true,
});

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('file_read_error'));
    reader.readAsDataURL(file);
  });

const compressImageFileToDataUrl = (file: File, maxEdge = 1280) =>
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

        let quality = 0.86;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 1_200_000 && quality > 0.62) {
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

export const ProductManager = ({ products, onProductsChange, storeSegment = 'outros' }) => {
  const { showToast } = useToast();
  const pendingDeleteTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const formRef = useRef<HTMLDivElement | null>(null);
  const createNameInputRef = useRef<HTMLInputElement | null>(null);
  const createCameraInputRef = useRef<HTMLInputElement | null>(null);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const inlineCameraInputRef = useRef<HTMLInputElement | null>(null);
  const inlineFileInputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState(null);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [mobileEditOpen, setMobileEditOpen] = useState(false);
  const [inlineCategorySelect, setInlineCategorySelect] = useState(initialForm.category);
  const [inlineCustomCategory, setInlineCustomCategory] = useState('');
  const [inlineForm, setInlineForm] = useState({
    name: '',
    price: '',
    promoPrice: '',
    promoActive: false,
    bundlePromoActive: false,
    bundlePromoQty: '',
    bundlePromoPrice: '',
    category: initialForm.category,
    description: '',
    imageUrl: '',
    isFeatured: false,
    active: true,
    availabilityDays: { ...defaultAvailability },
    modifiers: [],
  });
  const [inlineImageFile, setInlineImageFile] = useState('');
  const [inlineImagePreview, setInlineImagePreview] = useState('');
  const [formData, setFormData] = useState(initialForm);
  const [imagePreview, setImagePreview] = useState('');
  const [categorySelect, setCategorySelect] = useState(initialForm.category);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const categoryOptions = useMemo(() => {
    const segmentKey = normalizeCategory(storeSegment) || 'outros';
    const suggested = (SEGMENT_CATEGORY_SUGGESTIONS[segmentKey] || SEGMENT_CATEGORY_SUGGESTIONS.outros || [])
      .map((entry) => normalizeCategory(entry))
      .filter(Boolean);
    const baseDefaults = suggested.length
      ? suggested.map((entry) => ({
          id: entry,
          label: formatCategoryLabel(entry),
          icon: DotsThree,
        }))
      : defaultCategories.map((entry) => ({ id: entry.id, label: entry.label, icon: entry.icon }));
    const unique = new Set(baseDefaults.map((entry) => entry.id));
    (products || []).forEach((product) => {
      const key = normalizeCategory(product.category);
      if (key) unique.add(key);
    });
    const extras = Array.from(unique)
      .filter((entry) => !baseDefaults.find((item) => item.id === entry))
      .sort()
      .map((entry) => ({ id: entry, label: formatCategoryLabel(entry), icon: DotsThree }));
    return [ ...baseDefaults, ...extras ];
  }, [products, storeSegment]);

  const defaultCategoryId = useMemo(
    () => categoryOptions[0]?.id || initialForm.category,
    [categoryOptions]
  );

  useEffect(() => {
    if (!defaultCategoryId) return;
    setCategorySelect((prev) => (prev && prev !== initialForm.category ? prev : defaultCategoryId));
    setFormData((prev) => {
      const shouldReplace = !prev?.category || prev.category === initialForm.category;
      if (!shouldReplace) return prev;
      return { ...prev, category: defaultCategoryId };
    });
  }, [defaultCategoryId]);

  useEffect(() => {
    return () => {
      pendingDeleteTimersRef.current.forEach((timer) => clearTimeout(timer));
      pendingDeleteTimersRef.current.clear();
      if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
      if (inlineImagePreview?.startsWith('blob:')) URL.revokeObjectURL(inlineImagePreview);
    };
  }, [imagePreview, inlineImagePreview]);

  const categoryTabs = useMemo(() => {
    const counts = new Map();
    (products || []).forEach((product) => {
      const key = normalizeCategory(product.category || '');
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const tabs = [
      { id: 'all', label: 'Todos', count: products?.length || 0 },
      ...categoryOptions.map((entry) => ({
        id: entry.id,
        label: entry.label,
        count: counts.get(entry.id) || 0,
      })),
    ];
    return tabs;
  }, [products, categoryOptions]);

  const filteredProducts = useMemo(() => {
    if (categoryFilter === 'all') return products || [];
    return (products || []).filter(
      (product) => normalizeCategory(product.category) === categoryFilter
    );
  }, [products, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const pagedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page]);

  const resetForm = () => {
    setEditing(null);
    setFormData({ ...initialForm, category: defaultCategoryId });
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview('');
    setCategorySelect(defaultCategoryId);
    setCustomCategory('');
    setShowCustomInput(false);
  };

  const refreshProducts = async () => {
    if (!onProductsChange) return;
    try {
      const updated = await productService.list();
      onProductsChange(updated);
    } catch (error) {
      console.error('Não foi possível atualizar produtos', error);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name || !formData.price) return;
    if (categorySelect === '__custom__' && !formData.category) return;

    setSaving(true);
    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      promoPrice: formData.promoPrice ? parseFloat(formData.promoPrice) : undefined,
      promoActive: Boolean(formData.promoActive),
      bundlePromoQty: formData.bundlePromoQty ? Number(formData.bundlePromoQty) : undefined,
      bundlePromoPrice: formData.bundlePromoPrice ? parseFloat(formData.bundlePromoPrice) : undefined,
      bundlePromoActive: Boolean(formData.bundlePromoActive),
      imageFile: formData.imageFile || undefined,
      imageUrl: undefined,
      description: formData.description || undefined,
      availabilityDays: buildAvailabilityPayload(formData.availabilityDays),
      modifiers: normalizeProductModifiers(formData.modifiers || []),
    };

    try {
      await productService.save(payload);
      showToast('Produto adicionado com sucesso.', 'success');
      resetForm();
      await refreshProducts();
      // Fast data entry: jump back to "Nome do Produto" after a successful save.
      setTimeout(() => createNameInputRef.current?.focus(), 50);
    } catch (err) {
      showToast('Não foi possível salvar o produto.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product) => {
    const normalizedCategory = normalizeCategory(product.category || defaultCategoryId);
    const isKnown = categoryOptions.some((entry) => entry.id === normalizedCategory);
    setInlineCategorySelect(isKnown ? normalizedCategory : '__custom__');
    setInlineCustomCategory(isKnown ? '' : normalizedCategory);
    setInlineEditId(product.id);
    setInlineImageFile('');
    if (inlineImagePreview?.startsWith('blob:')) URL.revokeObjectURL(inlineImagePreview);
    setInlineImagePreview('');
    setInlineForm({
      name: product.name || '',
      price: product.price != null ? String(product.price) : '',
      promoPrice: product.promoPrice != null ? String(product.promoPrice) : '',
      promoActive: Boolean(product.promoActive),
      bundlePromoActive: Boolean(product.bundlePromoActive),
      bundlePromoQty: product.bundlePromoQty != null ? String(product.bundlePromoQty) : '',
      bundlePromoPrice: product.bundlePromoPrice != null ? String(product.bundlePromoPrice) : '',
      category: normalizedCategory || defaultCategoryId,
      description: product.description ?? product.desc ?? '',
      imageUrl: product.imageUrl || '',
      isFeatured: Boolean(product.isFeatured),
      active: product.active !== false,
      availabilityDays: normalizeAvailabilityState(product.availabilityDays),
      modifiers: normalizeProductModifiers(product.modifiers || []).map((modifier, index) => ({
        ...modifier,
        id: modifier.id || `modifier-${product.id}-${index + 1}`,
        price: String(modifier.price ?? ''),
      })),
    });
  };

  const handleEditMobile = (product, focusField?: 'price' | 'promo') => {
    handleEdit(product);
    setMobileEditOpen(true);
    if (focusField) {
      setTimeout(() => {
        const el = document.querySelector<HTMLInputElement>(`[data-product-edit="${focusField}"]`);
        el?.focus();
      }, 50);
    }
  };

  const handleInlineSave = async () => {
    if (!inlineEditId) return;
    if (!inlineForm.name || !inlineForm.price) return;
    setSaving(true);
    try {
      await productService.save({
        id: inlineEditId,
        name: inlineForm.name,
        price: parseFloat(inlineForm.price),
        promoPrice: inlineForm.promoPrice ? parseFloat(inlineForm.promoPrice) : undefined,
        promoActive: Boolean(inlineForm.promoActive),
        bundlePromoQty: inlineForm.bundlePromoQty ? Number(inlineForm.bundlePromoQty) : undefined,
        bundlePromoPrice: inlineForm.bundlePromoPrice ? parseFloat(inlineForm.bundlePromoPrice) : undefined,
        bundlePromoActive: Boolean(inlineForm.bundlePromoActive),
        category: inlineForm.category,
        description: inlineForm.description || undefined,
        imageUrl: inlineImageFile ? undefined : inlineForm.imageUrl || undefined,
        imageFile: inlineImageFile || undefined,
        isFeatured: inlineForm.isFeatured,
        active: inlineForm.active,
        availabilityDays: buildAvailabilityPayload(inlineForm.availabilityDays),
        modifiers: normalizeProductModifiers(inlineForm.modifiers || []),
      });
      showToast('Produto atualizado com sucesso.', 'success');
      setInlineEditId(null);
      setInlineImageFile('');
      setMobileEditOpen(false);
      await refreshProducts();
    } catch (error) {
      showToast('Não foi possível salvar o produto.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInlineCancel = () => {
    setInlineEditId(null);
    setInlineImageFile('');
    if (inlineImagePreview?.startsWith('blob:')) URL.revokeObjectURL(inlineImagePreview);
    setInlineImagePreview('');
    setMobileEditOpen(false);
  };

  const handleToggleActive = async (product) => {
    if (!product?.id) return;
    setSaving(true);
    try {
      await productService.save({
        id: product.id,
        active: !product.active,
      });
      showToast(
        product.active ? 'Produto desativado.' : 'Produto ativado.',
        'success'
      );
      await refreshProducts();
    } catch (error) {
      showToast('Não foi possível atualizar o status do produto.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const finalizeDeleteProduct = async (productId: string) => {
    setSaving(true);
    try {
      await productService.delete(productId);
      showToast('Produto removido com sucesso.', 'success');
      try {
        await refreshProducts();
      } catch (refreshError) {
        console.warn('Produto removido, mas a lista não atualizou imediatamente.', refreshError);
      }
    } catch (error: any) {
      const message = (error?.message || '').toString();
      if (error?.code === 'PROD-001' || error?.status === 404 || message.includes('Produto')) {
        showToast('Produto removido com sucesso.', 'success');
        try {
          await refreshProducts();
        } catch (refreshError) {
          console.warn('Produto removido, mas a lista não atualizou imediatamente.', refreshError);
        }
        return;
      }
      showToast('Não foi possível remover o produto.', 'error');
    } finally {
      setSaving(false);
      setPendingDeleteIds((prev) => prev.filter((id) => id !== productId));
      const timer = pendingDeleteTimersRef.current.get(productId);
      if (timer) {
        clearTimeout(timer);
        pendingDeleteTimersRef.current.delete(productId);
      }
    }
  };

  const handleDeleteProduct = (product: any) => {
    const productId = String(product?.id || '').trim();
    if (!productId) return;
    if (pendingDeleteTimersRef.current.has(productId)) return;
    setPendingDeleteIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
    const timer = setTimeout(() => {
      pendingDeleteTimersRef.current.delete(productId);
      void finalizeDeleteProduct(productId);
    }, 6000);
    pendingDeleteTimersRef.current.set(productId, timer);
    showToast(`"${product?.name || 'Produto'}" será removido em 6s.`, 'warning', {
      actionLabel: 'Desfazer',
      durationMs: 6500,
      onAction: () => {
        const runningTimer = pendingDeleteTimersRef.current.get(productId);
        if (runningTimer) {
          clearTimeout(runningTimer);
          pendingDeleteTimersRef.current.delete(productId);
        }
        setPendingDeleteIds((prev) => prev.filter((id) => id !== productId));
        showToast('Remoção cancelada.', 'info');
      },
    });
  };

  const handleUpload = async (file) => {
    if (!file) {
      setFormData((prev) => ({ ...prev, imageFile: '' }));
      if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
      setImagePreview('');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview(objectUrl);

    try {
      const compressed = await compressImageFileToDataUrl(file);
      setFormData((prev) => ({ ...prev, imageFile: compressed, imageUrl: '' }));
    } catch (error) {
      console.error('Falha ao comprimir imagem do produto', error);
      try {
        const fallback = await readFileAsDataUrl(file);
        setFormData((prev) => ({ ...prev, imageFile: fallback, imageUrl: '' }));
      } catch {
        showToast('Não foi possível processar a imagem.', 'error');
      }
    }
  };

  const handleInlineUpload = async (file) => {
    if (!file) {
      setInlineImageFile('');
      if (inlineImagePreview?.startsWith('blob:')) URL.revokeObjectURL(inlineImagePreview);
      setInlineImagePreview('');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    if (inlineImagePreview?.startsWith('blob:')) URL.revokeObjectURL(inlineImagePreview);
    setInlineImagePreview(objectUrl);

    try {
      const compressed = await compressImageFileToDataUrl(file);
      setInlineImageFile(compressed);
      setInlineForm((prev) => ({ ...prev, imageUrl: '' }));
    } catch (error) {
      console.error('Falha ao comprimir imagem de edição do produto', error);
      try {
        const fallback = await readFileAsDataUrl(file);
        setInlineImageFile(fallback);
        setInlineForm((prev) => ({ ...prev, imageUrl: '' }));
      } catch {
        showToast('Não foi possível processar a imagem.', 'error');
      }
    }
  };


  return (
    <div className="space-y-6">
      <div
        ref={formRef}
        className="overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/70 p-5 sm:p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]"
      >
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Plus size={20} weight="duotone" className="text-brand-primary" />
              Cadastro de produto
            </h3>
            <p className="mt-1 text-xs text-slate-500">Cadastre itens da vitrine com foto, preço e categoria.</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold border border-brand-primary/25 bg-brand-primary-soft text-brand-primary">
            Novo item
          </span>
        </div>

        <div className="grid gap-6">
          <form onSubmit={handleSubmit} className="space-y-4 w-full">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nome do Produto</label>
              <input
                className="p-3 border border-gray-200 rounded-xl w-full bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="Nome do produto"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                ref={createNameInputRef}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Preço</label>
              <input
                className="p-3 border border-gray-200 rounded-xl w-full bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="0.00"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
          </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Preço promocional (opcional)</label>
              <input
                className="p-3 border border-gray-200 rounded-xl w-full bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="0.00"
                type="number"
                step="0.01"
                value={formData.promoPrice}
                onChange={(e) => setFormData({ ...formData, promoPrice: e.target.value })}
              />
              <p className="text-[11px] text-slate-500">Se ativo, este valor será usado no pedido.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Ativar promoção no pedido</label>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Promoção ativa</p>
                  <p className="text-[11px] text-slate-500">Aplica o preço promocional.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, promoActive: !prev.promoActive }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    formData.promoActive
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {formData.promoActive ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-800">Promoção por quantidade</p>
                <p className="text-[11px] text-emerald-700">Ex.: 2 unidades por R$ 16,00</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, bundlePromoActive: !prev.bundlePromoActive }))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  formData.bundlePromoActive
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {formData.bundlePromoActive ? 'Ativo' : 'Inativo'}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.15em]">Leve</label>
                <input
                  className="p-3 border border-gray-200 rounded-xl w-full bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="2"
                  type="number"
                  min="2"
                  step="1"
                  value={formData.bundlePromoQty}
                  onChange={(e) => setFormData({ ...formData, bundlePromoQty: e.target.value })}
                  disabled={!formData.bundlePromoActive}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.15em]">Pague</label>
                <input
                  className="p-3 border border-gray-200 rounded-xl w-full bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="16.00"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.bundlePromoPrice}
                  onChange={(e) => setFormData({ ...formData, bundlePromoPrice: e.target.value })}
                  disabled={!formData.bundlePromoActive}
                />
              </div>
            </div>
            {(() => {
              const preview = getBundleEconomyPreview({
                unitPrice: formData.price,
                promoActive: formData.promoActive,
                promoPrice: formData.promoPrice,
                bundlePromoActive: formData.bundlePromoActive,
                bundlePromoQty: formData.bundlePromoQty,
                bundlePromoPrice: formData.bundlePromoPrice,
              });
              if (!preview) return null;
              return (
                <p className="mt-2 text-[11px] font-semibold text-emerald-700">
                  Economia por combo: {formatCurrency(preview.economy)} (de {formatCurrency(preview.regular)} por {formatCurrency(Number(formData.bundlePromoPrice || 0))})
                </p>
              );
            })()}
          </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
            <label className="text-sm font-medium text-gray-700">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = categorySelect === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setCategorySelect(option.id);
                      setCustomCategory('');
                      setShowCustomInput(false);
                      setFormData({ ...formData, category: option.id });
                    }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium text-sm transition-all hover:-translate-y-0.5 active:scale-95 ${
                      isSelected
                        ? 'bg-brand-primary text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon size={16} weight="duotone" />
                    {option.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setShowCustomInput(!showCustomInput);
                  if (showCustomInput) {
                    setCustomCategory('');
                    setCategorySelect(defaultCategoryId);
                    setFormData({ ...formData, category: defaultCategoryId });
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium text-sm transition-all hover:-translate-y-0.5 active:scale-95 border-2 ${
                  showCustomInput
                    ? 'border-brand-primary bg-brand-primary-soft text-brand-primary'
                    : 'border-gray-300 border-dashed text-gray-600 hover:border-brand-primary hover:text-brand-primary'
                }`}
              >
                <Plus size={16} weight="duotone" />
                Nova
              </button>
            </div>
            {showCustomInput && (
              <input
                className="mt-3 p-3 border border-gray-200 rounded-xl w-full bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="Digite o nome da nova categoria"
                value={customCategory}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomCategory(value);
                  setFormData({ ...formData, category: normalizeCategory(value) });
                }}
                autoFocus
              />
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <label className="text-sm font-medium text-gray-700">Imagem do Produto</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => createCameraInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 text-white shadow-sm hover:bg-slate-800 transition-all"
              >
                Tirar Foto
              </button>
              <button
                type="button"
                onClick={() => createFileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Selecionar Arquivo
              </button>
              <input
                ref={createCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleUpload(e.target.files?.[0])}
                className="hidden"
              />
              <input
                ref={createFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleUpload(e.target.files?.[0])}
                className="hidden"
              />
            </div>
            <div className="relative h-[200px] w-[200px] rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview do produto"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-center px-3">
                  <ImageIcon size={22} weight="duotone" className="mx-auto text-slate-400 mb-1" />
                  <p className="text-xs text-slate-500">Prévia 200x200</p>
                </div>
              )}
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
                    setImagePreview('');
                    setFormData({ ...formData, imageUrl: '', imageFile: '' });
                  }}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all shadow-lg"
                >
                  <Trash size={16} weight="duotone" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <label className="text-sm font-medium text-gray-700">Descrição (opcional)</label>
            <textarea
              className="p-3 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              placeholder="Descreva o produto..."
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="space-y-3 rounded-2xl border border-dashed border-brand-primary/30 bg-brand-primary-soft/20 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-slate-800">Adicionais (opcional)</label>
              <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-600">
                {(formData.modifiers || []).length} item{(formData.modifiers || []).length === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    modifiers: [ ...(prev.modifiers || []), createEmptyModifier((prev.modifiers || []).length) ],
                  }))
                }
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                + Adicional
              </button>
            </div>
            {(formData.modifiers || []).length === 0 ? (
              <p className="text-xs text-slate-500">Ex.: Ovo, Bacon, Calabresa (cada um com preço extra).</p>
            ) : (
              <div className="space-y-2">
                {(formData.modifiers || []).map((modifier, index) => (
                  <div key={modifier.id || index} className="grid grid-cols-1 md:grid-cols-[1fr_160px_auto] gap-2 items-center">
                    <input
                      className="p-3 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                      placeholder="Nome do adicional"
                      value={modifier.name || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          modifiers: (prev.modifiers || []).map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, name: e.target.value } : entry
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      step="0.01"
                      className="p-3 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                      placeholder="Preço extra"
                      value={modifier.price || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          modifiers: (prev.modifiers || []).map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, price: e.target.value } : entry
                          ),
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          modifiers: (prev.modifiers || []).filter((_, entryIndex) => entryIndex !== index),
                        }))
                      }
                      className="px-3 py-2 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <label className="text-sm font-medium text-gray-700">Dias de exibição</label>
            <div className="grid grid-cols-7 gap-2">
              {WEEK_DAYS.map((day) => (
                <label
                  key={day.key}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                    formData.availabilityDays?.[day.key]
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-emerald-600"
                    checked={Boolean(formData.availabilityDays?.[day.key])}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        availabilityDays: {
                          ...normalizeAvailabilityState(prev.availabilityDays),
                          [day.key]: e.target.checked,
                        },
                      }))
                    }
                  />
                  {day.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Se nenhum dia for marcado, o produto aparece todos os dias.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:px-5">
            <div>
              <p className="text-sm font-semibold text-slate-800">Promoção do dia</p>
              <p className="text-xs text-slate-500">Destaque este produto no topo da vitrine.</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, isFeatured: !prev.isFeatured }))}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                formData.isFeatured
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {formData.isFeatured ? 'Ativo' : 'Ativar'}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="bg-brand-gradient text-white px-6 py-3 rounded-xl font-semibold flex-1 flex justify-center items-center gap-2 hover:opacity-95 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 shadow-[0_14px_28px_-18px_rgba(59,130,246,0.8)]"
              disabled={saving}
            >
              <FloppyDisk size={18} weight="duotone" />
              {saving ? 'Salvando...' : 'Adicionar Produto'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-white border border-slate-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              Limpar
            </button>
          </div>
          </form>

        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_16px_34px_-26px_rgba(15,23,42,0.45)]">
        <div className="px-4 py-3 border-b border-slate-100 bg-white">
          <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setCategoryFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors duration-150 ${
                  categoryFilter === tab.id
                    ? 'bg-white text-slate-900 border-slate-300 shadow-sm'
                    : 'bg-transparent text-slate-600 border-transparent hover:bg-white/70'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>
        <div className="sm:hidden space-y-3">
          {pagedProducts.map((product) => (
            <div
              key={product.id}
              className={`rounded-2xl border border-slate-200 ${resolveCategoryAccent(product.category)} border-l-4 bg-gradient-to-br from-white via-white to-slate-50/60 p-4 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.38)]`}
            >
              <div className="flex items-start gap-3">
                {product.imageUrl ? (
                  <img src={resolveAssetUrl(product.imageUrl)} className="w-12 h-12 rounded-xl object-cover" alt="" />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <ImageIcon size={16} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">{product.name}</p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        product.active === false
                          ? 'bg-slate-100 text-slate-500 border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {product.active === false ? 'Inativo' : 'Ativo'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{formatCategoryLabel(product.category)}</p>
                  <div className="mt-1">
                    {renderAvailabilityBadges(product.availabilityDays)}
                  </div>
                  <div className="mt-2">
                    {product.promoActive && product.promoPrice ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs line-through text-slate-400">
                          {formatCurrency(product.price)}
                        </span>
                        <span className="text-emerald-600 font-bold">
                          {formatCurrency(product.promoPrice)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-brand-primary font-bold">{formatCurrency(product.price)}</span>
                    )}
                    {product.bundlePromoActive && Number(product.bundlePromoQty) >= 2 && Number(product.bundlePromoPrice) > 0 && (
                      <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                        {product.bundlePromoQty} por {formatCurrency(product.bundlePromoPrice)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditMobile(product)}
                    className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditMobile(product, 'price')}
                    className="px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-xs font-semibold"
                  >
                    Editar preço
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(product)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                      product.active === false
                        ? 'border-emerald-200 text-emerald-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {product.active === false ? 'Ativar' : 'Desativar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteProduct(product);
                    }}
                    disabled={pendingDeleteIds.includes(product.id)}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pendingDeleteIds.includes(product.id) ? 'Agendado...' : 'Excluir'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left min-w-[680px]">
          <thead className="bg-slate-50/90 border-b border-slate-200">
            <tr>
              <th className="p-4 text-[11px] uppercase tracking-[0.18em] font-bold text-slate-500">Foto</th>
              <th className="p-4 text-[11px] uppercase tracking-[0.18em] font-bold text-slate-500">Nome</th>
              <th className="p-4 text-[11px] uppercase tracking-[0.18em] font-bold text-slate-500">Categoria</th>
              <th className="p-4 text-[11px] uppercase tracking-[0.18em] font-bold text-slate-500">Preço</th>
              <th className="p-4 text-[11px] uppercase tracking-[0.18em] font-bold text-slate-500">Status</th>
              <th className="p-4 text-[11px] uppercase tracking-[0.18em] font-bold text-slate-500">Dias</th>
              <th className="p-4 text-[11px] uppercase tracking-[0.18em] font-bold text-slate-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagedProducts.map((product) => (
              <React.Fragment key={product.id}>
              <tr
                className={`group hover:bg-slate-50/75 transition-colors duration-150 ${
                  inlineEditId === product.id ? 'bg-amber-50/60' : ''
                } ${product.active === false ? 'opacity-70' : ''}`}
              >
                <td className="p-4">
                  {product.imageUrl ? (
                    <img src={resolveAssetUrl(product.imageUrl)} className="w-10 h-10 rounded object-cover" alt="" />
                  ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                        <ImageIcon size={16} className="text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex h-2 w-2 rounded-full ${resolveCategoryDot(product.category)}`} />
                      <span>{product.name}</span>
                      {product.isFeatured && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Promo do dia
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const Icon = getCategoryIcon(product.category);
                        return <Icon size={16} className="text-brand-primary" />;
                      })()}
                      <span className="text-sm text-gray-600">{formatCategoryLabel(product.category)}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {product.promoActive && product.promoPrice ? (
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-slate-400 line-through">
                          {formatCurrency(product.price)}
                        </span>
                        <span className="text-emerald-600 font-bold">
                          {formatCurrency(product.promoPrice)}
                        </span>
                        {product.bundlePromoActive && Number(product.bundlePromoQty) >= 2 && Number(product.bundlePromoPrice) > 0 && (
                          <span
                            className="text-[10px] font-semibold text-emerald-700 cursor-help"
                            title={getBundleEconomyLabel(product)}
                          >
                            {product.bundlePromoQty} por {formatCurrency(product.bundlePromoPrice)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-brand-primary font-bold">{formatCurrency(product.price)}</span>
                        {product.bundlePromoActive && Number(product.bundlePromoQty) >= 2 && Number(product.bundlePromoPrice) > 0 && (
                          <span
                            className="text-[10px] font-semibold text-emerald-700 cursor-help"
                            title={getBundleEconomyLabel(product)}
                          >
                            {product.bundlePromoQty} por {formatCurrency(product.bundlePromoPrice)}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                        product.active === false
                          ? 'bg-slate-100 text-slate-500 border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {product.active === false ? 'Inativo' : 'Ativo'}
                    </span>
                  </td>
                  <td className="p-4">
                    {renderAvailabilityBadges(product.availabilityDays)}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleEditMobile(product)}
                      className="text-brand-primary hover:bg-brand-primary-soft p-2 rounded transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                      <PencilSimple size={18} weight="duotone" />
                    </button>
                    <button
                      onClick={() => handleEditMobile(product, 'price')}
                      className="text-amber-600 hover:bg-amber-50 p-2 rounded transition-all hover:-translate-y-0.5 active:scale-95"
                      title="Editar preço"
                    >
                      R$
                    </button>
                    <button
                      onClick={() => handleToggleActive(product)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:-translate-y-0.5 active:scale-95 ${
                        product.active === false
                          ? 'text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                          : 'text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                      title={product.active === false ? 'Ativar produto' : 'Desativar produto'}
                    >
                      {product.active === false ? 'Ativar' : 'Pausar'}
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteProduct(product);
                      }}
                      disabled={pendingDeleteIds.includes(product.id)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:translate-y-0 disabled:active:scale-100"
                    >
                  <Trash size={18} weight="duotone" />
                    </button>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-white">
          <p className="text-xs text-slate-500">
            Exibindo {pagedProducts.length} de {filteredProducts.length} produtos
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              Anterior
            </button>
            <span className="text-xs text-slate-500">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
      {mobileEditOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            onClick={handleInlineCancel}
          />
          <div className="relative w-full max-h-[92vh] overflow-y-auto rounded-t-3xl border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50/70 p-5 pb-24 shadow-[0_30px_70px_-34px_rgba(15,23,42,0.65)] sm:max-w-2xl sm:rounded-3xl sm:p-6 sm:pb-24">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Editar produto</p>
                <p className="text-lg font-black text-slate-900">{inlineForm.name || 'Produto'}</p>
              </div>
              <button
                type="button"
                onClick={handleInlineCancel}
                className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Nome</label>
                <input
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm mt-2 bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  value={inlineForm.name}
                  onChange={(e) => setInlineForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
                <div className="min-w-0">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Preço</label>
                <input
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm mt-2 bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  type="number"
                  step="0.01"
                  value={inlineForm.price}
                  data-product-edit="price"
                  onChange={(e) => setInlineForm((prev) => ({ ...prev, price: e.target.value }))}
                />
                </div>
                <div className="min-w-0">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Promo</label>
                <input
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm mt-2 bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  type="number"
                  step="0.01"
                  value={inlineForm.promoPrice}
                  data-product-edit="promo"
                  onChange={(e) => setInlineForm((prev) => ({ ...prev, promoPrice: e.target.value }))}
                />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Categoria</label>
                <select
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm mt-2 bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  value={inlineCategorySelect}
                  onChange={(e) => {
                    const value = e.target.value;
                    setInlineCategorySelect(value);
                    if (value === '__custom__') {
                      const normalized = normalizeCategory(inlineCustomCategory);
                      setInlineForm((prev) => ({ ...prev, category: normalized || prev.category }));
                    } else {
                      setInlineCustomCategory('');
                      setInlineForm((prev) => ({ ...prev, category: value }));
                    }
                  }}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                  <option value="__custom__">+ Nova categoria</option>
                </select>
                {inlineCategorySelect === '__custom__' && (
                  <input
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm mt-2 bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    placeholder="Digite a nova categoria"
                    value={inlineCustomCategory}
                    onChange={(e) => {
                      const value = e.target.value;
                      setInlineCustomCategory(value);
                      setInlineForm((prev) => ({ ...prev, category: normalizeCategory(value) }));
                    }}
                    autoFocus
                  />
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Descrição</label>
                <textarea
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm mt-2 min-h-[100px] bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  value={inlineForm.description}
                  onChange={(e) => setInlineForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="rounded-2xl border border-dashed border-brand-primary/30 bg-brand-primary-soft/20 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Adicionais</label>
                  <button
                    type="button"
                    onClick={() =>
                      setInlineForm((prev) => ({
                        ...prev,
                        modifiers: [ ...(prev.modifiers || []), createEmptyModifier((prev.modifiers || []).length) ],
                      }))
                    }
                    className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700"
                  >
                    + Adicional
                  </button>
                </div>
                {(inlineForm.modifiers || []).length === 0 ? (
                  <p className="mt-2 text-[11px] text-slate-500">Sem adicionais cadastrados.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {(inlineForm.modifiers || []).map((modifier, index) => (
                      <div key={modifier.id || index} className="grid grid-cols-[1fr_120px_auto] gap-2 items-center">
                        <input
                          className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                          placeholder="Nome"
                          value={modifier.name || ''}
                          onChange={(e) =>
                            setInlineForm((prev) => ({
                              ...prev,
                              modifiers: (prev.modifiers || []).map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, name: e.target.value } : entry
                              ),
                            }))
                          }
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                          placeholder="0.00"
                          value={modifier.price || ''}
                          onChange={(e) =>
                            setInlineForm((prev) => ({
                              ...prev,
                              modifiers: (prev.modifiers || []).map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, price: e.target.value } : entry
                              ),
                            }))
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setInlineForm((prev) => ({
                              ...prev,
                              modifiers: (prev.modifiers || []).filter((_, entryIndex) => entryIndex !== index),
                            }))
                          }
                          className="px-2 py-2 rounded-xl border border-rose-200 text-[11px] font-semibold text-rose-700 bg-rose-50"
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Dias de exibição</label>
                <div className="mt-3 grid grid-cols-7 gap-2">
                  {WEEK_DAYS.map((day) => (
                    <label
                      key={day.key}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-semibold transition ${
                        inlineForm.availabilityDays?.[day.key]
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-emerald-600"
                        checked={Boolean(inlineForm.availabilityDays?.[day.key])}
                        onChange={(e) =>
                          setInlineForm((prev) => ({
                            ...prev,
                            availabilityDays: {
                              ...normalizeAvailabilityState(prev.availabilityDays),
                              [day.key]: e.target.checked,
                            },
                          }))
                        }
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Se nenhum dia for marcado, o produto aparece todos os dias.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
                <button
                  type="button"
                  onClick={() => setInlineForm((prev) => ({ ...prev, promoActive: !prev.promoActive }))}
                  className={`py-3 rounded-xl text-sm font-semibold border ${
                    inlineForm.promoActive
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {inlineForm.promoActive ? 'Promo ativa' : 'Promo inativa'}
                </button>
                <button
                  type="button"
                  onClick={() => setInlineForm((prev) => ({ ...prev, isFeatured: !prev.isFeatured }))}
                  className={`py-3 rounded-xl text-sm font-semibold border ${
                    inlineForm.isFeatured
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {inlineForm.isFeatured ? 'Destaque ativo' : 'Ativar destaque'}
                </button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Imagem</label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => inlineCameraInputRef.current?.click()}
                    className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
                  >
                    Tirar Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => inlineFileInputRef.current?.click()}
                    className="px-3 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
                  >
                    Selecionar Arquivo
                  </button>
                  <input
                    ref={inlineCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleInlineUpload(e.target.files?.[0])}
                    className="hidden"
                  />
                  <input
                    ref={inlineFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleInlineUpload(e.target.files?.[0])}
                    className="hidden"
                  />
                </div>
                <div className="mt-3 relative h-[200px] w-[200px] rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                  {inlineImagePreview || inlineForm.imageUrl ? (
                    <img
                      src={inlineImagePreview || resolveAssetUrl(inlineForm.imageUrl)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">Sem imagem</span>
                  )}
                  {(inlineImagePreview || inlineImageFile || inlineForm.imageUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (inlineImagePreview?.startsWith('blob:')) URL.revokeObjectURL(inlineImagePreview);
                        setInlineImageFile('');
                        setInlineImagePreview('');
                        setInlineForm((prev) => ({ ...prev, imageUrl: '' }));
                      }}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all"
                    >
                      <Trash size={16} weight="duotone" />
                    </button>
                  )}
                </div>
              </div>
              <div
                className="sticky bottom-0 z-20 -mx-5 mt-4 border-t border-slate-200 bg-white/90 px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-xl sm:-mx-6 sm:px-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto flex w-full max-w-2xl gap-3">
                <button
                  type="button"
                  onClick={handleInlineCancel}
                  className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleInlineSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-brand-gradient text-white text-sm font-semibold shadow-[0_12px_24px_-16px_rgba(59,130,246,0.85)] hover:opacity-95 disabled:opacity-60"
                >
                  Salvar
                </button>
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-emerald-700 uppercase tracking-[0.2em]">Combo promocional</label>
                  <button
                    type="button"
                    onClick={() => setInlineForm((prev) => ({ ...prev, bundlePromoActive: !prev.bundlePromoActive }))}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                      inlineForm.bundlePromoActive
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {inlineForm.bundlePromoActive ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Leve</label>
                    <input
                      className="w-full p-3 border border-gray-200 rounded-xl text-sm mt-1 bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                      type="number"
                      step="1"
                      min="2"
                      value={inlineForm.bundlePromoQty}
                      onChange={(e) => setInlineForm((prev) => ({ ...prev, bundlePromoQty: e.target.value }))}
                      disabled={!inlineForm.bundlePromoActive}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Pague</label>
                    <input
                      className="w-full p-3 border border-gray-200 rounded-xl text-sm mt-1 bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                      type="number"
                      step="0.01"
                      min="0"
                      value={inlineForm.bundlePromoPrice}
                      onChange={(e) => setInlineForm((prev) => ({ ...prev, bundlePromoPrice: e.target.value }))}
                      disabled={!inlineForm.bundlePromoActive}
                    />
                  </div>
                </div>
                {(() => {
                  const preview = getBundleEconomyPreview({
                    unitPrice: inlineForm.price,
                    promoActive: inlineForm.promoActive,
                    promoPrice: inlineForm.promoPrice,
                    bundlePromoActive: inlineForm.bundlePromoActive,
                    bundlePromoQty: inlineForm.bundlePromoQty,
                    bundlePromoPrice: inlineForm.bundlePromoPrice,
                  });
                  if (!preview) return null;
                  return (
                    <p className="mt-2 text-[11px] font-semibold text-emerald-700">
                      Economia por combo: {formatCurrency(preview.economy)}
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
