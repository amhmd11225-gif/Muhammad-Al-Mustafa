import { Headphones, MessageCircle, ShieldCheck, ThumbsUp, Truck } from 'lucide-react';
import type { StoreSettings } from '../../types';
import { buildGeneralWhatsappUrl } from '../../utils/format';

interface StorefrontTrustAndFooterProps {
  settings: StoreSettings;
}

export function StorefrontTrustAndFooter({
  settings,
}: StorefrontTrustAndFooterProps) {
  const whatsappUrl = buildGeneralWhatsappUrl(settings.whatsappNumber);

  const trustFeatures = [
    {
      icon: ThumbsUp,
      title: 'جودة مضمونة',
      desc: 'قطع مستعملة وفرط أصلية مفحوصة',
    },
    {
      icon: Headphones,
      title: 'دعم فني',
      desc: 'نساعدك في مطابقة القطعة لسيارتك',
    },
    {
      icon: Truck,
      title: 'توصيل لجميع المحافظات',
      desc: 'شحن سريع وموثوق لباب بيتك أو الورشة',
    },
    {
      icon: ShieldCheck,
      title: 'دفع عند الاستلام',
      desc: 'افحص قطعتك أولاً ثم ادفع نقداً',
    },
  ];

  return (
    <>
      {/* 4 Trust Feature Cards matching reference */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {trustFeatures.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 text-center flex flex-col items-center justify-center"
              >
                <div className="w-11 h-11 rounded-xl bg-neutral-100 text-[#111318] flex items-center justify-center mb-2.5">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-sm sm:text-base text-[#111318]">
                  {item.title}
                </h3>
                <p className="text-xs text-neutral-500 mt-1">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* About Us Section */}
      <section id="about-section" className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="font-display font-extrabold text-lg sm:text-xl text-[#111318] mb-2">
              من نحن — {settings.storeName}
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              {settings.aboutText}
            </p>
            {settings.address && (
              <p className="text-xs text-neutral-500 mt-3">
                العنوان: {settings.address}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Dark Footer CTA Banner matching reference */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <div className="bg-[#11141A] text-white rounded-2xl px-6 sm:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="text-center sm:text-right">
            <p className="font-display font-extrabold text-lg sm:text-2xl text-white">
              كل ما تحتاجه لسيارتك في مكان واحد
            </p>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              للاستفسار عن أي قطعة غير معروضة، راسلنا مباشرة وسنوفرها لك.
            </p>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 px-6 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white font-display font-bold text-sm sm:text-base inline-flex items-center gap-2.5 transition-colors whitespace-nowrap shrink-0 shadow-md"
          >
            <MessageCircle className="w-5 h-5" />
            <span>تواصل معنا عبر واتساب</span>
          </a>
        </div>
        <p className="text-center text-xs text-neutral-500 mt-4">
          © {new Date().getFullYear()} {settings.storeName} — جميع الحقوق محفوظة
        </p>
      </footer>
    </>
  );
}
