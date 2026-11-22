import { useState } from 'react';
import { Wrench } from 'lucide-react';

interface PartImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function PartImage({ src, alt, className = '' }: PartImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 text-neutral-400 p-4 text-center ${className}`}
      >
        <Wrench className="w-8 h-8 mb-1.5 text-neutral-400" />
        <span className="text-xs font-medium text-neutral-500 line-clamp-1">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
