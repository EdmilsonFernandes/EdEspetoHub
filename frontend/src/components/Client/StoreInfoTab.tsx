import React from 'react';
import {
  MapPinLine,
  Clock,
  InstagramLogo,
  WhatsappLogo,
  Scooter,
  Storefront,
  Info,
} from '@phosphor-icons/react';
import { formatAddress, formatOrderType } from '../../utils/format';

type StoreInfoTabProps = {
  storeDescription?: string | null;
  storeAddress?: unknown;
  todayHoursLabel?: string;
  todayClosingLabel?: string;
  isOpenNow?: boolean;
  deliveryFeeLabel?: string;
  orderTypes?: string[];
  whatsappNumber?: string;
  whatsappMessage?: string;
  instagramHandle?: string;
};

const normalizePhoneDigits = (value?: string | null) => String(value || '').replace(/\D/g, '');

const normalizeHandle = (value?: string | null) =>
  String(value || '').trim().replace(/^@+/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.25)] sm:p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-white">{icon}</span>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      <div className="text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

export function StoreInfoTab({
  storeDescription,
  storeAddress,
  todayHoursLabel,
  todayClosingLabel,
  isOpenNow,
  deliveryFeeLabel,
  orderTypes,
  whatsappNumber,
  whatsappMessage,
  instagramHandle,
}: StoreInfoTabProps) {
  const addressLabel = formatAddress(storeAddress);
  const phoneDigits = normalizePhoneDigits(whatsappNumber);
  const igHandle = normalizeHandle(instagramHandle);
  const deliveryModes = Array.isArray(orderTypes) ? orderTypes.filter(Boolean) : [];

  const hasAnyInfo = Boolean(
    storeDescription ||
      addressLabel ||
      todayHoursLabel ||
      deliveryModes.length ||
      phoneDigits ||
      igHandle
  );

  if (!hasAnyInfo) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Info size={32} weight="duotone" className="text-slate-300" />
        <p className="text-sm font-medium text-slate-500">Esta loja ainda não publicou informações detalhadas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {storeDescription && (
        <InfoCard icon={<Info size={16} weight="bold" />} title="Sobre">
          <p className="whitespace-pre-line break-words">{storeDescription}</p>
        </InfoCard>
      )}

      {(todayHoursLabel || isOpenNow === true || isOpenNow === false) && (
        <InfoCard icon={<Clock size={16} weight="bold" />} title="Funcionamento">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                isOpenNow
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-600'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isOpenNow ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {isOpenNow ? 'Aberto agora' : 'Fechado agora'}
            </span>
            {todayHoursLabel && <span className="text-xs font-medium text-slate-500">{todayHoursLabel}</span>}
          </div>
          {todayClosingLabel && (
            <p className="mt-2 text-xs text-slate-500">Fecha às {todayClosingLabel}</p>
          )}
        </InfoCard>
      )}

      {deliveryModes.length > 0 && (
        <InfoCard icon={<Scooter size={16} weight="bold" />} title="Formas de pedido">
          <div className="flex flex-wrap gap-2">
            {deliveryModes.map((type) => (
              <span
                key={type}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {formatOrderType(type)}
              </span>
            ))}
          </div>
          {deliveryFeeLabel && (
            <p className="mt-2 text-xs font-medium text-slate-500">{deliveryFeeLabel}</p>
          )}
        </InfoCard>
      )}

      {addressLabel && (
        <InfoCard icon={<MapPinLine size={16} weight="bold" />} title="Endereço">
          <p className="break-words">{addressLabel}</p>
        </InfoCard>
      )}

      {(phoneDigits || igHandle) && (
        <InfoCard icon={<Storefront size={16} weight="bold" />} title="Contato">
          <div className="flex flex-wrap gap-2">
            {phoneDigits && (
              <a
                href={`https://wa.me/${phoneDigits}${whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-600"
              >
                <WhatsappLogo size={15} weight="fill" />
                WhatsApp
              </a>
            )}
            {igHandle && (
              <a
                href={`https://instagram.com/${igHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-amber-500 px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
              >
                <InstagramLogo size={15} weight="fill" />
                Instagram
              </a>
            )}
          </div>
        </InfoCard>
      )}
    </div>
  );
}

export default StoreInfoTab;
