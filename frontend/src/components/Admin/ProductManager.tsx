// @ts-nocheck
import React, { useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Edit, Trash2, Save, Plus, Flame, Wine, Package, MoreHorizontal, X, ImagePlus } from 'lucide-react';
import { productService } from '../../services/productService';
import { formatCurrency } from '../../utils/format';
import { useToast } from '../../contexts/ToastContext';

const initialForm = { name: '', price: '', category: 'espetos', imageUrl: '', imageFile: '', description: '' };
const defaultCategories = [
  { id: 'espetos', label: 'Espetos', icon: Flame },
  { id: 'bebidas', label: 'Bebidas', icon: Wine },
  { id: 'porcoes', label: 'Porções', icon: Package },
  { id: 'outros', label: 'Outros', icon: MoreHorizontal },
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
  return known?.icon || MoreHorizontal;
};

export const ProductManager = ({ products, onProductsChange }) => {
  const { showToast } = useToast();
  const formRef = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState(null);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineDetailsId, setInlineDetailsId] = useState<string | null>(null);
  const [inlineForm, setInlineForm] = useState({
    name: '',
    price: '',
    category: initialForm.category,
    description: '',
    imageUrl: '',
  });
  const [inlineImageFile, setInlineImageFile] = useState('');
  const [formData, setFormData] = useState(initialForm);
  const [imageMode, setImageMode] = useState('url');
  const [imagePreview, setImagePreview] = useState('');
  const [categorySelect, setCategorySelect] = useState(initialForm.category);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [saving, setSaving] = useState(false);

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
      .map((entry) => ({ id: entry, label: formatCategoryLabel(entry), icon: MoreHorizontal }));
    return [ ...known, ...extras ];
  }, [products]);

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
      imageFile: imageMode === 'upload' ? formData.imageFile : undefined,
      imageUrl: imageMode === 'url' ? formData.imageUrl : undefined,
      description: formData.description || undefined,
    };

    try {
      await productService.save(payload);
      showToast('Produto adicionado com sucesso', 'success');
      resetForm();
      await refreshProducts();
    } catch (err) {
      showToast('Não foi possível salvar o produto', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product) => {
    setInlineEditId(product.id);
    setInlineForm({
      name: product.name || '',
      price: product.price != null ? String(product.price) : '',
      category: product.category || initialForm.category,
      description: product.description ?? product.desc ?? '',
      imageUrl: product.imageUrl || '',
    });
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
        category: inlineForm.category,
        description: inlineForm.description || undefined,
        imageUrl: inlineImageFile ? undefined : inlineForm.imageUrl || undefined,
        imageFile: inlineImageFile || undefined,
      });
      showToast('Produto atualizado com sucesso', 'success');
      setInlineEditId(null);
      setInlineDetailsId(null);
      setInlineImageFile('');
      await refreshProducts();
    } catch (error) {
      showToast('Não foi possível salvar o produto', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInlineCancel = () => {
    setInlineEditId(null);
    setInlineDetailsId(null);
    setInlineImageFile('');
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

  return (
    <div className="space-y-6">
      <div ref={formRef} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Plus size={20} />
          Novo Produto
        </h3>
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition ${
                      isSelected
                        ? 'bg-brand-primary text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon size={16} />
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
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition border-2 ${
                  showCustomInput
                    ? 'border-brand-primary bg-brand-primary-soft text-brand-primary'
                    : 'border-gray-300 border-dashed text-gray-600 hover:border-brand-primary hover:text-brand-primary'
                }`}
              >
                <Plus size={16} />
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
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
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
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
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
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition shadow-lg"
                    >
                      <Trash2 size={18} />
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
                      <ImageIcon size={24} className="text-gray-400 mb-2" />
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
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition shadow-lg"
                    >
                      <Trash2 size={18} />
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

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="bg-brand-primary text-white px-6 py-3 rounded-lg font-semibold flex-1 flex justify-center items-center gap-2 hover:bg-brand-primary/90 transition disabled:opacity-60"
              disabled={saving}
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Adicionar Produto'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Limpar
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-bold text-gray-600">Foto</th>
              <th className="p-4 font-bold text-gray-600">Nome</th>
              <th className="p-4 font-bold text-gray-600">Categoria</th>
              <th className="p-4 font-bold text-gray-600">Preço</th>
              <th className="p-4 font-bold text-gray-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="p-4">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} className="w-10 h-10 rounded object-cover" alt="" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                      <ImageIcon size={16} className="text-gray-400" />
                    </div>
                  )}
                </td>
                {inlineEditId === product.id ? (
                  <>
                    <td className="p-4">
                      <input
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                        value={inlineForm.name}
                        onChange={(e) => setInlineForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </td>
                    <td className="p-4">
                      <input
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                        value={inlineForm.category}
                        onChange={(e) => setInlineForm((prev) => ({ ...prev, category: e.target.value }))}
                      />
                    </td>
                    <td className="p-4">
                      <input
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                        type="number"
                        step="0.01"
                        value={inlineForm.price}
                        onChange={(e) => setInlineForm((prev) => ({ ...prev, price: e.target.value }))}
                      />
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={handleInlineSave}
                        className="text-emerald-600 hover:bg-emerald-50 p-2 rounded"
                        disabled={saving}
                      >
                        <Save size={18} />
                      </button>
                      <button
                        onClick={() => setInlineDetailsId((prev) => (prev === product.id ? null : product.id))}
                        className="text-brand-primary hover:bg-brand-primary-soft p-2 rounded"
                      >
                        <ImagePlus size={18} />
                      </button>
                      <button
                        onClick={handleInlineCancel}
                        className="text-slate-600 hover:bg-slate-100 p-2 rounded"
                      >
                        <X size={18} />
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-4 font-medium">{product.name}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const Icon = getCategoryIcon(product.category);
                          return <Icon size={16} className="text-brand-primary" />;
                        })()}
                        <span className="text-sm text-gray-600">{formatCategoryLabel(product.category)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-brand-primary font-bold">{formatCurrency(product.price)}</td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => handleEdit(product)} className="text-brand-primary hover:bg-brand-primary-soft p-2 rounded">
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => setInlineDetailsId((prev) => (prev === product.id ? null : product.id))}
                        className="text-slate-600 hover:bg-slate-100 p-2 rounded"
                        title="Detalhes"
                      >
                        <ImagePlus size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (!window.confirm('Excluir produto?')) return;
                          setSaving(true);
                          productService
                            .delete(product.id)
                            .then(async () => {
                              showToast('Produto removido', 'success');
                              await refreshProducts();
                            })
                            .catch(async (error) => {
                              const message = (error?.message || '').toString();
                              if (error?.code === 'PROD-001' || error?.status === 404 || message.includes('Produto')) {
                                showToast('Produto removido', 'success');
                                await refreshProducts();
                                return;
                              }
                              showToast('Não foi possível remover o produto', 'error');
                            })
                            .finally(() => setSaving(false));
                        }}
                        className="text-red-600 hover:bg-red-50 p-2 rounded"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </>
                )}
              </tr>
              {inlineDetailsId === product.id && (
                <tr className="bg-slate-50">
                  <td colSpan={5} className="px-4 pb-4">
                    <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr] bg-white rounded-xl border border-slate-200 p-4">
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">
                          Descrição
                        </label>
                        <textarea
                          className="w-full p-3 border border-gray-200 rounded-lg text-sm min-h-[120px]"
                          placeholder="Descreva o produto..."
                          value={inlineForm.description}
                          onChange={(e) => setInlineForm((prev) => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">
                          Imagem (URL)
                        </label>
                        <input
                          className="w-full p-3 border border-gray-200 rounded-lg text-sm"
                          placeholder="https://..."
                          value={inlineForm.imageUrl}
                          onChange={(e) => setInlineForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                        />
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">
                            Upload
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
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
                        <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50 h-32 flex items-center justify-center">
                          {inlineImageFile || inlineForm.imageUrl ? (
                            <img
                              src={inlineImageFile || inlineForm.imageUrl}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-gray-400">Sem imagem</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
