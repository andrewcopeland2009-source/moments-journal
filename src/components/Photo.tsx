import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { cachedUrl, decodedUrl } from '../lib/images';
import { useJournal } from '../state/journal';
import { ease } from '../lib/motion';

interface Props {
  id: string;
  /** Load the full-resolution image over the thumbnail. */
  full?: boolean;
  className?: string;
  fit?: 'cover' | 'contain';
  alt?: string;
}

/**
 * A photograph from the journal: an average-colour placeholder, a shimmer while
 * pixels load, then a quiet scale-and-fade reveal. Images already on screen
 * elsewhere appear instantly so shared-element transitions stay seamless.
 */
export function Photo({ id, full = false, className = '', fit = 'cover', alt = '' }: Props) {
  const meta = useJournal().photos.get(id);
  const [thumb, setThumb] = useState(() => cachedUrl(id, 'thumb'));
  const [hi, setHi] = useState(() => (full ? cachedUrl(id, 'full') : undefined));
  const [instant] = useState(() => !!cachedUrl(id, 'thumb'));

  useEffect(() => {
    let live = true;
    if (!thumb) decodedUrl(id, 'thumb').then((u) => live && u && setThumb(u));
    if (full && !hi) decodedUrl(id, 'full').then((u) => live && u && setHi(u));
    return () => {
      live = false;
    };
  }, [id, full, thumb, hi]);

  const objectFit = fit === 'cover' ? 'object-cover' : 'object-contain';

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ backgroundColor: meta?.color }}>
      {!thumb && <div className="shimmer absolute inset-0 opacity-60 mix-blend-soft-light" />}
      {thumb && (
        <motion.img
          src={thumb}
          alt={alt}
          draggable={false}
          className={`absolute inset-0 h-full w-full ${objectFit}`}
          initial={instant ? false : { opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: ease.out }}
        />
      )}
      {hi && (
        <motion.img
          src={hi}
          alt={alt}
          draggable={false}
          className={`absolute inset-0 h-full w-full ${objectFit}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        />
      )}
    </div>
  );
}
