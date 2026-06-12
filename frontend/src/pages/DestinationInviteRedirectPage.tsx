// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from '@phosphor-icons/react';
import { PublicDestinationShell } from '../components/Destinations/PublicDestinationShell';
import { Button, SurfaceCard } from '../components/ui';
import { destinationService } from '../services/destinationService';
import { buildListingClaimUrl } from '../utils/destinationListingClaim';

const appendParam = (params: URLSearchParams, key: string, value: any) => {
  const normalized = String(value || '').trim();
  if (normalized) params.set(key, normalized);
};

const buildHospitalityPartnerRequestPath = (destination: any, place: any) => {
  const params = new URLSearchParams();
  params.set('source', 'hospitality_place_claim');
  params.set('focus', 'partner');
  params.set('partnerType', 'HOSPITALITY');
  params.set('placeType', String(place?.type || 'CHALE'));
  appendParam(params, 'destinationId', destination?.id);
  appendParam(params, 'destinationSlug', destination?.slug);
  appendParam(params, 'destinationCity', destination?.city || destination?.name);
  appendParam(params, 'destinationState', destination?.state);
  appendParam(params, 'placeId', place?.id);
  appendParam(params, 'placeSlug', place?.slug);
  appendParam(params, 'name', place?.name);
  appendParam(params, 'description', place?.description);
  appendParam(params, 'address', place?.address);
  appendParam(params, 'city', place?.city || destination?.city || destination?.name);
  appendParam(params, 'state', place?.state || destination?.state);
  appendParam(params, 'zipCode', place?.zipCode);
  appendParam(params, 'whatsapp', place?.whatsapp || place?.phone);
  appendParam(params, 'instagramUrl', place?.instagramUrl);
  appendParam(params, 'websiteUrl', place?.websiteUrl);
  appendParam(params, 'logoUrl', place?.logoUrl);
  appendParam(params, 'bannerUrl', place?.bannerUrl);
  appendParam(params, 'message', `Quero assumir e atualizar o perfil ${String(place?.name || '').trim()} no Já no Caminho.`);
  return `/destinos/cadastrar?${params.toString()}#dados-parceiro`;
};

export function DestinationInviteRedirectPage({ kind = 'listing' }: { kind?: 'listing' | 'hospitality' }) {
  const navigate = useNavigate();
  const { destinationSlug, listingId, placeSlug } = useParams();
  const [status, setStatus] = useState('Validando convite seguro...');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const resolveInvite = async () => {
      setError('');
      try {
        if (!destinationSlug) throw new Error('Convite sem cidade.');
        const payload = await destinationService.getPublic(destinationSlug);
        if (!active) return;
        const destination = payload?.destination || {};

        if (kind === 'hospitality') {
          const place = (payload?.hospitalityPlaces || []).find((item: any) => String(item.slug) === String(placeSlug));
          if (!place) throw new Error('Não encontramos essa hospedagem no guia.');
          setStatus('Abrindo cadastro da hospedagem...');
          navigate(buildHospitalityPartnerRequestPath(destination, place), { replace: true });
          return;
        }

        const listing = (payload?.listings || []).find((item: any) => String(item.id) === String(listingId));
        if (!listing) throw new Error('Não encontramos esse serviço no guia.');
        setStatus('Abrindo cadastro da loja...');
        navigate(buildListingClaimUrl(destination, listing, {
          deliveryMode: listing?.hospitalityPlaceId ? 'selected' : 'selected',
          placeIds: listing?.hospitalityPlaceId ? [listing.hospitalityPlaceId] : [],
        }), { replace: true });
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || 'Não foi possível abrir esse convite.');
        setStatus('');
      }
    };

    resolveInvite();
    return () => {
      active = false;
    };
  }, [destinationSlug, kind, listingId, navigate, placeSlug]);

  return (
    <PublicDestinationShell active="register" backTo="/destinos" backLabel="Voltar" contextLabel="Convite seguro">
      <div className="mx-auto flex min-h-[62vh] max-w-xl items-center px-4 py-10">
        <SurfaceCard tone={error ? 'warning' : 'default'} padding="lg" className="w-full rounded-[2rem] text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[#edf6f8] text-[#153A4C]">
            <ShieldCheck size={34} weight="duotone" />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.18em] text-[#336886]">Já no Caminho</p>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
            Convite oficial
          </h1>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">
            {error || status || 'Abrindo o cadastro com segurança no domínio janocaminho.com.br.'}
          </p>
          {error ? (
            <Button
              type="button"
              size="lg"
              onClick={() => navigate('/destinos', { replace: true })}
              rightIcon={<ArrowRight size={16} weight="bold" />}
              className="mt-5 rounded-full"
            >
              Ver destinos
            </Button>
          ) : null}
        </SurfaceCard>
      </div>
    </PublicDestinationShell>
  );
}
