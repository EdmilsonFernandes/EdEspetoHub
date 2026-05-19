import type { DestinationListingCategory, HospitalityPlaceType } from './destinationHub';
import { normalizeDestinationSlug } from './destinationHub';

export type GoncalvesHospitalitySeed = {
  name: string;
  slug: string;
  type: HospitalityPlaceType;
  address: string;
  phone?: string;
  whatsapp?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  amenities?: string[];
};

export type GoncalvesListingSeed = {
  title: string;
  category: DestinationListingCategory;
  address?: string;
  phone?: string;
  whatsapp?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  featured?: boolean;
};

const instagram = (handle: string) => `https://www.instagram.com/${handle.replace(/^@/, '')}`;

const site = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

const phoneDigits = (value?: string) => String(value || '').replace(/\D/g, '');

const localPhoneDigits = (value?: string) => {
  const digits = phoneDigits(value);
  return digits.startsWith('55') ? digits.slice(2) : digits;
};

const isMobilePhone = (value?: string) => /^\d{2}9\d{8}$/.test(localPhoneDigits(value));

const contact = (phone: string) => ({
  phone,
  whatsapp: isMobilePhone(phone) ? phone : undefined,
});

const withSlugs = (items: Array<Omit<GoncalvesHospitalitySeed, 'slug'>>): GoncalvesHospitalitySeed[] =>
  items.map((item) => ({ ...item, slug: normalizeDestinationSlug(item.name) }));

export const GONCALVES_TOURISM_SOURCE =
  'Gastronomia e cultura em movimento: desenvolvimento de um roteiro turistico em Goncalves-MG';

export const GONCALVES_DESTINATION_SEED = {
  name: 'Gonçalves',
  slug: 'goncalves',
  city: 'Gonçalves',
  state: 'MG',
  description:
    'Curadoria inicial de Gonçalves com chalés, pousadas, restaurantes, cultura gastronômica, produtores locais e experiências da Serra da Mantiqueira.',
  heroTitle: 'Gonçalves para viver gastronomia e Mantiqueira',
  heroSubtitle:
    'Hospedagens acolhedoras, comida mineira, cervejarias, cachaçarias e lugares charmosos para explorar durante a viagem.',
  lat: -22.6545,
  lng: -45.8556,
  sortOrder: 30,
};

export const GONCALVES_BANNER_SEEDS = [
  {
    title: 'Sabores da Mantiqueira',
    subtitle: 'Restaurantes, cafés, empórios e produtores locais para conhecer em Gonçalves.',
    sortOrder: 10,
  },
  {
    title: 'Chalés e pousadas em meio à serra',
    subtitle: 'Hospedagens para descansar perto de trilhas, cachoeiras e experiências rurais.',
    sortOrder: 20,
  },
  {
    title: 'Roteiro cultural e gastronômico',
    subtitle: 'Cachaçaria, cervejaria, queijos e endereços locais organizados para o visitante.',
    sortOrder: 30,
  },
];

export const GONCALVES_HOSPITALITY_SEEDS = withSlugs([
  {
    name: 'Aconchego da Roça',
    type: 'OUTRO',
    address: 'Estrada do Mundo Novo, 514',
    ...contact('(35) 99990-9063'),
    instagramUrl: instagram('@Aconchegodaroca_Goncalves'),
  },
  {
    name: 'Alto do Sertão Chalé',
    type: 'CHALE',
    address: 'Estrada Bernardino M. de Castro, km 8',
    ...contact('(35) 99973-7009'),
    instagramUrl: instagram('@altodosertaochale'),
  },
  {
    name: 'Sítio Monte Claro',
    type: 'OUTRO',
    address: 'Bairro Campestre, km 9',
    ...contact('(35) 99921-1475'),
  },
  {
    name: 'Chalés BellaVista',
    type: 'CHALE',
    address: 'Bairro dos Neves',
    ...contact('(11) 99940-7906'),
    instagramUrl: instagram('@chalesbellavista'),
  },
  {
    name: 'Chalés Boa Vista',
    type: 'CHALE',
    address: 'Bairro Boa Vista, km 5',
    ...contact('(11) 99302-2000'),
    instagramUrl: instagram('@chales_boa_vista'),
  },
  {
    name: 'Chalés Cafundó',
    type: 'CHALE',
    address: 'Bairro Mundo Novo, km 6,5',
    ...contact('(35) 99990-7975'),
    instagramUrl: instagram('@chalecafundo'),
  },
  {
    name: 'Chalé Caminho da Montanha',
    type: 'CHALE',
    address: 'Estrada dos Costas, s/n, Bairro Rio Manso',
    ...contact('(31) 99728-8258'),
    instagramUrl: instagram('@chalecaminhodamontanha'),
  },
  {
    name: 'Chalé Canto das Águas',
    type: 'CHALE',
    address: 'Bairro Boa Vista',
    ...contact('(35) 99995-4295'),
  },
  {
    name: 'Chalé na Mata',
    type: 'CHALE',
    address: 'Bairro Dona Luciana, km 3,5',
    ...contact('(11) 99988-3523'),
    websiteUrl: site('chalenamata.com.br'),
  },
  {
    name: 'Chalé Pirilampo',
    type: 'CHALE',
    address: 'Bairro Venâncios',
    ...contact('(11) 97542-2559'),
  },
  {
    name: 'Chalé Recanto da Serra',
    type: 'CHALE',
    address: 'Bairro Campestre',
    ...contact('(35) 99966-7171'),
  },
  {
    name: 'Espaço Kalevala',
    type: 'OUTRO',
    address: 'Estrada do Campestre, km 12',
    ...contact('(11) 99501-3340'),
    websiteUrl: site('kalevalabrasil.com.br'),
  },
  {
    name: 'Fazenda das Rosas',
    type: 'OUTRO',
    address: 'Bairro Lambari',
    ...contact('(11) 99985-8138'),
    instagramUrl: instagram('@fazendadasrosas'),
  },
  {
    name: 'Hospedaria Caminho da Roça',
    type: 'POUSADA',
    address: 'Estrada São Sebastião das Três Orelhas, km 5',
    ...contact('(12) 99716-5919'),
    instagramUrl: instagram('@hospedariacaminhodaroca'),
  },
  {
    name: 'Hospedaria Vila Khepri',
    type: 'POUSADA',
    address: 'Av. Francisco T. R. Neto, 365 - Centro',
    ...contact('(11) 98197-8211'),
    instagramUrl: instagram('@hospedariavilakhepri'),
  },
  {
    name: 'Meu Chalé',
    type: 'CHALE',
    address: 'Chalé das Amoras - Terra Fria',
    ...contact('(11) 97283-9506'),
    websiteUrl: site('meuchale.com.br'),
  },
  {
    name: 'Morada Campestre',
    type: 'OUTRO',
    address: 'Bairro Campestre',
    ...contact('(12) 98106-7777'),
  },
  {
    name: 'Nascente Chalés',
    type: 'CHALE',
    address: 'Bairro Rio Manso',
    ...contact('(35) 99921-7279'),
    instagramUrl: instagram('@nascentechales'),
  },
  {
    name: 'Pousada Ao Nascer do Sol',
    type: 'POUSADA',
    address: 'Bairro Terra Fria, km 7',
    ...contact('(35) 99850-0767'),
  },
  {
    name: 'Pousada Arco-Íris',
    type: 'POUSADA',
    address: 'Rua Conselheiro A. Pinto, 365 - Centro',
    phone: '(35) 3654-1282',
    instagramUrl: instagram('@pousada_arcoiris'),
  },
  {
    name: 'Pousada Bicho do Mato',
    type: 'POUSADA',
    address: 'Sertão do Cantagalo',
    ...contact('(35) 99976-9970'),
    websiteUrl: site('pousadabichodomato.com.br'),
  },
  {
    name: 'Pousada Cabanas no Mundo',
    type: 'POUSADA',
    address: 'Bairro Dona Luciana, km 2,5',
    ...contact('(35) 99940-4074'),
    websiteUrl: site('cabanasnomundo.com.br'),
  },
  {
    name: 'Pousada Casa Campestre',
    type: 'POUSADA',
    address: 'Bairro Campestre, km 9',
    ...contact('(35) 99910-1060'),
    websiteUrl: site('casacampestre.tur.br'),
  },
  {
    name: 'Pousada Colina das Andorinhas',
    type: 'POUSADA',
    address: 'Bairro Dona Luciana',
    ...contact('(19) 99842-3301'),
    websiteUrl: site('pousadacolinadasandorinhas.com.br'),
  },
  {
    name: 'Pousada das Flores',
    type: 'POUSADA',
    address: 'Gonçalves, Estrada de São Sebastião das Três Orelhas, km 1,7',
    ...contact('(35) 99952-9134'),
  },
  {
    name: 'Pousada do Rio',
    type: 'POUSADA',
    address: 'Bairro dos Venâncios, km 8',
    ...contact('(11) 99807-1506'),
    websiteUrl: site('pousadadorio.com.br'),
  },
  {
    name: 'Pousada Dona Manoela',
    type: 'POUSADA',
    address: 'Bairro Atrás da Pedra, km 8',
    ...contact('(35) 99917-4742'),
    websiteUrl: site('pousadadonamanoela.com.br'),
  },
  {
    name: 'Pousada Espelho D’Água',
    type: 'POUSADA',
    address: 'Bairro Retiro, km 1',
    phone: '(35) 3654-1397',
    websiteUrl: site('pousadaespelhodagua.com.br'),
  },
  {
    name: 'Pousada & Restaurante Vitória',
    type: 'POUSADA',
    address: 'Bairro dos Remédios',
    ...contact('(11) 99447-5844'),
    websiteUrl: site('pousadavitoriagoncalves.com.br'),
  },
  {
    name: 'Pousada Gonçalves',
    type: 'POUSADA',
    address: 'Bairro Campestre, km 10',
    ...contact('(11) 98373-0888'),
    websiteUrl: site('pousadagoncalves.com.br'),
  },
  {
    name: 'Pousada Passaredo',
    type: 'POUSADA',
    address: 'Bairro Terra Fria, km 8',
    phone: '(35) 9982-2122',
    websiteUrl: site('pousadapassaredo.com.br'),
  },
  {
    name: 'Pousada Recanto da Vitória',
    type: 'POUSADA',
    address: 'Bairro Venâncios, km 6,5',
    ...contact('(11) 97447-8534'),
    websiteUrl: site('pousadarecantodavitoria.com.br'),
  },
  {
    name: 'Pousada Recanto do Sossego',
    type: 'POUSADA',
    address: 'Bairro Terra Fria, km 10',
    ...contact('(19) 99651-4747'),
    websiteUrl: site('recantodosossego.tur.br'),
  },
  {
    name: 'Pousada Riacho das Pedras',
    type: 'POUSADA',
    address: 'Rua João C. da Silva, 370 - Centro',
    ...contact('(35) 99997-4903'),
    websiteUrl: site('pousadariachodaspedras.com.br'),
  },
  {
    name: 'Pousada Serra Vista',
    type: 'POUSADA',
    address: 'Bairro Boa Vista, km 5',
    ...contact('(35) 98456-7390'),
    websiteUrl: site('pousadaserravista.com.br'),
  },
  {
    name: 'Pousada Solar d’araucária',
    type: 'POUSADA',
    address: 'Estrada da Terra Fria, 2 km - Bairro do Retiro',
    phone: '(35) 3654-1260',
    websiteUrl: site('pousadasolardaraucaria.com.br'),
  },
  {
    name: 'Pousada Tahiupara',
    type: 'POUSADA',
    address: 'Bairro do Rio Manso',
    ...contact('(11) 97178-3326'),
    websiteUrl: site('sitiostahiupara.com.br'),
  },
  {
    name: 'Pousada Trem das Cores',
    type: 'POUSADA',
    address: 'Bairro Retiro, km 1,5',
    ...contact('(35) 99831-7480'),
    websiteUrl: site('pousadatremdascores.com.br'),
  },
  {
    name: 'Pousada Três Orelhas',
    type: 'POUSADA',
    address: 'Bairro São Sebastião das Três Orelhas, km 6',
    phone: '(35) 3654-1376',
    websiteUrl: site('tresorelhas.com.br'),
  },
  {
    name: 'Pousada Ver o Vento',
    type: 'POUSADA',
    address: 'Bairro São Sebastião das Três Orelhas, km 5',
    ...contact('(35) 99992-7179'),
    websiteUrl: site('verovento.com.br'),
  },
  {
    name: 'Pousada Vida Verde',
    type: 'POUSADA',
    address: 'Bairro Boa Vista, km 4',
    phone: '(35) 3654-1217',
    websiteUrl: site('pousadavidaverde.com.br'),
  },
  {
    name: 'Pousada Viver a Pedra',
    type: 'POUSADA',
    address: 'Bairro Córrego da Foice, km 14',
    ...contact('(35) 99118-2423'),
    websiteUrl: site('pousadaviverapedra.com.br'),
  },
  {
    name: 'Pousada Villa Catarina',
    type: 'POUSADA',
    address: 'Estrada Rio Manso, km 01',
    ...contact('(35) 99958-4262'),
    websiteUrl: site('pousadavillacatarina.com.br'),
  },
  {
    name: 'Pousada Morada do Luar',
    type: 'POUSADA',
    address: 'Bairro dos Remédios',
    ...contact('(11) 97679-1323'),
    websiteUrl: site('moradadoluarchales.com.br'),
  },
  {
    name: 'Refúgio Alto Da Balança',
    type: 'OUTRO',
    address: 'Bairro dos Venâncios, km 8',
    ...contact('(35) 99751-2011'),
  },
  {
    name: 'Sítio Cantinho Feliz',
    type: 'CASA_TEMPORADA',
    address: 'Estrada Mundo Novo, km 1',
    ...contact('(35) 99894-1396'),
  },
  {
    name: 'Sítio Céu Azul',
    type: 'CASA_TEMPORADA',
    address: 'Bairro Piquiras, Gonçalves',
    ...contact('(35) 99965-7570'),
  },
  {
    name: 'Sítio Tyrol Mineiro',
    type: 'CASA_TEMPORADA',
    address: 'Bairro do Campestre',
    ...contact('(11) 99789-1771'),
    websiteUrl: site('tyrolmineiro.com.br'),
  },
  {
    name: 'Sítio Vila do Sol',
    type: 'CASA_TEMPORADA',
    address: 'Bairro Boa Vista, km 3,5',
    ...contact('(11) 97594-1056'),
    websiteUrl: site('sitioviladosol.com.br'),
  },
  {
    name: 'Urutau Pousada e Restaurante',
    type: 'POUSADA',
    address: 'Bairro do Ribeirãozinho, km 10',
    ...contact('(12) 99127-1486'),
    instagramUrl: instagram('@urutau.pousada.e.restaurante'),
  },
  {
    name: 'Vila Flor Pousada',
    type: 'POUSADA',
    address: 'Bairro Terra Fria, km 8',
    ...contact('(35) 99838-8195'),
  },
  {
    name: 'Chalés Recanto da Mantiqueira',
    type: 'CHALE',
    address: 'Estrada São Sebastião, km 01',
    ...contact('(35) 99890-2027'),
  },
  {
    name: 'Recanto do Bosque',
    type: 'OUTRO',
    address: 'Estrada Mundo Novo, km 7',
    ...contact('(35) 99714-0505'),
  },
]);

export const GONCALVES_LISTING_SEEDS: GoncalvesListingSeed[] = [
  {
    title: 'Bar Restaurante Dois Irmãos',
    category: 'RESTAURANTE_VISITAR',
    address: 'R. José Luiz de Souza, 279 - Centro',
    ...contact('(35) 99972-2830'),
  },
  {
    title: 'Cabana Empório e Restaurante',
    category: 'RESTAURANTE_VISITAR',
    address: 'Av. Francisco T. R. Neto, 240 - Centro',
    phone: '(35) 3654-1353',
    websiteUrl: site('cabanagoncalves.com.br'),
  },
  {
    title: 'DoubleB Espaço Gastronômico',
    category: 'RESTAURANTE_VISITAR',
    address: 'Estrada São Sebastião das Três Orelhas, km 2, Bairro Retiro',
    ...contact('(35) 99942-2327'),
    instagramUrl: instagram('@doubleb.events'),
  },
  {
    title: 'Flor de Zucca',
    category: 'RESTAURANTE_VISITAR',
    address: 'Praça Mons. Dutra, 246 - Centro',
    phone: '(35) 3495-0029',
    instagramUrl: instagram('@flordezuccarestaurantemg'),
  },
  {
    title: 'Fogo Aberto',
    category: 'RESTAURANTE_VISITAR',
    address: 'Estrada São Sebastião das Três Orelhas, km 2 - Retiro',
    ...contact('(11) 99282-7469'),
    instagramUrl: instagram('@fogoaberto'),
  },
  {
    title: 'Gastrô Massas Artesanais',
    category: 'RESTAURANTE_VISITAR',
    address: 'Bairro São Sebastião das Três Orelhas',
    ...contact('(11) 98121-3422'),
    instagramUrl: instagram('@gastro.massas'),
  },
  {
    title: 'Janelas com Tramela',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua Cel. João Vieira, 65 - Centro',
    ...contact('(12) 99749-5212'),
    instagramUrl: instagram('@janelascomtamelabar'),
    featured: true,
  },
  {
    title: 'Karú Restaurante',
    category: 'RESTAURANTE_VISITAR',
    address: 'Bairro dos Venâncios, km 6,5',
    ...contact('(11) 97327-3116'),
    instagramUrl: instagram('@karurestaurante'),
  },
  {
    title: 'Pousada & Restaurante Vitória',
    category: 'RESTAURANTE_VISITAR',
    address: 'Estrada dos Remédios, km 2',
    ...contact('(11) 99447-5844'),
    websiteUrl: site('pousadavitoriagoncalves.com.br'),
  },
  {
    title: 'Restaurante Allora',
    category: 'RESTAURANTE_VISITAR',
    address: 'Bairro Terra Fria, km 8',
    ...contact('(11) 97197-7337'),
  },
  {
    title: 'Restaurante Ao Pé da Pedra',
    category: 'RESTAURANTE_VISITAR',
    address: 'Bairro Terra Fria, km 10',
    ...contact('(35) 99910-3866'),
    instagramUrl: instagram('@restauranteaopedapedra'),
  },
  {
    title: 'Restaurante da Vilma',
    category: 'RESTAURANTE_VISITAR',
    address: 'Bairro Venâncios, km 7',
    ...contact('(35) 99837-0896'),
  },
  {
    title: 'Restaurante Cantagalo',
    category: 'RESTAURANTE_VISITAR',
    address: 'Bairro Sertão do Cantagalo',
    ...contact('(11) 99489-4079'),
  },
  {
    title: 'Restaurante Flor de Cerejeira',
    category: 'RESTAURANTE_VISITAR',
    address: 'Praça Monsenhor Dutra, 125 - Centro',
    phone: '(35) 3654-1356',
  },
  {
    title: 'Restaurante Mantiqueira',
    category: 'RESTAURANTE_VISITAR',
    address: 'Praça São Benedito, 57 - Centro',
    phone: '(35) 3654-1380',
  },
  {
    title: 'Restaurante Mar de Morros',
    category: 'RESTAURANTE_VISITAR',
    address: 'Estrada do Mundo Novo, km 6',
    ...contact('(24) 99944-6466'),
    instagramUrl: instagram('@cozinhamardemorros'),
  },
  {
    title: 'Restaurante Nascente das Trutas',
    category: 'RESTAURANTE_VISITAR',
    address: 'R. Antônio C. da Rosa, 173 - Centro',
    ...contact('(35) 99931-7279'),
    instagramUrl: instagram('@nascentedastrutas'),
  },
  {
    title: 'Restaurante Nó de Pinho Gastronomia',
    category: 'RESTAURANTE_VISITAR',
    address: 'Bairro do Retiro',
    phone: '(35) 3654-1398',
    websiteUrl: site('pousadasolardaraucaria.com.br'),
  },
  {
    title: 'Restaurante Porto do Céu Restobar',
    category: 'RESTAURANTE_VISITAR',
    address: 'R. Coronel P. Ribeiro, 80 - Centro',
    ...contact('(35) 99865-8454'),
    websiteUrl: site('portodoceu.com.br'),
  },
  {
    title: 'Restaurante Santa Massa',
    category: 'RESTAURANTE_VISITAR',
    address: 'Bairro Retiro, km 2,5',
    ...contact('(11) 97566-8864'),
    instagramUrl: instagram('@santa_massa_goncalves'),
  },
  {
    title: 'Restaurante Sabores da Mantiqueira',
    category: 'RESTAURANTE_VISITAR',
    address: 'Gonçalves - MG',
    phone: '(35) 99993-7479 / (11) 99965-3904',
    whatsapp: '(35) 99993-7479',
    websiteUrl: site('saboresdamantiqueira.com.br'),
  },
  {
    title: 'Restaurante Sauá',
    category: 'RESTAURANTE_VISITAR',
    address: 'Sertão do Cantagalo',
    ...contact('(35) 99976-9970'),
    websiteUrl: site('restaurantesaua.com.br'),
    featured: true,
  },
  {
    title: 'Restaurante Vida Verde',
    category: 'RESTAURANTE_VISITAR',
    address: 'Bairro Boa Vista, km 4',
    phone: '(35) 3654-1217',
    websiteUrl: site('pousadavidaverde.com.br'),
  },
  {
    title: 'Restaurante Pedra do Forno',
    category: 'RESTAURANTE_VISITAR',
    address: 'Bairro Pedra do Forno, km 11,5',
    ...contact('(35) 99885-0017'),
  },
  {
    title: 'San Benedetto',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua Capitão Antônio Carlos, 195',
    ...contact('(35) 99142-9206'),
    instagramUrl: instagram('@sanbenedetto.mg'),
    featured: true,
  },
  {
    title: 'Serras e Quintais',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua J. A. Braga, 152, Bairro Serrinha',
    ...contact('(35) 99833-1325'),
    instagramUrl: instagram('@serrasequintais'),
  },
  {
    title: 'Restaurante Terra Sem Mal',
    category: 'RESTAURANTE_VISITAR',
    address: 'Estrada do Sertãozinho',
    ...contact('(12) 98152-4066'),
    instagramUrl: instagram('@restauranteterrasemmal'),
  },
  {
    title: 'Urutau Pousada e Restaurante',
    category: 'RESTAURANTE_VISITAR',
    address: 'Bairro do Ribeirãozinho, km 10',
    ...contact('(12) 99127-1486'),
    instagramUrl: instagram('@urutau.pousada.e.restaurante'),
  },
  {
    title: 'Quinta do Tacho Restaurante',
    category: 'RESTAURANTE_VISITAR',
    address: 'Estrada São Sebastião, 1020',
    ...contact('(35) 99957-6270'),
    instagramUrl: instagram('@quintadotacho'),
    featured: true,
  },
  {
    title: 'Armazém São Bento Cultura e Gastronomia',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua Antônio Caetano da Rosa, 217 - Centro',
    ...contact('(35) 99829-7776'),
    instagramUrl: instagram('@armazemsaobento'),
    featured: true,
  },
  {
    title: 'Café na Roça',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua Fausto Rezende de Souza, 183',
    ...contact('(11) 97091-3216'),
    instagramUrl: instagram('@cafe_na_roca'),
  },
  {
    title: 'Naturale-se Empório Restaurante Café',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua Joaquim Ferreira de Souza, 109 - Centro',
    ...contact('(35) 99936-0513'),
    instagramUrl: instagram('@naturalesegoncalves'),
  },
  {
    title: 'Queijo Canastra & Cia (Pérolas da Mantiqueira)',
    category: 'LOJA',
    address: 'Rua Coronel João Vieira, 23 - Centro',
    ...contact('(35) 99906-6508'),
    instagramUrl: instagram('@queijoscanastragoncalvesmg'),
  },
  {
    title: 'Cervejaria 3 Orelhas',
    category: 'NOITE',
    address: 'Bairro São Sebastião das Três Orelhas, km 5',
    ...contact('(11) 94139-9899'),
    instagramUrl: instagram('@cervejaria3orelhas'),
    featured: true,
  },
  {
    title: 'Alambique Três Barras / Cachaçaria Gonçalves',
    category: 'PASSEIO',
    address: 'Bairro Três Barras, s/n - Três Barras',
    ...contact('(35) 99759-5751'),
    instagramUrl: instagram('@alambique_goncalves'),
    featured: true,
  },
  {
    title: 'Chalezinho Gastrobar',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua Antônio Caetano da Rosa, 229 - Centro',
    ...contact('(35) 99115-1504'),
  },
];
