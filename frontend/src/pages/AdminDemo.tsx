// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ImageSquare,
  PencilSimple,
  Trash,
  FloppyDisk,
  Plus,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { formatCurrency } from '../utils/format';

const demoStorageKey = 'adminDemoProducts';
const initialForm = { name: '', price: '', category: 'espetos', imageUrl: '', imageFile: '', desc: '' };
const defaultCategories = [
  { id: 'espetos', label: 'Espetos' },
  { id: 'bebidas', label: 'Bebidas' },
  { id: 'porcoes', label: 'Porções' },
  { id: 'outros', label: 'Outros' },
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

const seedProducts = [
  { id: 'demo-1', name: 'Espetinho de Alcatra', price: 12.9, category: 'espetos', imageUrl: '/chama-no-espeto.jpeg' },
  { id: 'demo-2', name: 'Espetinho de Frango', price: 9.9, category: 'espetos', imageUrl: '/chama-no-espeto.jpeg' },
  { id: 'demo-3', name: 'Pão de alho especial', price: 7.5, category: 'porcoes', imageUrl: '/chama-no-espeto.jpeg' },
];

const loadProducts = () => {
  try {
    const raw = localStorage.getItem(demoStorageKey);
    if (!raw) return seedProducts;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedProducts;
  } catch {
    return seedProducts;
  }
};

export function AdminDemo() {
  const navigate = useNavigate();
  const [products, setProducts] = useState(loadProducts);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [imageMode, setImageMode] = useState('url');
  const [imagePreview, setImagePreview] = useState('');
  const [categorySelect, setCategorySelect] = useState(initialForm.category);
  const [customCategory, setCustomCategory] = useState('');

  const categoryOptions = useMemo(() => {
    const unique = new Set(defaultCategories.map((entry) => entry.id));
    (products || []).forEach((product) => {
      const key = normalizeCategory(product.category);
      if (key) unique.add(key);
    });
    const known = defaultCategories.map((entry) => ({
      id: entry.id,
      label: entry.label,
    }));
    const extras = Array.from(unique)
      .filter((entry) => !defaultCategories.find((item) => item.id === entry))
      .sort()
      .map((entry) => ({ id: entry, label: formatCategoryLabel(entry) }));
    return [ ...known, ...extras ];
  }, [products]);

  const persist = (nextProducts) => {
    setProducts(nextProducts);
    localStorage.setItem(demoStorageKey, JSON.stringify(nextProducts));
  };

  const resetForm = () => {
    setEditing(null);
    setFormData(initialForm);
    setImageMode('url');
    setImagePreview('');
    setCategorySelect(initialForm.category);
    setCustomCategory('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.name || !formData.price) return;
    if (categorySelect === '__custom__' && !formData.category) return;

    const payload = {
      ...formData,
      id: editing?.id || `demo-${Date.now()}`,
      price: parseFloat(formData.price),
      imageUrl: imageMode === 'url' ? formData.imageUrl : imagePreview,
    };

    const next = editing
      ? products.map((item) => (item.id === editing.id ? payload : item))
      : [ payload, ...products ];
    persist(next);
    resetForm();
  };

  const handleEdit = (product) => {
    const categoryKey = normalizeCategory(product.category || initialForm.category);
    const isKnown = categoryOptions.some((entry) => entry.id === categoryKey);
    setCategorySelect(isKnown ? categoryKey : '__custom__');
    setCustomCategory(isKnown ? '' : categoryKey);
    setEditing(product);
    setFormData({
      ...product,
      category: categoryKey,
      imageFile: '',
      imageUrl: product.imageUrl || '',
    });
    setImageMode('url');
    setImagePreview(product?.imageUrl || '');
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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <button onClick={() => navigate('/')} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow border border-white bg-white">
                <img src="/chama-no-espeto.jpeg" alt="Chama no Espeto" className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-lg font-bold text-gray-900">Admin Demo</p>
                <p className="text-sm text-gray-500">Simulador de cadastro</p>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sessionStorage.setItem('scrollToDemoFlow', 'true');
                  navigate('/');
                }}
                className="px-3 py-2 text-sm rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 flex items-center gap-2"
              >
                Voltar ao guia
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(demoStorageKey);
                  persist(seedProducts);
                }}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <ArrowCounterClockwise size={16} weight="duotone" /> Reset demo
              </button>
              <button
                onClick={() => navigate('/create')}
                className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold"
              >
                Criar minha loja
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800">
          Esta e uma area de demonstracao. Os dados ficam apenas neste navegador.
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            {editing ? <PencilSimple size={20} weight="duotone" /> : <Plus size={20} weight="duotone" />}
            {editing ? 'Editar Produto' : 'Novo Produto'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="p-3 border rounded-lg"
              placeholder="Nome do Produto"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <input
              className="p-3 border rounded-lg"
              placeholder="Preço (Ex: 10.50)"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
            <div className="space-y-2">
              <select
                className="p-3 border rounded-lg w-full"
                value={categorySelect}
                onChange={(e) => {
                  const value = e.target.value;
                  setCategorySelect(value);
                  if (value === '__custom__') {
                    setFormData({ ...formData, category: normalizeCategory(customCategory) });
                  } else {
                    setCustomCategory('');
                    setFormData({ ...formData, category: value });
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
              {categorySelect === '__custom__' && (
                <input
                  className="p-3 border rounded-lg w-full"
                  placeholder="Digite a nova categoria"
                  value={customCategory}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomCategory(value);
                    setFormData({ ...formData, category: normalizeCategory(value) });
                  }}
                />
              )}
            </div>
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border ${imageMode === 'url' ? 'bg-brand-secondary text-white border-brand-secondary' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  Imagem por URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border ${imageMode === 'upload' ? 'bg-brand-secondary text-white border-brand-secondary' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  Upload de imagem
                </button>
              </div>

              {imageMode === 'url' ? (
                <input
                  className="p-3 border rounded-lg w-full"
                  placeholder="URL da Foto (https://...)"
                  value={formData.imageUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    setImagePreview(e.target.value);
                  }}
                />
              ) : (
                <input
                  className="p-3 border rounded-lg w-full"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUpload(e.target.files?.[0])}
                />
              )}

              {imagePreview && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <img src={imagePreview} alt="Preview" className="w-12 h-12 rounded object-cover border" />
                  <span>Pré-visualização da imagem</span>
                </div>
              )}
            </div>
            <textarea
              className="p-3 border rounded-lg md:col-span-2"
              placeholder="Descrição do item..."
              value={formData.desc}
              onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
            />

            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-brand-primary text-white px-6 py-3 rounded-lg font-bold flex-1 flex justify-center items-center gap-2 hover:opacity-90">
                <FloppyDisk size={18} weight="duotone" /> Salvar
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-brand-secondary-soft text-brand-secondary px-6 py-3 rounded-lg font-bold hover:opacity-90"
                >
                  Cancelar
                </button>
              )}
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
                        <ImageSquare size={16} weight="duotone" className="text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-medium">{product.name}</td>
                  <td className="p-4 capitalize text-sm text-gray-500">{formatCategoryLabel(product.category)}</td>
                  <td className="p-4 text-brand-primary font-bold">{formatCurrency(product.price)}</td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => handleEdit(product)} className="text-brand-primary hover:bg-brand-primary-soft p-2 rounded">
                      <PencilSimple size={18} weight="duotone" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Excluir produto?')) {
                          persist(products.filter((item) => item.id !== product.id));
                        }
                      }}
                      className="text-red-600 hover:bg-red-50 p-2 rounded"
                    >
                      <Trash size={18} weight="duotone" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
