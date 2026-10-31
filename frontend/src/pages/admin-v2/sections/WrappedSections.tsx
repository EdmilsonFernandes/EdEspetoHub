// Seções V2 de cauda longa: hospedam os componentes funcionais existentes
// (self-contained, mesma regra de negócio) dentro do shell V2. Zero duplicação.
import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { productService } from '../../../services/productService';
import { ProductManager } from '../../../components/Admin/ProductManager';
import { InventoryManager } from '../../../components/Admin/InventoryManager';
import { StoreUsersPanel } from '../../../components/Admin/StoreUsersPanel';
import { StoreDestinationPanel } from '../../../components/Admin/StoreDestinationPanel';
import { StoreCondominiumPanel } from '../../../components/Admin/StoreCondominiumPanel';
import { AdminCoupons } from '../../AdminCoupons';
import { AdminHighlights } from '../../AdminHighlights';
import { AdminMotoboys } from '../../AdminMotoboys';

const SectionBody = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto w-full max-w-[1180px] pb-6">{children}</div>
);

/** Produtos — mesma fonte do dashboard V1: productService.list + ProductManager. */
export const ProdutosSection = () => {
  const { auth } = useAuth();
  const storeId = String(auth?.store?.id || '');
  const [products, setProducts] = useState<any[] | null>(null);
  const [error, setError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    setError(false);
    productService
      .list(storeId)
      .then((items: any[]) => {
        if (alive) setProducts(Array.isArray(items) ? items : []);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [storeId, reloadTick]);

  if (error) {
    return (
      <SectionBody>
        <div className="border-rose-500/25 bg-rose-500/5 text-rose-600 dark:text-rose-400 flex flex-wrap items-center gap-2 rounded-lg border p-4 text-sm">
          Não foi possível carregar seus produtos.
          <button
            type="button"
            className="ml-2 underline underline-offset-2"
            onClick={() => setReloadTick((tick) => tick + 1)}
          >
            Tentar de novo
          </button>
        </div>
      </SectionBody>
    );
  }

  return (
    <SectionBody>
      <ProductManager
        products={products || []}
        onProductsChange={setProducts}
        storeSegment={auth?.store?.settings?.segment || 'outros'}
      />
    </SectionBody>
  );
};

/** Estoque — InventoryManager carrega os próprios dados. */
export const EstoqueSection = () => (
  <SectionBody>
    <InventoryManager />
  </SectionBody>
);

/** Cupons — modo embedded (sem chrome de página). */
export const CuponsSection = () => (
  <SectionBody>
    <AdminCoupons embedded />
  </SectionBody>
);

/** Destaques e push promocional. */
export const DestaquesSection = () => (
  <SectionBody>
    <AdminHighlights />
  </SectionBody>
);

/** Destinos turísticos (chalés/pousadas). */
export const DestinosSection = () => {
  const { auth } = useAuth();
  return (
    <SectionBody>
      <StoreDestinationPanel storeId={String(auth?.store?.id || '')} />
    </SectionBody>
  );
};

/** Condomínios e feiras. */
export const CondominiosSection = () => {
  const { auth } = useAuth();
  return (
    <SectionBody>
      <StoreCondominiumPanel storeId={String(auth?.store?.id || '')} />
    </SectionBody>
  );
};

/** Usuários da loja (admin/operador). */
export const UsuariosSection = () => (
  <SectionBody>
    <StoreUsersPanel />
  </SectionBody>
);

/** Entregadores — vínculos, documentos, solicitações (gate Pro/VIP no shell). */
export const MotoboysSection = () => (
  <SectionBody>
    <AdminMotoboys />
  </SectionBody>
);
