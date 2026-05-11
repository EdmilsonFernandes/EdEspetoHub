import type { DestinationListingCategory, HospitalityPlaceType } from './destinationHub';

export type SaoBentoHospitalitySeed = {
  name: string;
  slug: string;
  type: HospitalityPlaceType;
  address: string;
  phone?: string;
  whatsapp?: string;
  websiteUrl?: string;
  amenities?: string[];
};

export type SaoBentoListingSeed = {
  title: string;
  category: DestinationListingCategory;
  address?: string;
  phone?: string;
  whatsapp?: string;
  websiteUrl?: string;
  featured?: boolean;
};

export const SAO_BENTO_TOURISM_SOURCE = 'Mapa Turistico de Sao Bento do Sapucai';

export const SAO_BENTO_DESTINATION_SEED = {
  name: 'São Bento do Sapucaí',
  slug: 'sao-bento-do-sapucai',
  city: 'São Bento do Sapucaí',
  state: 'SP',
  description:
    'Curadoria inicial de São Bento do Sapucaí com hospedagens, restaurantes, atrações, aventura e serviços locais para viajantes.',
  heroTitle: 'São Bento do Sapucaí para viver a Mantiqueira',
  heroSubtitle:
    'Chalés, pousadas, Pedra do Baú, restaurantes e experiências locais organizados por cidade.',
  lat: -22.6837,
  lng: -45.7287,
  sortOrder: 20,
};

export const SAO_BENTO_BANNER_SEEDS = [
  {
    title: 'Pedra do Baú e aventura',
    subtitle: 'Trilhas, escalada, mirantes e agências locais para explorar São Bento.',
    sortOrder: 10,
  },
  {
    title: 'Hospedagens e gastronomia da Mantiqueira',
    subtitle: 'Pousadas, chalés, cafés, restaurantes e compras locais para montar a viagem.',
    sortOrder: 20,
  },
];

export const SAO_BENTO_HOSPITALITY_SEEDS: SaoBentoHospitalitySeed[] = [
  {
    name: 'Pousada do Fred',
    slug: 'pousada-do-fred',
    type: 'POUSADA',
    address: 'Av. Sebastião de Mello Mendes, 353 - Jardim Santa Terezinha',
    phone: '(12) 98284-6271',
    whatsapp: '(12) 98284-6271',
  },
  {
    name: 'Pousada Villa São Bento',
    slug: 'pousada-villa-sao-bento',
    type: 'POUSADA',
    address: 'Av. Juscelino Kubitschek de Oliveira, 421 - Jardim dos Cisnes',
    phone: '(12) 99712-5330',
    whatsapp: '(12) 99712-5330',
    websiteUrl: 'https://www.pousadavillasaobento.com.br',
  },
  {
    name: 'Pousada Casa Blanca',
    slug: 'pousada-casa-blanca',
    type: 'POUSADA',
    address: 'Av. Conselheiro Rodrigues Alves, 255 - Centro',
    phone: '(12) 3971-1637',
  },
  {
    name: 'Pousada Villa da Montanha',
    slug: 'pousada-villa-da-montanha',
    type: 'POUSADA',
    address: 'Rua Cândido José da Silva, 504 - Centro',
    phone: '(12) 3971-1268',
    websiteUrl: 'https://www.villadamontanha.com.br',
  },
  {
    name: 'Pousada Caminho da Mata',
    slug: 'pousada-caminho-da-mata',
    type: 'POUSADA',
    address: 'Estrada Municipal Durvalina Ribeiro da Silva - Serrano',
    phone: '(12) 98817-4741',
    whatsapp: '(12) 98817-4741',
    websiteUrl: 'https://www.pousadacaminhodamata.com.br',
  },
  {
    name: 'Pousada Quinta dos Colibris',
    slug: 'pousada-quinta-dos-colibris',
    type: 'POUSADA',
    address: 'Rua Sargento José Lourenço, 34 - Centro',
    phone: '(12) 3971-2516',
  },
  {
    name: 'Hospedaria Chalé Bauzinho',
    slug: 'hospedaria-chale-bauzinho',
    type: 'CHALE',
    address: 'Rua Engenheiro José Donato Carneiro, 192 - Jardim Santa Terezinha',
    phone: '(12) 99736-0942',
    whatsapp: '(12) 99736-0942',
    websiteUrl: 'https://www.casinhaamarelasbs.wixsite.com/pousadachalebauzinho',
  },
  {
    name: 'Pousada Sapucaí',
    slug: 'pousada-sapucai',
    type: 'POUSADA',
    address: 'Rua Dr. Oliveira Ribeiro, 237 - Centro',
    phone: '(12) 3971-1535',
    websiteUrl: 'https://www.pousadasapucaisbs.com.br',
  },
  {
    name: 'Hospedaria Vida na Roça',
    slug: 'hospedaria-vida-na-roca',
    type: 'POUSADA',
    address: 'Estrada Carmelina Francisca da Rosa Barros, km 3, s/n - Serrano',
    phone: '(12) 99721-8581',
    whatsapp: '(12) 99721-8581',
    websiteUrl: 'https://www.hospedariavidanaroca.com.br',
  },
  {
    name: 'Pousada Refúgio dos Palmares',
    slug: 'pousada-refugio-dos-palmares',
    type: 'POUSADA',
    address: 'Rua Santa Edwiges, 100 - Quilombo',
    phone: '(12) 99663-7705',
    whatsapp: '(12) 99663-7705',
  },
  {
    name: 'Hospedaria Estação Píccola',
    slug: 'hospedaria-estacao-piccola',
    type: 'POUSADA',
    address: 'Estrada da Ana Chata, km 1,5 - Paiol São Pedro',
    phone: '(12) 99797-6979',
    whatsapp: '(12) 99797-6979',
    websiteUrl: 'https://www.hospedariapiccola.com',
  },
  {
    name: 'Pousada Refúgio do Serrano',
    slug: 'pousada-refugio-do-serrano',
    type: 'POUSADA',
    address: 'Estrada Armando Pereira Goulart, 1045 - Serrano',
    phone: '(12) 3971-1758',
    websiteUrl: 'https://www.refugiodoserrano.com.br',
  },
  {
    name: 'Chalés São Félix',
    slug: 'chales-sao-felix',
    type: 'CHALE',
    address: 'Rua Caetano Rodrigues de Lima, 175 - Paiol Grande',
    phone: '(12) 99721-0015',
    whatsapp: '(12) 99721-0015',
  },
  {
    name: 'Pousada Flor de Ipê',
    slug: 'pousada-flor-de-ipe',
    type: 'POUSADA',
    address: 'Av. Nossa Senhora Aparecida, 262 - Serrano',
    phone: '(12) 3971-1391',
    websiteUrl: 'https://www.pousadaflordeipe.com.br',
  },
  {
    name: 'Chalés Riacho Doce',
    slug: 'chales-riacho-doce',
    type: 'CHALE',
    address: 'Rod. Pref. Benedito Gomes de Souza, km 5,5 - Paiol Grande',
    phone: '(12) 3971-1471',
    websiteUrl: 'https://www.saborcomarte.com.br',
  },
  {
    name: 'Pousada do Sítio',
    slug: 'pousada-do-sitio',
    type: 'POUSADA',
    address: 'Estrada Municipal do Bairro do Sítio, 975 - Sítio',
    phone: '(12) 3971-1640',
    websiteUrl: 'https://www.pousadadositio.com.br',
  },
  {
    name: 'Chalés Pedra do Baú',
    slug: 'chales-pedra-do-bau',
    type: 'CHALE',
    address: 'Estrada Municipal da Ana Chata, km 2,5 - Paiol São Pedro',
    phone: '(12) 99703-1065',
    whatsapp: '(12) 99703-1065',
    websiteUrl: 'https://www.chalepedradobau.com.br',
  },
  {
    name: 'Pousada do Quilombo',
    slug: 'pousada-do-quilombo',
    type: 'POUSADA',
    address: 'Estrada Vereador Benedito Cândido Ribeiro, 1403 - Quilombo',
    phone: '(12) 3971-2686',
  },
  {
    name: 'Chalés Manacás e Araucária',
    slug: 'chales-manacas-e-araucaria',
    type: 'CHALE',
    address: 'Rua das Araucárias, s/n - Paiol São Pedro',
    phone: '(12) 99703-9512',
    whatsapp: '(12) 99703-9512',
  },
  {
    name: 'Pousada Chalés Estalagem',
    slug: 'pousada-chales-estalagem',
    type: 'POUSADA',
    address: 'Rua Engenheiro José Donato Carneiro, 04 - Jardim Santa Terezinha',
    phone: '(12) 3971-1924',
    websiteUrl: 'https://www.pousadachalesdaestalagem.com.br',
  },
  {
    name: 'Chalés Lago do Baú',
    slug: 'chales-lago-do-bau',
    type: 'CHALE',
    address: 'Rua das Araucárias, s/n - Paiol São Pedro',
    phone: '(12) 99777-6643',
    whatsapp: '(12) 99777-6643',
  },
  {
    name: 'Pousada 4 Irmãos',
    slug: 'pousada-4-irmaos',
    type: 'POUSADA',
    address: 'Rua Antonio Américo da Silva, 11 - Jardim dos Cisnes',
    phone: '(12) 99202-1314',
    whatsapp: '(12) 99202-1314',
  },
  {
    name: 'Aldeia Manacás - Pousada Conceito',
    slug: 'aldeia-manacas-pousada-conceito',
    type: 'POUSADA',
    address: 'Estrada Municipal Antônio Rodrigues da Silva, 1200 - Serrano',
    phone: '(12) 98110-4737',
    whatsapp: '(12) 98110-4737',
    websiteUrl: 'https://www.aldeiamanacas.com.br',
  },
];

export const SAO_BENTO_LISTING_SEEDS: SaoBentoListingSeed[] = [
  {
    title: 'Monumento Natural Estadual da Pedra do Baú',
    category: 'ATRATIVO',
    address: 'Estrada Municipal do Bauzinho - acesso pela Rod. Mun. Thomaz Alckmin',
    featured: true,
  },
  {
    title: 'Mirante da Cachoeira do Toldi',
    category: 'ATRATIVO',
    address: 'Rodovia Municipal Thomaz Alckmin - Paiol Grande',
  },
  {
    title: 'Mirante do Cruzeiro',
    category: 'ATRATIVO',
    address: 'Rua Presidente Castelo Branco, s/n - Centro',
  },
  {
    title: 'Belvedere Bairro Serrano',
    category: 'ATRATIVO',
    address: 'Estrada Carmelina Francisca da Rosa Barros - Serrano',
  },
  {
    title: 'Capela de Mosaicos',
    category: 'ATRATIVO',
    address: 'Rua Treze de Maio, 2017 - Centro',
  },
  {
    title: 'Capela de Santo Stylianos',
    category: 'ATRATIVO',
    address: 'Estrada Municipal Armando Pereira Goulart - Serrano',
  },
  {
    title: 'Casa da Cultura Miguel Reale',
    category: 'ATRATIVO',
    address: 'Rua Sargento José Lourenço, 105 - Centro',
    phone: '(12) 3971-1665',
  },
  {
    title: 'Museu do Zé Pereira',
    category: 'ATRATIVO',
    address: 'Av. Dr. Rubião Júnior, 491, Box 24 - Centro',
    phone: '(12) 3971-1255',
  },
  {
    title: 'Galeria de Arte Galeria A',
    category: 'ATRATIVO',
    address: 'Rua Desembargador Afonso de Carvalho, 211 - Centro',
  },
  {
    title: 'Igreja Matriz',
    category: 'ATRATIVO',
    address: 'Praça Cônego Bento de Almeida - Centro',
    phone: '(12) 3971-2227',
  },
  {
    title: 'Arte no Quilombo',
    category: 'LOJA',
    address: 'Estrada Vereador Benedito Cândido Ribeiro, km 2,5 - Quilombo',
    phone: '(12) 3971-2669',
  },
  {
    title: 'Arteben - Casa do Artesão',
    category: 'LOJA',
    address: 'Rua Dr. Rubião Junior, 491, Box 16 - Centro',
    phone: '(12) 99756-3922',
    whatsapp: '(12) 99756-3922',
  },
  {
    title: 'Atelier de Tecidos Nakawe',
    category: 'LOJA',
    address: 'Estrada do Paiol Grande, km 13,5 - Toldi',
    phone: '(12) 99719-8007',
    whatsapp: '(12) 99719-8007',
    websiteUrl: 'https://www.nakawetecidos.com.br',
  },
  {
    title: 'Ateliê Ditinho Joana',
    category: 'LOJA',
    address: 'Estrada Vereador Benedito Cândido Ribeiro, km 2,5 - Quilombo',
    phone: '(12) 3971-2579',
  },
  {
    title: 'Ateliê Fiat Lux',
    category: 'LOJA',
    address: 'Praça Cônego Bento de Almeida, 442 - Centro',
    phone: '(12) 3971-2227',
  },
  {
    title: 'Emporium Naturae',
    category: 'LOJA',
    address: 'Rua Major Miguel Chiaradia, 173 - Centro',
    phone: '(12) 98827-2964',
    whatsapp: '(12) 98827-2964',
  },
  {
    title: 'Baú Ecoturismo',
    category: 'PASSEIO',
    address: 'Av. Conselheiro Rodrigues Alves, 143 - Centro',
    phone: '(12) 99737-5968',
    whatsapp: '(12) 99737-5968',
    websiteUrl: 'https://www.bauecoturismo.com.br',
    featured: true,
  },
  {
    title: 'Baú Ecoturismo Esporte e Aventura',
    category: 'PASSEIO',
    address: 'Comunidade São Pedro, km 11 - junto ao Restaurante Pedra do Baú',
    phone: '(12) 99737-5968',
    whatsapp: '(12) 99737-5968',
    websiteUrl: 'https://www.bauecoturismo.com.br',
  },
  {
    title: 'Rotas & Rochas Turismo',
    category: 'PASSEIO',
    address: 'Av. Sebastião de Mello Mendes, 165 - Jardim Santa Terezinha',
    phone: '(12) 99652-1217',
    whatsapp: '(12) 99652-1217',
    websiteUrl: 'https://www.rotaserochas.com.br',
  },
  {
    title: 'Dimy Climbing',
    category: 'PASSEIO',
    address: 'Rua Cândido José da Silva, 436 - Centro',
    phone: '(12) 99641-8323',
    whatsapp: '(12) 99641-8323',
  },
  {
    title: 'Montanhismus',
    category: 'PASSEIO',
    address: 'Estrada do Serrano, km 2 - Serrano',
    phone: '(12) 3971-1470',
    websiteUrl: 'https://www.montanhismus.com.br',
  },
  {
    title: 'BBloc Escalada em Boulder',
    category: 'PASSEIO',
    address: 'Rua Major Monteiro de Carvalho, 96 - Centro',
    phone: '(12) 3971-2235',
  },
  {
    title: 'Micro Cervejaria Bauzera',
    category: 'NOITE',
    address: 'Estrada Armando Pereira Goulart, km 2 - Serrano',
    phone: '(12) 3971-1470',
    featured: true,
  },
  {
    title: 'Quinta dos Cogumelos',
    category: 'RESTAURANTE_VISITAR',
    address: 'Estrada Municipal José Vital de Barros, km 1,5 - Serrano',
    phone: '(12) 99626-1100',
    whatsapp: '(12) 99626-1100',
    featured: true,
  },
  {
    title: 'Restaurante Pedra do Baú',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua das Araucárias, s/n - Paiol São Pedro',
    phone: '(12) 99703-9512',
    whatsapp: '(12) 99703-9512',
    featured: true,
  },
  {
    title: 'Restaurante Sabor com Arte',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rod. Pref. Benedito Gomes de Souza, km 5,5 - Paiol Grande',
    phone: '(12) 3971-1471',
    websiteUrl: 'https://www.saborcomarte.com.br',
    featured: true,
  },
  {
    title: 'Restaurante Trincheira',
    category: 'RESTAURANTE_VISITAR',
    address: 'Estrada Vereador Benedito Cândido Ribeiro, 1403 - Quilombo',
    phone: '(12) 3971-2686',
  },
  {
    title: 'Restaurante Rancho da Tilápia',
    category: 'RESTAURANTE_VISITAR',
    address: 'Estrada José Francisco de Paula, s/n - Serrano',
    phone: '(11) 99538-7670',
    whatsapp: '(11) 99538-7670',
  },
  {
    title: 'Restaurante Barracão',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rod. SP 42, km 162 - Caracol',
    phone: '(35) 99835-0102',
    whatsapp: '(35) 99835-0102',
  },
  {
    title: 'Pizzaria Rei da Pizza',
    category: 'RESTAURANTE_VISITAR',
    address: 'Travessa Nossa Senhora do Rosário, 86 - Centro',
    phone: '(12) 3971-2465',
  },
  {
    title: 'Pizzaria Deghust',
    category: 'RESTAURANTE_VISITAR',
    address: 'Av. Conselheiro Rodrigues Alves, 400 - Centro',
    phone: '(12) 3971-1870',
  },
  {
    title: 'Japa Dimy Restaurante',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua Cândido José da Silva, 436 - Centro',
    phone: '(12) 3971-2215',
  },
  {
    title: 'Dona Mariquinha Café e Empório',
    category: 'RESTAURANTE_VISITAR',
    address: 'Estrada Vereador Benedito Cândido Ribeiro, 1403 - Quilombo',
    phone: '(11) 99539-9288',
    whatsapp: '(11) 99539-9288',
  },
  {
    title: 'Doce Café',
    category: 'RESTAURANTE_VISITAR',
    address: 'Av. Conselheiro Rodrigues Alves, 463 - Centro',
    phone: '(12) 3971-2177',
  },
  {
    title: 'Brazin Burger',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua Major Miguel Chiaradia, 173, sala 02 - Centro',
    phone: '(12) 99715-6685',
    whatsapp: '(12) 99715-6685',
  },
  {
    title: 'Vinícola Villa Santa Maria',
    category: 'RESTAURANTE_VISITAR',
    address: 'Estrada Municipal José Teothônio Silva, s/n - Baú do Centro',
    phone: '(12) 99746-6298',
    whatsapp: '(12) 99746-6298',
  },
  {
    title: 'Armazém Santa Ana',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rod. Vereador Júlio da Silva, 95 - Centro',
    phone: '(11) 99179-3040',
    whatsapp: '(11) 99179-3040',
  },
  {
    title: 'Ateliê Culinário Chapati',
    category: 'RESTAURANTE_VISITAR',
    address: 'Rua Abade Pedrosa, 88 - Centro',
    phone: '(12) 99748-2425',
    whatsapp: '(12) 99748-2425',
  },
  {
    title: 'Hub São Bento',
    category: 'SERVICO',
    address: 'Rua Cap. Procópio Marcondes Azeredo, 155 - Centro',
    phone: '(12) 99633-8339',
    whatsapp: '(12) 99633-8339',
    websiteUrl: 'https://www.hubsaobento.com.br',
  },
  {
    title: 'Estacionamento Pedra do Baú',
    category: 'SERVICO',
    address: 'Rua das Araucárias, s/n - Paiol São Pedro',
  },
  {
    title: 'Estacionamento Chico Bento',
    category: 'SERVICO',
    address: 'Estrada Municipal Ana Chata',
  },
];
