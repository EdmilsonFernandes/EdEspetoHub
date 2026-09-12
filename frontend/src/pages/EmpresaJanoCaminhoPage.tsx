// @ts-nocheck
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, DeviceMobile } from '@phosphor-icons/react';
import './EmpresaJanoCaminhoPage.css';

export function EmpresaJanoCaminhoPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="jnc-page">
      {/* Ambient Light Effect */}
      <div className="jnc-ambient-bg">
        <div className="jnc-ambient-orb jnc-orb-1" />
        <div className="jnc-ambient-orb jnc-orb-2" />
        <div className="jnc-ambient-orb jnc-orb-3" />
        <div className="jnc-grid-overlay" />
        <div className="jnc-ecg-line" />
      </div>

      {/* Navbar Oficial */}
      <header className="jnc-navbar">
        <div className="jnc-container jnc-nav-inner">
          <a href="#" className="jnc-brand-group" title="JNC — Já No Caminho Tecnologia">
            <div className="jnc-brand-logo-frame">
              <img
                src="/logos/jnc-ecossistema-oficial.jpg"
                alt="JNC Logo Oficial"
                className="jnc-brand-logo-img-top"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logos/janocaminho-logo.svg';
                }}
              />
            </div>
            <div className="jnc-brand-text">
              <div className="jnc-brand-header-title">
                <span className="jnc-brand-badge-text">JNC</span>
                <span>Já No Caminho</span>
              </div>
              <div className="jnc-brand-tag">Ecossistema Tecnológico</div>
            </div>
          </a>

          <nav className="jnc-nav-links">
            <a href="#solucoes">Soluções</a>
            <a href="#drexame">🩺 Dr. Exame</a>
            <a href="#janocaminho">🛒 Já No Caminho</a>
            <a href="#uaiid">🛡️ Uai ID</a>
            <a href="#gemhunter">💎 GemHunter AI</a>
            <a href="#sobre">A Empresa</a>
          </nav>

          <div className="jnc-nav-actions">
            <a href="https://app.janocaminho.com.br/hub" target="_blank" rel="noopener noreferrer" className="jnc-nav-cta-btn">
              Acessar o Hub ↗
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="jnc-hero-section">
          <div className="jnc-container">
            <div className="jnc-hero-grid">
              
              {/* Coluna Esquerda: Texto e Ações */}
              <div className="jnc-hero-content">
                <div className="jnc-pill-badge">
                  <span className="jnc-pulse-dot" />
                  Ecossistema Tecnológico Unificado 2026
                </div>

                <h1 className="jnc-hero-title">
                  JNC — Tecnologia que conecta <br />
                  <span className="jnc-hero-title-gradient">Saúde, Gestão, Identidade &amp; Web3.</span>
                </h1>

                <p className="jnc-hero-subtitle">
                  Um ecossistema proprietário de alta performance unindo quatro verticais estratégicas sob a mesma infraestrutura de inteligência artificial, dados e segurança.
                </p>

                <div className="jnc-hero-motto-quote">
                  “Um ecossistema completo para cada desafio. Saúde, Gestão, Identidade e Inteligência On-Chain.”
                </div>

                <div className="jnc-hero-actions">
                  <a href="#solucoes" className="jnc-btn-hero-primary">
                    Conhecer o Ecossistema ↓
                  </a>
                  <Link to="/app" className="jnc-btn-hero-secondary" title="Ver apresentação exclusiva do app Já No Caminho">
                    <DeviceMobile size={18} weight="bold" />
                    <span>Apresentação do App</span>
                    <span>→</span>
                  </Link>
                </div>

                {/* Fast Pillars Navigation Chips */}
                <div className="jnc-hero-pills">
                  <a href="#drexame" className="jnc-pillar-chip">
                    <span className="dot dot-health" />
                    <strong>Dr. Exame</strong> (Saúde Digital)
                  </a>
                  <a href="#janocaminho" className="jnc-pillar-chip">
                    <span className="dot dot-delivery" />
                    <strong>Já No Caminho</strong> (Gestão SaaS)
                  </a>
                  <a href="#uaiid" className="jnc-pillar-chip">
                    <span className="dot dot-security" />
                    <strong>UAIID</strong> (Identidade 3D)
                  </a>
                  <a href="#gemhunter" className="jnc-pillar-chip">
                    <span className="dot dot-crypto" />
                    <strong>GemHunter AI</strong> (Web3 &amp; Anti-Golpe)
                  </a>
                </div>
              </div>

              {/* Coluna Direita: 3D Artwork Centerpiece Card */}
              <div
                className="jnc-hero-artwork-card"
                id="logoCard"
                onClick={() => setModalOpen(true)}
                title="Clique para ampliar o logo oficial"
              >
                <div className="jnc-artwork-img-wrapper">
                  <img
                    src="/logos/jnc-ecossistema-oficial.jpg"
                    alt="JNC Ecossistema Tecnológico — Logo Oficial"
                    className="jnc-artwork-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo-janocaminho-oficial.jpg';
                    }}
                  />
                </div>
                <div className="jnc-artwork-badge-floating">
                  <div className="jnc-badge-label-main">
                    <span style={{ color: "var(--mint)" }}>🛡️</span>
                    <span>JNC | Plataforma Unificada</span>
                  </div>
                  <span className="jnc-badge-status-tag">OFICIAL 2026</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Metrics Banner */}
        <div className="jnc-container">
          <div className="jnc-metrics-banner">
            <div className="jnc-banner-text">
              <h3 className="jnc-banner-title">Uma só holding, múltiplos motores de impacto</h3>
              <p className="jnc-banner-desc">
                Integrando exames preventivos com IA, comércio de proximidade, biometria facial forense e radar on-chain em tempo real.
              </p>
            </div>
            <div className="jnc-banner-stats">
              <div className="jnc-stat-box">
                <div className="jnc-stat-number">4</div>
                <div className="jnc-stat-label">Verticais Ativas</div>
              </div>
              <div className="jnc-stat-box">
                <div className="jnc-stat-number">&lt;400ms</div>
                <div className="jnc-stat-label">Latência Forense</div>
              </div>
              <div className="jnc-stat-box">
                <div className="jnc-stat-number">&lt;30min</div>
                <div className="jnc-stat-label">Radar Mempool</div>
              </div>
              <div className="jnc-stat-box">
                <div className="jnc-stat-number">99.9%</div>
                <div className="jnc-stat-label">Uptime AWS Cloud</div>
              </div>
            </div>
          </div>
        </div>

        {/* Soluções / Produtos Bento Grid */}
        <section className="jnc-products-section" id="solucoes">
          <div className="jnc-container">
            <div className="jnc-section-header">
              <span className="jnc-section-tag">Nossas Verticais</span>
              <h2 className="jnc-section-heading">As 4 Plataformas do Ecossistema JNC</h2>
              <p className="jnc-section-subheading">
                Cada plataforma foi concebida com identidade visual própria, arquitetura de alta performance e os logotipos oficiais integrados.
              </p>
            </div>

            <div className="jnc-products-grid">
              
              {/* 1. Dr. Exame */}
              <div className="jnc-product-card card-drexame" id="drexame">
                <div>
                  <div className="jnc-card-top">
                    <div className="jnc-product-brand-badge">
                      <div className="jnc-brand-avatar-box jnc-avatar-drexame">
                        <img
                          src="/logos/dr-exame-robot.png"
                          alt="Dr. Exame Robô Oficial"
                          className="jnc-avatar-img jnc-img-circle-crop"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/logos/dr-exame-icon.png'; }}
                        />
                      </div>
                      <div className="jnc-brand-meta">
                        <span className="jnc-brand-title jnc-brand-title-emerald">Dr. Exame</span>
                        <span className="jnc-brand-sub">Saúde Digital &amp; IA</span>
                      </div>
                    </div>
                    <span className="jnc-status-badge badge-live badge-health">
                      <span className="jnc-badge-dot dot-health" />
                      Saúde Digital
                    </span>
                  </div>

                  <h3 className="jnc-product-name">Dr. Exame</h3>
                  <p className="jnc-product-desc">
                    Inteligência médica e gestão preventiva de saúde. Análise automatizada de exames laboratoriais, histórico unificado do paciente e apoio a decisões clínicas com IA.
                  </p>
                  <div className="jnc-feature-tags">
                    <span className="jnc-feature-tag">Análise de Laudos</span>
                    <span className="jnc-feature-tag">Saúde Preventiva</span>
                    <span className="jnc-feature-tag">LGPD Saúde</span>
                    <span className="jnc-feature-tag">Histórico Unificado</span>
                    <span className="jnc-feature-tag">IA Clínica</span>
                  </div>
                </div>

                <div className="jnc-card-actions">
                  <a href="https://drexame.janocaminho.com.br" target="_blank" rel="noopener noreferrer" className="jnc-btn-card-primary btn-emerald">
                    <span>Acessar Dr. Exame</span>
                    <ArrowUpRight size={16} weight="bold" />
                  </a>
                  <a href="https://drexame.janocaminho.com.br" target="_blank" rel="noopener noreferrer" className="jnc-btn-card-secondary">
                    Ver Plataforma
                  </a>
                </div>
              </div>

              {/* 2. Já No Caminho (App & Hub) */}
              <div className="jnc-product-card card-app" id="janocaminho">
                <div>
                  <div className="jnc-card-top">
                    <div className="jnc-product-brand-badge">
                      <div className="jnc-brand-avatar-box jnc-avatar-app">
                        <img
                          src="/logos/janocaminho-robot.png"
                          alt="Já No Caminho Robô Oficial"
                          className="jnc-avatar-img"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/logos/janocaminho.jpg'; }}
                        />
                      </div>
                      <div className="jnc-brand-meta">
                        <span className="jnc-brand-title jnc-brand-title-orange">Já No Caminho</span>
                        <span className="jnc-brand-sub">App &amp; Hub Local</span>
                      </div>
                    </div>
                    <span className="jnc-status-badge badge-live badge-delivery">
                      <span className="jnc-badge-dot dot-delivery" />
                      Gestão SaaS &amp; App
                    </span>
                  </div>

                  <h3 className="jnc-product-name">Já No Caminho (App &amp; Hub)</h3>
                  <p className="jnc-product-desc">
                    Hub completo de pedidos, logística e comércio de proximidade. Conecta condomínios fechados, restaurantes, feiras e moradores locais com entrega ágil e marketplace sem atrito.
                  </p>
                  <div className="jnc-feature-tags">
                    <span className="jnc-feature-tag">Delivery Ágil</span>
                    <span className="jnc-feature-tag">Condomínios</span>
                    <span className="jnc-feature-tag">Google Play</span>
                    <span className="jnc-feature-tag">Lojas &amp; Hub</span>
                    <span className="jnc-feature-tag">Logística de Proximidade</span>
                  </div>
                </div>

                <div className="jnc-card-actions">
                  <Link to="/app" className="jnc-btn-card-primary btn-orange" title="Acessa a apresentação detalhada do aplicativo Já No Caminho">
                    <span>Conhecer o App →</span>
                  </Link>
                  <a href="https://app.janocaminho.com.br/hub" target="_blank" rel="noopener noreferrer" className="jnc-btn-card-secondary" title="Abrir direto o Hub de pedidos">
                    <span>Abrir o Hub ↗</span>
                  </a>
                </div>
              </div>

              {/* 3. Uai ID */}
              <div className="jnc-product-card card-uaiid" id="uaiid">
                <div>
                  <div className="jnc-card-top">
                    <div className="jnc-product-brand-badge">
                      <div className="jnc-brand-avatar-box jnc-avatar-uaiid">
                        <img
                          src="/logos/uaiid-shield.png"
                          alt="Uai ID Escudo Oficial"
                          className="jnc-avatar-img"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/logos/uai-logo.jpg'; }}
                        />
                      </div>
                      <div className="jnc-brand-meta">
                        <span className="jnc-brand-title jnc-brand-title-cyan">Uai ID</span>
                        <span className="jnc-brand-sub">Biometria &amp; KYC</span>
                      </div>
                    </div>
                    <span className="jnc-status-badge badge-live badge-security">
                      <span className="jnc-badge-dot dot-security" />
                      Identidade &amp; KYC
                    </span>
                  </div>

                  <h3 className="jnc-product-name">Uai ID</h3>
                  <p className="jnc-product-desc">
                    Infraestrutura de identidade digital e validação biométrica facial 3D. Prova de vida ativa, OCR forense de CNH/RG e motor antifraude em milissegundos para empresas e fintechs.
                  </p>
                  <div className="jnc-feature-tags">
                    <span className="jnc-feature-tag">Liveness 3D</span>
                    <span className="jnc-feature-tag">OCR Forense</span>
                    <span className="jnc-feature-tag">Anti-Spoofing</span>
                    <span className="jnc-feature-tag">Auditoria 1:1</span>
                    <span className="jnc-feature-tag">Latência &lt;400ms</span>
                  </div>
                </div>

                <div className="jnc-card-actions">
                  <a href="https://uaiid.com.br" target="_blank" rel="noopener noreferrer" className="jnc-btn-card-primary btn-cyan">
                    <span>Acessar Uai ID</span>
                    <ArrowUpRight size={16} weight="bold" />
                  </a>
                  <a href="https://uaiid.com.br/landing/index.html" target="_blank" rel="noopener noreferrer" className="jnc-btn-card-secondary">
                    Ver Demo
                  </a>
                </div>
              </div>

              {/* 4. GemHunter AI (v3.2) */}
              <div className="jnc-product-card card-gemhunter" id="gemhunter">
                <div>
                  <div className="jnc-card-top">
                    <div className="jnc-product-brand-badge">
                      <div className="jnc-brand-avatar-box jnc-avatar-gemhunter">
                        <img
                          src="/logos/gemhunter-badge.png"
                          alt="GemHunter AI Logo Oficial"
                          className="jnc-avatar-img jnc-gemhunter-img"
                        />
                      </div>
                      <div className="jnc-brand-meta">
                        <span className="jnc-brand-title jnc-brand-title-gold">GemHunter AI</span>
                        <span className="jnc-brand-sub">Radar Web3 &amp; Anti-Golpe</span>
                      </div>
                    </div>
                    <span className="jnc-status-badge badge-live badge-crypto">
                      <span className="jnc-badge-dot dot-crypto" />
                      v3.2 • On-Chain
                    </span>
                  </div>

                  <h3 className="jnc-product-name">GemHunter AI (v3.2)</h3>
                  <p className="jnc-product-desc">
                    Radar inteligente em tempo real e escudo anti-golpe para Web3. Simula transações de compra/venda (anti-honeypot), audita liquidez on-chain no nascimento da pool (&lt;30 min) e protege seu capital de forma 100% não-custodial na rede Base.
                  </p>
                  <div className="jnc-feature-tags">
                    <span className="jnc-feature-tag">Radar On-Chain</span>
                    <span className="jnc-feature-tag">Simulação Honeypot</span>
                    <span className="jnc-feature-tag">Mempool Scanner</span>
                    <span className="jnc-feature-tag">Auditoria DeFi</span>
                    <span className="jnc-feature-tag">Rede Base (EVM)</span>
                    <span className="jnc-feature-tag">Não-Custodial</span>
                  </div>
                </div>

                <div className="jnc-card-actions">
                  <a href="https://uaiid.com.br/gemhunter" target="_blank" rel="noopener noreferrer" className="jnc-btn-card-primary btn-gold">
                    <span>Acessar GemHunter AI</span>
                    <ArrowUpRight size={16} weight="bold" />
                  </a>
                  <a href="https://uaiid.com.br/gemhunter#radar" target="_blank" rel="noopener noreferrer" className="jnc-btn-card-secondary">
                    Ver Radar Ao Vivo
                  </a>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Sobre a Holding Section */}
        <section className="jnc-container" id="sobre" style={{ padding: "40px 24px 100px" }}>
          <div style={{ background: "rgba(13, 23, 48, 0.5)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "50px 40px" }}>
            <span className="jnc-section-tag">A Holding</span>
            <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 18, letterSpacing: "-0.02em" }}>
              Construindo a Infraestrutura do Amanhã
            </h2>
            <p style={{ color: "var(--text-soft)", fontSize: 16, lineHeight: 1.7, maxWidth: 860, marginBottom: 24 }}>
              A <strong>Já No Caminho Tecnologia (JNC)</strong> nasceu da convicção de que inteligência de dados, proximidade, segurança e auditoria devem caminhar lado a lado. Nossas quatro plataformas compartilham uma espinha dorsal de engenharia baseada em microsserviços na nuvem AWS, padrões rigorosos de segurança e IA aplicada para resolver problemas reais de pessoas, médicos, comerciantes e investidores.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontWeight: 800, color: "var(--mint)", marginBottom: 8 }}>🔒 Segurança &amp; LGPD Médica</div>
                <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Criptografia de ponta a ponta e conformidade com diretrizes nacionais de dados em todas as pontas.</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontWeight: 800, color: "var(--cyan)", marginBottom: 8 }}>⚡ Alta Disponibilidade Cloud</div>
                <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Arquitetura escalável em nuvem com latência submétrica e monitoramento 24/7.</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontWeight: 800, color: "var(--orange)", marginBottom: 8 }}>🤝 DNA de Proximidade &amp; App</div>
                <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Soluções desenhadas para gerar impacto direto em condomínios, feiras e comércio local.</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontWeight: 800, color: "#F59E0B", marginBottom: 8 }}>💎 Inteligência On-Chain &amp; DeFi</div>
                <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Auditoria algorítmica de contratos inteligentes, honeypots e liquidez on-chain em tempo real.</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="jnc-site-footer">
        <div className="jnc-container">
          <div className="jnc-footer-grid">
            <div className="jnc-footer-brand">
              <div className="jnc-brand-group">
                <div className="jnc-brand-logo-frame" style={{ width: 38, height: 38 }}>
                  <img src="/logos/jnc-ecossistema-oficial.jpg" className="jnc-brand-logo-img-top" alt="JNC Logo" />
                </div>
                <span style={{ fontWeight: 800, fontSize: 18 }}>Já No Caminho</span>
              </div>
              <p>
                Ecossistema tecnológico integrado. Plataforma unificada de saúde digital, gestão SaaS de comércio, identidade biométrica forense e inteligência on-chain Web3.
              </p>
            </div>

            <div className="jnc-footer-col">
              <h4>Plataformas</h4>
              <ul>
                <li><a href="https://drexame.janocaminho.com.br" target="_blank" rel="noopener noreferrer">Dr. Exame (Saúde)</a></li>
                <li><a href="https://app.janocaminho.com.br/hub" target="_blank" rel="noopener noreferrer">Já No Caminho (Hub)</a></li>
                <li><Link to="/app">Já No Caminho (App)</Link></li>
                <li><a href="https://uaiid.com.br" target="_blank" rel="noopener noreferrer">Uai ID (KYC &amp; Biometria)</a></li>
                <li><a href="https://uaiid.com.br/gemhunter" target="_blank" rel="noopener noreferrer">GemHunter AI (Web3 &amp; DeFi)</a></li>
              </ul>
            </div>

            <div className="jnc-footer-col">
              <h4>Institucional</h4>
              <ul>
                <li><a href="#sobre">A Empresa</a></li>
                <li><a href="#solucoes">Ecossistema</a></li>
                <li><a href="https://uaiid.com.br/landing/index.html" target="_blank" rel="noopener noreferrer">Documentação API</a></li>
                <li><a href="#">Privacidade &amp; LGPD</a></li>
              </ul>
            </div>

            <div className="jnc-footer-col">
              <h4>Rede &amp; Acesso</h4>
              <ul>
                <li><a href="https://app.janocaminho.com.br/hub" target="_blank" rel="noopener noreferrer">Painel Operacional ↗</a></li>
                <li><a href="https://uaiid.com.br/dashboard" target="_blank" rel="noopener noreferrer">Dashboard Uai ID ↗</a></li>
                <li><a href="https://drexame.janocaminho.com.br" target="_blank" rel="noopener noreferrer">Portal Dr. Exame ↗</a></li>
                <li><a href="https://uaiid.com.br/gemhunter#radar" target="_blank" rel="noopener noreferrer">Radar GemHunter Ao Vivo ↗</a></li>
              </ul>
            </div>
          </div>

          <div className="jnc-footer-bottom">
            <div>
              © 2026 Já No Caminho Tecnologia Ltda. Todos os direitos reservados.
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <span>CNPJ em conformidade</span>
              <span>Belo Horizonte / MG</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Lightbox Modal */}
      {modalOpen && (
        <div className="jnc-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="jnc-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="jnc-modal-close" onClick={() => setModalOpen(false)}>
              &times;
            </button>
            <div style={{ fontWeight: 800, marginBottom: 12, color: "var(--mint)" }}>
              JNC Ecossistema Tecnológico — Identidade Oficial
            </div>
            <img src="/logos/jnc-ecossistema-oficial.jpg" className="jnc-modal-img" alt="Logo Oficial JNC" />
          </div>
        </div>
      )}
    </div>
  );
}

export default EmpresaJanoCaminhoPage;
