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
  const { auth, hydrated } = useAuth();
  const session = useMemo(() => sessionProp || auth, [sessionProp, auth]);
  const [store, setStore] = useState<any>(session?.store);
  const [product, setProduct] = useState({ name: '', price: 0, category: '', imageUrl: '' });
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [newLogoFile, setNewLogoFile] = useState('');

  const storeId = store?.id;
  const storeSlug = store?.slug;

  const convertFileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) =>
    {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    setStore(session?.store);
    if (session?.store?.slug)
    {
      apiClient.setOwnerId(session.store.slug);
    }
  }, [session?.store]);

  useEffect(() => {
    if (!hydrated) return;
    if (!session?.token || session?.user?.role !== 'ADMIN' || !session?.store) {
      navigate('/admin');
    }
  }, [hydrated, navigate, session?.store, session?.token, session?.user?.role]);

  useEffect(() => {
    if (!storeSlug) return;
    productService.listBySlug(storeSlug).then(setProducts).catch((e) => setError(e.message));
    apiClient
      .get(`/stores/slug/${storeSlug}/orders`)
      .then(setOrders)
      .catch((e) => setError(e.message));
  }, [storeSlug]);

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

  const handleSocialChange = (index: number, key: 'type' | 'value', value: string) => {
    setStore((prev: any) => {
      const links = prev?.settings?.socialLinks ? [ ...prev.settings.socialLinks ] : [];
      links[ index ] = { ...links[ index ], [ key ]: value };
      return { ...prev, settings: { ...prev.settings, socialLinks: links } };
    });
  };

  const addSocialLink = () => {
    setStore((prev: any) => ({
      ...prev,
      settings: {
        ...prev.settings,
        socialLinks: [ ...(prev.settings?.socialLinks || []), { type: 'instagram', value: '' } ],
      },
    }));
  };

  const removeSocialLink = (index: number) => {
    setStore((prev: any) => ({
      ...prev,
      settings: {
        ...prev.settings,
        socialLinks: (prev.settings?.socialLinks || []).filter((_: any, i: number) => i !== index),
      },
    }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await convertFileToBase64(file);
      setNewLogoFile(base64);
      setStore((prev: any) => ({ ...prev, settings: { ...prev.settings, logoUrl: base64 } }));
    } catch (err) {
      setError('Não foi possível carregar o logo enviado.');
    }
  };

  const saveStore = async () => {
    if (!storeId) return;
    try {
      const updated = await api.updateStore(storeId, {
        name: store.name,
        logoUrl: newLogoFile ? undefined : store.settings?.logoUrl,
        logoFile: newLogoFile || undefined,
        primaryColor: store.settings?.primaryColor,
        secondaryColor: store.settings?.secondaryColor,
        socialLinks: store.settings?.socialLinks || [],
      });
      setStore(updated);
      setNewLogoFile('');
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

  if (!hydrated) {
    return <div className="container">Carregando painel...</div>;
  }

  if (!store) {
    return (
      <div className="container">
        <p>Recupere a sessão do administrador para acessar o painel.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Painel da loja</h2>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Identidade visual</h3>
        <input name="name" value={store?.name || ''} onChange={handleStoreChange} placeholder="Nome da loja" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="file" accept="image/*" onChange={handleLogoUpload} />
          {store?.settings?.logoUrl && (
            <img src={store.settings.logoUrl} alt="Logo" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
          )}
        </div>
        <label>
          Primária
          <input name="primaryColor" type="color" value={store?.settings?.primaryColor || '#b91c1c'} onChange={handleStoreChange} />
        </label>
        <label>
          Secundária
          <input name="secondaryColor" type="color" value={store?.settings?.secondaryColor || '#111827'} onChange={handleStoreChange} />
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <strong>Redes sociais</strong>
          {(store?.settings?.socialLinks || []).map((link: any, index: number) => (
            <div key={`${link.type}-${index}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={link.type}
                onChange={(e) => handleSocialChange(index, 'type', e.target.value)}
              >
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="twitter">Twitter (X)</option>
              </select>
              <input
                value={link.value}
                onChange={(e) => handleSocialChange(index, 'value', e.target.value)}
                placeholder="@usuario ou URL"
              />
              {(store.settings?.socialLinks || []).length > 1 && (
                <button type="button" onClick={() => removeSocialLink(index)}>
                  Remover
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addSocialLink}>
            Adicionar rede
          </button>
        </div>
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
