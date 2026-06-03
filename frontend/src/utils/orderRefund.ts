export type OrderRefundSnapshot = {
  status: string;
  amount: number | string | null;
  reason: string;
  refundedAt: string | null;
  hasRefund: boolean;
};

const firstPresent = (...values: any[]) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');

export const getOrderRefundSnapshot = (order: any): OrderRefundSnapshot => {
  const status = String(firstPresent(
    order?.refundStatus,
    order?.payment?.refundStatus,
    order?.onlinePayment?.refundStatus,
    ''
  ) || '').trim().toUpperCase();

  const amount = firstPresent(
    order?.refundAmount,
    order?.payment?.refundAmount,
    order?.onlinePayment?.refundAmount,
    null
  ) ?? null;

  const reason = String(firstPresent(
    order?.refundReason,
    order?.payment?.refundReason,
    order?.onlinePayment?.refundReason,
    ''
  ) || '').trim();

  const refundedAt = String(firstPresent(
    order?.refundedAt,
    order?.payment?.refundedAt,
    order?.onlinePayment?.refundedAt,
    ''
  ) || '').trim() || null;

  return {
    status,
    amount,
    reason,
    refundedAt,
    hasRefund: Boolean(status),
  };
};
