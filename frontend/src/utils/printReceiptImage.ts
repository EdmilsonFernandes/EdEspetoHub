type ReceiptItem = {
  quantity: number;
  name: string;
  lineTotal: string;
  notes?: string;
};

type PrintReceiptRawBtInput = {
  storeName: string;
  platformName?: string;
  queueLabel?: string;
  orderLabel: string;
  customerLabel: string;
  dateLabel: string;
  items: ReceiptItem[];
  totalLabel: string;
  debugLine?: string;
};

const sanitizeText = (value: unknown) =>
  String(value ?? "")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .trim();

const dotsLine = (left: string, right: string, size = 40) => {
  const safeLeft = sanitizeText(left);
  const safeRight = sanitizeText(right);
  const minDots = 3;
  const rawDots = size - safeLeft.length - safeRight.length;
  const dots = ".".repeat(Math.max(minDots, rawDots));
  return `${safeLeft} ${dots} ${safeRight}`;
};

const toBase64Utf8 = (value: string) => {
  const utf8 = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  return btoa(utf8);
};

const buildRawBtText = (payload: PrintReceiptRawBtInput) => {
  const itemsLines = payload.items.flatMap((item) => {
    const qty = Math.max(0, Number(item.quantity || 0));
    const name = sanitizeText(item.name || "Item");
    const lineTotal = sanitizeText(item.lineTotal || "R$ 0,00");
    const note = sanitizeText(item.notes || "");
    const lines = [dotsLine(`${qty}x ${name}`, lineTotal)];
    if (note) {
      lines.push(`  - ${note}`);
    }
    return lines;
  });

  const chunks = [
    `<center><big>${sanitizeText(payload.storeName || "SERTANEJO NO ESPETO").toUpperCase()}</big></center>`,
    `<center>${sanitizeText(payload.platformName || "Já no Caminho")}</center>`,
    "--------------------------------",
    `Fila: ${sanitizeText(payload.queueLabel || "--")} | Pedido: ${sanitizeText(payload.orderLabel || "--")}`,
    `Cliente: ${sanitizeText(payload.customerLabel || "Cliente")}`,
    `Data: ${sanitizeText(payload.dateLabel || "")}`,
    "--------------------------------",
    ...(payload.debugLine ? [sanitizeText(payload.debugLine)] : []),
    ...itemsLines,
    "--------------------------------",
    `<right><big>TOTAL: ${sanitizeText(payload.totalLabel || "R$ 0,00")}</big></right>`,
    "",
    "",
  ];

  return chunks.join("\n");
};

export const printReceiptAsImage = async (payload: PrintReceiptRawBtInput) => {
  if (!payload?.items?.length) {
    throw new Error("Pedido sem itens para impressão.");
  }

  const rawText = buildRawBtText(payload);
  const base64 = toBase64Utf8(rawText);
  window.location.href = `rawbt:base64,${base64}`;
};
