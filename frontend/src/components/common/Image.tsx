import { type ImgHTMLAttributes } from 'react';

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** Imagens above-the-fold (hero, logo do header). Default: lazy. */
  eager?: boolean;
};

/**
 * Wrapper de <img> com lazy loading + decoding assíncrono por defeito.
 * Usa <Image> em vez de <img> para garantir performance consistente.
 * Para imagens críticas (above-the-fold), passar `eager`.
 */
export function Image({ eager = false, ...props }: ImageProps) {
  return (
    <img
      {...props}
      loading={eager ? 'eager' : props.loading ?? 'lazy'}
      decoding={props.decoding ?? 'async'}
    />
  );
}
