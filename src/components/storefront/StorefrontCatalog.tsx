import { Plus, ShoppingCart, PackageX } from 'lucide-react';
import { PART_CATEGORIES, type Product } from '../../types';
import { formatPrice } from '../../utils/format';
import { PartImage } from '../PartImage';

interface StorefrontCatalogProps {
  products: Product[];
  loading: boolean;
  currency: string;
  searchQuery: string;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedCarMake: string;
  onSelectCarMake: (make: string) => void;
  onOrderNow: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onOpenAdminLogin: () => void;
}

export function StorefrontCatalog({
  products,
  loading,
  currency,
  searchQuery,
  selectedCategory,
  onSelectCategory,
  selectedCarMake,
  onSelectCarMake,
  onOrderNow,
  onAddToCart,
  onOpenAdminLogin,
}: StorefrontCatalogProps) {
  const availableMakes = Array.from(
    new Set(products.map((p) => p.carMake.trim()).filter(Boolean))
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'الكل' && p.category !== selectedCategory) {
      return false;
    }
    if (selectedCarMake !== 'الكل' && p.carMake.trim() !== selectedCarMake) {
      return false;
    }
    if (!normalizedQuery) return true;
    return (
      p.name.toLowerCase().includes(normalizedQuery) ||
      p.carMake.toLowerCase().includes(normalizedQuery) ||
      p.carModel.toLowerCase().includes(normalizedQuery) ||
      p.category.toLowerCase().includes(normalizedQuery)
    );
  });

  return (
    <section
      id="catalog-section"
      className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#111318]">
            أحدث المنتجات
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5 tabular-nums">
            {filteredProducts.length} قطعة معروضة
          </p>
        </div>

        {/* Car Make Filter */}
        {availableMakes.length > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor="car-make-filter" className="text-xs text-neutral-500 shrink-0">
              نوع السيارة:
            </label>
            <select
              id="car-make-filter"
              value={selectedCarMake}
              onChange={(e) => onSelectCarMake(e.target.value)}
              className="h-9 px-3 rounded-lg bg-white border border-neutral-200 text-sm text-[#111318] focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
            >
              <option value="الكل">جميع السيارات</option>
              {availableMakes.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
        <button
          type="button"
          onClick={() => onSelectCategory('الكل')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            selectedCategory === 'الكل'
              ? 'bg-[#111318] text-white'
              : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
          }`}
        >
          الكل
        </button>
        {PART_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onSelectCategory(category)}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedCategory === category
                ? 'bg-[#111318] text-white font-bold'
                : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="bg-white border border-neutral-200 rounded-2xl p-3 sm:p-4 animate-pulse"
            >
              <div className="aspect-[4/3] bg-neutral-200 rounded-xl mb-3" />
              <div className="h-4 bg-neutral-200 rounded w-3/4 mx-auto mb-2" />
              <div className="h-3 bg-neutral-200 rounded w-1/2 mx-auto mb-3" />
              <div className="h-5 bg-neutral-200 rounded w-1/3 mx-auto mb-4" />
              <div className="h-10 bg-neutral-200 rounded-xl w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProducts.length === 0 && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto mb-3">
            <PackageX className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-base sm:text-lg text-[#111318] mb-1">
            {products.length === 0
              ? 'لا توجد قطع مضافة في المتجر بعد'
              : 'لم يتم العثور على قطع مطابقة لبحثك'}
          </h3>
          <p className="text-sm text-neutral-500 mb-5">
            {products.length === 0
              ? 'قم بتسجيل الدخول كمدير لإضافة قطع الغيار بالتصوير أو تهيئة الكتالوج الأولي.'
              : 'جرب البحث باسم آخر أو اختر قسماً آخر.'}
          </p>
          {products.length === 0 ? (
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="px-5 py-2.5 rounded-xl bg-[#C8102E] text-white text-sm font-bold hover:bg-[#A60D26] transition-colors cursor-pointer"
            >
              دخول المدير لإضافة القطع
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onSelectCategory('الكل');
                onSelectCarMake('الكل');
              }}
              className="px-5 py-2.5 rounded-xl bg-[#111318] text-white text-sm font-bold hover:bg-black transition-colors cursor-pointer"
            >
              عرض جميع القطع
            </button>
          )}
        </div>
      )}

      {/* Product Grid matching reference */}
      {!loading && filteredProducts.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {filteredProducts.map((product) => {
            const outOfStock = product.quantity <= 0;
            return (
              <article
                key={product.id}
                className="bg-white border border-neutral-200 rounded-2xl p-3 sm:p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div>
                  <div className="aspect-[4/3] w-full rounded-xl bg-[#F5F6F8] overflow-hidden mb-3">
                    <PartImage
                      src={product.imageUrl}
                      alt={`${product.name} ${product.carMake} ${product.carModel}`}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  {/* Clean unboxed metadata line */}
                  <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-neutral-500 mb-1.5 truncate">
                    <span>{product.condition}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        outOfStock
                          ? 'text-[#C8102E] font-bold'
                          : 'text-emerald-700 font-medium tabular-nums'
                      }
                    >
                      {outOfStock ? 'نفذت الكمية' : `متوفر: ${product.quantity}`}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-sm sm:text-lg text-[#111318] text-center line-clamp-1">
                    {product.name}
                  </h3>

                  <p className="text-xs sm:text-sm text-neutral-600 text-center mt-0.5 line-clamp-1">
                    {product.carMake} {product.carModel}
                  </p>
                </div>

                <div className="mt-3 pt-2">
                  <div className="font-num font-extrabold text-base sm:text-xl text-[#C8102E] text-center mb-3 tabular-nums">
                    {formatPrice(product.price, currency)}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={outOfStock}
                      onClick={() => onOrderNow(product)}
                      className={`flex-1 h-10 sm:h-11 px-3 rounded-xl font-display font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                        outOfStock
                          ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                          : 'bg-[#C8102E] hover:bg-[#A60D26] text-white cursor-pointer'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4 shrink-0" />
                      <span>{outOfStock ? 'غير متوفر' : 'اطلب الآن'}</span>
                    </button>

                    {!outOfStock && (
                      <button
                        type="button"
                        onClick={() => onAddToCart(product)}
                        title="إضافة إلى السلة"
                        aria-label={`إضافة ${product.name} إلى السلة`}
                        className="w-10 sm:w-11 h-10 sm:h-11 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-[#111318] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
