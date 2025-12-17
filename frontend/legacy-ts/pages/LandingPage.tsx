import React from 'react';
import '../styles/global.css';

interface Props {
  onStart: () => void;
}

export function LandingPage({ onStart }: Props) {
  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="badge-secondary">Churras Sites</p>
          <h1>Crie seu site de pedidos de churrasco em minutos</h1>
          <p>
            Uma plataforma multi-loja pensada para churrasqueiros independentes. Cadastre-se, personalize logo e cores e
            receba pedidos no seu próprio endereço /loja/slug.
          </p>
        </div>
        <button className="button" onClick={onStart}>
          Criar minha loja
        </button>
      </header>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, marginTop: 32 }}>
        <div className="card">
          <h3>Multi-tenant real</h3>
          <p>Cada loja mantém seus produtos e pedidos isolados via storeId.</p>
        </div>
        <div className="card">
          <h3>Identidade visual dinâmica</h3>
          <p>Logo e cores controlam variáveis CSS para espelhar a marca do churrasqueiro.</p>
        </div>
        <div className="card">
          <h3>URL amigável</h3>
          <p>Slugs automáticos no formato /loja/:slug garantem uma vitrine única.</p>
        </div>
      </section>
    </div>
  );
}
