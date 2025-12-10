export const formatCurrency = (value) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatDateTime = (timestamp) => {
  if (!timestamp) return '';
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toLocaleString('pt-BR');
  }
  return new Date(timestamp).toLocaleString('pt-BR');
};

export const formatDuration = (milliseconds) => {
  if (!milliseconds || Number.isNaN(milliseconds)) return '0s';
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};


export const formatOrderType = (type) => {
  const map = {
    delivery: 'Entrega',
    pickup: 'Retirada',
    table: 'Mesa',
  };

  return map[type] || 'Não informado';
};

export const formatOrderStatus = (status) => {
  const map = {
    pending: 'Pendente',
    preparing: 'Preparando',
    done: 'Finalizado',
  };

  return map[status] || 'Indefinido';
};

