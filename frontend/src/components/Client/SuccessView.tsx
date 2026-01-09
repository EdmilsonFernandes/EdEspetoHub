// @ts-nocheck
import React from "react";
import { CheckCircle, QrCode, ArrowLeft } from "lucide-react";
import { formatPaymentMethod } from "../../utils/format";

// Chave Pix fixa (mock)
const PIX_KEY_MOCK =
  "00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000520400005303986540510.005802BR5913EspetinhoDatony6008SaoPaulo62070503***6304";

// Componente responsável por exibir o pagamento (Pix ou retirada)
const PaymentSummary = ({ paymentMethod, pixKey, phone }) => {
  if (paymentMethod === "pix") {
    const qrData = pixKey || phone || PIX_KEY_MOCK;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
      qrData
    )}`;


    return (
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 w-full mb-8">
        <div className="flex flex-col items-center gap-3 mb-4 text-center">
          <div className="p-3 bg-gray-50 rounded-full">
            <QrCode size={24} className="text-gray-700" />
          </div>
          <span className="font-bold text-gray-700">Pix para pagamento</span>
          <p className="text-xs text-gray-500">
            Use o QR Code ou copie a chave abaixo.
          </p>
        </div>

        <div className="flex justify-center mb-4">
          <img
            src={qrUrl}
            alt="QR Code Pix"
            className="w-48 h-48 rounded-lg border"
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-xl font-mono text-xs text-gray-700 break-all select-all border border-gray-200">
          {qrData}
        </div>

        <button
          onClick={() => navigator.clipboard.writeText(qrData)}
          className="w-full mt-4 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-colors"
        >
          Copiar chave Pix
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full mb-8 text-left">
      <h3 className="font-bold text-gray-800 mb-2">Pagamento na entrega/retirada</h3>
      <p className="text-sm text-gray-600">
        Forma registrada:{" "}
        <span className="font-bold uppercase">
          {formatPaymentMethod(paymentMethod)}
        </span>
        . Quando seu pedido estiver pronto, finalize o pagamento no local.
      </p>
    </div>
  );
};

// Tela final de sucesso do pedido
export const SuccessView = ({
  orderType,
  paymentMethod,
  onNewOrder,
  pixKey,
  phone,
  table,
  orderId,
  onTrackOrder,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6 animate-in zoom-in">
      <div className="w-24 h-24 bg-brand-primary-soft rounded-full flex items-center justify-center mb-6 text-brand-primary shadow-sm">
        <CheckCircle size={48} />
      </div>

      <h2 className="text-3xl font-black text-gray-800 mb-2">
        Pedido Realizado!
      </h2>

      <p className="text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">
        {orderType === "delivery"
          ? "Recebemos seu pedido de entrega. Avisaremos quando sair para entrega."
          : orderType === "table"
          ? `Seu pedido foi recebido e seguirá para a produção. Mesa ${table || "-"}.`
          : "Seu pedido foi recebido e seguirá para a produção."}
      </p>

      <PaymentSummary
        paymentMethod={paymentMethod}
        pixKey={pixKey}
        phone={phone}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        {orderId && (
          <button
            onClick={onTrackOrder}
            className="flex items-center justify-center gap-2 text-white bg-emerald-600 font-bold px-6 py-3 rounded-xl transition-colors hover:opacity-90"
          >
            <CheckCircle size={18} /> Acompanhar pedido
          </button>
        )}
        <button
          onClick={onNewOrder}
          className="flex items-center justify-center gap-2 text-white bg-brand-primary font-bold px-6 py-3 rounded-xl transition-colors hover:opacity-90"
        >
          <ArrowLeft size={18} /> Voltar para os pedidos
        </button>
      </div>
    </div>
  );
};
