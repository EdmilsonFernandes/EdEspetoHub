import React from 'react';
import { CheckCircle, QrCode, ArrowLeft } from 'lucide-react';
import { formatPaymentMethod } from '../../utils/format';

const PIX_KEY_MOCK =
  '00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000520400005303986540510.005802BR5913EspetinhoDatony6008SaoPaulo62070503***6304';

const PaymentSummary = ({ paymentMethod }) => {
  if (paymentMethod === 'pix') {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 w-full mb-8">
        <div className="flex flex-col items-center gap-3 mb-4">
          <div className="p-3 bg-gray-50 rounded-full">
            <QrCode size={24} className="text-gray-700" />
          </div>
          <span className="font-bold text-gray-700">Chave Pix (Copia e Cola)</span>
        </div>
        <div className="bg-gray-50 p-4 rounded-xl font-mono text-xs text-gray-500 break-all select-all border border-gray-200">
          {PIX_KEY_MOCK}
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(PIX_KEY_MOCK)}
          className="w-full mt-4 py-3 bg-gray-800 text-white rounded-xl font-bold text-sm hover:bg-gray-900 transition-colors"
        >
          Copiar Código Pix
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full mb-8 text-left">
      <h3 className="font-bold text-gray-800 mb-2">Pagamento na entrega/retirada</h3>
      <p className="text-sm text-gray-600">
        Forma registrada: <span className="font-bold uppercase">{formatPaymentMethod(paymentMethod)}</span>. Quando seu pedido
        estiver pronto, finalize o pagamento no local.
      </p>
    </div>
  );
};

export const SuccessView = ({ orderType, paymentMethod, onNewOrder }) => (
  <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6 animate-in zoom-in">
    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 shadow-sm">
      <CheckCircle size={48} />
    </div>
    <h2 className="text-3xl font-black text-gray-800 mb-2">Pedido Realizado!</h2>
    <p className="text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">
      {orderType === 'delivery'
        ? 'Recebemos seu pedido de entrega. Avisaremos quando sair para entrega.'
        : 'Seu pedido foi recebido e seguirá para a produção.'}
    </p>

    <PaymentSummary paymentMethod={paymentMethod} />

    <button
      onClick={onNewOrder}
      className="flex items-center gap-2 text-red-600 font-bold hover:bg-red-50 px-6 py-3 rounded-xl transition-colors"
    >
      <ArrowLeft size={18} /> Voltar para o cardápio
    </button>
  </div>
);
