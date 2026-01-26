/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: maps.ts
 * @Date: 2026-01-26
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Router } from 'express';
import { isValidAddress, isValidCoordinates, parseDurationSeconds } from '../utils/validation.js';

type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
};

const normalizeAddress = (address: string) => {
  return address
    .replace(/\|/g, ', ')
    .replace(/\bcep\b[:\s-]*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const stripZipFromAddress = (address: string) => {
  return address
    .replace(/\b\d{5}-?\d{3}\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .trim();
};

const geocodeAddress = async (address: string, apiKey: string) => {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('region', 'br');
  url.searchParams.set('language', 'pt-BR');

  const response = await fetch(url.toString());
  if (!response.ok) {
    return { ok: false, status: response.status, data: null as any };
  }

  const data = await response.json();
  return { ok: true, status: response.status, data };
};

const router = Router();

router.get('/js-key', (_req, res) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'Chave do Google Maps não configurada.' });
  }
  return res.json({ key: apiKey });
});

router.post('/geocode', async (req, res) => {
  try {
    const address = (req.body?.address || '').toString();
    if (!isValidAddress(address)) {
      return res.status(400).json({ message: 'Informe um endereço válido (mínimo 5 caracteres).' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'Chave do Google Maps não configurada.' });
    }

    const normalizedAddress = normalizeAddress(address);
    const primary = await geocodeAddress(normalizedAddress, apiKey);
    if (!primary.ok) {
      return res.status(500).json({ message: 'Falha ao consultar o Google Geocoding.' });
    }

    let result = primary.data?.results?.[0];
    if (!result) {
      const fallbackAddress = stripZipFromAddress(normalizedAddress);
      if (fallbackAddress && fallbackAddress !== normalizedAddress) {
        const secondary = await geocodeAddress(fallbackAddress, apiKey);
        if (secondary.ok) {
          result = secondary.data?.results?.[0];
        }
      }
    }

    if (!result?.geometry?.location) {
      return res.status(400).json({ message: 'Endereço não encontrado.' });
    }

    const payload: GeocodeResult = {
      lat: Number(result.geometry.location.lat),
      lng: Number(result.geometry.location.lng),
      formattedAddress: result.formatted_address || address,
    };

    return res.json(payload);
  } catch (error) {
    console.error('Geocode error', error);
    return res.status(500).json({ message: 'Erro ao processar o endereço.' });
  }
});

router.post('/route', async (req, res) => {
  try {
    const origin = req.body?.origin;
    const destination = req.body?.destination;

    if (!isValidCoordinates(origin) || !isValidCoordinates(destination)) {
      return res.status(400).json({ message: 'Coordenadas inválidas para rota.' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'Chave do Google Maps não configurada.' });
    }

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
      },
      body: JSON.stringify({
        origin: {
          location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
        },
        destination: {
          location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
        languageCode: 'pt-BR',
        units: 'METRIC',
      }),
    });

    if (!response.ok) {
      return res.status(500).json({ message: 'Falha ao consultar a rota no Google.' });
    }

    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route?.distanceMeters) {
      return res.status(400).json({ message: 'Não foi possível calcular a rota.' });
    }

    const distanceKm = Number((route.distanceMeters / 1000).toFixed(2));
    const durationSeconds = parseDurationSeconds(route.duration);
    const durationMin = durationSeconds ? Math.ceil(durationSeconds / 60) : null;

    return res.json({
      distanceKm,
      durationMin,
    });
  } catch (error) {
    console.error('Route error', error);
    return res.status(500).json({ message: 'Erro ao calcular rota.' });
  }
});

export default router;
