type ReceiptItem = {
  quantity: number;
  name: string;
  lineTotal: string;
  notes?: string;
};

type PrintReceiptImageInput = {
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

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildReceiptMarkup = (payload: PrintReceiptImageInput) => {
  const itemsHtml = payload.items
    .map((item) => {
      const qty = Math.max(0, Number(item.quantity || 0));
      const notes = item.notes ? `<div class="opt">${escapeHtml(item.notes)}</div>` : "";
      return `<div class="item"><span>${qty}x ${escapeHtml(item.name)}</span><span class="price">${escapeHtml(item.lineTotal)}</span></div>${notes}`;
    })
    .join("");

  return `
    <div id="receipt-root">
      <div class="bold">${escapeHtml(payload.storeName || "SERTANEJO NO ESPETO")}</div>
      <div class="center">${escapeHtml(payload.platformName || "Já no Caminho")}</div>
      <hr />
      <div><strong>#Fila:</strong> ${escapeHtml(payload.queueLabel || "--")}</div>
      <div>Pedido: ${escapeHtml(payload.orderLabel)}</div>
      <div>Cliente: ${escapeHtml(payload.customerLabel)}</div>
      <div>Data: ${escapeHtml(payload.dateLabel)}</div>
      <hr />
      ${payload.debugLine ? `<div class="center">${escapeHtml(payload.debugLine)}</div>` : ""}
      <div class="items-block">${itemsHtml}</div>
      <hr />
      <div class="item"><span><strong>TOTAL</strong></span><span class="price"><strong>${escapeHtml(payload.totalLabel)}</strong></span></div>
      <div class="tail">\n\n</div>
    </div>
  `;
};

export const printReceiptAsImage = async (payload: PrintReceiptImageInput) => {
  if (!payload?.items?.length) {
    throw new Error("Pedido sem itens para impressão.");
  }

  const win = window.open("", "_blank", "width=400,height=600");
  if (!win) {
    throw new Error("Bloqueio de popup ativo. Permita popups para imprimir.");
  }

  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Imprimir cupom</title>
    <style>
      * { box-sizing: border-box; }
      body { width: 75mm; margin: 0; padding: 2mm; font-family: monospace; font-size: 14px; color: #000; background: #fff; line-height: 1.35; }
      .bold { font-weight: 700; text-align: center; font-size: 18px; text-transform: uppercase; }
      .center { text-align: center; }
      .item { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; align-items: flex-start; }
      .price { text-align: right; white-space: nowrap; }
      .opt { margin-left: 2ch; font-size: 12px; }
      hr { border: 0; border-top: 1px dashed #000; margin: 8px 0; }
      .tail { white-space: pre-line; }
    </style>
  </head>
  <body>
    ${buildReceiptMarkup(payload)}
  </body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();

  await new Promise<void>((resolve) => {
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } finally {
        try {
          win.close();
        } catch {
          // noop
        }
        resolve();
      }
    }, 500);
  });
};
