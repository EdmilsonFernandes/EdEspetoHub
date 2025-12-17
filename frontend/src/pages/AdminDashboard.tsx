// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Props {
  session: any;
}

export function AdminDashboard({ session }: Props) {
  const [store, setStore] = useState<any>(session.store);
  const [product, setProduct] = useState({ name: '', price: 0, category: '', imageUrl: '' });
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');

  const storeId = store?.id;

  useEffect(() => {
    if (!storeId) return;
    api.listProducts(storeId).then(setProducts).catch((e) => setError(e.message));
    api.listOrders(storeId).then(setOrders).catch((e) => setError(e.message));
  }, [storeId]);

  useEffect(() => {
    if (!store?.settings) return;
    document.documentElement.style.setProperty('--primary-color', store.settings.primaryColor || '#b91c1c');
    document.documentElement.style.setProperty('--secondary-color', store.settings.secondaryColor || '#111827');
  }, [store]);

  const handleStoreChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setStore((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      settings: { ...prev.settings, [name]: value },
    }));
  };

  const saveStore = async () => {
    if (!storeId) return;
    try {
      const updated = await api.updateStore(storeId, {
        name: store.name,
        logoUrl: store.settings?.logoUrl,
        primaryColor: store.settings?.primaryColor,
        secondaryColor: store.settings?.secondaryColor,
      });
      setStore(updated);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const toggleStatus = async () => {
    if (!storeId) return;
    const updated = await api.setStatus(storeId, !store.open);
    setStore(updated);
  };

  const createProduct = async () => {
    if (!storeId) return;
    try {
      const created = await api.createProduct(storeId, product);
      setProducts((prev) => [...prev, created]);
      setProduct({ name: '', price: 0, category: '', imageUrl: '' });
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="container">
      <h2>Painel da loja</h2>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Identidade visual</h3>
        <input name="name" value={store?.name || ''} onChange={handleStoreChange} placeholder="Nome da loja" />
        <input name="logoUrl" value={store?.settings?.logoUrl || ''} onChange={handleStoreChange} placeholder="Logo URL" />
        <label>
          Primária
          <input name="primaryColor" type="color" value={store?.settings?.primaryColor || '#b91c1c'} onChange={handleStoreChange} />
        </label>
        <label>
          Secundária
          <input name="secondaryColor" type="color" value={store?.settings?.secondaryColor || '#111827'} onChange={handleStoreChange} />
        </label>
        <button className="button" onClick={saveStore}>
          Salvar
        </button>
        <button className="button" style={{ marginLeft: 8 }} onClick={toggleStatus}>
          {store?.open ? 'Fechar' : 'Abrir'} loja
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Novo produto</h3>
        <input placeholder="Nome" value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} />
        <input
          placeholder="Preço"
          type="number"
          value={product.price}
          onChange={(e) => setProduct({ ...product, price: Number(e.target.value) })}
        />
        <input placeholder="Categoria" value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })} />
        <input placeholder="Imagem" value={product.imageUrl} onChange={(e) => setProduct({ ...product, imageUrl: e.target.value })} />
        <button className="button" onClick={createProduct}>
          Cadastrar produto
        </button>
        <div style={{ marginTop: 12 }}>
          {products.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>
                {p.name} • R${p.price}
              </span>
              <span>{p.category}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Fila de pedidos</h3>
        {orders.map((o) => (
          <div key={o.id} style={{ borderBottom: '1px solid #e5e7eb', padding: '8px 0' }}>
            <strong>{o.customerName}</strong> — {o.status} — {o.items?.length || 0} itens
          </div>
        ))}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
