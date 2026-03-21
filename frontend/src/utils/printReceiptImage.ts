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
  locationLabel?: string;
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
const ESC_POS = {
  boldOn: "\x1B\x45\x01",
  boldOff: "\x1B\x45\x00",
  inverseOn: "\x1D\x42\x01",
  inverseOff: "\x1D\x42\x00",
};

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
  const locationLabel = sanitizeText(
    payload.locationLabel || (payload.tableLabel ? `MESA ${payload.tableLabel}` : "")
  );
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
    lines.push(
      `${ESC_POS.boldOn}${lastNameLine.padEnd(leftWidth, ".")}${lineTotal.padStart(rightWidth, " ")}${ESC_POS.boldOff}`
    );
    if (note) {
      const noteLines = wrapWords(note, LINE_WIDTH - 4);
      noteLines.forEach((n, index) => {
        lines.push(index === 0 ? `  - ${n}` : `    ${n}`);
      });
    }
    lines.push("");
    lines.push("");
    return lines;
  });

  const locationBlock = locationLabel
    ? [
        strongSeparator(),
        ...centerText(locationLabel.toUpperCase())
          .split("\n")
          .map((line) => `${ESC_POS.inverseOn}${line}${ESC_POS.inverseOff}`),
        strongSeparator(),
      ]
    : [];
  const customerBlock = (() => {
    const customer = sanitizeText(payload.customerLabel || "Cliente");
    if (!customer) return [];
    const lines = centerText(`CLIENTE: ${customer}`.toUpperCase())
      .split("\n")
      .map((line) => `${ESC_POS.inverseOn}${line}${ESC_POS.inverseOff}`);
    return [strongSeparator(), ...lines, strongSeparator()];
  })();

  const chunks = [
    strongSeparator(),
    centerText(sanitizeText(payload.storeName || "MINHA LOJA").toUpperCase()),
    centerText(`PLATAFORMA: ${sanitizeText(payload.platformName || "Já no Caminho")}`),
    strongSeparator(),
    ...wrapWords(`Fila: ${sanitizeText(payload.queueLabel || "--")}`, LINE_WIDTH),
    ...wrapWords(`Pedido: ${sanitizeText(payload.orderLabel || "--")}`, LINE_WIDTH),
    ...locationBlock,
    ...customerBlock,
    ...wrapWords(`Data: ${sanitizeText(payload.dateLabel || "")}`, LINE_WIDTH),
    separator(),
    `${ESC_POS.boldOn}ITENS${ESC_POS.boldOff}`,
    separator(),
    ...itemsLines,
    separator(),
    `${ESC_POS.boldOn}${fitLeftRight("TOTAL:", sanitizeText(payload.totalLabel || "R$ 0,00"))}${ESC_POS.boldOff}`,
    "",
    "",
  ];

  return chunks.join("\n");
};

const buildHtmlReceipt = (payload: PrintReceiptRawBtInput) => {
  const locationLabel = sanitizeText(
    payload.locationLabel || (payload.tableLabel ? `MESA ${payload.tableLabel}` : "")
  );
  const itemsHtml = payload.items
    .map((item) => {
      const qty = Math.max(0, Number(item.quantity || 0));
      const name = sanitizeText(item.name || "Item");
      const lineTotal = sanitizeText(item.lineTotal || "R$ 0,00");
      const notes = sanitizeText(item.notes || "");
      return `
        <div class="item-row">
          <span class="item-name">${qty}x ${name}</span>
          <span class="item-price">${lineTotal}</span>
        </div>
        ${notes ? `<div class="item-note">- ${notes}</div>` : ''}
      `;
    })
    .join('');

  const tableHtml = locationLabel
    ? `<div class="location-block">${locationLabel.toUpperCase()}</div>`
    : '';
  const customerHtml = `<div class="customer-block">CLIENTE: ${sanitizeText(
    payload.customerLabel || "Cliente"
  )}</div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cupom</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: "Consolas", "Courier New", "Liberation Mono", monospace; }
    body { width: 72mm; padding: 2mm; }
    .sep { border-top: 1px dashed #000; margin: 6px 0; }
    .title { text-align: center; font-weight: 800; font-size: 16px; text-transform: uppercase; }
    .subtitle { text-align: center; font-size: 11px; margin-top: 2px; }
    .meta { font-size: 11px; margin: 2px 0; }
    .customer-block {
      margin: 6px 0;
      text-align: center;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.4px;
      background: #000;
      color: #fff;
      border: 2px solid #000;
      padding: 5px 4px;
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
    }
    .location-block {
      margin: 8px 0;
      text-align: center;
      font-size: 21px;
      font-weight: 900;
      letter-spacing: 1px;
      background: #000;
      color: #fff;
      border: 2px solid #000;
      padding: 6px 4px;
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
    }
    .items-title { font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .item-row { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; margin: 3px 0; line-height: 1.45; }
    .item-name { flex: 1; padding-right: 6px; font-weight: 800; }
    .item-price { white-space: nowrap; font-weight: 800; }
    .item-note { font-size: 10px; margin-left: 8px; margin-bottom: 3px; line-height: 1.4; }
    .total { display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; margin-top: 6px; }
    .spacer { height: 16px; }
    @media print {
      .customer-block {
        background: #000 !important;
        color: #fff !important;
        border: 2px solid #000 !important;
        print-color-adjust: exact !important;
        -webkit-print-color-adjust: exact !important;
      }
      .location-block {
        background: #000 !important;
        color: #fff !important;
        border: 2px solid #000 !important;
        print-color-adjust: exact !important;
        -webkit-print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="title">${sanitizeText(payload.storeName || "MINHA LOJA").toUpperCase()}</div>
  <div class="subtitle">Plataforma: ${sanitizeText(payload.platformName || "Já no Caminho")}</div>
  ${tableHtml}
  ${customerHtml}
  <div class="sep"></div>
  <div class="meta">Fila: ${sanitizeText(payload.queueLabel || "--")}</div>
  <div class="meta">Pedido: ${sanitizeText(payload.orderLabel || "--")}</div>
  <div class="meta">Data: ${sanitizeText(payload.dateLabel || "")}</div>
  <div class="sep"></div>
  <div class="items-title">Itens</div>
  ${itemsHtml}
  <div class="sep"></div>
  <div class="total"><span>TOTAL</span><span>${sanitizeText(payload.totalLabel || "R$ 0,00")}</span></div>
  <div class="spacer"></div>
</body>
</html>`;
};

const isMobileUserAgent = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = String(navigator.userAgent || '').toLowerCase();
  return /android|iphone|ipad|ipod|mobile/.test(ua);
};

export const printReceiptAsImage = async (payload: PrintReceiptRawBtInput) => {
  if (!payload?.items?.length) {
    throw new Error("Pedido sem itens para impressão.");
  }

  if (isMobileUserAgent()) {
    const rawText = buildRawBtText(payload);
    const base64 = toBase64Utf8(rawText);
    window.location.href = `rawbt:base64,${base64}`;
    return { mode: 'rawbt' as const };
  }

  const printWindow = window.open('', '_blank', 'width=420,height=760');
  if (!printWindow) {
    throw new Error('Popup bloqueado para impressão.');
  }
  printWindow.document.open();
  printWindow.document.write(buildHtmlReceipt(payload));
  printWindow.document.close();
  window.setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } catch {
      // no-op
    }
  }, 450);
  return { mode: 'browser' as const };
};
