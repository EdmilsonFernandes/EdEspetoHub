import type { DestinationListingCategory, HospitalityPlaceType } from './destinationHub';

export type MonteVerdeGeoSeed = {
  lat: number;
  lng: number;
  formattedAddress: string;
};

export type MonteVerdeHospitalitySeed = {
  name: string;
  slug: string;
  type: HospitalityPlaceType;
  address: string;
  addressNumber: string;
  district: string;
  zipCode: string;
  phone?: string;
  whatsapp?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  amenities?: string[];
  geo: MonteVerdeGeoSeed;
  sourceUrl: string;
  sortOrder: number;
};

export type MonteVerdeListingSeed = {
  title: string;
  category: DestinationListingCategory;
  address: string;
  addressNumber: string;
  district: string;
  zipCode: string;
  phone?: string;
  whatsapp?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  featured?: boolean;
  geo: MonteVerdeGeoSeed;
  sourceUrl: string;
  sortOrder: number;
};

const instagram = (handle: string) => `https://www.instagram.com/${handle.replace(/^@/, '')}`;

export const MONTE_VERDE_TOURISM_SOURCE =
  'Curadoria publica de Monte Verde: Turismo Minas Gerais, sites oficiais, Booking/Tripadvisor e guias locais';

export const MONTE_VERDE_DESTINATION_SEED = {
  name: 'Monte Verde',
  slug: 'monte-verde',
  city: 'Monte Verde',
  state: 'MG',
  description:
    'Destino de montanha na Serra da Mantiqueira com chalés, pousadas, fondue, cervejaria, chocolates, trilhas e experiências de inverno.',
  heroTitle: 'Monte Verde para viver a Serra da Mantiqueira',
  heroSubtitle: 'Chalés, pousadas, restaurantes, chocolates, trilhas e experiências locais em uma rota só.',
  lat: -22.8626073,
  lng: -46.0348153,
  sortOrder: 35,
};

export const MONTE_VERDE_HOSPITALITY_SEEDS: MonteVerdeHospitalitySeed[] = [
  {
    name: 'Chalés Elliotti',
    slug: 'chales-elliotti',
    type: 'CHALE',
    address: 'Rodovia Deputado Agostinho Patrus',
    addressNumber: 'km 4',
    district: 'Monte Verde',
    zipCode: '37653000',
    amenities: ['Chalés', 'Montanha', 'Hospedagem'],
    geo: {
      lat: -22.8534954,
      lng: -46.0982924,
      formattedAddress:
        'Rodovia Deputado Agostinho Patrus km 4, Monte Verde, Camanducaia - MG, 37653-000, Brasil',
    },
    sourceUrl: 'https://www.booking.com/hotel/br/chala-c-s-elliotti.pt-br.html',
    sortOrder: 10,
  },
  {
    name: 'Pousada Águia Dourada',
    slug: 'pousada-aguia-dourada',
    type: 'POUSADA',
    address: 'Avenida Sol Nascente',
    addressNumber: '1778',
    district: 'Monte Verde',
    zipCode: '37653972',
    phone: '(35) 3438-2109',
    websiteUrl: 'https://www.pousadaaguiadourada.com.br/',
    amenities: ['Pousada', 'Centro', 'Montanha'],
    geo: {
      lat: -22.8601603,
      lng: -46.0411027,
      formattedAddress: 'Avenida Sol Nascente 1778, Monte Verde, Camanducaia - MG, 37653-972, Brasil',
    },
    sourceUrl: 'https://www.pousadaaguiadourada.com.br/',
    sortOrder: 20,
  },
  {
    name: 'Pousada Suiça Mineira Centro',
    slug: 'pousada-suica-mineira-centro',
    type: 'POUSADA',
    address: 'Avenida Monte Verde',
    addressNumber: '1950',
    district: 'Monte Verde',
    zipCode: '37653972',
    phone: '(35) 3438-2100',
    websiteUrl: 'https://pousadasuicamineira.com.br/',
    amenities: ['Pousada', 'Centro', 'Café da manhã'],
    geo: {
      lat: -22.8631987,
      lng: -46.0384902,
      formattedAddress: 'Avenida Monte Verde 1950, Monte Verde, Camanducaia - MG, 37653-972, Brasil',
    },
    sourceUrl: 'https://pousadasuicamineira.com.br/',
    sortOrder: 30,
  },
  {
    name: 'Pousada Suiça Mineira Garden',
    slug: 'pousada-suica-mineira-garden',
    type: 'POUSADA',
    address: 'Avenida das Montanhas',
    addressNumber: '1610',
    district: 'Monte Verde',
    zipCode: '37653000',
    websiteUrl: 'https://pousadasuicamineira.com.br/',
    amenities: ['Pousada', 'Jardim', 'Montanha'],
    geo: {
      lat: -22.8709101,
      lng: -46.0246564,
      formattedAddress: 'Avenida das Montanhas 1610, Monte Verde, Camanducaia - MG, 37653-000, Brasil',
    },
    sourceUrl: 'https://pousadasuicamineira.com.br/',
    sortOrder: 40,
  },
  {
    name: 'Pousada do Castelo',
    slug: 'pousada-do-castelo',
    type: 'POUSADA',
    address: 'Rua Virgo',
    addressNumber: '305',
    district: 'Monte Verde',
    zipCode: '37653000',
    websiteUrl: 'https://www.pousadadocastelo.com.br/',
    amenities: ['Pousada', 'Vista', 'Montanha'],
    geo: {
      lat: -22.8654668,
      lng: -46.023757,
      formattedAddress: 'Rua Virgo 305, Monte Verde, Camanducaia - MG, 37653-000, Brasil',
    },
    sourceUrl: 'https://www.pousadadocastelo.com.br/',
    sortOrder: 50,
  },
  {
    name: 'Palma Chalés',
    slug: 'palma-chales',
    type: 'CHALE',
    address: 'Rua do Luar',
    addressNumber: '1145',
    district: 'Monte Verde',
    zipCode: '37653972',
    phone: '(35) 3438-1267',
    websiteUrl: 'https://www.palmachales.com.br/',
    amenities: ['Chalés', 'Centro', 'Hospedagem'],
    geo: {
      lat: -22.8606318,
      lng: -46.0405345,
      formattedAddress: 'Rua do Luar 1145, Monte Verde, Camanducaia - MG, 37653-972, Brasil',
    },
    sourceUrl: 'https://www.palmachales.com.br/',
    sortOrder: 60,
  },
  {
    name: 'Pousada das Montanhas',
    slug: 'pousada-das-montanhas',
    type: 'POUSADA',
    address: 'Rua Cruzeiro do Sul',
    addressNumber: '201',
    district: 'Monte Verde',
    zipCode: '37653000',
    websiteUrl: 'https://www.pousadadasmontanhas.com.br/',
    amenities: ['Pousada', 'Montanha', 'Hospedagem'],
    geo: {
      lat: -22.8736883,
      lng: -46.0270112,
      formattedAddress: 'Rua Cruzeiro do Sul 201, Monte Verde, Camanducaia - MG, 37653-000, Brasil',
    },
    sourceUrl: 'https://www.pousadadasmontanhas.com.br/',
    sortOrder: 70,
  },
  {
    name: 'Kuriuwa Hotel',
    slug: 'kuriuwa-hotel',
    type: 'HOTEL',
    address: 'Rua do Bosque',
    addressNumber: '309',
    district: 'Jardim das Montanhas (Monte Verde)',
    zipCode: '37653000',
    phone: '(35) 3438-2302',
    websiteUrl: 'https://www.kuriuwa.com.br/',
    amenities: ['Hotel', 'Vista', 'Montanha'],
    geo: {
      lat: -22.8769444,
      lng: -46.0245032,
      formattedAddress: 'Rua do Bosque 309, Jardim das Montanhas, Monte Verde, Camanducaia - MG, 37653-000, Brasil',
    },
    sourceUrl: 'https://www.kuriuwa.com.br/',
    sortOrder: 80,
  },
];

export const MONTE_VERDE_LISTING_SEEDS: MonteVerdeListingSeed[] = [
  {
    title: 'Pucci Restaurante',
    category: 'RESTAURANTE_VISITAR',
    address: 'Avenida Monte Verde',
    addressNumber: '1117',
    district: 'Monte Verde',
    zipCode: '37653972',
    phone: '(35) 3438-1516',
    websiteUrl: 'https://www.puccirestaurante.com.br/',
    featured: true,
    geo: {
      lat: -22.8626073,
      lng: -46.0348153,
      formattedAddress: 'Avenida Monte Verde 1117, Monte Verde, Camanducaia - MG, 37653-972, Brasil',
    },
    sourceUrl: 'https://www.puccirestaurante.com.br/',
    sortOrder: 10,
  },
  {
    title: 'Paulo das Trutas',
    category: 'RESTAURANTE_VISITAR',
    address: 'Avenida das Montanhas',
    addressNumber: '120',
    district: 'Monte Verde',
    zipCode: '37653000',
    phone: '(35) 3438-1329',
    websiteUrl: 'https://www.paulodastrutas.com.br/',
    featured: true,
    geo: {
      lat: -22.8709101,
      lng: -46.0246564,
      formattedAddress: 'Avenida das Montanhas 120, Monte Verde, Camanducaia - MG, 37653-000, Brasil',
    },
    sourceUrl: 'https://www.paulodastrutas.com.br/',
    sortOrder: 20,
  },
  {
    title: 'Fritz Cervejaria Artesanal',
    category: 'NOITE',
    address: 'Rua Rolinha',
    addressNumber: '40',
    district: 'Monte Verde',
    zipCode: '37653000',
    phone: '(35) 3438-2414',
    websiteUrl: 'https://www.choppdofritz.com.br/',
    featured: true,
    geo: {
      lat: -22.8635088,
      lng: -46.0364183,
      formattedAddress: 'Rua Rolinha 40, Monte Verde, Camanducaia - MG, 37653-000, Brasil',
    },
    sourceUrl: 'https://www.choppdofritz.com.br/',
    sortOrder: 30,
  },
  {
    title: 'Gressoney Chocolates',
    category: 'LOJA',
    address: 'Avenida Monte Verde',
    addressNumber: '636',
    district: 'Monte Verde',
    zipCode: '37653972',
    phone: '(35) 3438-1178',
    websiteUrl: 'https://www.gressoneychocolates.com.br/',
    geo: {
      lat: -22.8636719,
      lng: -46.0399096,
      formattedAddress: 'Avenida Monte Verde 636, Monte Verde, Camanducaia - MG, 37653-972, Brasil',
    },
    sourceUrl: 'https://www.gressoneychocolates.com.br/',
    sortOrder: 40,
  },
  {
    title: 'Casa do Fondue',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua Rolinha',
    addressNumber: '50',
    district: 'Monte Verde',
    zipCode: '37653000',
    phone: '(35) 3438-2217',
    websiteUrl: 'https://www.restaurantecasadofondue.com.br/',
    geo: {
      lat: -22.863364,
      lng: -46.036186,
      formattedAddress: 'Rua Rolinha 50, Monte Verde, Camanducaia - MG, 37653-000, Brasil',
    },
    sourceUrl: 'https://www.restaurantecasadofondue.com.br/',
    sortOrder: 50,
  },
  {
    title: 'Ice Bar Monte Verde',
    category: 'NOITE',
    address: 'Avenida Monte Verde',
    addressNumber: '1500',
    district: 'Monte Verde',
    zipCode: '37653000',
    websiteUrl: 'https://icebarmonteverde.com.br/',
    geo: {
      lat: -22.8631987,
      lng: -46.0384902,
      formattedAddress: 'Avenida Monte Verde 1500, Monte Verde, Camanducaia - MG, 37653-000, Brasil',
    },
    sourceUrl: 'https://icebarmonteverde.com.br/',
    sortOrder: 60,
  },
  {
    title: "Unger's Pottery House",
    category: 'LOJA',
    address: 'Rua Uiarapurus',
    addressNumber: '1300',
    district: 'Monte Verde',
    zipCode: '37653000',
    phone: '(35) 3438-1539',
    websiteUrl: 'https://www.ungerspotteryhouse.com.br/',
    geo: {
      lat: -22.857762,
      lng: -46.032331,
      formattedAddress: 'Rua Uiarapurus 1300, Monte Verde, Camanducaia - MG, 37653-000, Brasil',
    },
    sourceUrl: 'https://www.ungerspotteryhouse.com.br/',
    sortOrder: 70,
  },
  {
    title: 'Parque Oschin',
    category: 'ATRATIVO',
    address: 'Rua do Parque',
    addressNumber: '',
    district: 'Monte Verde',
    zipCode: '37653000',
    websiteUrl: 'https://parqueoschin.com.br/',
    geo: {
      lat: -22.860914,
      lng: -46.028897,
      formattedAddress: 'Rua do Parque, Monte Verde, Camanducaia - MG, 37653-000, Brasil',
    },
    sourceUrl: 'https://parqueoschin.com.br/',
    sortOrder: 80,
  },
  {
    title: 'Escola Mineira de Falcoaria',
    category: 'PASSEIO',
    address: 'Rodovia Deputado Agostinho Patrus',
    addressNumber: '',
    district: 'Monte Verde',
    zipCode: '37653972',
    websiteUrl: 'https://www.escolamineiradefalcoaria.com.br/',
    geo: {
      lat: -22.8604668,
      lng: -46.0704019,
      formattedAddress:
        'Escola de Falcoaria de Monte Verde, Rodovia Deputado Agostinho Patrus, Monte Verde, Camanducaia - MG, 37653-972, Brasil',
    },
    sourceUrl: 'https://www.escolamineiradefalcoaria.com.br/',
    sortOrder: 90,
  },
  {
    title: 'Pedra Redonda',
    category: 'ATRATIVO',
    address: 'Avenida das Montanhas',
    addressNumber: 's/n',
    district: 'Monte Verde',
    zipCode: '37650000',
    websiteUrl: 'https://www.minasgerais.com.br/pt/atracoes/camanducaia/natureza/pedra-redonda',
    featured: true,
    geo: {
      lat: -22.886213,
      lng: -46.022051,
      formattedAddress: 'Pedra Redonda, Monte Verde, Camanducaia - MG, 37650-000, Brasil',
    },
    sourceUrl: 'https://www.minasgerais.com.br/pt/atracoes/camanducaia/natureza/pedra-redonda',
    sortOrder: 100,
  },
];
