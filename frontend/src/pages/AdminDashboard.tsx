// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { productService } from '../services/productService';
import { apiClient } from '../config/apiClient';

interface Props {
  session?: any;
}

export function AdminDashboard({ session: sessionProp }: Props) {
  const navigate = useNavigate();
  const { auth } = useAuth();

  // sessão vem do context ou da prop
  const session = useMemo(() => sessionProp || auth, [sessionProp, auth]);

  const [store, setStore] = useState<any>(session?.store || null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');

  const storeSlug = store?.slug;

  /* =========================
   * PROTEÇÃO DE ROTA (ADMIN)
   * ========================= */
  useEffect(() => {
    if (!session?.token || session?.user?.role !== 'ADMIN' || !session?.store) {
      navigate('/admin');
      return;
    }

    setStore(session.store);
  }, [session, navigate]);

  /* =========================
   * CARREGA PRODUTOS + PEDIDOS
   * ========================= */
  useEffect(() => {
    if (!storeSlug) return;

    productService
      .listBySlug(storeSlug)
      .then(setProducts)
      .catch(e => setError(e.message));

    apiClient
      .get(`/stores/slug/${storeSlug}/orders`)
      .then(setOrders)
      .catch(e => setError(e.message));
  }, [storeSlug]);

  /* =========================
   * CORES DA LOJA (THEME)
   * ========================= */
  useEffect(() => {
    if (!store?.settings) return;

    document.documentElement.style.setProperty('--primary-color', store.settings.primaryColor || '#b91c1c');
    document.documentElement.style.setProperty('--secondary-color', store.settings.secondaryColor || '#111827');
  }, [store]);

  /* =========================
   * RENDER
   * ========================= */
  if (!store) {
    return <div style={{ padding: 24 }}>Carregando painel da loja...</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Painel da Loja — {store.name}</h1>

      {/* =========================
       * PRODUTOS
       * ========================= */}
      <section style={{ marginTop: 24 }}>
        <h2>Produtos</h2>

        {products.length === 0 && <p>Nenhum produto cadastrado.</p>}

        {products.map(p => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e5e7eb',
              padding: '8px 0',
            }}
          >
            <span>{p.name}</span>
            <span>R$ {Number(p.price).toFixed(2)}</span>
            <span>{p.category}</span>
          </div>
        ))}
      </section>

      {/* =========================
       * PEDIDOS (FILA DO CHURRASQUEIRO)
       * ========================= */}
      <section style={{ marginTop: 32 }}>
        <h2>Fila de Pedidos</h2>

        {orders.length === 0 && <p>Nenhum pedido ainda.</p>}

        {orders.map(o => (
          <div
            key={o.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <strong>{o.customerName || 'Cliente'}</strong>
            <div>Status: {o.status}</div>
            <div>Itens: {o.items?.length || 0}</div>
            <div>Total: R$ {Number(o.total || 0).toFixed(2)}</div>
          </div>
        ))}
      </section>

      {error && <p style={{ color: 'red', marginTop: 16 }}>{error}</p>}
    </div>
  );
}
