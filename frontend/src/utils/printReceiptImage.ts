import {
  getStoredThermalPrinterSettings,
  normalizeThermalPrinterSettings,
  printNativeThermalReceipt,
  type ThermalPrinterSettings,
} from "./thermalPrinter";

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
  customerPhone?: string;
  customerNote?: string;
  locationLabel?: string;
  tableLabel?: string;
  dateLabel: string;
  items: ReceiptItem[];
  totalLabel: string;
  qrData?: string;
};

type PrintReceiptMode = 'native' | 'rawbt' | 'browser';
type PrintReceiptResult = {
  mode: PrintReceiptMode;
  durationMs?: number;
  bytes?: number;
  fallbackReason?: string;
};

let activePrintPromise: Promise<PrintReceiptResult> | null = null;
const RAWBT_FAST_FALLBACK_UNTIL_KEY = 'jnc:thermal-printer-rawbt-fast-fallback-until';
const RAWBT_FAST_FALLBACK_MS = 2 * 60 * 1000;

const sanitizeText = (value: unknown) =>
  String(value ?? "")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .trim();

const escapeHtml = (value: unknown) =>
  sanitizeText(value).replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[char] || char;
  });

// Conservative default for 58mm printers. Larger 80mm printers can use 42 columns.
const DEFAULT_LINE_WIDTH = 32;

const wrapWords = (value: string, width = DEFAULT_LINE_WIDTH) => {
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

const centerText = (value: string, width = DEFAULT_LINE_WIDTH) => {
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

const separator = (width = DEFAULT_LINE_WIDTH) => "-".repeat(width);
const strongSeparator = (width = DEFAULT_LINE_WIDTH) => "=".repeat(width);
const ESC_POS = {
  boldOn: "\x1B\x45\x01",
  boldOff: "\x1B\x45\x00",
  inverseOn: "\x1D\x42\x01",
  inverseOff: "\x1D\x42\x00",
  textDoubleHeightOn: "\x1D\x21\x01",
  textSizeReset: "\x1D\x21\x00",
};

const fitLeftRight = (left: string, right: string, width = DEFAULT_LINE_WIDTH) => {
  const safeRight = sanitizeText(right);
  const rightWidth = Math.min(12, Math.max(8, safeRight.length));
  const leftMax = Math.max(8, width - rightWidth);
  const safeLeft = sanitizeText(left).slice(0, leftMax);
  const leftPadded = safeLeft.padEnd(leftMax, " ");
  const rightPadded = safeRight.padStart(rightWidth, " ");
  return `${leftPadded}${rightPadded}`;
};

const normalizeReceiptIdentity = (value: unknown) =>
  sanitizeText(value)
    .toUpperCase()
    .replace(/^CLIENTE:\s*/, "")
    .replace(/\s+/g, " ");

const shouldPrintCustomer = (customerLabel: string, locationLabel: string) => {
  const customerIdentity = normalizeReceiptIdentity(customerLabel);
  if (!customerIdentity) return false;
  return customerIdentity !== normalizeReceiptIdentity(locationLabel);
};

const toBase64Utf8 = (value: string) => {
  const utf8 = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  return btoa(utf8);
};

export const buildRawBtText = (
  payload: PrintReceiptRawBtInput,
  printerSettings?: Partial<ThermalPrinterSettings>
) => {
  const settings = normalizeThermalPrinterSettings(printerSettings);
  const lineWidth = settings.paperWidth;
  const locationLabel = sanitizeText(
    payload.locationLabel || (payload.tableLabel ? `MESA ${payload.tableLabel}` : "")
  );
  const customerLabel = sanitizeText(payload.customerLabel || "");
  const customerPhone = sanitizeText(payload.customerPhone || "");

  // Items: QTD bold + name + price right-aligned, notes with *
  const itemsLines = payload.items.flatMap((item) => {
    const qty = Math.max(0, Number(item.quantity || 0));
    const name = sanitizeText(item.name || "Item");
    const lineTotal = sanitizeText(item.lineTotal || "R$ 0,00");
    const note = sanitizeText(item.notes || "");
    const rightWidth = Math.min(12, Math.max(8, lineTotal.length));
    const leftWidth = Math.max(8, lineWidth - rightWidth);

    const qtyStr = `${qty}x`;
    const nameWithQty = `${qtyStr} ${name}`;
    const nameLines = wrapWords(nameWithQty, leftWidth);
    const lines: string[] = [];

    // First line: bold QTD + name ... price
    if (nameLines.length <= 1) {
      const padded = (nameLines[0] || nameWithQty).slice(0, leftWidth).padEnd(leftWidth);
      lines.push(`${ESC_POS.boldOn}${padded}${lineTotal.padStart(rightWidth)}${ESC_POS.boldOff}`);
    } else {
      // Wrapped: first lines without price, last line with price
      for (let i = 0; i < nameLines.length - 1; i++) {
        lines.push(`${ESC_POS.boldOn}${nameLines[i]}${ESC_POS.boldOff}`);
      }
      const lastLine = (nameLines[nameLines.length - 1] || "").slice(0, leftWidth).padEnd(leftWidth);
      lines.push(`${ESC_POS.boldOn}${lastLine}${lineTotal.padStart(rightWidth)}${ESC_POS.boldOff}`);
    }

    // Notes with *
    if (note) {
      const noteLines = wrapWords(note, lineWidth - 6);
      noteLines.forEach((n, index) => {
        lines.push(index === 0 ? `      * ${n}` : `        ${n}`);
      });
    }

    lines.push("");
    return lines;
  });

  // Location block: strong visual anchor without repeating the table/location.
  const locationBlock = locationLabel
    ? [
        strongSeparator(lineWidth),
        ...centerText(locationLabel.toUpperCase(), lineWidth)
          .split("\n")
          .map(
            (line) =>
              `${ESC_POS.boldOn}${ESC_POS.textDoubleHeightOn}${line}${ESC_POS.textSizeReset}${ESC_POS.boldOff}`
          ),
        strongSeparator(lineWidth),
      ]
    : [];

  const customerBlock = shouldPrintCustomer(customerLabel, locationLabel)
    ? [
        ...wrapWords(`CLIENTE: ${customerLabel}`, lineWidth).map(
          (line) => `${ESC_POS.boldOn}${line}${ESC_POS.boldOff}`
        ),
        ...(customerPhone
          ? [`${ESC_POS.boldOn}FONE: ${customerPhone}${ESC_POS.boldOff}`]
          : []),
        separator(lineWidth),
      ]
    : [];

  // Customer note block: isolated with ! marker
  const customerNoteBlock = (() => {
    const note = sanitizeText(payload.customerNote || "");
    if (!note) return [];
    return [
      separator(lineWidth),
      `${ESC_POS.boldOn}  ! OBS:${ESC_POS.boldOff}`,
      ...wrapWords(note, lineWidth - 2).map((line) => `  ${line}`),
      separator(lineWidth),
    ];
  })();

  // Header: store name centered
  const headerBlock = [
    strongSeparator(lineWidth),
    centerText(sanitizeText(payload.storeName || "MINHA LOJA").toUpperCase(), lineWidth),
    strongSeparator(lineWidth),
  ];

  // QR footer block
  const qrFooterBlock = (() => {
    const qr = sanitizeText(payload.qrData || "");
    if (!qr) return [centerText("Volte sempre!", lineWidth), strongSeparator(lineWidth)];
    const displayUrl = qr.replace(/^https?:\/\//, "");
    return [
      ...centerText(displayUrl, lineWidth).split("\n"),
      centerText("Volte sempre!", lineWidth),
      strongSeparator(lineWidth),
    ];
  })();

  const totalLine = fitLeftRight("TOTAL:", sanitizeText(payload.totalLabel || "R$ 0,00"), lineWidth);

  const chunks = [
    ...headerBlock,
    sanitizeText(payload.dateLabel || ""),
    ...wrapWords(`Pedido: ${sanitizeText(payload.orderLabel || "--")}`, lineWidth),
    ...locationBlock,
    ...customerBlock,
    ...customerNoteBlock,
    `${ESC_POS.boldOn}${fitLeftRight("QTD  ITEM", "PREÇO", lineWidth)}${ESC_POS.boldOff}`,
    separator(lineWidth),
    ...itemsLines,
    separator(lineWidth),
    strongSeparator(lineWidth),
    `${ESC_POS.boldOn}${ESC_POS.textDoubleHeightOn}${totalLine}${ESC_POS.textSizeReset}${ESC_POS.boldOff}`,
    strongSeparator(lineWidth),
    "",
    ...qrFooterBlock,
  ];

  return chunks.join("\n");
};

const buildHtmlReceipt = (payload: PrintReceiptRawBtInput) => {
  const locationLabel = sanitizeText(
    payload.locationLabel || (payload.tableLabel ? `MESA ${payload.tableLabel}` : "")
  );
  const customerLabel = sanitizeText(payload.customerLabel || "");
  const customerPhone = sanitizeText(payload.customerPhone || "");
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
  const customerHtml = shouldPrintCustomer(customerLabel, locationLabel)
    ? `<div class="customer-block">CLIENTE: ${escapeHtml(customerLabel)}${customerPhone ? ` &middot; FONE: ${escapeHtml(customerPhone)}` : ''}</div>`
    : '';
  const customerNote = sanitizeText(payload.customerNote || "");
  const customerNoteHtml = customerNote
    ? `<div class="sep"></div><div class="note-title">OBS CLIENTE</div><div class="customer-note">${escapeHtml(customerNote)}</div>`
    : '';

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
      font-size: 17px;
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
    .note-title { font-size: 11px; font-weight: 900; margin: 5px 0 2px; text-transform: uppercase; }
    .customer-note { font-size: 12px; font-weight: 700; line-height: 1.25; margin-bottom: 4px; word-break: break-word; }
    .total { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; margin-top: 8px; }
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
  ${customerNoteHtml}
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

const openExternalScheme = (url: string) => {
  if (typeof document === 'undefined') {
    window.location.href = url;
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.style.display = 'none';
  link.setAttribute('aria-hidden', 'true');
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    try {
      link.remove();
    } catch {
      // no-op
    }
  }, 1000);
};

const getNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const getRawBtFastFallbackReason = () => {
  if (typeof window === 'undefined') return '';
  try {
    const until = Number(window.localStorage.getItem(RAWBT_FAST_FALLBACK_UNTIL_KEY) || 0);
    if (until > Date.now()) return 'NATIVE_RECENTLY_FAILED';
    window.localStorage.removeItem(RAWBT_FAST_FALLBACK_UNTIL_KEY);
  } catch {
    // no-op
  }
  return '';
};

const markRawBtFastFallback = (code: string) => {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (![ 'PRINT_FAILED', 'PRINT_TIMEOUT' ].includes(normalizedCode)) return;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      RAWBT_FAST_FALLBACK_UNTIL_KEY,
      String(Date.now() + RAWBT_FAST_FALLBACK_MS)
    );
  } catch {
    // no-op
  }
};

const clearRawBtFastFallback = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(RAWBT_FAST_FALLBACK_UNTIL_KEY);
  } catch {
    // no-op
  }
};

const sendToRawBt = (
  rawText: string,
  startedAt: number,
  fallbackReason: string,
  itemsCount: number
): PrintReceiptResult => {
  const base64 = toBase64Utf8(rawText);
  openExternalScheme(`rawbt:base64,${base64}`);
  const durationMs = Math.round(getNow() - startedAt);
  console.info('[print] impressão enviada via RawBT', {
    durationMs,
    bytes: base64.length,
    fallbackReason,
    items: itemsCount,
  });
  return { mode: 'rawbt', durationMs, bytes: base64.length, fallbackReason };
};

const runPrintReceipt = async (payload: PrintReceiptRawBtInput): Promise<PrintReceiptResult> => {
  if (!payload?.items?.length) {
    throw new Error("Pedido sem itens para impressão.");
  }

  if (isMobileUserAgent()) {
    const startedAt = getNow();
    const printerSettings = getStoredThermalPrinterSettings();
    const rawText = buildRawBtText(payload, printerSettings);
    const fastFallbackReason = getRawBtFastFallbackReason();
    if (fastFallbackReason) {
      return sendToRawBt(rawText, startedAt, fastFallbackReason, payload.items.length);
    }
    try {
      const result = await printNativeThermalReceipt(rawText, printerSettings, payload.qrData);
      clearRawBtFastFallback();
      const durationMs = Math.round(getNow() - startedAt);
      console.info('[print] impressão nativa concluída', {
        durationMs,
        bytes: result?.bytes,
        items: payload.items.length,
      });
      return { mode: 'native', durationMs, bytes: result?.bytes };
    } catch (nativeError: any) {
      const nativeCode = String(nativeError?.code || nativeError?.message || 'NATIVE_PRINT_UNAVAILABLE');
      markRawBtFastFallback(nativeCode);
      console.warn('[print] impressão nativa indisponível, usando fallback RawBT', {
        code: nativeCode,
        message: nativeError?.message,
      });
      return sendToRawBt(rawText, startedAt, nativeCode, payload.items.length);
    }
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
  return { mode: 'browser' };
};

export const printReceiptAsImage = async (payload: PrintReceiptRawBtInput) => {
  // Serializa impressoes: cada cupom espera o anterior terminar (encadeado). Antes, uma
  // 2a impressao concorrente era rejeitada com erro ("Aguarde a impressao atual..."),
  // fazendo o auto-print pular pedidos que chegavam durante uma impressao (so o 1o
  // imprimia). Agora eles formam fila; falha de um cupom nao derruba o proximo.
  const previous = activePrintPromise;
  const current = (previous ? previous.catch(() => undefined) : Promise.resolve())
    .then(() => runPrintReceipt(payload))
    .finally(() => {
    const releaseLock = () => {
      if (activePrintPromise === current) {
        activePrintPromise = null;
      }
    };
    if (typeof window !== 'undefined') {
      window.setTimeout(releaseLock, 700);
    } else {
      setTimeout(releaseLock, 700);
    }
  });
  activePrintPromise = current;
  return current;
};
