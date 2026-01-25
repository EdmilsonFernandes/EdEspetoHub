// @ts-nocheck
import React, { useMemo, useRef, useState } from 'react';
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

const initialForm = { name: '', price: '', promoPrice: '', promoActive: false, category: 'espetos', imageUrl: '', imageFile: '', description: '', isFeatured: false, active: true };
const defaultCategories = [
  { id: 'espetos', label: 'Espetos', icon: Fire },
  { id: 'bebidas', label: 'Bebidas', icon: Wine },
  { id: 'porcoes', label: 'Porções', icon: Package },
  { id: 'outros', label: 'Outros', icon: DotsThree },
];

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

export const ProductManager = ({ products, onProductsChange }) => {
  const { showToast } = useToast();
  const formRef = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState(null);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [mobileEditOpen, setMobileEditOpen] = useState(false);
  const [inlineForm, setInlineForm] = useState({
    name: '',
    price: '',
    promoPrice: '',
    promoActive: false,
    category: initialForm.category,
    description: '',
    imageUrl: '',
    isFeatured: false,
    active: true,
  });
  const [inlineImageFile, setInlineImageFile] = useState('');
  const [formData, setFormData] = useState(initialForm);
  const [imageMode, setImageMode] = useState('url');
  const [imagePreview, setImagePreview] = useState('');
  const [categorySelect, setCategorySelect] = useState(initialForm.category);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const categoryOptions = useMemo(() => {
    const unique = new Set(defaultCategories.map((entry) => entry.id));
    (products || []).forEach((product) => {
      const key = normalizeCategory(product.category);
      if (key) unique.add(key);
    });
    const known = defaultCategories.map((entry) => ({
      id: entry.id,
      label: entry.label,
      icon: entry.icon,
    }));
    const extras = Array.from(unique)
      .filter((entry) => !defaultCategories.find((item) => item.id === entry))
      .sort()
      .map((entry) => ({ id: entry, label: formatCategoryLabel(entry), icon: DotsThree }));
    return [ ...known, ...extras ];
  }, [products]);

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
    setFormData(initialForm);
    setImageMode('url');
    setImagePreview('');
    setCategorySelect(initialForm.category);
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
      imageFile: imageMode === 'upload' ? formData.imageFile : undefined,
      imageUrl: imageMode === 'url' ? formData.imageUrl : undefined,
      description: formData.description || undefined,
    };

    try {
      await productService.save(payload);
      showToast('Produto adicionado com sucesso.', 'success');
      resetForm();
      await refreshProducts();
    } catch (err) {
      showToast('Não foi possível salvar o produto.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product) => {
    setInlineEditId(product.id);
    setInlineImageFile('');
    setInlineForm({
      name: product.name || '',
      price: product.price != null ? String(product.price) : '',
      promoPrice: product.promoPrice != null ? String(product.promoPrice) : '',
      promoActive: Boolean(product.promoActive),
      category: product.category || initialForm.category,
      description: product.description ?? product.desc ?? '',
      imageUrl: product.imageUrl || '',
      isFeatured: Boolean(product.isFeatured),
      active: product.active !== false,
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
        category: inlineForm.category,
        description: inlineForm.description || undefined,
        imageUrl: inlineImageFile ? undefined : inlineForm.imageUrl || undefined,
        imageFile: inlineImageFile || undefined,
        isFeatured: inlineForm.isFeatured,
        active: inlineForm.active,
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

  const handleUpload = (file) => {
    if (!file) {
      setFormData((prev) => ({ ...prev, imageFile: '' }));
      setImagePreview('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString() || '';
      setFormData((prev) => ({ ...prev, imageFile: result }));
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const previewPrice =
    formData.price && !Number.isNaN(Number(formData.price))
      ? formatCurrency(Number(formData.price))
      : '—';
  const previewPromoPrice =
    formData.promoActive && formData.promoPrice && !Number.isNaN(Number(formData.promoPrice))
      ? formatCurrency(Number(formData.promoPrice))
      : '';
  const previewCategory =
    categorySelect === '__custom__'
      ? formatCategoryLabel(formData.category)
      : formatCategoryLabel(categorySelect || initialForm.category);
  const previewImage = imagePreview || formData.imageUrl;

  return (
    <div className="space-y-6">
      <div ref={formRef} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus size={20} weight="duotone" className="text-brand-primary" />
              Cadastro de produto
            </h3>
            <p className="text-xs text-slate-500 mt-1">Cadastre itens do cardápio com foto, preço e categoria.</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary-soft text-brand-primary">
            Novo item
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nome do Produto</label>
              <input
                className="p-3 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="Ex: Espeto de Carne"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Preço</label>
              <input
                className="p-3 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="Ex: 10.50"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Preço promocional (opcional)</label>
              <input
                className="p-3 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="Ex: 8.90"
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

          <div className="space-y-2">
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all hover:-translate-y-0.5 active:scale-95 ${
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
                    setCategorySelect(initialForm.category);
                    setFormData({ ...formData, category: initialForm.category });
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all hover:-translate-y-0.5 active:scale-95 border-2 ${
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
                className="p-3 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-brand-primary focus:border-transparent mt-3"
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

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Imagem do Produto</label>

            {/* Toggle buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setImageMode('url')}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5 active:scale-95 ${
                  imageMode === 'url'
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                URL da Imagem
              </button>
              <button
                type="button"
                onClick={() => setImageMode('upload')}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5 active:scale-95 ${
                  imageMode === 'upload'
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Fazer Upload
              </button>
            </div>

            {/* URL input */}
            {imageMode === 'url' && (
              <div className="space-y-2">
                <input
                  className="p-3 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={formData.imageUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    setImagePreview(e.target.value);
                  }}
                />
                {imagePreview && (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 max-w-48">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview('');
                        setFormData({ ...formData, imageUrl: '', imageFile: '' });
                      }}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all hover:-translate-y-0.5 active:scale-95 shadow-lg"
                    >
                      <Trash size={18} weight="duotone" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Upload area */}
            {imageMode === 'upload' && (
              <div className="space-y-2">
                {!imagePreview && (
                  <label className="relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-brand-primary hover:bg-brand-primary/5 transition">
                    <div className="flex flex-col items-center justify-center">
                    <ImageIcon size={24} weight="duotone" className="text-gray-400 mb-2" />
                      <p className="text-sm font-semibold text-gray-700">Arraste uma imagem aqui</p>
                      <p className="text-xs text-gray-500">ou clique para selecionar</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUpload(e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                )}
                {imagePreview && (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 max-w-48">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-48 h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview('');
                        setFormData({ ...formData, imageUrl: '', imageFile: '' });
                      }}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all hover:-translate-y-0.5 active:scale-95 shadow-lg"
                    >
                      <Trash size={18} weight="duotone" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Descrição (opcional)</label>
            <textarea
              className="p-3 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              placeholder="Descreva o produto..."
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Promoção do dia</p>
              <p className="text-xs text-slate-500">Destaque este produto no topo do cardápio.</p>
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
              className="bg-brand-primary text-white px-6 py-3 rounded-lg font-semibold flex-1 flex justify-center items-center gap-2 hover:bg-brand-primary/90 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
              disabled={saving}
            >
              <FloppyDisk size={18} weight="duotone" />
              {saving ? 'Salvando...' : 'Adicionar Produto'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              Limpar
            </button>
          </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pré-visualização</p>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
              {previewImage ? (
                <img src={previewImage} alt="Prévia do produto" className="w-full h-44 object-cover" />
              ) : (
                <div className="h-44 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                  <ImageIcon size={20} weight="duotone" />
                  Adicione uma foto para destacar o produto
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-base font-semibold text-slate-900 truncate">
                  {formData.name || 'Nome do produto'}
                </h4>
                <div className="flex items-center gap-2">
                  {previewPromoPrice ? (
                    <>
                      <span className="text-xs font-semibold text-slate-400 line-through">
                        {previewPrice}
                      </span>
                      <span className="text-sm font-bold text-emerald-600">{previewPromoPrice}</span>
                    </>
                  ) : (
                    <span className="text-sm font-bold text-brand-primary">{previewPrice}</span>
                  )}
                </div>
              </div>
              {formData.isFeatured && (
                <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Promoção do dia
                </span>
              )}
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600">
                {previewCategory || 'Categoria'}
              </span>
              <p className="text-xs text-slate-500">
                {formData.description || 'Adicione uma descrição curta para ajudar o cliente.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div className="rounded-lg border border-slate-200 bg-white px-2 py-2">
                Imagem: {imageMode === 'upload' ? 'Upload' : 'URL'}
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-2 py-2">
                Status: {saving ? 'Salvando...' : 'Pronto'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setCategoryFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:-translate-y-0.5 active:scale-95 ${
                categoryFilter === tab.id
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        <div className="sm:hidden space-y-3">
          {pagedProducts.map((product) => (
            <div key={product.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                {product.imageUrl ? (
                  <img src={product.imageUrl} className="w-12 h-12 rounded-xl object-cover" alt="" />
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
                      if (!window.confirm('Excluir produto?')) return;
                      setSaving(true);
                      productService
                        .delete(product.id)
                        .then(async () => {
                          showToast('Produto removido com sucesso.', 'success');
                          await refreshProducts();
                        })
                        .catch(async (error) => {
                          const message = (error?.message || '').toString();
                          if (error?.code === 'PROD-001' || error?.status === 404 || message.includes('Produto')) {
                            showToast('Produto removido com sucesso.', 'success');
                            await refreshProducts();
                            return;
                          }
                          showToast('Não foi possível remover o produto.', 'error');
                        })
                        .finally(() => setSaving(false));
                    }}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left min-w-[680px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-bold text-gray-600">Foto</th>
              <th className="p-4 font-bold text-gray-600">Nome</th>
              <th className="p-4 font-bold text-gray-600">Categoria</th>
              <th className="p-4 font-bold text-gray-600">Preço</th>
              <th className="p-4 font-bold text-gray-600">Status</th>
              <th className="p-4 font-bold text-gray-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pagedProducts.map((product) => (
              <React.Fragment key={product.id}>
              <tr
                className={`hover:bg-gray-50 ${
                  inlineEditId === product.id ? 'bg-amber-50/60' : ''
                } ${product.active === false ? 'opacity-70' : ''}`}
              >
                <td className="p-4">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} className="w-10 h-10 rounded object-cover" alt="" />
                  ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                        <ImageIcon size={16} className="text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-medium">
                    <div className="flex flex-wrap items-center gap-2">
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
                      </div>
                    ) : (
                      <span className="text-brand-primary font-bold">{formatCurrency(product.price)}</span>
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
                        if (!window.confirm('Excluir produto?')) return;
                        setSaving(true);
                        productService
                          .delete(product.id)
                          .then(async () => {
                            showToast('Produto removido com sucesso.', 'success');
                            await refreshProducts();
                          })
                          .catch(async (error) => {
                            const message = (error?.message || '').toString();
                            if (error?.code === 'PROD-001' || error?.status === 404 || message.includes('Produto')) {
                              showToast('Produto removido com sucesso.', 'success');
                              await refreshProducts();
                              return;
                            }
                            showToast('Não foi possível remover o produto.', 'error');
                          })
                          .finally(() => setSaving(false));
                      }}
                      className="text-red-600 hover:bg-red-50 p-2 rounded transition-all hover:-translate-y-0.5 active:scale-95"
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
            className="absolute inset-0 bg-black/40"
            onClick={handleInlineCancel}
          />
          <div className="relative w-full max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Editar produto</p>
                <p className="text-lg font-semibold text-gray-900">{inlineForm.name || 'Produto'}</p>
              </div>
              <button
                type="button"
                onClick={handleInlineCancel}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Nome</label>
                <input
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm mt-2"
                  value={inlineForm.name}
                  onChange={(e) => setInlineForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Preço</label>
                <input
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm mt-2"
                  type="number"
                  step="0.01"
                  value={inlineForm.price}
                  data-product-edit="price"
                  onChange={(e) => setInlineForm((prev) => ({ ...prev, price: e.target.value }))}
                />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Promo</label>
                <input
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm mt-2"
                  type="number"
                  step="0.01"
                  value={inlineForm.promoPrice}
                  data-product-edit="promo"
                  onChange={(e) => setInlineForm((prev) => ({ ...prev, promoPrice: e.target.value }))}
                />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Categoria</label>
                <input
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm mt-2"
                  value={inlineForm.category}
                  onChange={(e) => setInlineForm((prev) => ({ ...prev, category: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Descrição</label>
                <textarea
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm mt-2 min-h-[100px]"
                  value={inlineForm.description}
                  onChange={(e) => setInlineForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Imagem (URL)</label>
                <input
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm mt-2"
                  placeholder="https://..."
                  value={inlineForm.imageUrl}
                  onChange={(e) => setInlineForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                />
                <div className="mt-3 flex items-center justify-between">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 3 * 1024 * 1024) {
                        showToast('Imagem acima de 3MB. Reduza e tente novamente.', 'error');
                        e.target.value = '';
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = reader.result?.toString() || '';
                        setInlineImageFile(result);
                        setInlineForm((prev) => ({ ...prev, imageUrl: '' }));
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="text-xs"
                  />
                  {inlineImageFile && (
                    <button
                      type="button"
                      onClick={() => setInlineImageFile('')}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <div className="mt-3 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 h-32 flex items-center justify-center">
                  {inlineImageFile || inlineForm.imageUrl ? (
                    <img
                      src={inlineImageFile || inlineForm.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">Sem imagem</span>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleInlineCancel}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleInlineSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-brand-primary text-white text-sm font-semibold"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
