import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PaymentAuditPanel } from './PaymentAuditPanel';

const pendingSummary = {
  provider: 'MERCADO_PAGO',
  paymentMethod: 'PIX',
  paymentStatus: 'PENDING',
  paymentStatusLabel: 'Aguardando Pagamento',
  amount: 14.9,
  providerPaymentId: '123',
  updatedAt: '2026-05-17T12:00:00.000Z',
};

const failedLookupEvent = {
  id: 'event-1',
  eventStageLabel: 'Falha técnica no processamento',
  providerStatusLabel: 'Falha na transação',
  providerStatusDetailLabel: 'Falha temporária de consulta',
  createdAt: '2026-05-17T12:01:00.000Z',
};

describe('PaymentAuditPanel', () => {
  it('does not expose technical failure events in the merchant payment summary when hidden', () => {
    render(
      <PaymentAuditPanel
        summary={pendingSummary}
        events={[failedLookupEvent] as any}
        showEvents={false}
        onTechnicalClick={() => {}}
      />
    );

    expect(screen.getByText('Aguardando Pagamento')).toBeInTheDocument();
    expect(screen.queryByText(/Falha técnica no processamento/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Falha temporária de consulta/i)).not.toBeInTheDocument();
  });

  it('can still render technical events when explicitly enabled', () => {
    render(<PaymentAuditPanel summary={pendingSummary} events={[failedLookupEvent] as any} onTechnicalClick={() => {}} />);

    expect(screen.getByText(/Falha técnica no processamento/i)).toBeInTheDocument();
  });
});
