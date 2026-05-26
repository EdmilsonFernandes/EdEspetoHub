import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ForkKnife, 
  Package, 
  Buildings, 
  CheckCircle, 
  MapPinLine, 
  Info, 
  WarningCircle, 
  Coins 
} from '@phosphor-icons/react';

type TabType = 'food' | 'retail' | 'local';

export function LandingUseCases() {
  const [activeTab, setActiveTab] = useState<TabType>('food');

  // States for food simulator
  const [qty, setQty] = useState(1);
  const [farofa, setFarofa] = useState(false);
  const [queijo, setQueijo] = useState(false);

  // States for retail simulator
  const [weight, setWeight] = useState(500); // grams
  const [stock, setStock] = useState(5);

  // States for local simulator
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Constants for food calculation
  const originalPricePerItem = 26.00;
  const promoPricePerItem = 22.00;
  const isPromoActive = qty >= 3;
  const pricePerItem = isPromoActive ? promoPricePerItem : originalPricePerItem;
  const modifierPrice = (farofa ? 3.00 : 0) + (queijo ? 4.50 : 0);
  const foodTotal = (pricePerItem * qty) + (modifierPrice * qty);

  // Constants for retail calculation
  // Box dimensions scale dynamically with weight
  const boxLength = Math.max(15, Math.min(60, Math.round(15 + (weight - 100) * 0.005)));
  const boxWidth = Math.max(10, Math.min(45, Math.round(10 + (weight - 100) * 0.004)));
  const boxHeight = Math.max(5, Math.min(40, Math.round(5 + (weight - 100) * 0.003)));

  const handleScan = () => {
    setScanning(true);
    setScanned(false);
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
    }, 2500);
  };

  const tabs = [
    {
      id: 'food' as TabType,
      label: 'Restaurantes & Lanches',
      icon: ForkKnife,
      description: 'Lógica completa para cardápio digital, combos inteligentes, controle de fila e pedidos locais.',
    },
    {
      id: 'retail' as TabType,
      label: 'Lojas & Empórios',
      icon: Package,
      description: 'Controle de estoque preventivo e cálculo de frete por dimensões para envio postal.',
    },
    {
      id: 'local' as TabType,
      label: 'Condomínios & Turismo',
      icon: Buildings,
      description: 'Georreferenciamento de precisão para entregas hiperlocais e rotas programadas.',
    },
  ];

  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">
          Operação Real
        </span>
        <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
          Simule os recursos do seu negócio
        </h2>
        <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed">
          Sem recursos inventados. Teste agora as ferramentas nativas que estão prontas no banco de dados e no código do sistema.
        </p>
      </div>

      {/* Tabs selector */}
      <div className="flex flex-wrap justify-center gap-3 p-1.5 rounded-[1.8rem] border border-white/5 bg-slate-950/80 max-w-3xl mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="activeTabGlow"
                  className="absolute inset-0 bg-white/[0.06] border border-white/10 rounded-2xl -z-10 shadow-[0_12px_24px_-10px_rgba(255,255,255,0.1)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon size={16} weight="duotone" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <div className="min-h-[460px] relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <AnimatePresence mode="wait">
          {activeTab === 'food' && (
            <motion.div
              key="food-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid gap-10 lg:grid-cols-12 items-center"
            >
              {/* Esquerda: Features */}
              <div className="lg:col-span-6 space-y-6">
                <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  Tudo para o seu Delivery deslanchar
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  O sistema possui suporte a adicionais, combos por volume de compra e inteligência operacional para calcular tempos de preparo na cozinha.
                </p>

                <div className="space-y-4">
                  {[
                    { title: 'Preço Promocional em Lotes (Bundles)', desc: 'Desconto progressivo automático no carrinho quando o cliente compra mais unidades.' },
                    { title: 'Personalizadores de Produtos (Modifiers)', desc: 'Opções como ponto de carne, complementos e opcionais com preços dedicados.' },
                    { title: 'Pedidos presenciais em Mesa com Taxas', desc: 'Lógica pronta para couvert e taxa de serviço opcional calculados por mesa.' },
                    { title: 'Fila de Cozinha e ETA Inteligente', desc: 'Estimativa de entrega com base no preparo dos itens e quantidade de pedidos ativos.' }
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3">
                      <CheckCircle size={18} weight="fill" className="text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[13px] font-black text-white">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Direita: Simulador */}
              <div className="lg:col-span-6 flex justify-center">
                <div className="w-full max-w-[360px] rounded-3xl border border-white/10 bg-slate-950 p-5 space-y-5 shadow-2xl">
                  <div className="border-b border-white/5 pb-3">
                    <p className="text-[9px] font-black tracking-widest text-cyan-400 uppercase">Simulador de Cardápio</p>
                    <h4 className="text-base font-black text-white mt-1">🍢 Espeto Alcatra Premium</h4>
                    <p className="text-xs text-slate-400 mt-1">Escolha os opcionais e a quantidade abaixo:</p>
                  </div>

                  {/* Modifiers Checks */}
                  <div className="space-y-3.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Adicionais (Modifiers)</p>
                    
                    <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={farofa}
                          onChange={(e) => setFarofa(e.target.checked)}
                          className="h-4.5 w-4.5 rounded border-white/10 bg-slate-900 accent-cyan-400 cursor-pointer"
                        />
                        <span className="text-xs font-black text-slate-200">Farofa Especial Caseira</span>
                      </div>
                      <span className="text-xs font-black text-cyan-400">+ R$ 3,00</span>
                    </label>

                    <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={queijo}
                          onChange={(e) => setQueijo(e.target.checked)}
                          className="h-4.5 w-4.5 rounded border-white/10 bg-slate-900 accent-cyan-400 cursor-pointer"
                        />
                        <span className="text-xs font-black text-slate-200">Queijo Coalha Derretido</span>
                      </div>
                      <span className="text-xs font-black text-cyan-400">+ R$ 4,50</span>
                    </label>
                  </div>

                  {/* Quantity selector */}
                  <div className="flex items-center justify-between gap-3 border-t border-dashed border-white/10 pt-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Quantidade</p>
                      <p className="text-xs font-semibold text-slate-300 mt-1">Leve 3+ por R$ 22,00/cada</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-1.5 rounded-xl">
                      <button 
                        type="button" 
                        onClick={() => setQty(Math.max(1, qty - 1))}
                        className="h-8 w-8 rounded-lg bg-slate-900 text-white font-black hover:bg-slate-800 transition active:scale-95"
                      >
                        -
                      </button>
                      <span className="text-sm font-black w-5 text-center">{qty}</span>
                      <button 
                        type="button" 
                        onClick={() => setQty(qty + 1)}
                        className="h-8 w-8 rounded-lg bg-slate-900 text-white font-black hover:bg-slate-800 transition active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Dynamic bundle promo alert */}
                  <AnimatePresence>
                    {isPromoActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 flex items-center gap-2 overflow-hidden"
                      >
                        <Coins size={16} className="text-emerald-400 shrink-0" />
                        <span className="text-[10px] font-black text-emerald-300 leading-tight uppercase">
                          Desconto Progressivo Ativo!
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Total calculation display */}
                  <div className="border-t border-white/5 pt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Total da Simulação</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">({qty}x espeto + opcionais)</p>
                    </div>
                    <span className="text-xl font-black text-emerald-400">
                      R$ {foodTotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'retail' && (
            <motion.div
              key="retail-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid gap-10 lg:grid-cols-12 items-center"
            >
              {/* Esquerda: Features */}
              <div className="lg:col-span-6 space-y-6">
                <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  Automação para Varejo & Lojas Gerais
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Não é apenas para delivery de comida. O sistema já calcula dimensões de embalagens físicas para envio por Correios e monitora o estoque.
                </p>

                <div className="space-y-4">
                  {[
                    { title: 'Alerta Preventivo de Baixo Estoque', desc: 'Evita vendas frustradas. Define um limite mínimo que avisa na tela do lojista antes que o produto acabe.' },
                    { title: 'Dimensões por Peso e Tamanho (Correios)', desc: 'Cálculo dinâmico baseado em peso (g), largura, altura e comprimento (cm) de cada embalagem.' },
                    { title: 'Controle de Movimentações de Estoque', desc: 'Histórico integrado no banco que registra todas as saídas e reposições manuais de cada item.' },
                    { title: 'Modo de Entrega Postal Ativo', desc: 'Suporte a cálculo de taxas nacionais de envio conectando CEP de origem e destino.' }
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3">
                      <CheckCircle size={18} weight="fill" className="text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[13px] font-black text-white">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Direita: Simulador */}
              <div className="lg:col-span-6 flex justify-center">
                <div className="w-full max-w-[360px] rounded-3xl border border-white/10 bg-slate-950 p-5 space-y-5 shadow-2xl">
                  
                  {/* Estoque Preventivo */}
                  <div className="border-b border-white/5 pb-3">
                    <p className="text-[9px] font-black tracking-widest text-emerald-400 uppercase">Simulador de Estoque</p>
                    <div className="flex items-center justify-between gap-3 mt-1.5">
                      <span className="text-xs font-semibold text-slate-400">Estoque do Produto:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setStock(Math.max(0, stock - 1))}
                          className="h-7 w-7 rounded bg-white/5 hover:bg-white/10 text-white font-black text-xs transition"
                        >
                          -
                        </button>
                        <span className="text-xs font-black min-w-5 text-center">{stock} un.</span>
                        <button
                          type="button"
                          onClick={() => setStock(stock + 1)}
                          className="h-7 w-7 rounded bg-white/5 hover:bg-white/10 text-white font-black text-xs transition"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {stock <= 3 ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 flex items-center gap-2 overflow-hidden"
                        >
                          <WarningCircle size={16} className="text-rose-400 shrink-0" />
                          <span className="text-[9px] font-black text-rose-300 leading-tight uppercase">
                            Alerta Crítico: Estoque abaixo do mínimo (3 un.)!
                          </span>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 flex items-center gap-2 overflow-hidden"
                        >
                          <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                          <span className="text-[9px] font-black text-emerald-300 leading-tight uppercase">
                            Estoque Saudável
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Dimensões Postais */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-[9px] font-black tracking-widest text-emerald-400 uppercase">Simulador de Frete Correios</p>
                      <p className="text-xs text-slate-400 mt-1">Ajuste o peso do produto para recalcular a caixa:</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400">Peso do Produto:</span>
                        <span className="text-white font-black">{weight}g</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="5000"
                        step="100"
                        value={weight}
                        onChange={(e) => setWeight(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                      />
                    </div>

                    {/* Caixa 3D Mockup */}
                    <div className="relative h-28 rounded-2xl border border-white/5 bg-slate-900/50 flex items-center justify-center overflow-hidden">
                      <div className="absolute top-2 left-2 flex items-center gap-1 text-[8.5px] font-bold text-slate-500">
                        <Info size={11} />
                        Cálculo DDL Ativo
                      </div>
                      
                      {/* Box Visual representation */}
                      <motion.div
                        animate={{
                          width: `${Math.min(100, 40 + (weight - 100) * 0.012)}px`,
                          height: `${Math.min(70, 30 + (weight - 100) * 0.008)}px`,
                        }}
                        className="border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 rounded flex items-center justify-center text-[10px] font-black text-emerald-400"
                      >
                        Pacote
                      </motion.div>
                    </div>

                    {/* Output dimension attributes */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: 'Comprimento', val: `${boxLength} cm` },
                        { label: 'Largura', val: `${boxWidth} cm` },
                        { label: 'Altura', val: `${boxHeight} cm` },
                      ].map((dim) => (
                        <div key={dim.label} className="rounded-xl bg-white/[0.02] border border-white/5 py-2">
                          <p className="text-[8px] font-black uppercase text-slate-500 leading-none">{dim.label}</p>
                          <p className="text-[10px] font-black text-white mt-1">{dim.val}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'local' && (
            <motion.div
              key="local-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid gap-10 lg:grid-cols-12 items-center"
            >
              {/* Esquerda: Features */}
              <div className="lg:col-span-6 space-y-6">
                <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  Diferencial Geográfico Hiperlocal
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Para condomínios fechados ou turismo rural e pousadas, a plataforma lê as coordenadas geográficas exatas para sincronizar entregas com precisão.
                </p>

                <div className="space-y-4">
                  {[
                    { title: 'Filtro por Latitude & Longitude (`lat`, `lng`)', desc: 'Lista apenas os entregadores e lojas com suporte geográfico para alcançar a coordenada exata da cabana ou chalé.' },
                    { title: 'Mapeamento de Condomínios e Feiras', desc: 'Lojas e barracas móveis podem se vincular a eventos internos de condomínios com dias de abertura programados.' },
                    { title: 'Controle de Taxas de Entregas Coletivas', desc: 'Permite gerenciar rotas conjuntas para economizar frete dentro de condomínios e vilas fechadas.' },
                    { title: 'QR Code Inteligente por Acomodação', desc: 'O hóspede aponta para o QR e encontra apenas comércios com raios de entrega válidos para aquele chalé.' }
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3">
                      <CheckCircle size={18} weight="fill" className="text-violet-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[13px] font-black text-white">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Direita: Simulador */}
              <div className="lg:col-span-6 flex justify-center">
                <div className="w-full max-w-[360px] rounded-3xl border border-white/10 bg-slate-950 p-5 space-y-5 shadow-2xl">
                  
                  <div className="border-b border-white/5 pb-3">
                    <p className="text-[9px] font-black tracking-widest text-violet-400 uppercase">Simulador de GPS</p>
                    <h4 className="text-base font-black text-white mt-1">📍 Localizador Geográfico</h4>
                    <p className="text-xs text-slate-400 mt-1">Escaneando cabana/chalé ativo na montanha:</p>
                  </div>

                  {/* Scan visual */}
                  <div className="relative h-32 rounded-2xl border border-white/5 bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
                    <AnimatePresence mode="wait">
                      {scanning && (
                        <motion.div
                          key="scan-anim"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center justify-center space-y-2"
                        >
                          {/* Pulsing Radar Ring */}
                          <span className="absolute h-16 w-16 rounded-full border border-violet-500/40 bg-violet-500/5 animate-ping" />
                          <MapPinLine size={28} className="text-violet-400 animate-pulse relative z-10" />
                          <span className="text-[9px] font-black uppercase text-violet-300 relative z-10">Escaneando Radar...</span>
                        </motion.div>
                      )}

                      {scanned && !scanning && (
                        <motion.div
                          key="scanned-anim"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center justify-center space-y-2.5 text-center px-4"
                        >
                          <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            ✓
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-white uppercase leading-none">Chalé #08 Localizado</p>
                            <p className="text-[8px] text-slate-500 mt-1 font-semibold">Coordenadas: Lat: -22.95420 · Lng: -45.98730</p>
                          </div>
                          <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[8.5px] font-black text-violet-300">
                            3 lojas entregam aqui
                          </span>
                        </motion.div>
                      )}

                      {!scanning && !scanned && (
                        <motion.div
                          key="idle-anim"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center justify-center space-y-2.5"
                        >
                          <MapPinLine size={28} className="text-slate-500" />
                          <span className="text-[9px] font-black uppercase text-slate-400">Pronto para buscar</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    type="button"
                    disabled={scanning}
                    onClick={handleScan}
                    className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-indigo-500 disabled:opacity-55 text-white text-[10px] font-black rounded-xl shadow-[0_12px_24px_-10px_rgba(139,92,246,0.4)] flex items-center justify-center gap-1.5"
                  >
                    {scanning ? 'Identificando Localização...' : 'Simular Leitura de Coordenada'}
                  </button>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
