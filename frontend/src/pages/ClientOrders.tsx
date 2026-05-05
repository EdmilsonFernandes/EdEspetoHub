// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowClockwise,
  ArrowSquareOut,
  CaretDown,
  CalendarBlank,
  CheckCircle,
  ChatCircleDots,
  Clock,
  CreditCard,
  House,
  UserCircle,
  Package,
  Receipt,
  Motorcycle,
  SpinnerGap,
  Storefront,
  Timer,
  WarningCircle,
  WhatsappLogo,
  XCircle,
  Buildings,
} from '@phosphor-icons/react';
import { customerAccountService } from '../services/customerAccountService';
import { orderService } from '../services/orderService';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatOrderDisplayId } from '../utils/format';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { getPaymentProviderMeta } from '../utils/paymentAssets';
import { formatSelectedModifiers } from '../utils/productModifiers';
import { navigateBackOrFallback } from '../utils/navigation';

const TERMINAL_STATUSES = [ 'DELIVERED', 'CANCELLED', 'FINISHED', 'REJECTED', 'DONE' ];
const ACTIVE_REFRESH_MS = 10_000;
const DELAY_GRACE_MS = 15 * 60 * 1000;

const normalizeStatus = (status?: string) => String(status || '').trim().toUpperCase();

const formatGroupDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatRelativeGroupLabel = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfTarget.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
    });
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
    });
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStoreInitials = (name?: string) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return 'JN';
  return parts.map((part) => part[0]?.toUpperCase() || '').join('');
};

const getOrderItemQty = (item: any) => Math.max(1, Number(item?.quantity ?? item?.qty ?? 1));

const getOrderItemsCount = (items: any[]) =>
  (Array.isArray(items) ? items : []).reduce((sum, item) => sum + getOrderItemQty(item), 0);

const getOrderItemImageUrl = (item: any) => resolveAssetUrl(item?.imageUrl || item?.product?.imageUrl || '');

const getOrderItemDetails = (item: any) => {
  const labels = [];
  if (item?.cookingPoint) labels.push(String(item.cookingPoint));
  if (item?.passSkewer) labels.push('passar farinha');
  const modifiers = formatSelectedModifiers(item?.selectedModifiers || []);
  if (modifiers.length) labels.push(`+ ${modifiers.join(', ')}`);
  return labels.join(' • ');
};

const getEtaWindowLabel = (eta?: { windowMin?: number; windowMax?: number; totalMinutes?: number } | null) => {
  const min = Number(eta?.windowMin || 0);
  const max = Number(eta?.windowMax || 0);
  const total = Number(eta?.totalMinutes || 0);
  if (min > 0 && max > 0) return `${min}-${max} min`;
  if (total > 0) return `${total} min`;
  return '';
};

const getEtaDeadlineMs = (order: any, details?: any) => {
  const createdAt = new Date(order?.createdAt || '').getTime();
  const etaMinutes = Number(details?.eta?.windowMax || details?.eta?.totalMinutes || details?.eta?.windowMin || 0);
  if (!createdAt || !(etaMinutes > 0)) return null;
  return createdAt + etaMinutes * 60 * 1000;
};

const isCustomerCancelableStatus = (status?: string) =>
  [ 'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'READY_FOR_DELIVERY', 'WAITING_FOR_MOTOBOY' ].includes(normalizeStatus(status));

const buildWhatsappLink = (phone?: string | null, native = false, message?: string) => {
  const normalized = String(phone || '').replace(/\D/g, '').replace(/^55/, '');
  if (!normalized) return '';
  const encodedMessage = String(message || '').trim() ? encodeURIComponent(String(message || '').trim()) : '';
  if (native) return encodedMessage ? `whatsapp://send?phone=55${normalized}&text=${encodedMessage}` : `whatsapp://send?phone=55${normalized}`;
  return encodedMessage ? `https://wa.me/55${normalized}?text=${encodedMessage}` : `https://wa.me/55${normalized}`;
};

const formatSupportDateTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildOrderSupportMessage = ({
  order,
  customerName,
  storeName,
  isActive,
  topicTitle,
  topicMessage,
}: {
  order: any;
  customerName?: string;
  storeName?: string;
  isActive: boolean;
  topicTitle?: string;
  topicMessage?: string;
}) => {
  const orderNumber =
    formatOrderDisplayId(String(order?.id || '').trim(), String(order?.store?.slug || order?.storeSlug || '').trim()) ||
    String(order?.id || '').trim() ||
    '-';
  const safeCustomerName = String(
    customerName ||
    order?.customer?.fullName ||
    order?.customer?.name ||
    order?.customerName ||
    'Cliente'
  ).trim();
  const safeStoreName = String(storeName || order?.store?.name || 'a loja').trim();
  const orderDateTime = formatSupportDateTime(order?.createdAt);
  const normalizedTopicTitle = String(topicTitle || '').trim();
  const normalizedTopicMessage = String(topicMessage || '').trim();

  if (normalizedTopicTitle || normalizedTopicMessage) {
    return `Olá, tudo bem? Meu nome é ${safeCustomerName}. Sou cliente do pedido #${orderNumber}${orderDateTime ? `, feito em ${orderDateTime},` : ''} na ${safeStoreName}. Preciso de ajuda com: ${normalizedTopicTitle || 'meu pedido'}. ${normalizedTopicMessage || 'Pode me orientar, por favor?'} Pode me ajudar?`;
  }

  if (isActive) {
    return `Olá, tudo bem? Meu nome é ${safeCustomerName}. Sou cliente do pedido #${orderNumber}${orderDateTime ? `, feito em ${orderDateTime},` : ''} na ${safeStoreName}. Gostaria de saber o status do meu pedido e confirmar se está tudo certo. Pode me ajudar?`;
  }

  return `Olá, tudo bem? Meu nome é ${safeCustomerName}. Sou cliente do pedido #${orderNumber}${orderDateTime ? `, feito em ${orderDateTime},` : ''} na ${safeStoreName}. Tenho uma dúvida sobre esse pedido e gostaria de suporte. Pode me ajudar?`;
};

const buildReorderPayload = (order: any) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  return {
    items: items
      .map((item: any) => ({
        productId: item?.productId || item?.product?.id || null,
        name: item?.name || item?.product?.name || '',
        quantity: item?.quantity ?? item?.qty ?? 1,
        cookingPoint: item?.cookingPoint || '',
        passSkewer: Boolean(item?.passSkewer),
        selectedModifiers: Array.isArray(item?.selectedModifiers) ? item.selectedModifiers : [],
      }))
      .filter((item: any) => item.productId || item.name),
  };
};

const isDeliverySupportOrder = (order: any) => {
  const normalizedType = String(order?.type || '').trim().toLowerCase();
  const normalizedCondominiumMode = String(
    order?.condominiumOrder?.fulfillmentMode ||
    order?.condominiumFulfillmentMode ||
    ''
  ).trim().toLowerCase();

  return (
    normalizedType === 'delivery' ||
    normalizedCondominiumMode === 'apartment_delivery' ||
    normalizedCondominiumMode === 'condominium_apartment'
  );
};

const getOrderHelpSections = (isDelivery: boolean) => [
  {
    id: 'status',
    title: 'Status e andamento',
    subtitle: 'Prazo, preparo e etapa atual do pedido',
    icon: Clock,
    items: [
      {
        id: 'status-current',
        title: 'Quero saber o status do meu pedido',
        answer: 'A loja acompanha o preparo e consegue confirmar a etapa atual do pedido. Em pedidos com entrega, a saída e a chegada também dependem da operação de entrega vinculada.',
        whatsappHint: 'Gostaria de confirmar o status atual do meu pedido.',
      },
      {
        id: 'status-delay',
        title: 'Meu pedido está demorando',
        answer: 'Quando houver atraso, a confirmação do novo prazo precisa ser feita diretamente com a loja. Em entregas, o tempo final também pode variar conforme a operação de entrega.',
        whatsappHint: 'Meu pedido parece estar demorando além do esperado e preciso de uma atualização.',
      },
      {
        id: 'status-confirm',
        title: isDelivery ? 'Preciso confirmar a entrega' : 'Preciso confirmar a retirada',
        answer: isDelivery
          ? 'Confirme com a loja os dados da entrega, referência do endereço e a etapa atual do envio.'
          : 'Confirme com a loja o horário, o ponto e os detalhes da retirada do pedido.',
        whatsappHint: isDelivery
          ? 'Preciso confirmar os detalhes da entrega do meu pedido.'
          : 'Preciso confirmar os detalhes da retirada do meu pedido.',
      },
    ],
  },
  {
    id: 'payment',
    title: 'Pagamento',
    subtitle: 'Cobrança, reconhecimento e divergência de valor',
    icon: CreditCard,
    items: [
      {
        id: 'payment-check',
        title: 'Pagamento não foi reconhecido',
        answer: 'Se você já pagou e o pedido ainda não foi confirmado, a loja precisa validar o recebimento e a conciliação desse pagamento no atendimento do pedido.',
        whatsappHint: 'Já realizei o pagamento, mas ele ainda não foi reconhecido no pedido.',
      },
      {
        id: 'payment-value',
        title: 'Valor cobrado diferente',
        answer: 'Qualquer divergência de valor deve ser validada primeiro com a loja responsável pelo pedido, incluindo itens, taxas e forma de cobrança.',
        whatsappHint: 'Notei uma divergência no valor cobrado do meu pedido e gostaria de verificar.',
      },
      {
        id: 'payment-method',
        title: 'Dúvida sobre Pix, cartão ou taxa',
        answer: 'A loja pode confirmar a forma de cobrança usada no pedido, o valor final e orientar sobre dúvidas práticas do pagamento aplicado.',
        whatsappHint: 'Tenho uma dúvida sobre a forma de pagamento ou taxa aplicada no meu pedido.',
      },
    ],
  },
  {
    id: 'items',
    title: 'Itens do pedido',
    subtitle: 'Conferência, qualidade e composição do pedido',
    icon: Package,
    items: [
      {
        id: 'items-missing',
        title: 'Item faltando',
        answer: 'A conferência e a montagem do pedido são responsabilidade da loja. Para agilizar a solução, fale com a loja informando qual item não foi recebido.',
        whatsappHint: 'Recebi o pedido, mas faltou um item. Gostaria de verificar isso com vocês.',
      },
      {
        id: 'items-wrong',
        title: 'Recebi item diferente',
        answer: 'Quando o item enviado não corresponde ao pedido, a loja deve confirmar a divergência e orientar a melhor forma de atendimento.',
        whatsappHint: 'Recebi um item diferente do que pedi e preciso de suporte.',
      },
      {
        id: 'items-quality',
        title: 'Problema na qualidade ou preparo',
        answer: 'Questões de preparo, temperatura, ponto ou apresentação precisam ser tratadas com a loja responsável pela produção do pedido.',
        whatsappHint: 'Tenho uma dúvida sobre a qualidade ou preparo de um item do meu pedido.',
      },
    ],
  },
  {
    id: 'fulfillment',
    title: isDelivery ? 'Entrega' : 'Retirada',
    subtitle: isDelivery ? 'Endereço, recebimento e andamento da entrega' : 'Horário, ponto e confirmação da retirada',
    icon: isDelivery ? Motorcycle : Storefront,
    items: isDelivery
      ? [
          {
            id: 'delivery-address',
            title: 'Preciso ajustar ou confirmar o endereço',
            answer: 'A loja precisa validar rapidamente se ainda é possível ajustar referência, complemento ou ponto de entrega do pedido.',
            whatsappHint: 'Preciso confirmar ou ajustar os dados de entrega do meu pedido.',
          },
          {
            id: 'delivery-missing',
            title: 'Pedido marcado como entregue e não recebi',
            answer: 'Nesse caso, fale imediatamente com a loja para confirmar o registro da entrega e a operação responsável pelo envio.',
            whatsappHint: 'Meu pedido foi marcado como entregue, mas eu ainda não recebi.',
          },
          {
            id: 'delivery-contact',
            title: 'Preciso falar sobre a entrega',
            answer: 'Se houver dúvida sobre saída, rota, referência ou recebimento, a loja consegue orientar o atendimento e o contato sobre essa entrega.',
            whatsappHint: 'Preciso de ajuda com a entrega do meu pedido.',
          },
        ]
      : [
          {
            id: 'pickup-time',
            title: 'Quero confirmar o horário de retirada',
            answer: 'A loja consegue informar a previsão e o melhor momento para retirar o pedido sem desencontro.',
            whatsappHint: 'Quero confirmar o horário ideal para retirar meu pedido.',
          },
          {
            id: 'pickup-point',
            title: 'Preciso confirmar o local de retirada',
            answer: 'Se houver qualquer dúvida sobre balcão, feira ou ponto de retirada, confirme diretamente com a loja antes de sair.',
            whatsappHint: 'Preciso confirmar o local de retirada do meu pedido.',
          },
          {
            id: 'pickup-problem',
            title: 'Tive um problema na retirada',
            answer: 'Ocorrências no momento da retirada devem ser tratadas com a loja responsável pelo atendimento do pedido.',
            whatsappHint: 'Tive um problema no momento da retirada do meu pedido.',
          },
        ],
  },
];

const groupOrdersByDate = (orders: any[]) => {
  const groups: Array<{ key: string; label: string; caption: string; orders: any[]; totalAmount: number }> = [];
  const byKey = new Map<string, { key: string; label: string; caption: string; orders: any[]; totalAmount: number }>();

  orders.forEach((order) => {
    const key = new Date(order.createdAt).toISOString().slice(0, 10);
    const existing = byKey.get(key);
    if (existing) {
      existing.orders.push(order);
      existing.totalAmount += Number(order?.total || 0);
      return;
    }
    const next = {
      key,
      label: formatRelativeGroupLabel(order.createdAt),
      caption: formatGroupDate(order.createdAt),
      orders: [ order ],
      totalAmount: Number(order?.total || 0),
    };
    byKey.set(key, next);
    groups.push(next);
  });

  return groups;
};

const getOrderFulfillmentMeta = (order: any) => {
  const normalizedType = String(order?.type || '').trim().toLowerCase();
  const normalizedCondominiumMode = String(
    order?.condominiumOrder?.fulfillmentMode ||
    order?.condominiumFulfillmentMode ||
    ''
  ).trim().toLowerCase();

  if (
    normalizedType === 'delivery' ||
    normalizedCondominiumMode === 'apartment_delivery' ||
    normalizedCondominiumMode === 'condominium_apartment'
  ) {
    return {
      label: 'Entrega',
      toneClass: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
    };
  }

  if (normalizedType === 'table') {
    return {
      label: 'Mesa',
      toneClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    };
  }

  return {
    label: 'Retirada',
    toneClass: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
  };
};

const formatOrderMoment = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfTarget.getTime()) / 86_400_000);

  if (diffDays === 0) return `Hoje, ${formatTime(value)}`;
  if (diffDays === 1) return `Ontem, ${formatTime(value)}`;
  return formatSupportDateTime(value);
};

const getStatusMeta = (status: string, orderType?: string) => {
  const normalized = normalizeStatus(status);
  const normalizedType = String(orderType || '').trim().toLowerCase();
  const isDelivery = normalizedType === 'delivery';

  switch (normalized) {
    case 'AWAITING_PAYMENT':
      return {
        label: 'Aguardando pagamento',
        icon: <Clock size={15} weight="duotone" className="text-sky-500" />,
        toneClass: 'text-sky-600',
      };
    case 'PENDING':
    case 'ACCEPTED':
      return {
        label: 'Recebido',
        icon: <Clock size={15} weight="duotone" className="text-amber-500" />,
        toneClass: 'text-amber-600',
      };
    case 'PREPARING':
      return {
        label: 'Em preparação',
        icon: <SpinnerGap size={15} weight="duotone" className="text-sky-600" />,
        toneClass: 'text-sky-600',
      };
    case 'READY':
    case 'READY_FOR_DELIVERY':
    case 'WAITING_FOR_MOTOBOY': {
      const readyLabel =
        isDelivery ? 'Aguardando entregador' :
        normalizedType === 'table' ? 'Pedido pronto' :
        'Disponível para retirada';
      return {
        label: readyLabel,
        icon: <Package size={15} weight="duotone" className="text-emerald-600" />,
        toneClass: 'text-emerald-600',
      };
    }
    case 'DELIVERING':
    case 'IN_DELIVERY':
    case 'DISPATCHED':
      return {
        label: 'Em rota',
        icon: <Motorcycle size={15} weight="duotone" className="text-indigo-600" />,
        toneClass: 'text-indigo-600',
      };
    case 'DELIVERED':
      return {
        label: 'Entregue',
        icon: <CheckCircle size={15} weight="fill" className="text-emerald-500" />,
        toneClass: 'text-emerald-600',
      };
    case 'DONE':
    case 'FINISHED':
      return {
        label: 'Finalizado',
        icon: <CheckCircle size={15} weight="fill" className="text-emerald-500" />,
        toneClass: 'text-emerald-600',
      };
    case 'CANCELLED':
    case 'REJECTED':
      return {
        label: 'Cancelado',
        icon: <XCircle size={15} weight="duotone" className="text-rose-500" />,
        toneClass: 'text-rose-600',
      };
    default:
      return {
        label: 'Pedido',
        icon: <Package size={15} weight="duotone" className="text-slate-400" />,
        toneClass: 'text-slate-500',
      };
  }
};

function OrderCard({
  order,
  isActive,
  details,
  onCancelRequest,
  onConfirmReceipt,
  confirmReceiptLoading,
  onOpenHelp,
  onOpenOrder,
  onOpenStore,
}: {
  order: any;
  isActive: boolean;
  details?: any;
  onCancelRequest: (order: any) => void;
  onConfirmReceipt: (order: any) => void;
  confirmReceiptLoading?: boolean;
  onOpenHelp: (order: any) => void;
  onOpenOrder: (orderId: string) => void;
  onOpenStore: (slug?: string) => void;
}) {
  const statusMeta = getStatusMeta(order.status, order.type);
  const items = Array.isArray(order.items) ? order.items : [];
  const primaryItem = items[0] || null;
  const extraItems = Math.max(0, items.length - 1);
  const thumbnails = items
    .map((item: any) => resolveAssetUrl(item.imageUrl || ''))
    .filter(Boolean)
    .slice(0, 2);
  const logoUrl = resolveAssetUrl(order.store?.settings?.logoUrl || '');
  const storeName = order.store?.name || 'Loja parceira';
  const orderDate = formatTime(order.createdAt);
  const orderMoment = formatOrderMoment(order.createdAt);
  const orderDisplayId =
    formatOrderDisplayId(String(order?.id || '').trim(), String(order?.store?.slug || order?.storeSlug || '').trim()) ||
    String(order?.id || '').trim() ||
    '-';
  const etaWindowLabel = getEtaWindowLabel(details?.eta);
  const etaDeadlineMs = getEtaDeadlineMs(order, details);
  const itemsCount = getOrderItemsCount(items);
  const fulfillmentMeta = getOrderFulfillmentMeta(order);
  const condominiumOrder = order?.condominiumOrder || (order?.condominiumId ? {
    condominiumName: order?.condominiumName,
    fulfillmentMode: order?.condominiumFulfillmentMode,
    unit: order?.condominiumUnit,
  } : null);
  const condominiumFulfillment = String(condominiumOrder?.fulfillmentMode || '').toLowerCase();
  const condominiumLabel =
    condominiumFulfillment === 'apartment_delivery' || condominiumFulfillment === 'condominium_apartment'
      ? 'Entrega no apartamento'
      : 'Retirada na feira';
  const isDelayed = Boolean(etaDeadlineMs && Date.now() > etaDeadlineMs);
  const canCancel = Boolean(
    isActive &&
    isDelayed &&
    isCustomerCancelableStatus(order.status) &&
    etaDeadlineMs &&
    Date.now() > etaDeadlineMs + DELAY_GRACE_MS
  );
  const handleRepeatOrder = () => {
    const storeSlug = String(order?.store?.slug || '').trim();
    const payload = buildReorderPayload(order);
    if (!storeSlug || !payload.items.length) {
      onOpenStore(order?.store?.slug);
      return;
    }
    localStorage.setItem(`reorder:${storeSlug}`, JSON.stringify(payload));
    onOpenStore(storeSlug);
  };

  const isCancelled = ['CANCELLED', 'REJECTED'].includes(normalizeStatus(order.status));
  const canConfirmReceipt =
    !isActive &&
    normalizeStatus(order.status) === 'DELIVERED' &&
    String(order?.type || '').trim().toLowerCase() === 'delivery' &&
    !order?.customerReceivedAt;

  return (
    <article className={`overflow-hidden rounded-[28px] bg-white shadow-[0_8px_32px_-16px_rgba(15,23,42,0.18)] ${isActive ? 'ring-1 ring-emerald-200' : 'ring-1 ring-slate-100'}`}>
      {/* Header do card */}
      <button
        type="button"
        onClick={() => onOpenOrder(order.id)}
        className="flex w-full items-center gap-3 px-4 pt-4 pb-2.5 text-left"
      >
        {/* Logo da loja */}
        <div
          onClick={(e) => { e.stopPropagation(); onOpenStore(order.store?.slug); }}
          className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border-2 bg-slate-100 transition-transform active:scale-95 ${isActive ? 'border-emerald-300 shadow-[0_0_0_3px_rgba(52,211,153,0.15)]' : 'border-slate-200'}`}
        >
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#153A4C,#336886)] text-sm font-black text-white">
              {getStoreInitials(storeName)}
            </div>
          )}
          {isActive && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
          )}
        </div>

        {/* Nome + status */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[14px] font-black text-slate-900">{storeName}</h3>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            {isActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                {statusMeta.label}
              </span>
            ) : (
              <span className={`text-[12px] font-semibold ${isCancelled ? 'text-rose-500' : 'text-slate-500'}`}>
                {statusMeta.label}
              </span>
            )}
            <span className="text-slate-300">·</span>
            <span className="text-[11px] text-slate-400">{orderDate || formatGroupDate(order.createdAt)}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
              #{orderDisplayId}
            </span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${fulfillmentMeta.toneClass}`}>
              {fulfillmentMeta.label}
            </span>
          </div>
          {condominiumOrder?.condominiumName ? (
            <p className="mt-1 inline-flex max-w-full rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              <span className="truncate">{condominiumLabel} • {condominiumOrder.condominiumName}</span>
            </p>
          ) : null}
        </div>

        {/* Valor */}
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-black text-slate-900">{formatCurrency(order.total || 0)}</p>
          {thumbnails.length > 0 && (
            <div className="mt-1 flex justify-end">
              {thumbnails.map((src, index) => (
                <img key={`${order.id}-th-${index}`} src={src} alt="" className={`h-4.5 w-4.5 rounded-full border border-white object-cover ${index > 0 ? '-ml-1.5' : ''}`} />
              ))}
            </div>
          )}
        </div>
      </button>

      {/* Botão pagar MP */}
      {normalizeStatus(order.status) === 'AWAITING_PAYMENT' && order.paymentLink && (
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => {
              const url = order.paymentLink;
              if (!url) return;
              if (Capacitor.isNativePlatform()) { Browser.open({ url }); } else { window.open(url, '_blank'); }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#009ee3] py-3 text-sm font-black text-white shadow-[0_6px_18px_-8px_rgba(0,158,227,0.55)] active:scale-[0.98] transition-transform"
          >
            <img src={getPaymentProviderMeta('mercado_pago').icon} alt="" className="h-5 w-5 object-contain brightness-0 invert" />
            Finalizar pagamento
          </button>
        </div>
      )}

      {/* Itens */}
      <button type="button" onClick={() => onOpenOrder(order.id)} className="block w-full text-left">
        <div className="mx-4 mb-3 overflow-hidden rounded-2xl bg-slate-50">
          {normalizeStatus(order.status) === 'AWAITING_PAYMENT' && (
            <div className="border-b border-slate-100 px-3 py-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-600">
                <SpinnerGap size={11} weight="duotone" className="animate-spin" />
                Confirme o pagamento para entrar na fila
              </span>
            </div>
          )}
          {isActive && etaWindowLabel && (
            <div className="border-b border-slate-100 px-3 py-2">
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${isDelayed ? 'text-amber-600' : 'text-emerald-600'}`}>
                <Timer size={11} weight="duotone" />
                {isDelayed ? 'Atrasado' : `Previsão ${etaWindowLabel}`}
              </span>
            </div>
          )}
          {primaryItem ? (
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-600">
                  {getOrderItemQty(primaryItem)}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-slate-800">{primaryItem.name || 'Item do pedido'}</span>
                  {getOrderItemDetails(primaryItem) ? (
                    <span className="block truncate text-[11px] text-slate-400">{getOrderItemDetails(primaryItem)}</span>
                  ) : null}
                </div>
                {extraItems > 0 ? (
                  <span className="inline-flex shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#336886] ring-1 ring-slate-200">
                    +{extraItems}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-500">{orderMoment || formatGroupDate(order.createdAt)}</span>
                <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-flex" />
                <span>{itemsCount} {itemsCount === 1 ? 'item no pedido' : 'itens no pedido'}</span>
                {extraItems > 0 ? (
                  <>
                    <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-flex" />
                    <span className="font-semibold text-[#336886]">+{extraItems} adicional{extraItems === 1 ? '' : 'is'}</span>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
          {isCancelled && String(order.canceledReason || '').trim() && (
            <div className="border-t border-rose-100 bg-rose-50 px-3 py-2 text-[11px] text-rose-600">
              <span className="font-semibold">Motivo: </span>{order.canceledReason}
            </div>
          )}
          {isCancelled && ['pix','credito','debito','credit_card','debit_card'].includes(String(order.paymentMethod || order.payment || '').toLowerCase()) && String(order.paymentStatus || '').toUpperCase() === 'PAID' && !order.refundStatus && (
            <div className="border-t border-sky-100 bg-sky-50 px-3 py-2 text-[11px] text-sky-700">
              <span className="font-semibold">Reembolso em análise</span> {'\u2014'} o estabelecimento está processando a devolução do valor pago.
            </div>
          )}
          {isCancelled && order.refundStatus === 'REFUNDED' && (
            <div className="border-t border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 font-semibold">
              ✓ Reembolso processado{order.refundAmount ? ` — ${formatCurrency(order.refundAmount)}` : ''}
            </div>
          )}
          {isCancelled && order.refundStatus === 'PARTIALLY_REFUNDED' && (
            <div className="border-t border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-700 font-semibold">
              ✓ Reembolso parcial processado{order.refundAmount ? ` — ${formatCurrency(order.refundAmount)}` : ''}
            </div>
          )}
          {isCancelled && order.refundStatus === 'DENIED' && (
            <div className="border-t border-rose-100 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
              <span className="font-semibold">Reembolso não aprovado</span>{order.refundReason ? ` — ${order.refundReason}` : ''}. Em caso de dúvidas, entre em contato com o estabelecimento.
            </div>
          )}
          {['DELIVERING', 'IN_DELIVERY', 'DISPATCHED'].includes(normalizeStatus(order.status)) && details?.delivery?.motoboy?.name && (
            <div className="flex items-center gap-2 border-t border-indigo-100 bg-indigo-50 px-3 py-2">
              <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-white shadow-sm">
                {details.delivery.motoboy.profileImageUrl ? (
                  <img src={resolveAssetUrl(details.delivery.motoboy.profileImageUrl)} alt={details.delivery.motoboy.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-indigo-200 text-[10px] font-bold text-indigo-700">
                    {String(details.delivery.motoboy.name)[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <p className="text-[11px] font-semibold text-indigo-700">{details.delivery.motoboy.name}</p>
              <Motorcycle size={13} weight="duotone" className="ml-auto text-indigo-400" />
            </div>
          )}
        </div>
      </button>

      {/* Rodapé com ações */}
      <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-2.5">
        {isActive && isDelayed ? (
          <>
            <button type="button" onClick={() => onOpenHelp(order)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-[#cfe0ea] bg-[linear-gradient(135deg,#f8fbfd,#e9f3f8)] py-2.5 text-[13px] font-black text-[#153A4C] shadow-[0_14px_28px_-18px_rgba(51,104,134,0.32)] active:scale-[0.98] transition-all hover:-translate-y-0.5">
              <ChatCircleDots size={15} weight="duotone" />
              Falar com a loja
            </button>
            {canCancel && (
              <button type="button" onClick={() => onCancelRequest(order)} className="inline-flex flex-1 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-2.5 text-[13px] font-semibold text-rose-600 active:scale-[0.98] transition-transform">
                Solicitar cancelamento
              </button>
            )}
          </>
        ) : isActive ? (
          <button type="button" onClick={() => onOpenOrder(order.id)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[linear-gradient(135deg,#153A4C,#336886)] py-2.5 text-[13px] font-bold text-white shadow-[0_8px_20px_-10px_rgba(21,58,76,0.5)] active:scale-[0.98] transition-transform">
            Acompanhar pedido
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onOpenHelp(order)}
              className="inline-flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-2xl border border-[#cfe0ea] bg-[linear-gradient(135deg,#f8fbfd,#e9f3f8)] text-[#336886] shadow-[0_16px_30px_-22px_rgba(51,104,134,0.34)] active:scale-95 transition-all hover:-translate-y-0.5"
              title="Ajuda com este pedido"
            >
              <ChatCircleDots size={17} weight="duotone" />
            </button>
            <button type="button" onClick={() => onOpenOrder(order.id)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-2.5 text-[13px] font-semibold text-slate-700 active:scale-[0.98] transition-transform">
              Ver detalhes
            </button>
            {canCancel && (
              <button type="button" onClick={() => onCancelRequest(order)} className="inline-flex flex-1 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-2.5 text-[13px] font-semibold text-rose-600 active:scale-[0.98] transition-transform">
                Cancelar
              </button>
            )}
            {canConfirmReceipt ? (
              <button
                type="button"
                onClick={() => onConfirmReceipt(order)}
                disabled={confirmReceiptLoading}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_20px_-10px_rgba(5,150,105,0.5)] active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-70"
              >
                {confirmReceiptLoading ? <SpinnerGap size={14} weight="bold" className="animate-spin" /> : <CheckCircle size={14} weight="fill" />}
                Confirmar recebimento
              </button>
            ) : (
              <button type="button" onClick={handleRepeatOrder} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[linear-gradient(135deg,#153A4C,#336886)] py-2.5 text-[13px] font-bold text-white shadow-[0_8px_20px_-10px_rgba(21,58,76,0.5)] active:scale-[0.98] transition-transform">
                <ArrowClockwise size={14} weight="bold" />
                Pedir de novo
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}

function OrderHelpScreen({
  order,
  customerName,
  onClose,
  onOpenStore,
}: {
  order: any;
  customerName?: string;
  onClose: () => void;
  onOpenStore: (slug?: string) => void;
}) {
  const storeName = order?.store?.name || 'Loja parceira';
  const logoUrl = resolveAssetUrl(order?.store?.settings?.logoUrl || '');
  const statusMeta = getStatusMeta(order?.status, order?.type);
  const isDelivery = isDeliverySupportOrder(order);
  const orderDateTime = formatSupportDateTime(order?.createdAt) || formatGroupDate(order?.createdAt);
  const orderDisplayId =
    formatOrderDisplayId(String(order?.id || '').trim(), String(order?.store?.slug || order?.storeSlug || '').trim()) ||
    String(order?.id || '').trim() ||
    '-';
  const totalLabel = isDelivery ? 'Total com entrega' : 'Total para retirada';
  const supportSections = useMemo(() => getOrderHelpSections(isDelivery), [isDelivery]);
  const defaultExpandedId = supportSections[0]?.items?.[0]?.id || null;
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(defaultExpandedId);

  useEffect(() => {
    setExpandedTopicId(defaultExpandedId);
  }, [defaultExpandedId, order?.id]);

  const handleWhatsApp = (topicTitle?: string, topicMessage?: string) => {
    const supportMessage = buildOrderSupportMessage({
      order,
      customerName,
      storeName,
      isActive: !TERMINAL_STATUSES.includes(normalizeStatus(order?.status)),
      topicTitle,
      topicMessage,
    });
    const nativeUrl = buildWhatsappLink(order?.store?.phone, true, supportMessage);
    const webUrl = buildWhatsappLink(order?.store?.phone, false, supportMessage);
    if (!webUrl) {
      onClose();
      onOpenStore(order?.store?.slug);
      return;
    }
    if (Capacitor.isNativePlatform() && nativeUrl) {
      window.location.href = nativeUrl;
      return;
    }
    window.open(webUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[90] bg-[linear-gradient(180deg,#eef5fa_0%,#f8fbfd_100%)]">
      <div className="pointer-events-none absolute right-[-12%] top-[-10%] h-[34%] w-[48%] rounded-full bg-[#336886]/14 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[4%] left-[-8%] h-[26%] w-[34%] rounded-full bg-sky-300/12 blur-[110px]" />

      <div className="relative mx-auto flex h-full max-w-2xl flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#d5e3ec]/70 bg-[rgba(244,248,251,0.94)] px-4 py-4 backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#cfe0ea] bg-white/85 text-[#153A4C] shadow-[0_12px_24px_-22px_rgba(51,104,134,0.28)] transition-all active:scale-95"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5">
              <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-5 w-5 rounded-[0.5rem] object-cover shadow-sm ring-1 ring-slate-200" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#336886]">Atendimento</p>
            </div>
            <h1 className="text-[15px] font-semibold text-stone-950">Ajuda com pedido</h1>
          </div>
          <div className="w-10" />
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="rounded-[30px] border border-[#d5e3ec] bg-[linear-gradient(140deg,rgba(248,251,253,0.98)_0%,rgba(236,245,250,0.98)_56%,rgba(255,255,255,0.98)_100%)] p-4 text-slate-900 shadow-[0_28px_60px_-40px_rgba(51,104,134,0.24)] ring-1 ring-white/80">
            <div className="flex items-start gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[1.2rem] border border-[#cfe0ea] bg-white shadow-[0_18px_34px_-24px_rgba(51,104,134,0.22)]">
                {logoUrl ? (
                  <img src={logoUrl} alt={storeName} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#153A4C,#336886)] text-sm font-black text-white">
                    {getStoreInitials(storeName)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-lg font-black text-stone-950">{storeName}</p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#cfe0ea] bg-white/92 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#336886] shadow-[0_12px_22px_-20px_rgba(51,104,134,0.2)]">
                    {statusMeta.icon}
                    {statusMeta.label}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-stone-500">Pedido #{orderDisplayId} • {orderDateTime}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-[1.15rem] border border-[#cfe0ea] bg-white/92 px-4 py-3 shadow-[0_16px_30px_-24px_rgba(51,104,134,0.16)]">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#336886]">Resumo</p>
                <p className="mt-1 text-sm font-black text-stone-900">{totalLabel}</p>
                <p className="mt-1 text-base font-black text-[#153A4C]">{formatCurrency(order?.total || 0)}</p>
              </div>
              <div className="rounded-[1.15rem] border border-stone-200/80 bg-white/88 px-4 py-3 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.12)]">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Atendimento</p>
                <p className="mt-1 text-sm font-black text-stone-900">{isDelivery ? 'Entrega' : 'Retirada'}</p>
                <p className="mt-1 text-xs font-medium text-stone-500">{isDelivery ? 'Pedido com envio' : 'Pedido para retirada'}</p>
              </div>
              <div className="rounded-[1.15rem] border border-stone-200/80 bg-white/88 px-4 py-3 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.12)]">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Canal</p>
                <p className="mt-1 text-sm font-black text-stone-900">Loja responsável</p>
                <p className="mt-1 text-xs font-medium text-stone-500">Contato direto pelo pedido</p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[26px] border border-[#dbe7ef] bg-[linear-gradient(135deg,#f8fbfd,#ffffff)] p-4 shadow-[0_18px_40px_-32px_rgba(51,104,134,0.18)]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#cfe0ea] bg-white shadow-[0_14px_28px_-22px_rgba(51,104,134,0.22)]">
                <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="text-sm font-black text-stone-950">Como funciona o atendimento</p>
                <p className="mt-1 text-xs font-medium leading-5 text-stone-600 sm:text-sm">
                  O Já no Caminho facilita o contato e o registro do atendimento. A preparação, conferência e atendimento do pedido são de responsabilidade da loja. Em pedidos com entrega, a execução da entrega é responsabilidade da operação vinculada ao pedido.
                </p>
              </div>
            </div>
          </div>

          <section className="mt-5">
            <div className="px-1">
              <h2 className="text-base font-black text-stone-950">Precisa de ajuda com...</h2>
              <p className="mt-1 text-sm text-stone-500">Escolha o assunto e veja a orientação antes de falar com a loja.</p>
            </div>

            <div className="mt-3 space-y-3">
              {supportSections.map((section) => {
                const Icon = section.icon;
                return (
                  <div key={section.id} className="overflow-hidden rounded-[28px] border border-[#dbe7ef] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,250,0.98))] shadow-[0_18px_36px_-32px_rgba(51,104,134,0.18)]">
                    <div className="flex items-start gap-3 border-b border-[#dbe7ef] px-4 py-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#cfe0ea] bg-[linear-gradient(135deg,#f6fbfe,#e5f2f8)] text-[#336886] shadow-[0_14px_28px_-22px_rgba(51,104,134,0.24)]">
                        <Icon size={20} weight="duotone" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-stone-950">{section.title}</p>
                        <p className="mt-1 text-xs font-medium leading-5 text-stone-500">{section.subtitle}</p>
                      </div>
                    </div>

                    <div>
                      {section.items.map((item) => {
                        const isExpanded = expandedTopicId === item.id;
                        return (
                          <div key={item.id} className="border-t border-[#dbe7ef] first:border-t-0">
                            <button
                              type="button"
                              onClick={() => setExpandedTopicId((prev) => (prev === item.id ? null : item.id))}
                              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-[#edf6fb]"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-stone-900">{item.title}</p>
                              </div>
                              <CaretDown
                                size={18}
                                weight="bold"
                                className={`shrink-0 text-stone-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>

                            {isExpanded ? (
                              <div className="border-t border-[#dbe7ef] bg-[linear-gradient(180deg,rgba(240,247,251,0.72),rgba(255,255,255,0.94))] px-4 py-4">
                                <div className="rounded-[1.2rem] border border-[#dbe7ef] bg-[linear-gradient(135deg,#f9fcfe,#ffffff)] px-4 py-3 shadow-[0_14px_28px_-24px_rgba(51,104,134,0.16)]">
                                  <div className="flex items-start gap-2.5">
                                    <WarningCircle size={18} weight="duotone" className="mt-0.5 shrink-0 text-[#336886]" />
                                    <p className="text-sm font-medium leading-6 text-stone-600">{item.answer}</p>
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {buildWhatsappLink(order?.store?.phone, false) ? (
                                    <button
                                      type="button"
                                      onClick={() => handleWhatsApp(item.title, item.whatsappHint)}
                                      className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#16a34a,#15803d)] px-4 py-3 text-sm font-black text-white shadow-[0_18px_34px_-20px_rgba(22,163,74,0.45)] transition-all hover:brightness-105 active:scale-[0.98]"
                                    >
                                      <WhatsappLogo size={18} weight="fill" />
                                      Falar com a loja no WhatsApp
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onClose();
                                        onOpenStore(order?.store?.slug);
                                      }}
                                      className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#153A4C,#336886)] px-4 py-3 text-sm font-black text-white shadow-[0_18px_34px_-20px_rgba(51,104,134,0.4)] transition-all hover:brightness-105 active:scale-[0.98]"
                                    >
                                      <ArrowSquareOut size={16} weight="bold" />
                                      Abrir loja
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-[24px] border border-[#dbe7ef] bg-[linear-gradient(135deg,#f8fbfd,#ffffff)] p-4 shadow-[0_16px_36px_-32px_rgba(51,104,134,0.18)]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#cfe0ea] bg-[linear-gradient(135deg,#f6fbfe,#e5f2f8)] text-[#336886] shadow-[0_14px_28px_-22px_rgba(51,104,134,0.24)]">
                  <ChatCircleDots size={20} weight="duotone" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-stone-950">Contato direto com a loja</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-stone-600 sm:text-sm">
                    Se preferir, você pode abrir o atendimento direto com uma mensagem pronta e contextualizada com esse pedido.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {buildWhatsappLink(order?.store?.phone, false) ? (
                      <button
                        type="button"
                        onClick={() => handleWhatsApp()}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#16a34a,#166534)] px-4 py-3 text-sm font-black text-white shadow-[0_18px_34px_-20px_rgba(22,163,74,0.48)] transition-all hover:brightness-105 active:scale-[0.98]"
                      >
                        <WhatsappLogo size={18} weight="fill" />
                        Abrir conversa no WhatsApp
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenStore(order?.store?.slug);
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#153A4C,#336886)] px-4 py-3 text-sm font-black text-white shadow-[0_18px_34px_-20px_rgba(51,104,134,0.4)] transition-all hover:brightness-105 active:scale-[0.98]"
                      >
                        <ArrowSquareOut size={16} weight="bold" />
                        Abrir loja
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function ClientOrders() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'finished' | 'cancelled'>('all');
  const [orderDetails, setOrderDetails] = useState<Record<string, any>>({});
  const [helpOrder, setHelpOrder] = useState<any | null>(null);
  const [cancelModal, setCancelModal] = useState<{ order: any | null; reason: string; submitting: boolean }>({
    order: null,
    reason: '',
    submitting: false,
  });
  const [confirmingReceiptOrderId, setConfirmingReceiptOrderId] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const prevAwaitingIdsRef = useRef<Set<string>>(new Set());
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const PAGE_SIZE = 10;

  const refreshActiveOrderDetails = useCallback(async (targetOrders: any[]) => {
    const active = (Array.isArray(targetOrders) ? targetOrders : []).filter(
      (order) => !TERMINAL_STATUSES.includes(normalizeStatus(order.status))
    );
    if (!active.length) {
      setOrderDetails({});
      return;
    }

    const entries = await Promise.all(
      active.map(async (order) => {
        try {
          const data = await orderService.getPublicById(order.id);
          return [ order.id, data ];
        } catch {
          return [ order.id, null ];
        }
      })
    );

    setOrderDetails((prev) => {
      const next: Record<string, any> = {};
      for (const [ orderId, payload ] of entries) {
        if (payload) next[String(orderId)] = payload;
      }
      return Object.keys(next).length ? next : prev;
    });
  }, []);

  const loadOrders = useCallback(async (options?: { silent?: boolean }) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const requestId = ++requestIdRef.current;

    if (!options?.silent) {
      setError('');
      setLoading(true);
    }

    try {
      const result = await customerAccountService.listOrders({ limit: PAGE_SIZE, offset: 0 });
      if (requestId !== requestIdRef.current) return;
      const { data = [], hasMore: more = false } = result || {};

      if (options?.silent) {
        // Merge first page into existing state: update known orders, prepend genuinely new ones
        setOrders((prev) => {
          const newMap = new Map((data as any[]).map((o: any) => [o.id, o]));
          const updated = prev.map((o: any) => (newMap.has(o.id) ? newMap.get(o.id) : o));
          const existingIds = new Set(prev.map((o: any) => o.id));
          const newItems = (data as any[]).filter((o: any) => !existingIds.has(o.id));
          return [...newItems, ...updated];
        });
      } else {
        setOrders(data);
        setHasMore(more);
        offsetRef.current = (data as any[]).length;
      }

      if (!options?.silent) setLoading(false);
      void refreshActiveOrderDetails(data);
    } catch (e: any) {
      if (requestId !== requestIdRef.current) return;
      setError(e?.message || 'Falha ao carregar pedidos.');
      if (!options?.silent) showToast(e?.message || 'Falha ao carregar pedidos.', 'error');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
      inFlightRef.current = false;
    }
  }, [refreshActiveOrderDetails, showToast]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await customerAccountService.listOrders({ limit: PAGE_SIZE, offset: offsetRef.current });
      const { data = [], hasMore: more = false } = result || {};
      setOrders((prev) => [...prev, ...(data as any[])]);
      setHasMore(more);
      offsetRef.current += (data as any[]).length;
    } catch {
      // ignore — user can scroll again to retry
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore]);

  useEffect(() => {
    document.title = 'Meus Pedidos | Já no Caminho';
  }, []);

  useEffect(() => {
    if (!helpOrder || typeof document === 'undefined') return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [helpOrder]);

  useEffect(() => {
    const sessionRaw = localStorage.getItem('customerSession');
    if (!sessionRaw) {
      navigate('/cliente?next=/cliente/pedidos&hub=1', { replace: true });
      return;
    }

    void loadOrders();
  }, [loadOrders, navigate]);

  const activeOrders = useMemo(
    () => orders.filter((order) => !TERMINAL_STATUSES.includes(normalizeStatus(order.status))),
    [orders]
  );
  const pastOrders = useMemo(
    () => orders.filter((order) => TERMINAL_STATUSES.includes(normalizeStatus(order.status))),
    [orders]
  );
  const groupedPastOrders = useMemo(() => groupOrdersByDate(pastOrders), [pastOrders]);
  const activeOrderIds = useMemo(() => activeOrders.map((order) => String(order.id)).join('|'), [activeOrders]);
  const filteredOrders = useMemo(() => {
    if (statusFilter === 'active') return activeOrders;
    if (statusFilter === 'finished') {
      return orders.filter((order) => [ 'DELIVERED', 'FINISHED', 'DONE' ].includes(normalizeStatus(order.status)));
    }
    if (statusFilter === 'cancelled') {
      return orders.filter((order) => [ 'CANCELLED', 'REJECTED' ].includes(normalizeStatus(order.status)));
    }
    return orders;
  }, [activeOrders, orders, statusFilter]);
  const filteredPastOrders = useMemo(
    () => filteredOrders.filter((order) => TERMINAL_STATUSES.includes(normalizeStatus(order.status))),
    [filteredOrders]
  );
  const filteredActiveOrders = useMemo(
    () => filteredOrders.filter((order) => !TERMINAL_STATUSES.includes(normalizeStatus(order.status))),
    [filteredOrders]
  );
  const groupedFilteredPastOrders = useMemo(() => groupOrdersByDate(filteredPastOrders), [filteredPastOrders]);
  const deliveredOrdersCount = useMemo(
    () => orders.filter((order) => [ 'DELIVERED', 'FINISHED', 'DONE' ].includes(normalizeStatus(order.status))).length,
    [orders]
  );
  const cancelledOrdersCount = useMemo(
    () => orders.filter((order) => [ 'CANCELLED', 'REJECTED' ].includes(normalizeStatus(order.status))).length,
    [orders]
  );
  const customerDisplayName = useMemo(() => {
    try {
      const sessionRaw = localStorage.getItem('customerSession');
      const session = sessionRaw ? JSON.parse(sessionRaw) : null;
      return String(session?.user?.fullName || session?.user?.name || '').trim();
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    if (!activeOrders.length) return;

    const refreshIfVisible = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void loadOrders({ silent: true });
    };

    const timer = window.setInterval(refreshIfVisible, ACTIVE_REFRESH_MS);
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('jnc:app-foreground', refreshIfVisible as EventListener);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('jnc:app-foreground', refreshIfVisible as EventListener);
    };
  }, [activeOrderIds, activeOrders.length, loadOrders]);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) void loadMore(); },
      { rootMargin: '160px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  // Detect payment confirmation: show toast when any awaiting_payment order transitions to a paid status
  useEffect(() => {
    const currentAwaiting = new Set(
      orders.filter((o) => String(o.status || '').toLowerCase() === 'awaiting_payment').map((o) => o.id)
    );
    const prev = prevAwaitingIdsRef.current;
    if (prev.size > 0) {
      const confirmed = [...prev].filter((id) => {
        if (currentAwaiting.has(id)) return false;
        const order = orders.find((o) => o.id === id);
        const s = String(order?.status || '').toLowerCase();
        return !['cancelled', 'rejected'].includes(s);
      });
      if (confirmed.length > 0) {
        showToast('Pagamento confirmado! Seu pedido foi aceito.', 'success', { durationMs: 6000 });
      }
    }
    prevAwaitingIdsRef.current = currentAwaiting;
  }, [orders]);

  // On native APK: refresh when app returns to foreground or MP browser closes
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const hasAwaitingPayment = orders.some((o) => String(o.status || '').toLowerCase() === 'awaiting_payment');
    if (!hasAwaitingPayment) return;
    let appHandle: any;
    let browserHandle: any;
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void loadOrders({ silent: true });
    }).then((h) => { appHandle = h; });
    Browser.addListener('browserFinished', () => {
      void loadOrders({ silent: true });
    }).then((h) => { browserHandle = h; });
    return () => { appHandle?.remove(); browserHandle?.remove(); };
  }, [orders, loadOrders]);

  const openStore = (slug?: string) => {
    if (!slug) {
      navigate('/hub');
      return;
    }
    navigate(`/${slug}`);
  };

  const submitCustomerCancellation = async () => {
    if (!cancelModal.order || cancelModal.submitting) return;
    const reason = String(cancelModal.reason || '').trim();
    if (reason.length < 3) {
      showToast('Informe um motivo para a loja entender o cancelamento.', 'warning');
      return;
    }

    try {
      setCancelModal((prev) => ({ ...prev, submitting: true }));
      await customerAccountService.cancelOrder(cancelModal.order.id, { reason });
      showToast('Pedido cancelado com sucesso.', 'success');
      setCancelModal({ order: null, reason: '', submitting: false });
      await loadOrders({ silent: true });
    } catch (error: any) {
      setCancelModal((prev) => ({ ...prev, submitting: false }));
      showToast(error?.message || 'Não foi possível cancelar o pedido agora.', 'error');
    }
  };

  const handleConfirmReceiptFromList = useCallback(async (order: any) => {
    const orderId = String(order?.id || '').trim();
    if (!orderId || confirmingReceiptOrderId) return;

    try {
      setConfirmingReceiptOrderId(orderId);
      await customerAccountService.confirmOrderReceived(orderId);
      showToast('Recebimento confirmado com sucesso.', 'success');
      await loadOrders({ silent: true });
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível confirmar o recebimento agora.', 'error');
    } finally {
      setConfirmingReceiptOrderId(null);
    }
  }, [confirmingReceiptOrderId, loadOrders, showToast]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EEF2F7]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  const orderFilters: Array<{
    key: 'all' | 'active' | 'finished' | 'cancelled';
    label: string;
    count: number;
    icon: JSX.Element;
    selectedClass: string;
    idleClass: string;
  }> = [
    {
      key: 'all',
      label: 'Todos',
      count: orders.length,
      icon: <Receipt size={13} weight="duotone" />,
      selectedClass: 'bg-[#153A4C] text-white shadow-[0_4px_12px_-4px_rgba(21,58,76,0.45)]',
      idleClass: 'bg-slate-100 text-slate-600',
    },
    {
      key: 'active',
      label: 'Em andamento',
      count: activeOrders.length,
      icon: <Timer size={13} weight="duotone" />,
      selectedClass: 'bg-emerald-500 text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.45)]',
      idleClass: 'bg-emerald-50 text-emerald-700',
    },
    {
      key: 'finished',
      label: 'Finalizados',
      count: deliveredOrdersCount,
      icon: <CheckCircle size={13} weight="duotone" />,
      selectedClass: 'bg-sky-500 text-white shadow-[0_4px_12px_-4px_rgba(14,165,233,0.45)]',
      idleClass: 'bg-sky-50 text-sky-700',
    },
    {
      key: 'cancelled',
      label: 'Cancelado',
      count: cancelledOrdersCount,
      icon: <XCircle size={13} weight="duotone" />,
      selectedClass: 'bg-rose-500 text-white shadow-[0_4px_12px_-4px_rgba(244,63,94,0.45)]',
      idleClass: 'bg-rose-50 text-rose-600',
    },
  ];

  return (
    <main className="min-h-screen bg-[#EEF2F7] pb-[calc(env(safe-area-inset-bottom)+5.75rem)] pt-[env(safe-area-inset-top)]">
      <div className="pointer-events-none fixed top-[-10%] right-[-8%] h-[38%] w-[46%] rounded-full bg-[#153A4C]/13 blur-[120px] -z-10" />
      <div className="pointer-events-none fixed bottom-[8%] left-[-5%] h-[26%] w-[34%] rounded-full bg-[#336886]/7 blur-[100px] -z-10" />
      <div className="mx-auto max-w-2xl">
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3.5">
            <button
              onClick={() => navigateBackOrFallback(navigate, '/hub?profile=1')}
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-all active:scale-95"
            >
              <ArrowLeft size={18} weight="bold" />
            </button>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1.5">
                <img src="/janocaminho.jpg" alt="Já no Caminho" className="h-5 w-5 rounded-[0.45rem] object-cover shadow-sm" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Histórico</p>
              </div>
              <h1 className="text-[15px] font-black text-slate-900">Meus pedidos</h1>
              {activeOrders.length > 0 && (
                <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  {activeOrders.length} em andamento
                </span>
              )}
            </div>
            <div className="w-9" />
          </div>

          <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
            {orderFilters.map((filter) => {
              const isSelected = statusFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all duration-200 active:scale-[0.97] ${isSelected ? filter.selectedClass : filter.idleClass}`}
                >
                  {filter.icon}
                  {filter.label}
                  {filter.count > 0 && (
                    <span className={`inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-black ${isSelected ? 'bg-white/25 text-white' : 'bg-white/60 text-current'}`}>
                      {filter.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </header>

        <div className="px-4 py-4">
          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          {filteredActiveOrders.length > 0 ? (
            <section className="mb-7">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">Em andamento</h2>
                    <p className="text-[11px] text-slate-400">Priorize estes pedidos primeiro.</p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-emerald-600 ring-1 ring-emerald-100 shadow-[0_10px_20px_-18px_rgba(16,185,129,0.5)]">
                  {filteredActiveOrders.length} ativo{filteredActiveOrders.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-3">
                {filteredActiveOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isActive
                    details={orderDetails[order.id]}
                    onCancelRequest={(selectedOrder) => setCancelModal({ order: selectedOrder, reason: '', submitting: false })}
                    onConfirmReceipt={handleConfirmReceiptFromList}
                    confirmReceiptLoading={confirmingReceiptOrderId === String(order.id)}
                    onOpenHelp={setHelpOrder}
                    onOpenOrder={(orderId) => navigate(`/pedido/${orderId}`)}
                    onOpenStore={openStore}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2">
                <Package size={15} weight="duotone" className="text-slate-500" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Histórico</h2>
                  <p className="text-[11px] text-slate-400">Pedidos organizados do mais recente para trás.</p>
                </div>
              </div>
              {filteredPastOrders.length > 0 ? (
                <span className="inline-flex shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.28)]">
                  {filteredPastOrders.length} no histórico
                </span>
              ) : null}
            </div>

            {filteredPastOrders.length === 0 && filteredActiveOrders.length === 0 ? (
              <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <Storefront size={28} weight="duotone" />
                </div>
                <p className="text-base font-semibold text-slate-900">Você ainda não fez pedidos</p>
                <p className="mt-1 text-sm text-slate-500">Quando pedir pelo app, eles vão aparecer aqui.</p>
                <button
                  onClick={() => navigate('/hub')}
                  className="mt-6 rounded-2xl bg-[linear-gradient(135deg,#153A4C,#336886)] px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_36px_-24px_rgba(21,58,76,0.55)] transition-colors hover:brightness-105"
                >
                  Explorar lojas
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedFilteredPastOrders.map((group) => (
                  <section key={group.key}>
                    <div className="mb-3 flex items-center justify-between gap-3 px-1">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{group.label}</p>
                        <p className="text-[11px] text-slate-400">{group.caption}</p>
                      </div>
                      {group.orders.length > 1 ? (
                        <div className="text-right">
                          <p className="text-[11px] font-semibold text-slate-500">{group.orders.length} pedidos</p>
                          <p className="text-[11px] font-black text-slate-700">{formatCurrency(group.totalAmount)}</p>
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-3">
                      {group.orders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          isActive={false}
                          details={orderDetails[order.id]}
                          onCancelRequest={() => {}}
                          onConfirmReceipt={handleConfirmReceiptFromList}
                          confirmReceiptLoading={confirmingReceiptOrderId === String(order.id)}
                          onOpenHelp={setHelpOrder}
                          onOpenOrder={(orderId) => navigate(`/pedido/${orderId}`)}
                          onOpenStore={openStore}
                        />
                      ))}
                    </div>
                  </section>
                ))}
                <div ref={sentinelRef} className="h-1" />
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {helpOrder ? (
        <OrderHelpScreen
          order={helpOrder}
          customerName={customerDisplayName}
          onClose={() => setHelpOrder(null)}
          onOpenStore={openStore}
        />
      ) : null}

      {cancelModal.order ? (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/45 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:items-center">
          <div className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-400">Cancelamento</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Conte o motivo para a loja</h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelModal({ order: null, reason: '', submitting: false })}
                className="rounded-2xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <XCircle size={20} weight="duotone" />
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Esse pedido já passou do prazo previsto. Se quiser, você pode enviar um motivo e cancelar pelo app.
            </p>

            <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              A loja recebe esse motivo para entender o cancelamento.
            </div>

            <textarea
              value={cancelModal.reason}
              onChange={(event) => setCancelModal((prev) => ({ ...prev, reason: event.target.value }))}
              rows={4}
              placeholder="Ex.: o prazo passou bastante e eu não consigo mais receber agora."
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelModal({ order: null, reason: '', submitting: false })}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100"
              >
                Agora nao
              </button>
              <button
                type="button"
                onClick={submitCustomerCancellation}
                disabled={cancelModal.submitting}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {cancelModal.submitting ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <nav className={`fixed bottom-0 left-0 right-0 z-[100] px-0 pb-0 transition-transform duration-300 lg:hidden ${
        cancelModal.order || helpOrder ? 'translate-y-[120%] pointer-events-none' : 'translate-y-0'
      }`}>
        <div className="mx-auto max-w-none rounded-none border border-b-0 border-[#336886]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,250,252,0.94)_100%)] px-2 pt-2 shadow-[0_-18px_38px_-28px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/60 backdrop-blur-2xl">
          <div className="grid min-h-[4.75rem] grid-cols-4 items-center gap-1.5 pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
          <button
            type="button"
            onClick={() => navigate('/hub')}
            className="group flex flex-col items-center justify-center gap-1 rounded-[1.3rem] py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.03]"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-hover:bg-slate-200">
              <House size={18} weight="duotone" />
            </span>
            <span>Início</span>
          </button>
          <button
            type="button"
            className="group flex flex-col items-center justify-center gap-1 rounded-[1.3rem] bg-[linear-gradient(180deg,rgba(51,104,134,0.12)_0%,rgba(51,104,134,0.06)_100%)] py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#2d5f7b] shadow-[0_14px_28px_-22px_rgba(51,104,134,0.42)] ring-1 ring-[#336886]/12 transition-[transform,color,background-color,box-shadow] duration-200 ease-out active:scale-[1.03]"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#336886] text-white shadow-[0_14px_28px_-18px_rgba(51,104,134,0.65)]">
              <Receipt size={18} weight="fill" />
            </span>
            <span>Pedidos</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/hub?panel=condominios')}
            className="group flex flex-col items-center justify-center gap-1 rounded-[1.3rem] py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.03]"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-hover:bg-slate-200">
              <Buildings size={18} weight="duotone" />
            </span>
            <span>Condo</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/hub?profile=1')}
            className="group flex flex-col items-center justify-center gap-1 rounded-[1.3rem] py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 transition-[transform,color,background-color,box-shadow] duration-200 ease-out hover:text-slate-700 active:scale-[1.03]"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 group-hover:bg-slate-200">
              <UserCircle size={18} weight="duotone" />
            </span>
            <span>Perfil</span>
          </button>
          </div>
        </div>
      </nav>
    </main>
  );
}
