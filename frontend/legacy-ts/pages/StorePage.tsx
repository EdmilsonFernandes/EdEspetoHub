import React, { useEffect, useState } from 'react';
import '../styles/global.css';
import { api } from '../services/api';

interface Props {
  slug: string;
}

export function StorePage({ slug }: Props) {
  const [store, setStore] = useState<any>();
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => {
    api
      .fetchStore(slug)
      .then((data) => {
        setStore(data);
        document.documentElement.style.setProperty('--primary-color', data.settings?.primaryColor || '#b91c1c');
        document.documentElement.style.setProperty('--secondary-color', data.settings?.secondaryColor || '#111827');
        return api.listProducts(data.id);
      })
      .then(setProducts)
      .catch((e) => console.error(e));
  }, [slug]);

  const addToCart = (id: string) => setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));

  const total = products.reduce((acc, p) => acc + (cart[p.id] || 0) * Number(p.price || 0), 0);

  return (
    <div className="container">
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {store?.settings?.logoUrl && <img src={store.settings.logoUrl} alt={store?.name} height={64} />}
        <div>
          <h1>{store?.name}</h1>
          <p className="badge-secondary">{store?.open ? 'Aberto' : 'Fechado'}</p>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginTop: 24 }}>
        <div className="card">
          <h3>Cardápio</h3>
          {products.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <div>
                <strong>{p.name}</strong>
                <p>{p.category}</p>
              </div>
              <div>
                <p>R${p.price}</p>
                <button className="button" onClick={() => addToCart(p.id)}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Carrinho</h3>
          {products
            .filter((p) => cart[p.id])
            .map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span>
                  {p.name} x {cart[p.id]}
                </span>
                <span>R${(cart[p.id] || 0) * Number(p.price)}</span>
              </div>
            ))}
          <hr />
          <strong>Total: R${total.toFixed(2)}</strong>
        </div>
      </section>
    </div>
  );
}
