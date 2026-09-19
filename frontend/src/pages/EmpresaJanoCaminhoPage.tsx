// @ts-nocheck
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  DeviceMobile,
  ShieldCheck,
  Cpu,
  ChartLineUp,
  Lightning,
  Lock,
  GlobeSimple,
  CaretDown,
  Sparkle,
  ArrowRight
} from '@phosphor-icons/react';
import './EmpresaJanoCaminhoPage.css';

export function EmpresaJanoCaminhoPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="jnc-page wibx-theme">
      {/* Ambient Cyber Light Effect */}
      <div className="wibx-ambient-bg">
        <div className="wibx-ambient-glow wibx-glow-top" />
        <div className="wibx-ambient-glow wibx-glow-mid" />
        <div className="wibx-ambient-glow wibx-glow-bottom" />
        <div className="wibx-grid-matrix" />
      </div>

      {/* Floating Pill Navbar (Wibx Signature) */}
      <header className="wibx-navbar-wrapper">
        <div className="wibx-navbar-pill">
          <a href="#" className="wibx-brand-group" title="JNC — Já No Caminho Tecnologia">
            <div className="wibx-brand-emblem">
              <img
                src="/logos/jnc-ecossistema-oficial.webp"
                alt="JNC Logo Oficial"
                className="wibx-brand-logo-img"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logos/janocaminho-logo.svg';
                }}
              />
            </div>
            <div className="wibx-brand-text-col">
              <div className="wibx-brand-title-row">
                <span className="wibx-badge-chip">JNC</span>
                <span className="wibx-brand-name">Já No Caminho</span>
              </div>
              <span className="wibx-brand-subtitle">Ecossistema Tecnológico</span>
            </div>
          </a>

          <nav className="wibx-nav-menu">
            <a href="#solucoes" className="wibx-nav-item">Soluções</a>
            <a href="#drexame" className="wibx-nav-item">
              <span className="wibx-nav-dot dot-health" />
              Dr. Exame
            </a>
            <a href="#janocaminho" className="wibx-nav-item">
              <span className="wibx-nav-dot dot-delivery" />
              Já No Caminho
            </a>
            <a href="#uaiid" className="wibx-nav-item">
              <span className="wibx-nav-dot dot-security" />
              Uai ID
            </a>
            <a href="#gemhunter" className="wibx-nav-item">
              <span className="wibx-nav-dot dot-crypto" />
              GemHunter AI
            </a>
            <a href="#arquitetura" className="wibx-nav-item">Arquitetura</a>
            <a href="#sobre" className="wibx-nav-item">A Holding</a>
          </nav>

          <div className="wibx-nav-cta-wrapper">
            <a
              href="#solucoes"
              className="wibx-btn-neon-pill"
              title="Conhecer as soluções do ecossistema"
            >
              <span>Ver Soluções</span>
              <CaretDown size={15} weight="bold" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section (Wibx High-Impact) */}
        <section className="wibx-hero-section">
          <div className="wibx-container">
            <div className="wibx-hero-grid">
              
              {/* Coluna Esquerda: Typography & CTAs */}
              <div className="wibx-hero-left">
                <div className="wibx-status-pill">
                  <span className="wibx-pulse-neon" />
                  <span className="wibx-status-pill-text">ECOSSISTEMA TECNOLÓGICO 2026</span>
                </div>

                <h1 className="wibx-hero-headline">
                  O ECOSSISTEMA QUE CONECTA <br />
                  <span className="wibx-neon-gradient-text">SAÚDE, GESTÃO, BIOMETRIA &amp; WEB3.</span>
                </h1>

                <p className="wibx-hero-subtext">
                  Uma infraestrutura unificada e proprietária de inteligência artificial, engenharia de dados e segurança forense, impulsionando quatro plataformas estratégicas de alta performance.
                </p>

                <div className="wibx-quote-strip">
                  <Sparkle size={18} weight="fill" className="wibx-quote-icon" />
                  <span>“Um ecossistema completo para cada desafio. Saúde, Gestão, Identidade e Inteligência On-Chain.”</span>
                </div>

                <div className="wibx-hero-actions">
                  <a href="#solucoes" className="wibx-btn-hero-primary">
                    <span>Explorar Soluções</span>
                    <CaretDown size={18} weight="bold" />
                  </a>
                  <Link to="/app" className="wibx-btn-hero-secondary" title="Ver apresentação exclusiva do app Já No Caminho">
                    <DeviceMobile size={18} weight="bold" />
                    <span>Apresentação do App</span>
                    <ArrowRight size={16} weight="bold" />
                  </Link>
                </div>

                {/* Fast Verticals Pills */}
                <div className="wibx-pillar-tags">
                  <a href="#drexame" className="wibx-tag-pill">
                    <span className="wibx-tag-indicator dot-health" />
                    <span><strong>01</strong> Dr. Exame</span>
                  </a>
                  <a href="#janocaminho" className="wibx-tag-pill">
                    <span className="wibx-tag-indicator dot-delivery" />
                    <span><strong>02</strong> Já No Caminho</span>
                  </a>
                  <a href="#uaiid" className="wibx-tag-pill">
                    <span className="wibx-tag-indicator dot-security" />
                    <span><strong>03</strong> Uai ID</span>
                  </a>
                  <a href="#gemhunter" className="wibx-tag-pill">
                    <span className="wibx-tag-indicator dot-crypto" />
                    <span><strong>04</strong> GemHunter AI</span>
                  </a>
                </div>
              </div>

              {/* Coluna Direita: Wibx High-Tech 3D Showcase Card */}
              <div className="wibx-hero-right">
                <div
                  className="wibx-artwork-card"
                  onClick={() => setModalOpen(true)}
                  title="Clique para ampliar o logo oficial do ecossistema"
                >
                  <div className="wibx-artwork-glow" />
                  <div className="wibx-artwork-inner">
                    <img
                      src="/logos/jnc-ecossistema-oficial.webp"
                      alt="JNC Ecossistema Tecnológico — Logo Oficial"
                      className="wibx-artwork-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logos/janocaminho-logo.svg';
                      }}
                    />
                  </div>

                  {/* Telemetria Flutuante 1: Uptime */}
                  <div className="wibx-floating-badge badge-top-left">
                    <span className="wibx-badge-dot-live" />
                    <div className="wibx-badge-meta">
                      <span className="wibx-badge-label">STATUS OPERACIONAL</span>
                      <span className="wibx-badge-value">99.9% Cloud AWS</span>
                    </div>
                  </div>

                  {/* Telemetria Flutuante 2: Latência */}
                  <div className="wibx-floating-badge badge-bottom-right">
                    <Lightning size={16} weight="fill" className="wibx-icon-lightning" />
                    <div className="wibx-badge-meta">
                      <span className="wibx-badge-label">LATÊNCIA BIOMÉTRICA</span>
                      <span className="wibx-badge-value">&lt;400ms Forense 3D</span>
                    </div>
                  </div>

                  {/* Telemetria Flutuante 3: On-Chain */}
                  <div className="wibx-floating-badge badge-bottom-left">
                    <ShieldCheck size={16} weight="fill" className="wibx-icon-shield" />
                    <div className="wibx-badge-meta">
                      <span className="wibx-badge-label">RADAR ON-CHAIN</span>
                      <span className="wibx-badge-value">Mempool &lt;30min</span>
                    </div>
                  </div>

                  <div className="wibx-card-click-hint">
                    <span>Clique para ampliar artwork oficial</span>
                    <ArrowUpRight size={14} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Telemetry & Metrics Ticker (Wibx Style) */}
        <section className="wibx-metrics-section">
          <div className="wibx-container">
            <div className="wibx-metrics-ticker">
              
              <div className="wibx-metric-item">
                <div className="wibx-metric-number">04</div>
                <div className="wibx-metric-info">
                  <span className="wibx-metric-title">Verticais Ativas</span>
                  <span className="wibx-metric-desc">Saúde, Gestão, KYC &amp; Web3</span>
                </div>
              </div>

              <div className="wibx-metric-divider" />

              <div className="wibx-metric-item">
                <div className="wibx-metric-number">&lt;400ms</div>
                <div className="wibx-metric-info">
                  <span className="wibx-metric-title">Latência Forense</span>
                  <span className="wibx-metric-desc">Liveness biométrico 3D</span>
                </div>
              </div>

              <div className="wibx-metric-divider" />

              <div className="wibx-metric-item">
                <div className="wibx-metric-number">&lt;30min</div>
                <div className="wibx-metric-info">
                  <span className="wibx-metric-title">Radar Mempool</span>
                  <span className="wibx-metric-desc">Detecção on-chain no bloco 0</span>
                </div>
              </div>

              <div className="wibx-metric-divider" />

              <div className="wibx-metric-item">
                <div className="wibx-metric-number">99.9%</div>
                <div className="wibx-metric-info">
                  <span className="wibx-metric-title">Disponibilidade</span>
                  <span className="wibx-metric-desc">Infraestrutura AWS Cloud</span>
                </div>
              </div>

              <div className="wibx-metric-divider" />

              <div className="wibx-metric-item">
                <div className="wibx-metric-number">100%</div>
                <div className="wibx-metric-info">
                  <span className="wibx-metric-title">Não-Custodial &amp; LGPD</span>
                  <span className="wibx-metric-desc">Auditoria e soberania de dados</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Verticals Bento Showcase (Wibx 01, 02, 03, 04) */}
        <section className="wibx-verticals-section" id="solucoes">
          <div className="wibx-container">
            
            <div className="wibx-section-header">
              <div className="wibx-section-tag">
                <span className="wibx-tag-glow" />
                // NOSSAS VERTICAIS
              </div>
              <h2 className="wibx-section-title">
                Quatro Motores Tecnológicos. <br />
                <span className="wibx-text-dimmed">Uma Só Espinha Dorsal Integrada.</span>
              </h2>
              <p className="wibx-section-description">
                Cada vertical foi concebida com domínio de especialização, identidade visual proprietária e motores de inteligência artificial de alta disponibilidade.
              </p>
            </div>

            <div className="wibx-cards-grid">
              
              {/* CARD 01: Dr. Exame */}
              <div className="wibx-card card-health" id="drexame">
                <div className="wibx-card-header">
                  <div className="wibx-card-index">01 / SAÚDE DIGITAL</div>
                  <span className="wibx-card-status status-health">
                    <span className="wibx-dot-pulse dot-health" />
                    Saúde &amp; IA Clínica
                  </span>
                </div>

                <div className="wibx-card-brand-row">
                  <div className="wibx-brand-avatar-frame frame-health">
                    <img
                      src="/logos/dr-exame-robot.webp"
                      alt="Dr. Exame Robô Oficial"
                      className="wibx-avatar-img"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/logos/dr-exame-icon.png'; }}
                    />
                  </div>
                  <div className="wibx-brand-text-col">
                    <h3 className="wibx-product-title">Dr. Exame</h3>
                    <span className="wibx-product-sub">Saúde Digital &amp; Medicina Preditiva</span>
                  </div>
                </div>

                <p className="wibx-product-desc">
                  Inteligência médica e gestão preventiva de exames laboratoriais. Interpretação automatizada de laudos, histórico unificado do paciente e apoio a decisões clínicas fundamentadas em IA com rigorosa conformidade LGPD Saúde.
                </p>

                <div className="wibx-tag-list">
                  <span className="wibx-mini-tag">Análise de Laudos</span>
                  <span className="wibx-mini-tag">Saúde Preventiva</span>
                  <span className="wibx-mini-tag">LGPD Saúde</span>
                  <span className="wibx-mini-tag">Histórico Unificado</span>
                  <span className="wibx-mini-tag">IA Clínica</span>
                </div>

                <div className="wibx-card-footer">
                  <a
                    href="https://drexame.janocaminho.com.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wibx-btn-card-neon"
                  >
                    <span>Acessar Dr. Exame</span>
                    <ArrowUpRight size={16} weight="bold" />
                  </a>
                  <a
                    href="https://drexame.janocaminho.com.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wibx-btn-card-outline"
                  >
                    <span>Ver Plataforma</span>
                  </a>
                </div>
              </div>

              {/* CARD 02: Já No Caminho */}
              <div className="wibx-card card-delivery" id="janocaminho">
                <div className="wibx-card-header">
                  <div className="wibx-card-index">02 / GESTÃO SAAS &amp; APP</div>
                  <span className="wibx-card-status status-delivery">
                    <span className="wibx-dot-pulse dot-delivery" />
                    Delivery &amp; Proximidade
                  </span>
                </div>

                <div className="wibx-card-brand-row">
                  <div className="wibx-brand-avatar-frame frame-delivery">
                    <img
                      src="/logos/janocaminho-robot.webp"
                      alt="Já No Caminho Robô Oficial"
                      className="wibx-avatar-img"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/logos/janocaminho.jpg'; }}
                    />
                  </div>
                  <div className="wibx-brand-text-col">
                    <h3 className="wibx-product-title">Já No Caminho</h3>
                    <span className="wibx-product-sub">App &amp; Logística de Proximidade</span>
                  </div>
                </div>

                <p className="wibx-product-desc">
                  Plataforma completa de pedidos, logística e comércio de proximidade. Conecta condomínios residenciais fechados, restaurantes, comércios locais e moradores com rotas inteligentes, fila de produção em tempo real e ecossistema sem atritos.
                </p>

                <div className="wibx-tag-list">
                  <span className="wibx-mini-tag">Delivery Ágil</span>
                  <span className="wibx-mini-tag">Condomínios</span>
                  <span className="wibx-mini-tag">Google Play</span>
                  <span className="wibx-mini-tag">Lojas Parceiras</span>
                  <span className="wibx-mini-tag">Logística Local</span>
                </div>

                <div className="wibx-card-footer">
                  <Link
                    to="/app"
                    className="wibx-btn-card-neon"
                    title="Acessar a apresentação detalhada do aplicativo Já No Caminho"
                  >
                    <span>Apresentação do App</span>
                    <ArrowRight size={16} weight="bold" />
                  </Link>
                  <a
                    href="https://app.janocaminho.com.br/hub"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wibx-btn-card-outline"
                    title="Acessar a plataforma web Já No Caminho"
                  >
                    <span>Acessar Plataforma Web ↗</span>
                  </a>
                </div>
              </div>

              {/* CARD 03: Uai ID */}
              <div className="wibx-card card-security" id="uaiid">
                <div className="wibx-card-header">
                  <div className="wibx-card-index">03 / BIOMETRIA FORENSE</div>
                  <span className="wibx-card-status status-security">
                    <span className="wibx-dot-pulse dot-security" />
                    Identidade &amp; KYC
                  </span>
                </div>

                <div className="wibx-card-brand-row">
                  <div className="wibx-brand-avatar-frame frame-security">
                    <img
                      src="/logos/uaiid-shield.webp"
                      alt="Uai ID Escudo Oficial"
                      className="wibx-avatar-img"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/logos/uai-logo.webp'; }}
                    />
                  </div>
                  <div className="wibx-brand-text-col">
                    <h3 className="wibx-product-title">Uai ID</h3>
                    <span className="wibx-product-sub">Biometria Facial 3D &amp; KYC</span>
                  </div>
                </div>

                <p className="wibx-product-desc">
                  Infraestrutura de validação de identidade e biometria facial 3D com inteligência artificial. Prova de vida ativa, OCR forense de documentos (CNH/RG), detecção de deepfakes e motor antifraude ultrarrápido com resposta em milissegundos.
                </p>

                <div className="wibx-tag-list">
                  <span className="wibx-mini-tag">Liveness 3D</span>
                  <span className="wibx-mini-tag">OCR Forense</span>
                  <span className="wibx-mini-tag">Anti-Spoofing</span>
                  <span className="wibx-mini-tag">Auditoria 1:1</span>
                  <span className="wibx-mini-tag">Latência &lt;400ms</span>
                </div>

                <div className="wibx-card-footer">
                  <a
                    href="https://uaiid.com.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wibx-btn-card-neon"
                  >
                    <span>Acessar Uai ID</span>
                    <ArrowUpRight size={16} weight="bold" />
                  </a>
                  <a
                    href="https://uaiid.com.br/landing/index.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wibx-btn-card-outline"
                  >
                    <span>Ver Demo &amp; API</span>
                  </a>
                </div>
              </div>

              {/* CARD 04: GemHunter AI */}
              <div className="wibx-card card-crypto" id="gemhunter">
                <div className="wibx-card-header">
                  <div className="wibx-card-index">04 / RADAR ON-CHAIN WEB3</div>
                  <span className="wibx-card-status status-crypto">
                    <span className="wibx-dot-pulse dot-crypto" />
                    v3.2 • On-Chain Base
                  </span>
                </div>

                <div className="wibx-card-brand-row">
                  <div className="wibx-brand-avatar-frame frame-crypto">
                    <img
                      src="/logos/gemhunter-badge.png"
                      alt="GemHunter AI Logo Oficial"
                      className="wibx-avatar-img wibx-gemhunter-img"
                    />
                  </div>
                  <div className="wibx-brand-text-col">
                    <h3 className="wibx-product-title">GemHunter AI (v3.2)</h3>
                    <span className="wibx-product-sub">Radar Web3 &amp; Escudo Anti-Golpe</span>
                  </div>
                </div>

                <p className="wibx-product-desc">
                  Radar inteligente em tempo real e escudo anti-golpe para Web3. Simula transações de compra/venda (anti-honeypot), audita liquidez on-chain no nascimento da pool (&lt;30 min) e protege seu capital de forma 100% não-custodial na rede Base.
                </p>

                <div className="wibx-tag-list">
                  <span className="wibx-mini-tag">Radar On-Chain</span>
                  <span className="wibx-mini-tag">Simulação Honeypot</span>
                  <span className="wibx-mini-tag">Mempool Scanner</span>
                  <span className="wibx-mini-tag">Auditoria DeFi</span>
                  <span className="wibx-mini-tag">Rede Base (EVM)</span>
                  <span className="wibx-mini-tag">Não-Custodial</span>
                </div>

                <div className="wibx-card-footer">
                  <a
                    href="https://uaiid.com.br/gemhunter"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wibx-btn-card-neon"
                  >
                    <span>Acessar GemHunter AI</span>
                    <ArrowUpRight size={16} weight="bold" />
                  </a>
                  <a
                    href="https://uaiid.com.br/gemhunter#radar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wibx-btn-card-outline"
                  >
                    <span>Ver Radar Ao Vivo</span>
                  </a>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Unified Architecture Section (Wibx Style) */}
        <section className="wibx-arch-section" id="arquitetura">
          <div className="wibx-container">
            <div className="wibx-arch-box">
              <div className="wibx-arch-header">
                <div className="wibx-section-tag">// ARQUITETURA UNIFICADA</div>
                <h2 className="wibx-arch-title">A Espinha Dorsal JNC</h2>
                <p className="wibx-arch-desc">
                  Como quatro verticais distintas compartilham a mesma infraestrutura de alta velocidade, IA preditiva e conformidade regulatória.
                </p>
              </div>

              <div className="wibx-arch-grid">
                
                <div className="wibx-arch-card">
                  <div className="wibx-arch-icon-box icon-cloud">
                    <Cpu size={28} weight="duotone" />
                  </div>
                  <h4 className="wibx-arch-card-title">Cloud AWS Distribuída</h4>
                  <p className="wibx-arch-card-text">
                    Microsserviços em contêineres gerenciados com latência submétrica, failover automático e 99.9% de uptime garantido por SLA.
                  </p>
                  <div className="wibx-arch-card-meta">
                    <span>Alta Disponibilidade</span>
                    <span>Multi-Região</span>
                  </div>
                </div>

                <div className="wibx-arch-card">
                  <div className="wibx-arch-icon-box icon-ai">
                    <ChartLineUp size={28} weight="duotone" />
                  </div>
                  <h4 className="wibx-arch-card-title">Motores de IA Preditiva</h4>
                  <p className="wibx-arch-card-text">
                    Modelos de visão computacional para OCR biométrico, interpretação de laudos laboratoriais e rotas logísticas de entrega local.
                  </p>
                  <div className="wibx-arch-card-meta">
                    <span>Visão Computacional</span>
                    <span>NLP Clínico</span>
                  </div>
                </div>

                <div className="wibx-arch-card">
                  <div className="wibx-arch-icon-box icon-security">
                    <Lock size={28} weight="duotone" />
                  </div>
                  <h4 className="wibx-arch-card-title">Criptografia &amp; LGPD</h4>
                  <p className="wibx-arch-card-text">
                    Proteção de dados biométricos e clínicos em repouso e em trânsito com chaves assimétricas e auditoria de trilha imutável.
                  </p>
                  <div className="wibx-arch-card-meta">
                    <span>Zero-Trust</span>
                    <span>Auditoria 1:1</span>
                  </div>
                </div>

                <div className="wibx-arch-card">
                  <div className="wibx-arch-icon-box icon-chain">
                    <GlobeSimple size={28} weight="duotone" />
                  </div>
                  <h4 className="wibx-arch-card-title">Radar On-Chain Base</h4>
                  <p className="wibx-arch-card-text">
                    Mempool scanner que inspeciona contratos inteligentes e liquidez recém-criada em blocos EVM de forma 100% descentralizada.
                  </p>
                  <div className="wibx-arch-card-meta">
                    <span>Anti-Honeypot</span>
                    <span>Não-Custodial</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Sobre a Holding Section */}
        <section className="wibx-about-section" id="sobre">
          <div className="wibx-container">
            <div className="wibx-about-card">
              <div className="wibx-section-tag">// A HOLDING</div>
              <h2 className="wibx-about-title">Construindo a Infraestrutura Tecnológica do Amanhã</h2>
              <p className="wibx-about-paragraph">
                A <strong>Já No Caminho Tecnologia (JNC)</strong> nasceu da convicção de que inteligência de dados, proximidade, segurança e auditoria devem caminhar lado a lado. Nossas quatro plataformas compartilham uma espinha dorsal de engenharia baseada em microsserviços na nuvem AWS, padrões rigorosos de segurança e IA aplicada para resolver problemas reais de pessoas, médicos, comerciantes e investidores.
              </p>

              <div className="wibx-about-pillars">
                <div className="wibx-pillar-box">
                  <div className="wibx-pillar-icon">🔒</div>
                  <div className="wibx-pillar-title">Segurança &amp; LGPD Médica</div>
                  <div className="wibx-pillar-desc">Criptografia de ponta a ponta e conformidade com diretrizes nacionais de dados em todas as pontas.</div>
                </div>

                <div className="wibx-pillar-box">
                  <div className="wibx-pillar-icon">⚡</div>
                  <div className="wibx-pillar-title">Alta Disponibilidade Cloud</div>
                  <div className="wibx-pillar-desc">Arquitetura escalável em nuvem com latência submétrica e monitoramento automatizado 24/7.</div>
                </div>

                <div className="wibx-pillar-box">
                  <div className="wibx-pillar-icon">🤝</div>
                  <div className="wibx-pillar-title">DNA de Proximidade &amp; App</div>
                  <div className="wibx-pillar-desc">Soluções desenhadas para gerar impacto direto em condomínios fechados, feiras e comércio local.</div>
                </div>

                <div className="wibx-pillar-box">
                  <div className="wibx-pillar-icon">💎</div>
                  <div className="wibx-pillar-title">Inteligência On-Chain &amp; DeFi</div>
                  <div className="wibx-pillar-desc">Auditoria algorítmica de contratos inteligentes, honeypots e liquidez on-chain em tempo real.</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer (Wibx Obsidian) */}
      <footer className="wibx-footer">
        <div className="wibx-container">
          <div className="wibx-footer-grid">
            
            <div className="wibx-footer-brand-col">
              <div className="wibx-brand-group">
                <div className="wibx-brand-emblem" style={{ width: 42, height: 42 }}>
                  <img src="/logos/jnc-ecossistema-oficial.webp" className="wibx-brand-logo-img" alt="JNC Logo" />
                </div>
                <div className="wibx-brand-text-col">
                  <span className="wibx-brand-name" style={{ fontSize: 18 }}>Já No Caminho</span>
                  <span className="wibx-brand-subtitle">Tecnologia &amp; Inovação</span>
                </div>
              </div>
              <p className="wibx-footer-tagline">
                Ecossistema tecnológico integrado. Plataforma unificada de saúde digital, gestão SaaS de comércio, identidade biométrica forense e inteligência on-chain Web3.
              </p>
            </div>

            <div className="wibx-footer-col">
              <h4>Plataformas</h4>
              <ul>
                <li><a href="https://drexame.janocaminho.com.br" target="_blank" rel="noopener noreferrer">Dr. Exame (Saúde Digital)</a></li>
                <li><a href="https://app.janocaminho.com.br/hub" target="_blank" rel="noopener noreferrer">Já No Caminho (Hub)</a></li>
                <li><Link to="/app">Já No Caminho (App)</Link></li>
                <li><a href="https://uaiid.com.br" target="_blank" rel="noopener noreferrer">Uai ID (Biometria 3D)</a></li>
                <li><a href="https://uaiid.com.br/gemhunter" target="_blank" rel="noopener noreferrer">GemHunter AI (Web3 Radar)</a></li>
              </ul>
            </div>

            <div className="wibx-footer-col">
              <h4>Institucional</h4>
              <ul>
                <li><a href="#sobre">A Empresa</a></li>
                <li><a href="#solucoes">Ecossistema</a></li>
                <li><a href="#arquitetura">Arquitetura Unificada</a></li>
                <li><a href="https://uaiid.com.br/landing/index.html" target="_blank" rel="noopener noreferrer">Documentação API</a></li>
                <li><a href="#">Privacidade &amp; LGPD</a></li>
              </ul>
            </div>

            <div className="wibx-footer-col">
              <h4>Rede &amp; Acessos</h4>
              <ul>
                <li><a href="https://app.janocaminho.com.br/hub" target="_blank" rel="noopener noreferrer">Painel Operacional ↗</a></li>
                <li><a href="https://uaiid.com.br/dashboard" target="_blank" rel="noopener noreferrer">Dashboard Uai ID ↗</a></li>
                <li><a href="https://drexame.janocaminho.com.br" target="_blank" rel="noopener noreferrer">Portal Dr. Exame ↗</a></li>
                <li><a href="https://uaiid.com.br/gemhunter#radar" target="_blank" rel="noopener noreferrer">Radar GemHunter Ao Vivo ↗</a></li>
              </ul>
            </div>

          </div>

          <div className="wibx-footer-bottom">
            <div className="wibx-footer-copy">
              © 2026 Já No Caminho Tecnologia Ltda. Todos os direitos reservados.
            </div>
            <div className="wibx-footer-compliance">
              <span>CNPJ em conformidade</span>
              <span className="wibx-sep">•</span>
              <span>Belo Horizonte / MG</span>
              <span className="wibx-sep">•</span>
              <span>AWS Cloud Infrastructure</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Lightbox Modal */}
      {modalOpen && (
        <div className="wibx-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="wibx-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="wibx-modal-close" onClick={() => setModalOpen(false)}>
              &times;
            </button>
            <div className="wibx-modal-title">
              JNC Ecossistema Tecnológico — Identidade Oficial
            </div>
            <img src="/logos/jnc-ecossistema-oficial.webp" className="wibx-modal-img" alt="Logo Oficial JNC" />
          </div>
        </div>
      )}
    </div>
  );
}

export default EmpresaJanoCaminhoPage;
