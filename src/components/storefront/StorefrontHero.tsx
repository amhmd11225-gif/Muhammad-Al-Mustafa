import { HERO_BANNER_IMAGE } from '../../data/seedCatalog';

interface StorefrontHeroProps {
  storeName: string;
  onBrowseClick: () => void;
}

export function StorefrontHero({ storeName, onBrowseClick }: StorefrontHeroProps) {
  return (
    <section id="top" className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6 w-full">
      <div className="relative overflow-hidden rounded-2xl bg-[#0F1115] min-h-[260px] sm:min-h-[360px] lg:min-h-[420px] flex items-center shadow-sm">
        <img
          src={HERO_BANNER_IMAGE}
          alt={storeName}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Measured scrim keeping all 7 cars clearly visible while guaranteeing crisp text contrast */}
        <div
          className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/30 to-transparent"
          aria-hidden="true"
        />

        <div className="relative z-10 w-full px-6 sm:px-12 py-8 sm:py-12 flex flex-col items-start max-w-lg">
          <h1
            className="font-display font-extrabold text-white leading-tight mb-4"
            style={{
              fontSize: 'clamp(1.85rem, 4vw, 3.25rem)',
              textWrap: 'balance',
            }}
          >
            {storeName}
          </h1>

          <div className="inline-block -skew-x-6 bg-[#C8102E] px-5 py-2 rounded-md shadow-md mb-6">
            <span className="block skew-x-6 font-display font-bold text-white text-base sm:text-xl whitespace-nowrap">
              جودة عالية .. سعر مناسب
            </span>
          </div>

          <button
            type="button"
            onClick={onBrowseClick}
            className="px-6 py-2.5 rounded-xl bg-white text-[#111318] font-display font-bold text-sm hover:bg-neutral-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            تصفح القطع المتوفرة
          </button>
        </div>
      </div>
    </section>
  );
}
