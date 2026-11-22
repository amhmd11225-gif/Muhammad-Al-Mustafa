interface BrandLogoProps {
  storeName?: string;
  compact?: boolean;
}

export function BrandLogo({ storeName = 'قطع غيار السيارات', compact = false }: BrandLogoProps) {
  return (
    <div className="flex items-center gap-2.5 select-none whitespace-nowrap shrink-0">
      <div className="relative flex items-center justify-center w-11 h-9 shrink-0">
        <svg
          viewBox="0 0 88 60"
          className="w-full h-full"
          aria-hidden="true"
        >
          {/* Sleek red car roof/silhouette matching reference */}
          <path
            d="M8 31 C16 20, 32 10, 52 10 C66 10, 76 17, 81 24 L68 24 C60 17, 46 15, 31 19 C22 21, 15 26, 8 31 Z"
            fill="#C8102E"
          />
          <path
            d="M4 34 C14 31, 30 29, 44 30 L42 34 C29 34, 16 35, 4 37 Z"
            fill="#FFFFFF"
            opacity="0.9"
          />
          {/* Mechanical Gear */}
          <g transform="translate(59, 36)">
            <path
              d="M0 -15 L3 -15 L4 -11.5 L7.5 -10 L10.5 -12.5 L12.5 -10.5 L10 -7.5 L11.5 -4 L15 -3 L15 3 L11.5 4 L10 7.5 L12.5 10.5 L10.5 12.5 L7.5 10 L4 11.5 L3 15 L-3 15 L-4 11.5 L-7.5 10 L-10.5 12.5 L-12.5 10.5 L-10 7.5 L-11.5 4 L-15 3 L-15 -3 L-11.5 -4 L-10 -7.5 L-12.5 -10.5 L-10.5 -12.5 L-7.5 -10 L-4 -11.5 L-3 -15 Z"
              fill="#FFFFFF"
            />
            <circle cx="0" cy="0" r="6" fill="#0F1115" />
          </g>
        </svg>
      </div>
      {!compact && (
        <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-white">
          {storeName}
        </span>
      )}
    </div>
  );
}
