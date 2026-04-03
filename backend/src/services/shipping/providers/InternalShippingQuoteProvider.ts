import { ShippingQuoteProviderInput, ShippingQuoteResult } from '../types';
import { ShippingQuoteProvider } from './ShippingQuoteProvider';

export class InternalShippingQuoteProvider implements ShippingQuoteProvider {
  readonly name = 'internal_postal_v1';

    /**
   * Executes parse distance factor business logic.
   *
   * @author Edmilson Lopes
   */
private parseDistanceFactor(originZip: string, destinationZip: string) {
    if (!originZip || !destinationZip) return 1.2;
    if (originZip.slice(0, 3) === destinationZip.slice(0, 3)) return 1.0;
    if (originZip.slice(0, 2) === destinationZip.slice(0, 2)) return 1.25;
    return 1.5;
  }

    /**
   * Calculates values for quote.
   *
   * @author Edmilson Lopes
   */
async quote(input: ShippingQuoteProviderInput): Promise<ShippingQuoteResult> {
    const weightKg = Math.max(0.3, input.pkg.weightG / 1000);
    const volumetricKg = Math.max(
      0.3,
      (input.pkg.lengthCm * input.pkg.widthCm * input.pkg.heightCm) / 6000
    );
    const billableWeightKg = Math.max(weightKg, volumetricKg);
    const distanceFactor = this.parseDistanceFactor(input.originZip, input.destinationZip);
    const baseFee = Number.isFinite(input.baseFee) && input.baseFee > 0 ? input.baseFee : 9.9;

    const pacPrice = Number((baseFee + billableWeightKg * 4.6 * distanceFactor).toFixed(2));
    const sedexPrice = Number((baseFee + 8 + billableWeightKg * 6.9 * distanceFactor).toFixed(2));
    const pacDays = distanceFactor <= 1 ? 4 : distanceFactor <= 1.25 ? 6 : 8;
    const sedexDays = distanceFactor <= 1 ? 2 : distanceFactor <= 1.25 ? 3 : 4;

    return {
      provider: this.name,
      services: [
        {
          serviceCode: 'PAC',
          serviceName: 'PAC',
          price: pacPrice,
          estimatedDays: pacDays,
          currency: 'BRL',
        },
        {
          serviceCode: 'SEDEX',
          serviceName: 'SEDEX',
          price: sedexPrice,
          estimatedDays: sedexDays,
          currency: 'BRL',
        },
      ],
      debug: {
        billableWeightKg: Number(billableWeightKg.toFixed(3)),
        weightKg: Number(weightKg.toFixed(3)),
        volumetricKg: Number(volumetricKg.toFixed(3)),
        distanceFactor,
      },
    };
  }
}

