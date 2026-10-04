import { describe, expect, it } from 'vitest';
import { normalizeSearchText } from './text';

describe('normalizeSearchText — fonte única de normalização de busca', () => {
  it('remove acentos mantendo a base (ç→c, ã→a, é→e)', () => {
    expect(normalizeSearchText('Couve-Flor Assada')).toBe('couve-flor assada');
    expect(normalizeSearchText('Espetinho de Coração')).toBe('espetinho de coracao');
    expect(normalizeSearchText('Pão de Queijo')).toBe('pao de queijo');
  });

  it('ignora caixa (maiúsculas/minúsculas)', () => {
    expect(normalizeSearchText('PIZZA')).toBe('pizza');
    expect(normalizeSearchText('PiZzA')).toBe('pizza');
  });

  it('apara espaços das pontas', () => {
    expect(normalizeSearchText('  água de coco  ')).toBe('agua de coco');
  });

  it('trata null/undefined/number sem lançar (retorna string)', () => {
    expect(normalizeSearchText(null)).toBe('');
    expect(normalizeSearchText(undefined)).toBe('');
    expect(normalizeSearchText(42)).toBe('42');
    expect(normalizeSearchText(0)).toBe('0');
  });

  it('busca com acento acha item sem acento e vice-versa (uso real do hub)', () => {
    const catalog = ['Espetinho de Frango', 'Refrigerante Guaraná', 'Pão de Alho'];
    const hit1 = catalog.filter((n) => normalizeSearchText(n).includes(normalizeSearchText('PAO DE')));
    const hit2 = catalog.filter((n) => normalizeSearchText(n).includes(normalizeSearchText('guarana')));
    expect(hit1).toEqual(['Pão de Alho']);
    expect(hit2).toEqual(['Refrigerante Guaraná']);
  });
});
