export const formatCurrency = (value) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatDateTime = (timestamp) => {
  if (!timestamp) return '';
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toLocaleString('pt-BR');
  }
  return new Date(timestamp).toLocaleString('pt-BR');
};
