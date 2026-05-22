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

const TOURISTIC_DISTRICT_FALLBACKS_BY_STATE: Record<string, string[]> = {
  SP: ['São Francisco Xavier'],
};

const cityCacheKey = (uf: string) => `ibge:cities-districts:v2:${String(uf || '').toUpperCase()}`;

const uniqueSortedLocationNames = (values: string[]) => {
  const byNormalizedName = new Map<string, string>();
  values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .forEach((value) => {
      const key = normalizeLocationName(value);
      if (key && !byNormalizedName.has(key)) byNormalizedName.set(key, value);
    });

  return Array.from(byNormalizedName.values()).sort((left, right) => left.localeCompare(right, 'pt-BR'));
};

const fetchIbgeLocationNames = async (url: string): Promise<string[]> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Falha ao carregar localidades.');
  const data = await response.json();
  return Array.isArray(data)
    ? data.map((entry: any) => String(entry?.nome || '').trim()).filter(Boolean)
    : [];
};

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

  const fallbackDistricts = TOURISTIC_DISTRICT_FALLBACKS_BY_STATE[uf] || [];
  const cityUrl = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`;
  const districtUrl = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/distritos?orderBy=nome`;

  const [citiesResult, districtsResult] = await Promise.allSettled([
    fetchIbgeLocationNames(cityUrl),
    fetchIbgeLocationNames(districtUrl),
  ]);

  const cities = citiesResult.status === 'fulfilled' ? citiesResult.value : [];
  const districts = districtsResult.status === 'fulfilled' ? districtsResult.value : [];
  const mergedLocations = uniqueSortedLocationNames([...cities, ...districts, ...fallbackDistricts]);

  if (!mergedLocations.length) throw new Error('Falha ao carregar cidades.');

  try {
    if (typeof localStorage !== 'undefined' && mergedLocations.length) {
      localStorage.setItem(cacheKey, JSON.stringify(mergedLocations));
    }
  } catch {
    // Cache é opcional.
  }

  return mergedLocations;
};
