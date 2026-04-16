import { expect, describe, it } from 'vitest';
import { buildPixPayload } from '../../utils/pixPayload';

describe('Suíte de Pagamentos: pixPayload Utilities', () => {

  it('deve formatar corretamente chaves PIX de telefones adicionando o prefixo +55', () => {
    const payloadTelefone = buildPixPayload({
      key: '11999999999',
      name: 'Loja Teste',
      city: 'Sao Paulo',
      amount: 15.50
    });
    
    // O payload PIX deve conter o Br Code referenciando o +55. A Tag 01 abriga a chave.
    // O tamanho de "+5511999999999" é 14. Assim, o campo formatado deve conter "0114+5511999999999"
    expect(payloadTelefone).toContain('0114+5511999999999');
  });

  it('deve formatar corretamente chaves PIX como CPF (mantendo apenas 11 digitos, sem +55)', () => {
    const cpfValido = '52998224725'; // Exemplo fictício que bate o modulo matemático de CPF
    const payloadCpf = buildPixPayload({
      key: cpfValido,
      name: 'Loja Teste',
      city: 'Sao Paulo',
      amount: 15.50
    });
    
    // O tamanho do CPF é 11 dígitos. Assim na Tag 01 deve conter "0111<CPF>"
    expect(payloadCpf).toContain('0111' + cpfValido);
  });

  it('o TXID não deve conter espaços e deve ser fallback para *** se houver apenas caracteres especiais', () => {
    const payloadInvalido = buildPixPayload({
      key: '12345678909',
      txid: ' PEDIDO - %$$! 123 ',
    });
    
    // Na Tag 62(05) do Pix BACEN, ele tem que higienizar isso para PEDIDO123 (limpa non-alphanumerics extra)
    expect(payloadInvalido).toContain('0509PEDIDO123');

    const payloadFallback = buildPixPayload({
      key: '12345678909',
      txid: ' -= * ', // Só lixo = deve dar "***"
    });
    expect(payloadFallback).toContain('0503***');
  });
});
