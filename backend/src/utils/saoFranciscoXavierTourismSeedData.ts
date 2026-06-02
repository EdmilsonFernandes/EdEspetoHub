import type { DestinationListingCategory, HospitalityPlaceType } from './destinationHub';

export type SaoFranciscoXavierGeoSeed = {
  lat: number;
  lng: number;
  formattedAddress: string;
};

export type SaoFranciscoXavierHospitalitySeed = {
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
  geo: SaoFranciscoXavierGeoSeed;
  sourceUrl: string;
  sortOrder: number;
};

export type SaoFranciscoXavierListingSeed = {
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
  geo: SaoFranciscoXavierGeoSeed;
  sourceUrl: string;
  sortOrder: number;
};

const instagram = (handle: string) => `https://www.instagram.com/${handle.replace(/^@/, '')}`;

export const SAO_FRANCISCO_XAVIER_TOURISM_SOURCE =
  'Curadoria publica de Sao Francisco Xavier: COMTUR, sites oficiais, Booking/Tripadvisor e guias locais';

export const SAO_FRANCISCO_XAVIER_DESTINATION_SEED = {
  name: 'São Francisco Xavier',
  slug: 'sao-francisco-xavier',
  city: 'São Francisco Xavier',
  state: 'SP',
  description:
    'Destino de montanha no Vale do Paraiba para chales, pousadas, gastronomia local, trilhas, artesanato e experiencias ao ar livre.',
  heroTitle: 'Monte sua estadia em São Francisco Xavier',
  heroSubtitle: 'Hospedagens, delivery local, passeios e serviços próximos em uma experiência só.',
  lat: -22.91378,
  lng: -45.961481,
  sortOrder: 40,
};

export const SAO_FRANCISCO_XAVIER_HOSPITALITY_SEEDS: SaoFranciscoXavierHospitalitySeed[] = [
  {
    name: 'Pousada Muriqui',
    slug: 'pousada-muriqui',
    type: 'POUSADA',
    address: 'Rua Ezequiel Alves Graciano',
    addressNumber: '118',
    district: 'Centro (São Francisco Xavier)',
    zipCode: '12249000',
    websiteUrl: 'https://muriqui.pousada.biz/',
    amenities: ['Pousada', 'Centro', 'Piscina'],
    geo: {
      lat: -22.913691,
      lng: -45.960934,
      formattedAddress:
        'Rua Ezequiel Alves Graciano 118, São Francisco Xavier, São José dos Campos - SP, 12249-000, Brasil',
    },
    sourceUrl: 'https://www.booking.com/hotel/br/pousada-muriqui.pt-br.html',
    sortOrder: 20,
  },
  {
    name: 'Chalés SFX',
    slug: 'chales-sfx',
    type: 'CHALE',
    address: 'Praça Cônego Antônio Manzi',
    addressNumber: '138',
    district: 'Centro (São Francisco Xavier)',
    zipCode: '12249000',
    amenities: ['Chalés', 'Centro', 'Hospedagem'],
    geo: {
      lat: -22.912394,
      lng: -45.960598,
      formattedAddress:
        'Praça Cônego Antônio Manzi 138, São Francisco Xavier, São José dos Campos - SP, 12249-000, Brasil',
    },
    sourceUrl: 'https://www.booking.com/hotel/br/chales-sfx.pt-br.html',
    sortOrder: 30,
  },
  {
    name: 'Pousada Varandas da Mantiqueira',
    slug: 'pousada-varandas-da-mantiqueira',
    type: 'POUSADA',
    address: 'Estrada Ezequiel Alves Graciano',
    addressNumber: '1931',
    district: 'São Francisco Xavier',
    zipCode: '12249000',
    amenities: ['Pousada', 'Montanha', 'Vista'],
    geo: {
      lat: -22.920603,
      lng: -45.974141,
      formattedAddress:
        'Estrada Ezequiel Alves Graciano 1931, São Francisco Xavier, São José dos Campos - SP, 12249-000, Brasil',
    },
    sourceUrl: 'https://www.pousadasincriveis.com/hospedagem/pousada-varandas-da-mantiqueira/',
    sortOrder: 40,
  },
  {
    name: 'Pousada Kolibri',
    slug: 'pousada-kolibri',
    type: 'POUSADA',
    address: 'Estrada de Santa Cruz',
    addressNumber: '600',
    district: 'Santa Cruz (São Francisco Xavier)',
    zipCode: '12249000',
    phone: '(12) 3797-2975',
    websiteUrl: 'https://pousadakolibri.com.br',
    amenities: ['Pousada', 'Natureza', 'Trilhas'],
    geo: {
      lat: -22.920585,
      lng: -46.005313,
      formattedAddress:
        'Estrada de Santa Cruz 600, São Francisco Xavier, São José dos Campos - SP, 12249-000, Brasil',
    },
    sourceUrl: 'https://www.tripadvisor.com/Hotel_Review-g3175968-d4511293-Reviews-Pousada_Kolibri-Sao_Francisco_Xavier_State_of_Sao_Paulo.html',
    sortOrder: 50,
  },
];

export const SAO_FRANCISCO_XAVIER_LISTING_SEEDS: SaoFranciscoXavierListingSeed[] = [
  {
    title: 'Raiz Burguer & Restaurante',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua 15 de Novembro',
    addressNumber: '41',
    district: 'Centro (São Francisco Xavier)',
    zipCode: '12249000',
    whatsapp: '(12) 99649-7869',
    instagramUrl: instagram('@raizburguererestaurante'),
    featured: true,
    geo: {
      lat: -22.911899,
      lng: -45.959221,
      formattedAddress:
        'Rua 15 de Novembro 41, São Francisco Xavier, São José dos Campos - SP, 12249-000, Brasil',
    },
    sourceUrl: 'https://comtur.sjc.br/restaurantes-sjx/',
    sortOrder: 10,
  },
  {
    title: 'Bruno Pães Artesanais',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua Ezequiel Alves Graciano',
    addressNumber: '183',
    district: 'Centro (São Francisco Xavier)',
    zipCode: '12249000',
    whatsapp: '(12) 99636-0243',
    geo: {
      lat: -22.913259,
      lng: -45.960036,
      formattedAddress:
        'Rua Ezequiel Alves Graciano 183, São Francisco Xavier, São José dos Campos - SP, 12249-000, Brasil',
    },
    sourceUrl: 'https://www.sluurpy.com.br/s%C3%A3o-francisco-xavier/restaurante/7845510/bruno-p%C3%A3es-artesanais-sfx',
    sortOrder: 20,
  },
  {
    title: 'Dona Xica Café',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua 15 de Novembro',
    addressNumber: '106',
    district: 'Centro (São Francisco Xavier)',
    zipCode: '12249000',
    whatsapp: '(12) 99679-7475',
    instagramUrl: instagram('@donaxicacafe'),
    websiteUrl: 'https://www.donaxicacafe.com.br',
    featured: true,
    geo: {
      lat: -22.911644,
      lng: -45.958776,
      formattedAddress:
        'Rua 15 de Novembro 106, São Francisco Xavier, São José dos Campos - SP, 12249-000, Brasil',
    },
    sourceUrl: 'https://comtur.sjc.br/restaurantes-sjx/',
    sortOrder: 30,
  },
  {
    title: 'Restaurante João de Barro',
    category: 'RESTAURANTE_VISITAR',
    address: 'Largo São Sebastião',
    addressNumber: '105',
    district: 'Centro (São Francisco Xavier)',
    zipCode: '12249000',
    whatsapp: '(12) 99767-1661',
    websiteUrl: 'https://www.facebook.com/joaodebarrosfx/',
    featured: true,
    geo: {
      lat: -22.9118211,
      lng: -45.9576923,
      formattedAddress:
        'Largo São Sebastião 105, Centro, São Francisco Xavier, São José dos Campos - SP, 12249-000, Brasil',
    },
    sourceUrl: 'https://www.sluurpy.com/pt/s%C3%A3o-francisco-xavier/restaurant/1572797/restaurante-jo%C3%A3o-de-barro',
    sortOrder: 40,
  },
  {
    title: 'Deck Restobar',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua 15 de Novembro',
    addressNumber: '114',
    district: 'Centro (São Francisco Xavier)',
    zipCode: '12249000',
    whatsapp: '(12) 99635-5995',
    websiteUrl: 'http://www.facebook.com/restobardeck/',
    geo: {
      lat: -22.9110477,
      lng: -45.9573648,
      formattedAddress:
        'Rua 15 de Novembro 114, São Francisco Xavier, São José dos Campos - SP, 12249-000, Brasil',
    },
    sourceUrl: 'https://www.sluurpy.com/pt/s%C3%A3o-francisco-xavier/restaurant/7848068/deck-restobar',
    sortOrder: 50,
  },
  {
    title: 'Villa K2 Restaurante e Empório',
    category: 'RESTAURANTE_VISITAR',
    address: 'Largo São Sebastião',
    addressNumber: '37',
    district: 'Centro (São Francisco Xavier)',
    zipCode: '12249000',
    phone: '(12) 3926-1631',
    geo: {
      lat: -22.911212,
      lng: -45.957981,
      formattedAddress:
        'Largo São Sebastião 37, São Francisco Xavier, São José dos Campos - SP, 12249-000, Brasil',
    },
    sourceUrl: 'https://serradoluar.com.br/vila-k2-restaurante-bar/',
    sortOrder: 60,
  },
  {
    title: 'SP 50 Bier',
    category: 'NOITE',
    address: 'Rua 15 de Novembro',
    addressNumber: '427',
    district: 'Centro (São Francisco Xavier)',
    zipCode: '12249000',
    whatsapp: '(12) 99608-0408',
    instagramUrl: instagram('@sp50bier'),
    websiteUrl: 'https://sp50bier.com.br/',
    geo: {
      lat: -22.910872,
      lng: -45.955849,
      formattedAddress:
        'Rua 15 de Novembro 427, São Francisco Xavier, São José dos Campos - SP, 12249-000, Brasil',
    },
    sourceUrl: 'https://www.baressp.com.br/bares/sp-50-bier',
    sortOrder: 70,
  },
  {
    title: 'São Francisco Restaurante',
    category: 'RESTAURANTE_VISITAR',
    address: 'Praça Cônego Antônio Manzi',
    addressNumber: '138',
    district: 'Centro (São Francisco Xavier)',
    zipCode: '12249000',
    whatsapp: '(12) 99725-8742',
    instagramUrl: instagram('@saofranciscorestaurante'),
    geo: {
      lat: -22.912394,
      lng: -45.960598,
      formattedAddress:
        'Praça Cônego Antônio Manzi 138, São Francisco Xavier, São José dos Campos - SP, 12249-000, Brasil',
    },
    sourceUrl: 'https://www.tripadvisor.com.br/Restaurant_Review-g3175968-d18895579-Reviews-Sao_Francisco_Restaurante_SFX-Sao_Francisco_Xavier_State_of_Sao_Paulo.html',
    sortOrder: 80,
  },
  {
    title: 'Padaria Vale Verde',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua Treze de Maio',
    addressNumber: '11',
    district: 'São Francisco Xavier',
    zipCode: '12249000',
    phone: '(12) 3926-1506',
    geo: {
      lat: -22.913729,
      lng: -45.958646,
      formattedAddress:
        'Rua Treze de Maio 11, São Francisco Xavier, São José dos Campos - SP, 12249-000, Brasil',
    },
    sourceUrl: 'https://www.diariocidade.com/sp/sao-jose-dos-campos/guia/padaria-vale-verde-09350982000116/',
    sortOrder: 90,
  },
  {
    title: 'Neo Armazém & Co',
    category: 'LOJA',
    address: 'Rua Ezequiel Alves Graciano',
    addressNumber: '169',
    district: 'Centro (São Francisco Xavier)',
    zipCode: '12249001',
    phone: '(12) 99760-4572',
    websiteUrl: 'https://neoqueijosdecabra.com.br/neo-armazem-co/',
    geo: {
      lat: -22.913215,
      lng: -45.959881,
      formattedAddress:
        'Rua Ezequiel Alves Graciano 169, São Francisco Xavier, São José dos Campos - SP, 12249-001, Brasil',
    },
    sourceUrl: 'https://neoqueijosdecabra.com.br/neo-armazem-co/',
    sortOrder: 100,
  },
  {
    title: 'Feira Produtos da Terra',
    category: 'LOJA',
    address: 'Rua 15 de Novembro',
    addressNumber: '900',
    district: 'Centro (São Francisco Xavier)',
    zipCode: '12249027',
    whatsapp: '(12) 99671-9530',
    instagramUrl: instagram('@feiradesaoxico'),
    geo: {
      lat: -22.9110477,
      lng: -45.9573648,
      formattedAddress:
        'Rua 15 de Novembro 900, Centro, São Francisco Xavier, São José dos Campos - SP, 12249-027, Brasil',
    },
    sourceUrl: 'https://comtur.sjc.br/restaurantes-sjx/',
    sortOrder: 110,
  },
  {
    title: 'Jô Arte Metal',
    category: 'LOJA',
    address: 'Rua 15 de Novembro',
    addressNumber: '317',
    district: 'Centro (São Francisco Xavier)',
    zipCode: '12249027',
    whatsapp: '(12) 99622-8359',
    websiteUrl: 'https://joartemetal.com.br/',
    geo: {
      lat: -22.910948,
      lng: -45.95682,
      formattedAddress:
        'Rua 15 de Novembro 317, São Francisco Xavier, São José dos Campos - SP, 12249-027, Brasil',
    },
    sourceUrl: 'https://joartemetal.com.br/',
    sortOrder: 120,
  },
  {
    title: 'Jabuti Expedições',
    category: 'PASSEIO',
    address: 'Estrada Vereador Pedro David',
    addressNumber: '14300',
    district: 'São Francisco Xavier',
    zipCode: '12249000',
    websiteUrl: 'https://www.jabutiexpedicoes.com/',
    geo: {
      lat: -22.909734,
      lng: -45.9467279,
      formattedAddress:
        'Estrada Vereador Pedro David 14300, São Francisco Xavier, São José dos Campos - SP, 12249-000, Brasil',
    },
    sourceUrl: 'https://www.jabutiexpedicoes.com/',
    sortOrder: 130,
  },
  {
    title: 'Mantiqueira EcoAventura',
    category: 'PASSEIO',
    address: 'Estrada Vereador Pedro David',
    addressNumber: '18001',
    district: 'Chácara 9 Vinten (São Francisco Xavier)',
    zipCode: '12249029',
    phone: '(12) 3926-1741',
    whatsapp: '(12) 99650-8659',
    websiteUrl: 'https://www.mantiqueiraecoaventura.com/',
    geo: {
      lat: -22.909734,
      lng: -45.9467279,
      formattedAddress:
        'Estrada Vereador Pedro David 18001, São Francisco Xavier, São José dos Campos - SP, 12249-029, Brasil',
    },
    sourceUrl: 'https://www.mantiqueiraecoaventura.com/',
    sortOrder: 140,
  },
  {
    title: 'Cachoeira Pedro David',
    category: 'ATRATIVO',
    address: 'Cachoeira Pedro David',
    addressNumber: '',
    district: 'São Francisco Xavier',
    zipCode: '12249000',
    geo: {
      lat: -22.9246438,
      lng: -45.9799858,
      formattedAddress:
        'Cachoeira Pedro David, São Francisco Xavier, São José dos Campos - SP, 12249-000, Brasil',
    },
    sourceUrl: 'https://infotursfx.com.br/',
    sortOrder: 150,
  },
];
