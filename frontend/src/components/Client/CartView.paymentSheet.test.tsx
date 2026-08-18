import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// RouteMapView puxa mapa pesado que não interessa ao sheet de pagamento.
vi.mock('../RouteMapView', () => ({ RouteMapView: () => null }));

import { CartView } from './CartView';

// Visitante (isCustomerLogged=false) renderiza o checkout em página única:
// a seção Pagamento (e o botão "Alterar forma") já aparece sem walkthrough.
const renderGuestCart = (props = {}) =>
  render(
    <CartView
      cart={{ p1: { id: 'p1', name: 'Espeto de costela', price: 12, qty: 2 } }}
      customer={{ type: 'pickup', name: 'Teste', phone: '11999999999' }}
      paymentMethod="dinheiro"
      paymentSummary={{ methods: { pixOnline: true, manualPix: true, cash: true } } as any}
      pricingSummary={{ subtotal: 24, discountTotal: 0, total: 24 }}
      onApplySavedAddress={vi.fn()}
      onOpenAddressManager={vi.fn()}
      onUseCurrentLocation={vi.fn()}
      onValidateDeliveryAddress={vi.fn()}
      onChangeDeliveryMode={vi.fn()}
      onCalculatePostalQuote={vi.fn()}
      onSelectPostalService={vi.fn()}
      onChangeCustomer={vi.fn()}
      onChangePayment={vi.fn()}
      onUpdateCart={vi.fn()}
      onCheckout={vi.fn()}
      onCheckoutResumeConsumed={vi.fn()}
      onBack={vi.fn()}
      {...props}
    />
  );

describe('CartView — sheet de troca de forma de pagamento', () => {
  it('1º toque aplica a forma nova e fecha o sheet — sem CTA Confirmar', () => {
    const onChangePayment = vi.fn();
    renderGuestCart({ onChangePayment });

    fireEvent.click(screen.getByRole('button', { name: /alterar forma/i }));
    expect(screen.getByTestId('checkout-payment-method-sheet')).toBeInTheDocument();

    // Regressão do batch 6: o CTA ficava além do corte do sheet (inalcançável)
    // e a seleção pendente era descartada ao fechar. Não deve mais existir.
    expect(screen.queryByRole('button', { name: /confirmar forma de pagamento/i })).not.toBeInTheDocument();

    // "Via Mercado Pago" diferencia o Pix online do "Pix da loja".
    fireEvent.click(screen.getByRole('button', { name: /via mercado pago/i }));

    expect(onChangePayment).toHaveBeenCalledTimes(1);
    expect(onChangePayment).toHaveBeenCalledWith('pix');
    expect(screen.queryByTestId('checkout-payment-method-sheet')).not.toBeInTheDocument();
  });

  it('toca em Pix da loja e aplica pix_loja fechando o sheet', () => {
    const onChangePayment = vi.fn();
    renderGuestCart({ onChangePayment });

    fireEvent.click(screen.getByRole('button', { name: /alterar forma/i }));
    fireEvent.click(screen.getByRole('button', { name: /pix da loja/i }));

    expect(onChangePayment).toHaveBeenCalledTimes(1);
    expect(onChangePayment).toHaveBeenCalledWith('pix_loja');
    expect(screen.queryByTestId('checkout-payment-method-sheet')).not.toBeInTheDocument();
  });
});
