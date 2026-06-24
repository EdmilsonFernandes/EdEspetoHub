// Helpers e constantes de módulo extraídos de GrillQueue.tsx.
// @ts-nocheck
import { Clock, Play, Check, CheckSquare } from "@phosphor-icons/react";
import { isTableServiceCategory } from "../../../utils/tableServiceSettings";

export const normalizeSearchText = (value: any) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export const resolveCustomerOrderNote = (order: any) =>
  String(order?.customerNote || order?.customer_note || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

export const fuzzyIncludes = (text: string, query: string) => {
  const source = normalizeSearchText(text);
  const target = normalizeSearchText(query);
  if (!target) return true;
  return source.includes(target);
};

export const formatTableIdentifier = (value: any) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  return /^\d+$/.test(normalized) ? normalized.padStart(2, "0") : normalized.toUpperCase();
};

export const SYSTEM_LOGO_SRC = "/janocaminho.jpg";

export const STORE_CANCELLATION_REASON_OPTIONS = [
  "Item indisponível",
  "Loja sem operação no momento",
  "Endereço fora da área de atendimento",
  "Problema operacional",
  "Outro motivo",
];

export const DELIVERY_ISSUE_REASON_OPTIONS = [
  "Cliente não localizado",
  "Endereço incorreto",
  "Cliente recusou",
  "Problema no caminho",
  "Outro motivo",
];

export const resolveLocationIdentifier = (order: any) => {
  const explicitIdentifier = String(
    order?.location_identifier ??
      order?.locationIdentifier ??
      order?.location?.identifier ??
      order?.location?.label ??
      order?.sector ??
      order?.setor ??
      ""
  ).trim();
  if (explicitIdentifier) {
    return explicitIdentifier.toUpperCase();
  }
  const type = String(order?.type || "").toLowerCase();
  const fulfillmentMode = String(order?.fulfillmentMode || "").toLowerCase();

  // Lógica para condomínios
  if (order?.condominiumId) {
    let condoDetails = `COND. ${order.condominiumName || ''}`;
    if ((fulfillmentMode === 'condominium_apartment' || fulfillmentMode === 'apartment_delivery') && order.condominiumUnit) {
      const { block, tower, apartment, reference } = order.condominiumUnit;
      let unitDetails = [];
      if (block) unitDetails.push(`Bl. ${block}`);
      if (tower) unitDetails.push(`Tr. ${tower}`);
      if (apartment) unitDetails.push(`Apto ${apartment}`);
      if (reference) unitDetails.push(`Ref. ${reference}`);
      if (unitDetails.length) {
        condoDetails += ` (${unitDetails.join(', ')})`;
      }
    }
    return condoDetails.toUpperCase();
  }

  if (type === "pickup") return "RETIRADA";
  if (type === "table") {
    const formattedTable = formatTableIdentifier(order?.table);
    return formattedTable ? `MESA ${formattedTable}` : "MESA";
  }
  if (type === "reservation") {
    const scheduled = order?.scheduledFor;
    const ts = scheduled ? new Date(scheduled).getTime() : NaN;
    const timeLabel = Number.isFinite(ts)
      ? new Date(scheduled).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '';
    return ""; // o chip no card já mostra "Reserva HH:MM" — não duplicar no identificador
  }
  return "";
};

export const parseMesaIdentifier = (value: any) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^MESA\s+(.+)$/i);
  if (!match) return { isMesa: false, number: "", raw };
  return { isMesa: true, number: String(match[1] || "").trim(), raw };
};

export const isPostalOrder = (order: any) =>
  String(order?.type || "").toLowerCase() === "delivery" &&
  String(order?.fulfillmentMode || "").toLowerCase() === "postal";

export const isCondominiumOrder = (order: any) => Boolean(order?.condominiumId || order?.condominiumName);

export const MANUAL_ITEM_CATEGORY = "Avulsos";
export const TABLE_SERVICE_KIND_COUVERT = "couvert";

export const isTableOrder = (order: any) => String(order?.type || "").toLowerCase() === "table";

export const getOrderItemCategory = (item: any, productsById?: Map<any, any>) => {
  const product = item?.product || productsById?.get?.(item?.productId || item?.id);
  return String(product?.category || item?.category || "");
};

export const isTableServiceOrderItem = (item: any, productsById?: Map<any, any>) =>
  isTableServiceCategory(getOrderItemCategory(item, productsById));

export const resolveCondominiumCardIdentifier = (order: any) => {
  if (!isCondominiumOrder(order)) return "";
  const fulfillmentMode = String(order?.fulfillmentMode || "").toLowerCase();
  const unit = order?.condominiumUnit || {};
  const isApartment = fulfillmentMode === "condominium_apartment" || fulfillmentMode === "apartment_delivery";
  if (!isApartment) return "COND.";

  const apartment = String(unit?.apartment || "").trim();
  const blockOrTower = String(unit?.block || unit?.tower || "").trim();
  if (apartment) return `APTO ${apartment}`.toUpperCase();
  if (blockOrTower) return `BL. ${blockOrTower}`.toUpperCase();
  return "APTO";
};

export const getTableStageMeta = (stage: string) => {
  if (stage === "pending") {
    return {
      label: "Aguardando",
      icon: Clock,
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  if (stage === "preparing") {
    return {
      label: "Em preparo",
      icon: Play,
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }
  if (stage === "ready") {
    return {
      label: "Pronta",
      icon: Check,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  return {
    label: "Em andamento",
    icon: CheckSquare,
    className: "border-orange-200 bg-orange-50 text-orange-700",
  };
};
