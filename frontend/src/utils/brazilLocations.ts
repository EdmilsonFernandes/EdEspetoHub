export type BrazilStateOption = {
  value: string;
  label: string;
};

export const BRAZIL_STATES: BrazilStateOption[] = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

export const normalizeLocationName = (value?: string | null) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const cityCacheKey = (uf: string) => `ibge:cities:${String(uf || '').toUpperCase()}`;

export const loadBrazilCitiesByState = async (ufValue: string): Promise<string[]> => {
  const uf = String(ufValue || '').toUpperCase().slice(0, 2);
  if (!uf || uf.length !== 2) return [];

  const cacheKey = cityCacheKey(uf);
  try {
    const cached = typeof localStorage !== 'undefined' ? localStorage.getItem(cacheKey) : '';
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    // Cache quebrado não deve impedir o cadastro.
  }

  const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`);
  if (!response.ok) throw new Error('Falha ao carregar cidades.');
  const data = await response.json();
  const cities = Array.isArray(data)
    ? data
        .map((entry: any) => String(entry?.nome || '').trim())
        .filter(Boolean)
        .sort((left: string, right: string) => left.localeCompare(right, 'pt-BR'))
    : [];

  try {
    if (typeof localStorage !== 'undefined' && cities.length) {
      localStorage.setItem(cacheKey, JSON.stringify(cities));
    }
  } catch {
    // Cache é opcional.
  }

  return cities;
};
