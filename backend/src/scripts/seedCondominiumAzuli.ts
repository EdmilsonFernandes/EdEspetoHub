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

const nextFridayDate = () => {
  const now = new Date();
  const saoPauloNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const day = saoPauloNow.getDay();
  const hour = saoPauloNow.getHours();
  const daysUntilFriday = (5 - day + 7) % 7;
  const shouldUseNextWeek = daysUntilFriday === 0 && hour >= 22;
  const next = new Date(saoPauloNow);
  next.setDate(saoPauloNow.getDate() + daysUntilFriday + (shouldUseNextWeek ? 7 : 0));
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const dd = String(next.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

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

  const firstEventDate = nextFridayDate();
  const eventRows: Array<{ id: string }> = await AppDataSource.query(
    `
      INSERT INTO condominium_events (
        condominium_id,
        title,
        status,
        starts_at,
        ends_at,
        pickup_location,
        notes,
        active,
        updated_at
      )
      VALUES (
        $1,
        $2,
        'scheduled',
        ($3 || 'T17:00:00-03:00')::timestamptz,
        ($3 || 'T22:00:00-03:00')::timestamptz,
        $4,
        $5,
        TRUE,
        NOW()
      )
      ON CONFLICT (condominium_id, starts_at) DO UPDATE SET
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        ends_at = EXCLUDED.ends_at,
        pickup_location = EXCLUDED.pickup_location,
        notes = EXCLUDED.notes,
        active = TRUE,
        updated_at = NOW()
      RETURNING id;
    `,
    [
      condominiumId,
      'Feira do Spazio Campo Azuli',
      firstEventDate,
      'Barraca principal da feira',
      'Evento inicial para validar agenda de feiras no Hub de condominios.',
    ]
  );

  const eventId = eventRows[0]?.id || (await AppDataSource.query(
    `
      SELECT id
      FROM condominium_events
      WHERE condominium_id = $1
        AND starts_at = ($2 || 'T17:00:00-03:00')::timestamptz
      LIMIT 1;
    `,
    [condominiumId, firstEventDate]
  ))[0]?.id;

  logger.info('Condominium event seed saved', { condominiumId, eventId, startsAt: `${firstEventDate}T17:00:00-03:00` });

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

      if (eventId) {
        await AppDataSource.query(
          `
            INSERT INTO condominium_event_stores (
              event_id,
              store_id,
              active,
              allow_pickup_at_stall,
              allow_apartment_delivery,
              apartment_delivery_fee,
              notes,
              updated_at
            )
            SELECT
              $1,
              s.id,
              TRUE,
              TRUE,
              TRUE,
              0,
              $2,
              NOW()
            FROM stores s
            WHERE s.slug = $3
            ON CONFLICT (event_id, store_id) DO UPDATE SET
              active = EXCLUDED.active,
              allow_pickup_at_stall = EXCLUDED.allow_pickup_at_stall,
              allow_apartment_delivery = EXCLUDED.allow_apartment_delivery,
              apartment_delivery_fee = EXCLUDED.apartment_delivery_fee,
              notes = EXCLUDED.notes,
              updated_at = NOW();
          `,
          [eventId, 'Participacao confirmada na proxima feira do Campo Azuli.', OPTIONAL_STORE_SLUG]
        );
        logger.info('Store linked to condominium event seed', { storeSlug: OPTIONAL_STORE_SLUG, eventId });
      }
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
