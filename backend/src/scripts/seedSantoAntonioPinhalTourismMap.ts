/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2026 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: seedSantoAntonioPinhalTourismMap.ts
 * @Date: 2026-06-02
 */

import 'reflect-metadata';
import 'dotenv/config';
import { AppDataSource } from '../config/database';
import { runMigrations } from '../utils/runMigrations';
import { logger } from '../utils/logger';
import { seedTourismDestinationMap, TourismHospitalitySeed, TourismListingSeed } from '../utils/destinationTourismSeeder';
import {
  SANTO_ANTONIO_PINHAL_DESTINATION_SEED,
  SANTO_ANTONIO_PINHAL_HOSPITALITY_SEEDS,
  SANTO_ANTONIO_PINHAL_LISTING_SEEDS,
  SANTO_ANTONIO_PINHAL_TOURISM_SOURCE,
} from '../utils/santoAntonioPinhalTourismSeedData';

const log = logger.child({ scope: 'seedSantoAntonioPinhalTourismMap' });

const destinationDescription = `${SANTO_ANTONIO_PINHAL_DESTINATION_SEED.description} Dados factuais importados como curadoria inicial; parcerias oficiais devem ser confirmadas pelos responsaveis.`;

const placeDescription = (seed: TourismHospitalitySeed) => {
  const typeLabel =
    seed.type === 'CHALE'
      ? 'Chale'
      : seed.type === 'HOTEL'
        ? 'Hotel'
        : seed.type === 'POUSADA'
          ? 'Pousada'
          : 'Hospedagem';

  return `${typeLabel} em Santo Antonio do Pinhal cadastrado como curadoria inicial do Ja no Caminho. Fotos, tarifas e regras devem ser confirmadas pelo responsavel.`;
};

const listingDescription = (seed: TourismListingSeed) => {
  if (seed.category === 'RESTAURANTE_VISITAR') {
    return 'Lugar para comer, pedir informacao ou visitar em Santo Antonio do Pinhal. Confirme horarios, disponibilidade, entrega e valores diretamente com o estabelecimento.';
  }
  if (seed.category === 'PASSEIO') {
    return 'Experiencia local para visitantes em Santo Antonio do Pinhal. Confirme disponibilidade, valores e requisitos diretamente com o responsavel.';
  }
  if (seed.category === 'ATRATIVO') {
    return 'Ponto de interesse da curadoria turistica de Santo Antonio do Pinhal.';
  }
  if (seed.category === 'NOITE') {
    return 'Opcao local para sair ou conhecer a noite em Santo Antonio do Pinhal. Confirme horarios antes de visitar.';
  }
  if (seed.category === 'LOJA') {
    return 'Compra local, artesanato ou produto regional em Santo Antonio do Pinhal. Confirme horarios, disponibilidade e valores diretamente com o responsavel.';
  }
  return 'Registro de curadoria local. Confirme horarios, disponibilidade e valores diretamente com o responsavel.';
};

const seed = async () => {
  await AppDataSource.initialize();
  await runMigrations();

  const result = await seedTourismDestinationMap({
    destination: SANTO_ANTONIO_PINHAL_DESTINATION_SEED,
    hospitality: SANTO_ANTONIO_PINHAL_HOSPITALITY_SEEDS,
    listings: SANTO_ANTONIO_PINHAL_LISTING_SEEDS,
    destinationDescription,
    placeDescription,
    listingDescription,
  });

  log.info('Santo Antonio do Pinhal tourism seed saved', {
    source: SANTO_ANTONIO_PINHAL_TOURISM_SOURCE,
    ...result,
  });

  await AppDataSource.destroy();
};

seed().catch(async (error) => {
  log.error('Failed to seed Santo Antonio do Pinhal tourism map', { error });
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
