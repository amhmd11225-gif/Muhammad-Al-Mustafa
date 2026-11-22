import { useState } from 'react';
import {
  ChevronDown,
  Home,
  LayoutGrid,
  Phone,
  Search,
  ShoppingCart,
  User,
} from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { PWAInstallButton } from '../PWAInstallButton';
import { PART_CATEGORIES } from '../../types';

interface StorefrontHeaderProps {
  storeName: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenDashboard: () => void;
  isStaffSignedIn: boolean;
  whatsappUrl: string;
}

export function StorefrontHeader({
  storeName,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  cartCount,
  onOpenCart,
  onOpenDashboard,
  isStaffSignedIn,
  whatsappUrl,
}: StorefrontHeaderProps) {
  const [catMenuOpen, setCatMenuOpen] = useState(false);

  const handleNavCategory = (cat: string) => {
    onSelectCategory(cat);
    setCatMenuOpen(false);
    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0F1115] text-white shadow-md w-full">
      {/* Top Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-5">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectCategory('الكل');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="min-w-0 shrink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E] rounded-lg"
        >
          <BrandLogo storeName={storeName} />
        </a>

        {/* Search Input (Desktop & Tablet) */}
        <div className="hidden md:flex flex-1 max-w-lg relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث عن قطعة غيار، نوع السيارة أو الموديل..."
            className="w-full h-11 pr-4 pl-11 rounded-full bg-white text-[#111318] placeholder:text-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
          />
          <Search className="w-5 h-5 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <PWAInstallButton variant="header" />

          <button
            type="button"
            onClick={onOpenDashboard}
            className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title={isStaffSignedIn ? 'الانتقال إلى لوحة التحكم' : 'دخول المدير والموظفين'}
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isStaffSignedIn ? 'لوحة التحكم' : 'دخول الإدارة'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            aria-label="سلة المشتريات"
            className="relative h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-lg bg-white/10 hover:bg-white/15 text-white inline-flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline text-sm font-medium">السلة</span>
            {cartCount > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-[#C8102E] text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden px-3 pb-2.5">
        <div className="relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث عن قطعة غيار أو سيارة..."
            className="w-full h-10 pr-4 pl-10 rounded-full bg-white text-[#111318] placeholder:text-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
          />
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Secondary Navigation Bar matching reference */}
      <nav className="bg-[#161920] border-t border-white/10 w-full">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 flex items-center gap-0.5 sm:gap-4 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => handleNavCategory('الكل')}
            className={`px-3 sm:px-4 py-2.5 font-bold inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'الكل'
                ? 'bg-[#C8102E] text-white'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>الرئيسية</span>
          </button>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setCatMenuOpen((prev) => !prev)}
              className={`px-2.5 sm:px-3.5 py-2.5 font-medium inline-flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedCategory !== 'الكل'
                  ? 'text-white font-bold'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>الأقسام</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {catMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#161920] border border-white/15 rounded-xl shadow-xl py-1.5 z-50">
                <button
                  type="button"
                  onClick={() => handleNavCategory('الكل')}
                  className={`w-full text-right px-4 py-2 text-sm transition-colors cursor-pointer ${
                    selectedCategory === 'الكل'
                      ? 'bg-[#C8102E] text-white font-bold'
                      : 'text-neutral-200 hover:bg-white/10'
                  }`}
                >
                  جميع الأقسام
                </button>
                {PART_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleNavCategory(cat)}
                    className={`w-full text-right px-4 py-2 text-sm transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#C8102E] text-white font-bold'
                        : 'text-neutral-200 hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <a
            href="#about-section"
            className="px-2.5 sm:px-3.5 py-2.5 font-medium text-neutral-300 hover:text-white whitespace-nowrap shrink-0 transition-colors"
          >
            من نحن
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 sm:px-3.5 py-2.5 font-medium text-neutral-300 hover:text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>تواصل معنا</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
