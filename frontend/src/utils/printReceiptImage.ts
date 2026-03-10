import html2canvas from "html2canvas";

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
  widthPx?: number;
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
  const widthPx = Math.max(320, Number(payload.widthPx || 400));
  const itemsHtml = payload.items
    .map((item) => {
      const qty = Math.max(0, Number(item.quantity || 0));
      const notes = item.notes ? `<div class="opt">${escapeHtml(item.notes)}</div>` : "";
      return `<div class="item"><span>${qty}x ${escapeHtml(item.name)}</span><span class="price">${escapeHtml(item.lineTotal)}</span></div>${notes}`;
    })
    .join("");

  return `
    <div id="receipt-root" style="width:${widthPx}px;background:#fff;color:#000;font-family:'Courier New',monospace;padding:12px 14px 16px;line-height:1.35;">
      <div style="text-align:center;font-weight:700;text-transform:uppercase;font-size:18px;">${escapeHtml(payload.storeName || "SERTANEJO NO ESPETO")}</div>
      <div style="text-align:center;font-size:12px;margin-top:2px;">${escapeHtml(payload.platformName || "Já no Caminho")}</div>
      <hr style="border:none;border-top:1px dashed #000;margin:8px 0;" />
      <div style="font-weight:700;">#Fila: ${escapeHtml(payload.queueLabel || "--")}</div>
      <div>Pedido: ${escapeHtml(payload.orderLabel)}</div>
      <div>Cliente: ${escapeHtml(payload.customerLabel)}</div>
      <div>Data: ${escapeHtml(payload.dateLabel)}</div>
      <hr style="border:none;border-top:1px dashed #000;margin:8px 0;" />
      ${payload.debugLine ? `<div style="text-align:center;font-size:12px;">${escapeHtml(payload.debugLine)}</div>` : ""}
      <div style="min-height:48px;">${itemsHtml}</div>
      <hr style="border:none;border-top:1px dashed #000;margin:8px 0;" />
      <div class="item" style="font-weight:700;"><span>TOTAL</span><span class="price">${escapeHtml(payload.totalLabel)}</span></div>
      <div style="white-space:pre-line;">\n\n</div>
    </div>
  `;
};

export const printReceiptAsImage = async (payload: PrintReceiptImageInput) => {
  if (!payload?.items?.length) {
    throw new Error("Pedido sem itens para impressão.");
  }

  const printWindow = window.open("", "_blank", "width=420,height=760");
  if (!printWindow) {
    throw new Error("Bloqueio de popup ativo. Permita popups para imprimir.");
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Imprimir cupom</title>
        <style>
          body { margin:0; padding:0; background:#fff; }
          .print-wrap { width:72mm; margin:0 auto; padding:0; }
          .receipt-image { width:100%; display:block; image-rendering:-webkit-optimize-contrast; }
        </style>
      </head>
      <body><div class="print-wrap">Gerando cupom...</div></body>
    </html>
  `);
  printWindow.document.close();

  const sandbox = document.createElement("div");
  sandbox.style.position = "fixed";
  sandbox.style.left = "-99999px";
  sandbox.style.top = "0";
  sandbox.style.background = "#fff";
  sandbox.style.zIndex = "-1";
  sandbox.innerHTML = buildReceiptMarkup(payload);
  document.body.appendChild(sandbox);

  try {
    const root = sandbox.querySelector("#receipt-root") as HTMLElement | null;
    if (!root) throw new Error("Falha ao montar cupom.");

    const canvas = await html2canvas(root, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: root.scrollWidth,
      width: root.scrollWidth,
    });

    const dataUrl = canvas.toDataURL("image/png");
    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Imprimir cupom</title>
          <style>
            @page { size: auto; margin: 0; }
            body { margin: 0; padding: 0; background: #fff; }
            .print-wrap { width: 72mm; margin: 0 auto; padding: 0; }
            .receipt-image { width: 100%; display: block; }
          </style>
        </head>
        <body>
          <div class="print-wrap">
            <img class="receipt-image" src="${dataUrl}" alt="Cupom de impressão" />
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();

    await new Promise<void>((resolve) => {
      const fire = () => {
        printWindow.focus();
        printWindow.print();
        resolve();
      };
      if (printWindow.document.readyState === "complete") {
        setTimeout(fire, 300);
      } else {
        printWindow.onload = () => setTimeout(fire, 300);
      }
    });

    setTimeout(() => {
      try {
        printWindow.close();
      } catch {
        // noop
      }
    }, 400);
  } finally {
    sandbox.remove();
  }
};

