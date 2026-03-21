export interface BulkImportProductDraft {
  name: string;
  price: number;
  category: string;
  description?: string;
}

export interface BulkImportParseResult {
  items: BulkImportProductDraft[];
  warnings: string[];
}

const normalizeText = (value: string) => String(value || '').replace(/\u00A0/g, ' ').trim();

const normalizeCategory = (value: string) =>
  normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const parseMoney = (input: string): number | null => {
  if (!input) return null;
  const base = String(input).replace(/r\$\s*/gi, '').trim();
  const raw = base.includes(',')
    ? base.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')
    : base.replace(/,/g, '').replace(/[^\d.]/g, '');
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Number(value.toFixed(2));
};

const ensureCategory = (category: string) => normalizeCategory(category || 'outros') || 'outros';

const parsePipeLine = (line: string, category: string): BulkImportProductDraft[] => {
  const parts = line.split('|').map((part) => normalizeText(part));
  if (parts.length < 2) return [];
  const name = normalizeText(parts[0]);
  const price = parseMoney(parts[1]);
  if (!name || !price) return [];
  const descriptionPart = parts.find((part) => /^desc\s*:/i.test(part));
  const description = descriptionPart ? normalizeText(descriptionPart.replace(/^desc\s*:/i, '')) : '';
  return [
    {
      name,
      price,
      category: ensureCategory(category),
      description: description || undefined,
    },
  ];
};

const parseHalfWholeLine = (line: string, category: string): BulkImportProductDraft[] => {
  const match = line.match(/^(.*?)\((.*?)\)\s*(?:->.*)?$/i);
  if (!match) return [];
  const baseName = normalizeText(match[1]);
  const inside = normalizeText(match[2]);
  if (!baseName || !inside) return [];

  const meiaMatch = inside.match(/meia\s*:\s*r?\$?\s*([\d.,]+)/i);
  const inteiraMatch = inside.match(/inteira\s*:\s*r?\$?\s*([\d.,]+)/i);

  if (!meiaMatch && !inteiraMatch) {
    const single = parseMoney(inside);
    if (!single) return [];
    return [
      {
        name: baseName,
        price: single,
        category: ensureCategory(category),
      },
    ];
  }

  const parsed: BulkImportProductDraft[] = [];
  const meiaPrice = parseMoney(meiaMatch?.[1] || '');
  const inteiraPrice = parseMoney(inteiraMatch?.[1] || '');
  if (meiaPrice) {
    parsed.push({
      name: `${baseName} (Meia)`,
      price: meiaPrice,
      category: ensureCategory(category),
    });
  }
  if (inteiraPrice) {
    parsed.push({
      name: `${baseName} (Inteira)`,
      price: inteiraPrice,
      category: ensureCategory(category),
    });
  }
  return parsed;
};

const parseCompactListLine = (line: string, category: string): BulkImportProductDraft[] => {
  if (!line.includes(',')) return [];
  return line
    .split(',')
    .map((chunk) => normalizeText(chunk))
    .flatMap((chunk) => parseHalfWholeLine(chunk, category));
};

const parseJsonLine = (line: string, currentCategory: string): BulkImportProductDraft[] => {
  const trimmed = normalizeText(line);
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return [];
  try {
    const parsed = JSON.parse(trimmed);
    const name = normalizeText(parsed?.name || '');
    const price = Number(parsed?.price);
    if (!name || !Number.isFinite(price) || price <= 0) return [];
    const category = ensureCategory(parsed?.category || currentCategory);
    const description = normalizeText(parsed?.description || parsed?.desc || '');
    return [
      {
        name,
        price: Number(price.toFixed(2)),
        category,
        description: description || undefined,
      },
    ];
  } catch {
    return [];
  }
};

const parseCsvLine = (line: string, currentCategory: string): BulkImportProductDraft[] => {
  if (!line.includes(';')) return [];
  const cols = line.split(';').map((part) => normalizeText(part));
  if (cols.length < 2) return [];

  const first = (cols[0] || '').toLowerCase();
  const second = (cols[1] || '').toLowerCase();
  if (
    (first.includes('nome') || first.includes('produto')) &&
    (second.includes('preco') || second.includes('valor'))
  ) {
    return [];
  }

  const name = cols[0];
  const price = parseMoney(cols[1]);
  if (!name || !price) return [];
  const category = ensureCategory(cols[2] || currentCategory);
  const description = normalizeText(cols[3] || '');
  return [
    {
      name,
      price,
      category,
      description: description || undefined,
    },
  ];
};

export const parseBulkProductsInput = (rawText: string): BulkImportParseResult => {
  const lines = String(rawText || '')
    .split('\n')
    .map((line) => normalizeText(line))
    .filter(Boolean);

  const warnings: string[] = [];
  const items: BulkImportProductDraft[] = [];
  let currentCategory = 'outros';

  lines.forEach((line, index) => {
    if (/^comando\b/i.test(line) || /^execute\b/i.test(line)) return;

    const categoryMatch = line.match(/^categoria\s*:\s*(.+)$/i);
    if (categoryMatch) {
      currentCategory = ensureCategory(categoryMatch[1]);
      return;
    }

    if (/^[-•]/.test(line)) {
      const sanitized = normalizeText(line.replace(/^[-•]\s*/, ''));
      if (!sanitized) return;
      line = sanitized;
    }

    let parsed = parseJsonLine(line, currentCategory);
    if (!parsed.length) parsed = parseCsvLine(line, currentCategory);
    if (!parsed.length) parsed = parsePipeLine(line, currentCategory);
    if (!parsed.length) parsed = parseHalfWholeLine(line, currentCategory);
    if (!parsed.length) parsed = parseCompactListLine(line, currentCategory);

    if (!parsed.length) {
      warnings.push(`Linha ${index + 1} não reconhecida: "${line}"`);
      return;
    }

    parsed.forEach((item) => {
      if (!item.name || !item.price) return;
      items.push(item);
    });
  });

  return { items, warnings };
};

export const buildBulkImportTemplate = () => `CATEGORIA: REFEICOES
File de Tilapia (Meia) | R$ 63,00 | Desc: Arroz, feijao, batata frita, farofa e file de tilapia.
File de Tilapia (Inteira) | R$ 105,00 | Desc: Arroz, feijao, batata frita, farofa e file de tilapia.

CATEGORIA: PORCOES
File de Tilapia 600g (Meia: R$ 41,00 | Inteira: R$ 68,00)
Batata Frita (Meia: R$ 23,00 | Inteira: R$ 39,00)

CATEGORIA: BEBIDAS
Coca Cola 1L (R$ 14,00), Refrigerante Lata (R$ 8,00), Agua com Gas (R$ 5,00)`;
