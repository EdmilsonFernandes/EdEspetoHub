// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  DeviceMobile,
  RocketLaunch,
} from '@phosphor-icons/react';

export function EmpresaJanoCaminhoPage() {
  return (
    <div style={styles.pageWrap}>
      {/* Background Orbs Glow */}
      <div style={styles.ambientOrbs}>
        <div style={{ ...styles.orb, ...styles.orb1 }} />
        <div style={{ ...styles.orb, ...styles.orb2 }} />
        <div style={{ ...styles.orb, ...styles.orb3 }} />
        <div style={styles.gridOverlay} />
      </div>

      {/* Header / Navbar Institucional */}
      <header style={styles.navbar}>
        <div style={styles.navContainer}>
          <div style={styles.brandGroup}>
            <img
              src="/logos/janocaminho.jpg"
              alt="Já No Caminho"
              style={styles.brandLogoImg}
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <span style={styles.brandName}>
              Já No Caminho <span style={styles.brandAccent}>Tecnologia</span>
            </span>
          </div>

          <nav style={styles.navLinks}>
            <a href="#solucoes" style={styles.navLink}>Produtos</a>
            <a href="#ecossistema" style={styles.navLink}>Ecossistema</a>
            <a href="#empresa" style={styles.navLink}>A Empresa</a>
            <a href="#contato" style={styles.navLink}>Contato</a>
          </nav>

          <a
            href="https://app.janocaminho.com.br/hub"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.navCta}
          >
            Acessar o Hub ↗
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main style={styles.mainContent}>
        <section style={styles.heroSection}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={styles.pillBadge}
          >
            <span style={styles.pulseDot} />
            ECOSSISTEMA INTEGRADO DE TECNOLOGIA
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={styles.heroTitle}
          >
            Inovação, Inteligência e Confiança <br />
            <span style={styles.heroGradientText}>no seu dia a dia.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={styles.heroSubtitle}
          >
            A <strong>Já No Caminho</strong> desenvolve plataformas escaláveis de alta tecnologia conectando saúde preventiva, comércio de proximidade e validação biométrica forense em uma só holding.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={styles.heroActions}
          >
            <a href="#solucoes" style={styles.btnHeroPrimary}>
              Explorar Nossos Produtos ↓
            </a>
            <a href="https://app.janocaminho.com.br" style={styles.btnHeroSecondary} title="Site oficial do app Já No Caminho">
              <DeviceMobile size={18} weight="bold" />
              <span>Conhecer o App Delivery</span>
              <span>→</span>
            </a>
          </motion.div>
        </section>

        {/* Seção de Soluções e Produtos (Bento Grid) */}
        <section id="solucoes" style={styles.productsSection}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTag}>Nossas Soluções</span>
            <h2 style={styles.sectionHeading}>Um ecossistema completo para cada desafio</h2>
            <p style={styles.sectionSubheading}>
              Cada plataforma foi construída com identidade própria, alta tecnologia e foco na melhor experiência do usuário.
            </p>
          </div>

          <div style={styles.productsGrid}>
            
            {/* 1. Dr. Exame */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              style={{ ...styles.productCard, borderColor: "rgba(236, 72, 153, 0.35)" }}
            >
              <div>
                <div style={styles.cardTop}>
                  <div style={styles.productLogoBox}>
                    <img
                      src="/logos/dr-exame-app-icon.png"
                      alt="Dr. Exame"
                      style={{ height: 42, width: 42, borderRadius: 12, objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <span style={{ ...styles.statusBadge, ...styles.statusBadgeLive }}>Saúde Digital</span>
                </div>

                <h3 style={styles.productName}>Dr. Exame</h3>
                <p style={styles.productDesc}>
                  Inteligência médica e gestão preventiva de saúde. Análise automatizada de exames laboratoriais, histórico unificado do paciente e apoio a decisões clínicas.
                </p>

                <div style={styles.featureTags}>
                  <span style={styles.featureTag}>Análise de Laudos</span>
                  <span style={styles.featureTag}>Saúde Preventiva</span>
                  <span style={styles.featureTag}>LGPD Saúde</span>
                  <span style={styles.featureTag}>Histórico Digital</span>
                </div>
              </div>

              <div style={styles.cardActions}>
                <a
                  href="https://drexame.janocaminho.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...styles.btnCardPrimary, background: "linear-gradient(135deg, #EC4899 0%, #DB2777 100%)" }}
                >
                  <span>Acessar Dr. Exame</span>
                  <ArrowUpRight size={16} weight="bold" />
                </a>
              </div>
            </motion.div>

            {/* 2. Já No Caminho (App) */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              style={{ ...styles.productCard, borderColor: "rgba(16, 185, 129, 0.35)" }}
            >
              <div>
                <div style={styles.cardTop}>
                  <div style={{ ...styles.productLogoBox, background: "rgba(255, 255, 255, 0.95)", padding: "4px 10px" }}>
                    <img
                      src="/janocaminho.jpg"
                      alt="Já No Caminho"
                      style={{ height: 38, width: 38, borderRadius: 10, objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <span style={{ ...styles.statusBadge, ...styles.statusBadgeLive }}>Delivery & Hub</span>
                </div>

                <h3 style={styles.productName}>Já No Caminho (App)</h3>
                <p style={styles.productDesc}>
                  Hub completo de comércio de proximidade e delivery. Conecta condomínios, restaurantes, mercados e destinos locais com checkout rápido e logística ágil.
                </p>

                <div style={styles.featureTags}>
                  <span style={styles.featureTag}>Delivery Ágil</span>
                  <span style={styles.featureTag}>Condomínios</span>
                  <span style={styles.featureTag}>Google Play</span>
                  <span style={styles.featureTag}>Lojas & Destinos</span>
                </div>
              </div>

              <div style={styles.cardActions}>
                {/* Leva para o site do app (app.janocaminho.com.br) — primeiro o site do app, depois o hub */}
                <a
                  href="https://app.janocaminho.com.br"
                  style={{ ...styles.btnCardPrimary, background: "linear-gradient(135deg, #10B981 0%, #059669 100%)" }}
                  title="Site oficial do aplicativo Já No Caminho (apresentação e lojas)"
                >
                  <span>Conhecer o App →</span>
                </a>
                {/* Leva direto para o hub de pedidos */}
                <a
                  href="https://app.janocaminho.com.br/hub"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.btnCardSecondary}
                  title="Abrir direto o Hub de pedidos e lojas"
                >
                  <span>Abrir o Hub ↗</span>
                </a>
              </div>
            </motion.div>

            {/* 3. Uai ID */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              style={{ ...styles.productCard, borderColor: "rgba(0, 210, 255, 0.35)" }}
            >
              <div>
                <div style={styles.cardTop}>
                  <div style={{ ...styles.productLogoBox, background: "rgba(10, 18, 40, 0.9)", borderColor: "rgba(0, 210, 255, 0.4)", padding: "4px 12px" }}>
                    <img
                      src="/logos/uai-logo.jpg"
                      alt="Uai ID"
                      style={{ height: 44, width: 44, borderRadius: 12, objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <span style={{ ...styles.statusBadge, ...styles.statusBadgeLive }}>Biometria & KYC</span>
                </div>

                <h3 style={styles.productName}>Uai ID</h3>
                <p style={styles.productDesc}>
                  Infraestrutura de identidade digital para o Brasil. Verificação facial 3D, prova de vida ativa, OCR forense de CNH/RG e motor de score antifraude em milissegundos.
                </p>

                <div style={styles.featureTags}>
                  <span style={styles.featureTag}>Liveness 3D</span>
                  <span style={styles.featureTag}>OCR Forense</span>
                  <span style={styles.featureTag}>Anti-Spoofing</span>
                  <span style={styles.featureTag}>API REST</span>
                </div>
              </div>

              <div style={styles.cardActions}>
                <a
                  href="https://uaiid.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...styles.btnCardPrimary, background: "linear-gradient(135deg, #00D2FF 0%, #2563EB 100%)" }}
                >
                  <span>Acessar Uai ID</span>
                  <ArrowUpRight size={16} weight="bold" />
                </a>
                <a href="https://uaiid.com.br/landing/index.html" target="_blank" rel="noopener noreferrer" style={styles.btnCardSecondary}>
                  Ver Demo
                </a>
              </div>
            </motion.div>

            {/* 4. Novo Produto (Em Breve) */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              style={{ ...styles.productCard, borderColor: "rgba(139, 92, 246, 0.35)", background: "rgba(15, 23, 42, 0.45)", borderStyle: "dashed" }}
            >
              <div>
                <div style={styles.cardTop}>
                  <div style={{ ...styles.productLogoBox, background: "rgba(139, 92, 246, 0.15)", borderColor: "rgba(139, 92, 246, 0.4)", color: "#C084FC", fontWeight: 900 }}>
                    <RocketLaunch size={24} weight="fill" />
                    <span style={{ marginLeft: 6, fontSize: 14 }}>JNC</span>
                  </div>
                  <span style={{ ...styles.statusBadge, background: "rgba(139, 92, 246, 0.15)", color: "#C084FC", borderColor: "rgba(139, 92, 246, 0.4)" }}>
                    Em Breve · Q4
                  </span>
                </div>

                <h3 style={styles.productName}>Nova Solução</h3>
                <p style={styles.productDesc}>
                  Uma nova tecnologia inovadora está sendo desenvolvida para expandir ainda mais o ecossistema Já No Caminho. Em breve disponível para nossos clientes e parceiros.
                </p>

                <div style={styles.featureTags}>
                  <span style={styles.featureTag}>Inovação Contínua</span>
                  <span style={styles.featureTag}>Inteligência Artificial</span>
                  <span style={styles.featureTag}>Em Homologação</span>
                </div>
              </div>

              <div style={styles.cardActions}>
                <div style={{ ...styles.btnCardPrimary, background: "rgba(139, 92, 246, 0.25)", color: "#C084FC", cursor: "default" }}>
                  <span>Lançamento em Breve ⏳</span>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Banner Institucional de Ecossistema */}
          <div id="ecossistema" style={styles.integrationBanner}>
            <div style={{ flex: "1 1 300px" }}>
              <span style={styles.sectionTag}>Holding & Governança</span>
              <h3 style={styles.bannerTitle}>Conectividade robusta sob a mesma excelência tecnológica</h3>
              <p style={styles.bannerDesc}>
                Todas as soluções da <strong>Já No Caminho</strong> compartilham a mesma infraestrutura em nuvem de alta disponibilidade, rigorosos protocolos de proteção de dados (LGPD) e autenticação biométrica unificada.
              </p>
            </div>

            <div style={styles.bannerStats}>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>3+</div>
                <div style={styles.statLabel}>Plataformas Ativas</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>99.9%</div>
                <div style={styles.statLabel}>Disponibilidade Cloud</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>LGPD</div>
                <div style={styles.statLabel}>Conformidade Total</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="empresa" style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerColBrand}>
            <div style={styles.brandGroup}>
              <img
                src="/logos/janocaminho.jpg"
                alt="Já No Caminho"
                style={{ height: 32, width: "auto", borderRadius: 6 }}
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
              <span style={{ fontWeight: 800, fontSize: 18, color: "#FFFFFF" }}>Já No Caminho</span>
            </div>
            <p style={{ color: "#94A3B8", fontSize: 14, marginTop: 14, lineHeight: 1.6, maxWidth: 320 }}>
              Construindo soluções digitais que transformam a experiência de pessoas, empresas e comunidades em todo o Brasil.
            </p>
          </div>

          <div style={styles.footerCol}>
            <h4 style={styles.footerColTitle}>Plataformas</h4>
            <div style={styles.footerLinksList}>
              <a href="https://drexame.janocaminho.com.br" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>Dr. Exame (Saúde)</a>
              <a href="https://app.janocaminho.com.br" style={styles.footerLink}>Já No Caminho (Site do App)</a>
              <a href="https://app.janocaminho.com.br/hub" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>Já No Caminho (Hub / Pedidos)</a>
              <a href="https://uaiid.com.br" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>Uai ID (Biometria & KYC)</a>
            </div>
          </div>

          <div style={styles.footerCol}>
            <h4 style={styles.footerColTitle}>Institucional</h4>
            <div style={styles.footerLinksList}>
              <a href="#empresa" style={styles.footerLink}>Sobre a Empresa</a>
              <a href="#ecossistema" style={styles.footerLink}>Tecnologia & Cloud</a>
              <a href="#solucoes" style={styles.footerLink}>Novos Lançamentos</a>
              <a href="mailto:contato@janocaminho.com.br" style={styles.footerLink}>Parcerias Corporativas</a>
            </div>
          </div>

          <div style={styles.footerCol} id="contato">
            <h4 style={styles.footerColTitle}>Contato</h4>
            <div style={styles.footerLinksList}>
              <a href="mailto:contato@janocaminho.com.br" style={styles.footerLink}>contato@janocaminho.com.br</a>
              <a href="https://wa.me/5512999999999" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>Suporte WhatsApp</a>
              <span style={{ color: "#64748B", fontSize: 13 }}>Brasil · São Paulo & Minas Gerais</span>
            </div>
          </div>
        </div>

        <div style={styles.footerBottom}>
          <div>
            © 2026 Já No Caminho Tecnologia. Todos os direitos reservados.
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <Link to="/termos" style={{ color: "#94A3B8" }}>Termos de Uso</Link>
            <a href="#top" style={{ color: "#94A3B8" }}>Voltar ao topo ↑</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageWrap: {
    minHeight: "100vh",
    backgroundColor: "#060C1A",
    color: "#FFFFFF",
    position: "relative",
    overflowX: "hidden",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  ambientOrbs: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
  },
  orb: {
    position: "absolute",
    borderRadius: "50%",
    filter: "blur(110px)",
    opacity: 0.35,
  },
  orb1: {
    width: 550,
    height: 550,
    background: "radial-gradient(circle, #3B72F7 0%, transparent 70%)",
    top: -100,
    left: -100,
  },
  orb2: {
    width: 600,
    height: 600,
    background: "radial-gradient(circle, #00D2FF 0%, transparent 70%)",
    top: "40%",
    right: -150,
    opacity: 0.25,
  },
  orb3: {
    width: 500,
    height: 500,
    background: "radial-gradient(circle, #10B981 0%, transparent 70%)",
    bottom: -100,
    left: "20%",
    opacity: 0.2,
  },
  gridOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage: "linear-gradient(rgba(59,114,247,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,114,247,0.05) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
  },
  navbar: {
    position: "fixed",
    top: 0, left: 0, right: 0,
    height: 78,
    background: "rgba(6, 12, 26, 0.88)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    borderBottom: "1px solid rgba(59, 114, 247, 0.22)",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
  },
  navContainer: {
    maxWidth: 1200,
    width: "100%",
    margin: "0 auto",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandGroup: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  brandLogoImg: {
    height: 38,
    width: "auto",
    borderRadius: 8,
    boxShadow: "0 0 15px rgba(0, 210, 255, 0.3)",
    background: "#FFFFFF",
    padding: 4,
  },
  brandName: {
    fontWeight: 900,
    fontSize: 20,
    letterSpacing: "-0.03em",
    color: "#FFFFFF",
  },
  brandAccent: {
    color: "#00D2FF",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: 32,
  },
  navLink: {
    fontSize: 14.5,
    fontWeight: 600,
    color: "#94A3B8",
    textDecoration: "none",
    transition: "color 0.2s",
  },
  navCta: {
    background: "linear-gradient(135deg, #3B72F7 0%, #00D2FF 100%)",
    color: "#FFFFFF",
    fontWeight: 700,
    fontSize: 14,
    padding: "10px 22px",
    borderRadius: 8,
    boxShadow: "0 4px 20px rgba(59, 114, 247, 0.35)",
    textDecoration: "none",
  },
  mainContent: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 24px",
  },
  heroSection: {
    padding: "165px 0 95px",
    textAlign: "center",
  },
  pillBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 16px",
    borderRadius: 999,
    background: "rgba(0, 210, 255, 0.08)",
    border: "1px solid rgba(0, 210, 255, 0.3)",
    color: "#00D2FF",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.1em",
    marginBottom: 24,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#00D2FF",
    boxShadow: "0 0 12px #00D2FF",
  },
  heroTitle: {
    fontSize: "clamp(36px, 5.2vw, 62px)",
    fontWeight: 900,
    letterSpacing: "-0.04em",
    lineHeight: 1.15,
    maxWidth: 920,
    margin: "0 auto 24px",
  },
  heroGradientText: {
    background: "linear-gradient(135deg, #FFFFFF 20%, #00D2FF 60%, #3B72F7 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  heroSubtitle: {
    fontSize: "clamp(16px, 2vw, 19.5px)",
    color: "#CBD5E1",
    maxWidth: 750,
    margin: "0 auto 40px",
    fontWeight: 400,
    lineHeight: 1.65,
  },
  heroActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  btnHeroPrimary: {
    padding: "14px 32px",
    borderRadius: 8,
    background: "linear-gradient(135deg, #3B72F7 0%, #00D2FF 100%)",
    color: "#FFFFFF",
    fontWeight: 800,
    fontSize: 16,
    textDecoration: "none",
    boxShadow: "0 8px 30px rgba(59, 114, 247, 0.4)",
  },
  btnHeroSecondary: {
    padding: "14px 28px",
    borderRadius: 8,
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    color: "#FFFFFF",
    fontWeight: 700,
    fontSize: 15,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    backdropFilter: "blur(10px)",
  },
  productsSection: {
    padding: "60px 0 120px",
  },
  sectionHeader: {
    textAlign: "center",
    marginBottom: 56,
  },
  sectionTag: {
    fontSize: 12,
    fontWeight: 800,
    color: "#00D2FF",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    marginBottom: 12,
    display: "inline-block",
  },
  sectionHeading: {
    fontSize: "clamp(28px, 3.5vw, 42px)",
    fontWeight: 900,
    letterSpacing: "-0.03em",
    marginBottom: 16,
  },
  sectionSubheading: {
    color: "#94A3B8",
    fontSize: 16,
    maxWidth: 620,
    margin: "0 auto",
  },
  productsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 28,
  },
  productCard: {
    background: "rgba(15, 26, 56, 0.72)",
    border: "1px solid rgba(59, 114, 247, 0.22)",
    borderRadius: 22,
    padding: "34px 30px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  productLogoBox: {
    height: 52,
    padding: "6px 14px",
    borderRadius: 12,
    background: "rgba(255, 255, 255, 0.07)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid",
  },
  statusBadgeLive: {
    background: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.4)",
    color: "#34D399",
  },
  productName: {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    marginBottom: 10,
    color: "#FFFFFF",
  },
  productDesc: {
    color: "#CBD5E1",
    fontSize: 14.5,
    lineHeight: 1.6,
    marginBottom: 24,
    minHeight: 68,
  },
  featureTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 28,
  },
  featureTag: {
    fontSize: 12,
    fontWeight: 600,
    color: "#94A3B8",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "3px 10px",
    borderRadius: 6,
  },
  cardActions: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    paddingTop: 20,
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    flexWrap: "wrap",
  },
  btnCardPrimary: {
    flex: 1,
    padding: "12px 18px",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13.5,
    textAlign: "center",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    color: "#FFFFFF",
    textDecoration: "none",
  },
  btnCardSecondary: {
    padding: "12px 14px",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13,
    background: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    color: "#FFFFFF",
    textDecoration: "none",
  },
  integrationBanner: {
    marginTop: 80,
    background: "linear-gradient(135deg, rgba(15, 26, 56, 0.85) 0%, rgba(10, 18, 40, 0.98) 100%)",
    border: "1px solid rgba(59, 114, 247, 0.22)",
    borderRadius: 30,
    padding: "50px 40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 40,
    flexWrap: "wrap",
  },
  bannerTitle: {
    fontSize: "clamp(22px, 2.5vw, 32px)",
    fontWeight: 900,
    marginBottom: 12,
    letterSpacing: "-0.02em",
  },
  bannerDesc: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 1.65,
  },
  bannerStats: {
    display: "flex",
    gap: 32,
    flexWrap: "wrap",
  },
  statBox: {
    textAlign: "left",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 900,
    color: "#00D2FF",
    lineHeight: 1,
    marginBottom: 6,
    fontFamily: "'JetBrains Mono', monospace",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#94A3B8",
  },
  footer: {
    borderTop: "1px solid rgba(59, 114, 247, 0.22)",
    background: "rgba(6, 12, 26, 0.95)",
    padding: "60px 0 30px",
    position: "relative",
    zIndex: 1,
  },
  footerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 24px",
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr",
    gap: 40,
    marginBottom: 50,
  },
  footerColBrand: {},
  footerCol: {},
  footerColTitle: {
    fontSize: 13,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  footerLinksList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  footerLink: {
    color: "#94A3B8",
    fontSize: 14,
    textDecoration: "none",
  },
  footerBottom: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "24px 24px 0",
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
    fontSize: 13,
    color: "#94A3B8",
  },
};

export default EmpresaJanoCaminhoPage;
