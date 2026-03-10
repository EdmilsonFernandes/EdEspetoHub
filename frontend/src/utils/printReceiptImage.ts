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
};

const sanitizeText = (value: unknown) =>
  String(value ?? "")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .trim();

// 42 columns is safer across 58/80mm profiles in RawBT and avoids wrapping.
const LINE_WIDTH = 42;

const centerText = (value: string, width = LINE_WIDTH) => {
  const text = sanitizeText(value);
  if (!text) return "";
  if (text.length >= width) return text.slice(0, width);
  const left = Math.floor((width - text.length) / 2);
  const right = width - text.length - left;
  return `${" ".repeat(left)}${text}${" ".repeat(right)}`;
};

const separator = (width = LINE_WIDTH) => "-".repeat(width);

const fitLeftRight = (left: string, right: string, width = LINE_WIDTH) => {
  const safeRight = sanitizeText(right);
  const rightWidth = Math.min(10, Math.max(8, safeRight.length));
  const leftMax = Math.max(8, width - rightWidth);
  const safeLeft = sanitizeText(left).slice(0, leftMax);
  const leftPadded = safeLeft.padEnd(leftMax, ".");
  const rightPadded = safeRight.padStart(rightWidth, " ");
  return `${leftPadded}${rightPadded}`;
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
    const lines = [fitLeftRight(`${qty}x ${name}`, lineTotal)];
    if (note) {
      lines.push(`  - ${note.slice(0, LINE_WIDTH - 4)}`);
    }
    return lines;
  });

  const chunks = [
    centerText(sanitizeText(payload.storeName || "SERTANEJO NO ESPETO").toUpperCase()),
    centerText(`Plataforma: ${sanitizeText(payload.platformName || "Já no Caminho")}`),
    separator(),
    `Fila: ${sanitizeText(payload.queueLabel || "--")}`.slice(0, LINE_WIDTH),
    `Pedido: ${sanitizeText(payload.orderLabel || "--")}`.slice(0, LINE_WIDTH),
    `Cliente: ${sanitizeText(payload.customerLabel || "Cliente")}`.slice(0, LINE_WIDTH),
    `Data: ${sanitizeText(payload.dateLabel || "")}`.slice(0, LINE_WIDTH),
    centerText("FMT: RAWBT-TXT-V2"),
    separator(),
    ...itemsLines,
    separator(),
    fitLeftRight("TOTAL:", sanitizeText(payload.totalLabel || "R$ 0,00")),
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
