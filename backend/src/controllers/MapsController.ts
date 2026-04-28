import { Request, Response } from 'express';
import { GeoLocationService } from '../services/GeoLocationService';

const geoLocationService = new GeoLocationService();

const isValidAddress = (value: unknown) => String(value || '').trim().length >= 5;

const isValidCoordinates = (value: any) =>
  Number.isFinite(Number(value?.lat)) && Number.isFinite(Number(value?.lng));

export class MapsController {
  static async geocode(req: Request, res: Response) {
    try {
      const address = String(req.body?.address || '').trim();
      if (!isValidAddress(address)) {
        return res.status(400).json({ message: 'Informe um endereço válido (mínimo 5 caracteres).' });
      }

      const result = await geoLocationService.geocodeAddress(address);
      if (!result) {
        return res.status(400).json({ message: 'Endereço não encontrado.' });
      }

      return res.json(result);
    } catch (error) {
      console.error('Maps geocode error', error);
      return res.status(500).json({ message: 'Erro ao processar o endereço.' });
    }
  }

  static async route(req: Request, res: Response) {
    try {
      const origin = req.body?.origin;
      const destination = req.body?.destination;

      if (!isValidCoordinates(origin) || !isValidCoordinates(destination)) {
        return res.status(400).json({ message: 'Coordenadas inválidas para rota.' });
      }

      const route = geoLocationService.estimateRoute(
        { lat: Number(origin.lat), lng: Number(origin.lng) },
        { lat: Number(destination.lat), lng: Number(destination.lng) }
      );

      if (!route) {
        return res.status(400).json({ message: 'Não foi possível calcular a rota.' });
      }

      return res.json(route);
    } catch (error) {
      console.error('Maps route error', error);
      return res.status(500).json({ message: 'Erro ao calcular rota.' });
    }
  }
}
