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
  tableLabel?: string;
  dateLabel: string;
  items: ReceiptItem[];
  totalLabel: string;
};

const sanitizeText = (value: unknown) =>
  String(value ?? "")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .trim();

// Conservative width for mobile + mixed RawBT profiles (58mm/80mm).
const LINE_WIDTH = 32;

const wrapWords = (value: string, width = LINE_WIDTH) => {
  const text = sanitizeText(value);
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word.slice(0, width);
      continue;
    }
    const candidate = `${current} ${word}`;
    if (candidate.length <= width) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word.slice(0, width);
  }
  if (current) lines.push(current);
  return lines;
};

const centerText = (value: string, width = LINE_WIDTH) => {
  const lines = wrapWords(value, width);
  return lines
    .map((line) => {
      if (line.length >= width) return line;
      const left = Math.floor((width - line.length) / 2);
      const right = width - line.length - left;
      return `${" ".repeat(left)}${line}${" ".repeat(right)}`;
    })
    .join("\n");
};

const separator = (width = LINE_WIDTH) => "-".repeat(width);
const strongSeparator = (width = LINE_WIDTH) => "=".repeat(width);

const fitLeftRight = (left: string, right: string, width = LINE_WIDTH) => {
  const safeRight = sanitizeText(right);
  const rightWidth = Math.min(12, Math.max(8, safeRight.length));
  const leftMax = Math.max(8, width - rightWidth);
  const safeLeft = sanitizeText(left).slice(0, leftMax);
  const leftPadded = safeLeft.padEnd(leftMax, " ");
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
    const rightWidth = Math.min(12, Math.max(8, lineTotal.length));
    const leftWidth = Math.max(8, LINE_WIDTH - rightWidth);
    const nameLines = wrapWords(`${qty}x ${name}`, leftWidth);
    const lines = nameLines.slice(0, -1);
    const lastNameLine = (nameLines[nameLines.length - 1] || "").slice(0, leftWidth);
    lines.push(`${lastNameLine.padEnd(leftWidth, ".")}${lineTotal.padStart(rightWidth, " ")}`);
    if (note) {
      const noteLines = wrapWords(note, LINE_WIDTH - 4);
      noteLines.forEach((n, index) => {
        lines.push(index === 0 ? `  - ${n}` : `    ${n}`);
      });
    }
    lines.push("");
    return lines;
  });

  const chunks = [
    strongSeparator(),
    centerText(sanitizeText(payload.storeName || "SERTANEJO NO ESPETO").toUpperCase()),
    centerText(`PLATAFORMA: ${sanitizeText(payload.platformName || "Já no Caminho")}`),
    strongSeparator(),
    ...wrapWords(`Fila: ${sanitizeText(payload.queueLabel || "--")}`, LINE_WIDTH),
    ...wrapWords(`Pedido: ${sanitizeText(payload.orderLabel || "--")}`, LINE_WIDTH),
    ...wrapWords(`Cliente: ${sanitizeText(payload.customerLabel || "Cliente")}`, LINE_WIDTH),
    ...(payload.tableLabel
      ? [strongSeparator(), centerText(`*** MESA ${sanitizeText(payload.tableLabel)} ***`), strongSeparator()]
      : []),
    ...wrapWords(`Data: ${sanitizeText(payload.dateLabel || "")}`, LINE_WIDTH),
    separator(),
    "ITENS",
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
