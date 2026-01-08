// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { Image as ImageIcon, Edit, Trash2, Save, Plus } from 'lucide-react';
import { productService } from '../../services/productService';
import { formatCurrency } from '../../utils/format';

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

export const ProductManager = ({ products }) => {
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

  const resetForm = () => {
    setEditing(null);
    setFormData(initialForm);
    setImageMode('url');
    setImagePreview('');
    setCategorySelect(initialForm.category);
    setCustomCategory('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name || !formData.price) return;
    if (categorySelect === '__custom__' && !formData.category) return;

    const payload = {
      ...formData,
      id: editing?.id,
      price: parseFloat(formData.price),
      imageFile: imageMode === 'upload' ? formData.imageFile : undefined,
      imageUrl: imageMode === 'url' ? formData.imageUrl : undefined,
    };

    await productService.save(payload);
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
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          {editing ? <Edit size={20} /> : <Plus size={20} />}
          {editing ? 'Editar Produto' : 'Novo Produto'}
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
            <select
              className="p-3 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
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
                className="p-3 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
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

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Imagem do Produto</label>
            <div className="bg-gray-50 rounded-lg p-1 inline-flex">
              <button
                type="button"
                onClick={() => setImageMode('url')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  imageMode === 'url' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                URL da Imagem
              </button>
              <button
                type="button"
                onClick={() => setImageMode('upload')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  imageMode === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Upload
              </button>
            </div>

            {imageMode === 'url' ? (
              <input
                className="p-3 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="https://exemplo.com/imagem.jpg"
                value={formData.imageUrl}
                onChange={(e) => {
                  setFormData({ ...formData, imageUrl: e.target.value });
                  setImagePreview(e.target.value);
                }}
              />
            ) : (
              <input
                className="p-3 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-brand-primary focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-brand-primary file:text-white hover:file:bg-brand-primary/90"
                type="file"
                accept="image/*"
                onChange={(e) => handleUpload(e.target.files?.[0])}
              />
            )}

            {imagePreview && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <img src={imagePreview} alt="Preview" className="w-16 h-16 rounded-lg object-cover border" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Pré-visualização</p>
                  <p className="text-xs text-gray-500">Imagem carregada com sucesso</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Descrição (opcional)</label>
            <textarea
              className="p-3 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              placeholder="Descreva o produto..."
              rows={3}
              value={formData.desc}
              onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="submit" 
              className="bg-brand-primary text-white px-6 py-3 rounded-lg font-semibold flex-1 flex justify-center items-center gap-2 hover:bg-brand-primary/90 transition"
            >
              <Save size={18} /> 
              {editing ? 'Atualizar Produto' : 'Adicionar Produto'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
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
                      <ImageIcon size={16} className="text-gray-400" />
                    </div>
                  )}
                </td>
                <td className="p-4 font-medium">{product.name}</td>
                <td className="p-4 capitalize text-sm text-gray-500">{formatCategoryLabel(product.category)}</td>
                <td className="p-4 text-brand-primary font-bold">{formatCurrency(product.price)}</td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => handleEdit(product)} className="text-brand-primary hover:bg-brand-primary-soft p-2 rounded">
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Excluir produto?')) productService.delete(product.id);
                    }}
                    className="text-red-600 hover:bg-red-50 p-2 rounded"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
