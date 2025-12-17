// @ts-nocheck
import React, { useState } from 'react';
import { Image as ImageIcon, Edit, Trash2, Save, Plus } from 'lucide-react';
import { productService } from '../../services/productService';
import { formatCurrency } from '../../utils/format';

const initialForm = { name: '', price: '', category: 'espetos', imageUrl: '', desc: '' };

export const ProductManager = ({ products }) => {
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(initialForm);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name || !formData.price) return;

    await productService.save({ ...formData, id: editing?.id, price: parseFloat(formData.price) });
    setEditing(null);
    setFormData(initialForm);
  };

  const handleEdit = (product) => {
    setEditing(product);
    setFormData(product);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          {editing ? <Edit size={20} /> : <Plus size={20} />}
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
          <select className="p-3 border rounded-lg" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
            <option value="espetos">Espetos</option>
            <option value="bebidas">Bebidas</option>
            <option value="porcoes">Porções</option>
          </select>
          <input
            className="p-3 border rounded-lg"
            placeholder="URL da Foto (https://...)"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
          />
          <textarea
            className="p-3 border rounded-lg md:col-span-2"
            placeholder="Descrição do item..."
            value={formData.desc}
            onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
          />

          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold flex-1 flex justify-center items-center gap-2">
              <Save size={18} /> Salvar
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setFormData(initialForm);
                }}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-bold"
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
                <td className="p-4 capitalize text-sm text-gray-500">{product.category}</td>
                <td className="p-4 text-green-600 font-bold">{formatCurrency(product.price)}</td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => handleEdit(product)} className="text-blue-600 hover:bg-blue-50 p-2 rounded">
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
