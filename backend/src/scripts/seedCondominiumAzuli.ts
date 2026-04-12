/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: seedCondominiumAzuli.ts
 * @Date: 2026-04-12
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import 'reflect-metadata';
import 'dotenv/config';
import { AppDataSource } from '../config/database';
import { runMigrations } from '../utils/runMigrations';
import { logger } from '../utils/logger';

const CONDOMINIUM_SLUG = 'spazio-campo-azuli';
const OPTIONAL_STORE_SLUG = String(process.env.STORE_SLUG || '').trim();

/**
 * Seeds the Campo Azuli condominium used for local validation of the condominium Hub.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-04-12
 */
const seed = async () => {
  await AppDataSource.initialize();
  await runMigrations();

  const rows: Array<{ id: string }> = await AppDataSource.query(
    `
      INSERT INTO condominiums (
        name,
        slug,
        description,
        address,
        city,
        state,
        zip_code,
        logo_url,
        active,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        TRUE,
        NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip_code = EXCLUDED.zip_code,
        logo_url = EXCLUDED.logo_url,
        active = TRUE,
        updated_at = NOW()
      RETURNING id;
    `,
    [
      'Condominio Spazio Campo Azuli',
      CONDOMINIUM_SLUG,
      'Feira local do Condominio Spazio Campo Azuli.',
      'R. Sebastiao Sorato, 50 - Jardim Paraiso',
      'Sao Jose dos Campos',
      'SP',
      '12235431',
      '/uploads/condominiums/azuli.png',
    ]
  );

  const condominiumId = rows[0]?.id;
  logger.info('Condominium seed saved', { condominiumId, slug: CONDOMINIUM_SLUG });

  if (OPTIONAL_STORE_SLUG) {
    const linkedRows = await AppDataSource.query(
      `
        INSERT INTO store_condominiums (
          store_id,
          condominium_id,
          active,
          schedule,
          pickup_instructions,
          allow_pickup_at_stall,
          allow_apartment_delivery,
          apartment_delivery_fee,
          notes,
          updated_at
        )
        SELECT
          s.id,
          $1,
          TRUE,
          $2::jsonb,
          $3,
          TRUE,
          TRUE,
          0,
          $4,
          NOW()
        FROM stores s
        WHERE s.slug = $5
        ON CONFLICT (store_id, condominium_id) DO UPDATE SET
          active = EXCLUDED.active,
          schedule = EXCLUDED.schedule,
          pickup_instructions = EXCLUDED.pickup_instructions,
          allow_pickup_at_stall = EXCLUDED.allow_pickup_at_stall,
          allow_apartment_delivery = EXCLUDED.allow_apartment_delivery,
          apartment_delivery_fee = EXCLUDED.apartment_delivery_fee,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING store_id;
      `,
      [
        condominiumId,
        JSON.stringify([
          {
            day: 5,
            intervals: [
              {
                start: '17:00',
                end: '22:00',
              },
            ],
          },
        ]),
        'Retirada na barraca principal da feira.',
        'Vinculo inicial para teste do Hub de condominios.',
        OPTIONAL_STORE_SLUG,
      ]
    );

    if (linkedRows.length === 0) {
      logger.warn('Store slug not found; condominium was created without store link', { storeSlug: OPTIONAL_STORE_SLUG });
    } else {
      logger.info('Store linked to condominium seed', { storeSlug: OPTIONAL_STORE_SLUG, condominiumSlug: CONDOMINIUM_SLUG });
    }
  }

  await AppDataSource.destroy();
};

seed().catch(async (error) => {
  logger.error('Failed to seed Campo Azuli condominium', { error });
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
