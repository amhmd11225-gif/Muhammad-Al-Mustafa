import { useRef, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Camera,
  CheckCircle2,
  ClipboardList,
  Package,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import type { DashboardTab, Order, Product, Sale } from '../../types';
import { ORDER_STATUS_LABELS } from '../../types';
import {
  formatDateTime,
  formatPrice,
  formatShortDate,
  isSameDay,
} from '../../utils/format';

interface DashboardHomeProps {
  products: Product[];
  orders: Order[];
  sales: Sale[];
  currency: string;
  onNavigate: (tab: DashboardTab) => void;
  onQuickPhotoSelected: (file: File) => void;
}

export function DashboardHome({
  products,
  orders,
  sales,
  currency,
  onNavigate,
  onQuickPhotoSelected,
}: DashboardHomeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date();
  const totalRemainingPieces = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalSoldPieces = products.reduce((sum, p) => sum + (p.soldCount || 0), 0);
  const lowStockProducts = products.filter((p) => p.quantity <= p.minStock);
  const newOrders = orders.filter((o) => o.status === 'new');

  const todaySales = sales.filter((s) => isSameDay(s.createdAt, today));
  const todaySalesAmount = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const todaySalesQty = todaySales.reduce((sum, s) => sum + s.quantity, 0);

  // Weekly chart data (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const daySales = sales.filter((s) => isSameDay(s.createdAt, d));
    const count = daySales.reduce((sum, s) => sum + s.quantity, 0);
    const amount = daySales.reduce((sum, s) => sum + s.totalAmount, 0);
    return {
      label: formatShortDate(d),
      count,
      amount,
    };
  });

  const maxChartCount = Math.max(5, ...last7Days.map((d) => d.count));

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onQuickPhotoSelected(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top KPI Cards matching reference + required inventory numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => onNavigate('orders')}
          className="bg-[#C8102E] text-white rounded-2xl p-4 sm:p-5 text-right shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-white/90">
              الطلبات الجديدة
            </span>
            <ClipboardList className="w-5 h-5 text-white/85" />
          </div>
          <p className="font-num font-extrabold text-2xl sm:text-3xl tabular-nums">
            {newOrders.length}
          </p>
          <p className="text-[11px] text-white/80 mt-1">
            إجمالي الطلبات: {orders.length}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('sales')}
          className="bg-[#16A34A] text-white rounded-2xl p-4 sm:p-5 text-right shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-white/90">
              مبيعات اليوم
            </span>
            <ShoppingCart className="w-5 h-5 text-white/85" />
          </div>
          <p className="font-num font-extrabold text-xl sm:text-2xl tabular-nums truncate">
            {formatPrice(todaySalesAmount, currency)}
          </p>
          <p className="text-[11px] text-white/85 mt-1 tabular-nums">
            {todaySalesQty} قطعة مباعة اليوم
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('inventory')}
          className="bg-[#0284C7] text-white rounded-2xl p-4 sm:p-5 text-right shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-white/90">
              المنتجات والمتبقي
            </span>
            <Package className="w-5 h-5 text-white/85" />
          </div>
          <p className="font-num font-extrabold text-2xl sm:text-3xl tabular-nums">
            {totalRemainingPieces}
          </p>
          <p className="text-[11px] text-white/85 mt-1 tabular-nums">
            {products.length} نوع قطعة في المخزن
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('sales')}
          className="bg-[#11141A] text-white rounded-2xl p-4 sm:p-5 text-right shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-neutral-300">
              القطع المباعة
            </span>
            <TrendingUp className="w-5 h-5 text-[#C8102E]" />
          </div>
          <p className="font-num font-extrabold text-2xl sm:text-3xl tabular-nums">
            {totalSoldPieces}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1 tabular-nums">
            تحتاج شراء: {lowStockProducts.length} صنف
          </p>
        </button>
      </div>

      {/* Quick Add by Photo + Weekly Sales Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Add Product by Camera Widget matching reference */}
        <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#111318] flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#0284C7]" />
              <span>إضافة منتج بالتصوير</span>
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('add-part')}
              className="text-xs font-bold text-[#C8102E] hover:underline cursor-pointer"
            >
              فتح النموذج الكامل
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 min-h-[160px] border-2 border-dashed border-neutral-300 hover:border-[#C8102E] rounded-xl bg-neutral-50 hover:bg-red-50/30 transition-colors flex flex-col items-center justify-center p-5 text-center cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-neutral-200/80 text-neutral-700 flex items-center justify-center mb-3">
              <Camera className="w-6 h-6" />
            </div>
            <p className="font-display font-bold text-sm text-[#111318]">
              اضغط لالتقاط صورة القطعة أو اختيار ملف
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              مع إمكانية التعرف على اسم القطعة بالذكاء الاصطناعي
            </p>
          </button>
        </div>

        {/* Weekly Sales Chart matching reference */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#111318] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#0284C7]" />
              <span>المبيعات خلال الأسبوع</span>
            </h2>
            <span className="text-xs text-neutral-500">عدد القطع المباعة يومياً</span>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 pt-4 border-b border-neutral-200 pb-2">
            {last7Days.map((day, idx) => {
              const heightPct = Math.max(
                day.count > 0 ? 14 : 6,
                Math.round((day.count / maxChartCount) * 100)
              );
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end h-full group"
                  title={`${day.label}: ${day.count} قطعة (${formatPrice(day.amount, currency)})`}
                >
                  <span className="text-[11px] font-bold text-neutral-600 mb-1 tabular-nums">
                    {day.count}
                  </span>
                  <div
                    className={`w-full max-w-[38px] rounded-t-lg transition-all duration-300 ${
                      day.count > 0 ? 'bg-[#0284C7] group-hover:bg-[#C8102E]' : 'bg-neutral-200'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 sm:gap-4 pt-2">
            {last7Days.map((day, idx) => (
              <span
                key={idx}
                className="flex-1 text-center text-[11px] sm:text-xs font-medium text-neutral-600 truncate"
              >
                {day.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Status & Low Stock Alert Cards matching reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#EAF7EE] border border-emerald-200 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-800 font-display font-bold text-base">
              <CheckCircle2 className="w-5 h-5" />
              <span>المخزون الحالي</span>
            </div>
            <p className="font-num font-extrabold text-2xl sm:text-3xl text-emerald-700 mt-1 tabular-nums">
              {totalRemainingPieces} قطعة
            </p>
            <p className="text-xs text-emerald-800/80 mt-1">
              موزعة على {products.length} صنف مختلف
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="h-10 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-display font-bold text-xs sm:text-sm whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            عرض المخزون
          </button>
        </div>

        <div className="bg-[#FDF0F2] border border-red-200 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#C8102E] font-display font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>القطع التي تحتاج شراء أو قربت تنفد</span>
            </div>
            <p className="font-num font-extrabold text-2xl sm:text-3xl text-[#C8102E] mt-1 tabular-nums">
              {lowStockProducts.length} قطعة
            </p>
            <p className="text-xs text-red-900/80 mt-1">
              {products.filter((p) => p.quantity === 0).length} نافدة بالكامل
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="h-10 px-4 rounded-xl bg-[#C8102E] hover:bg-[#A60D26] text-white font-display font-bold text-xs sm:text-sm whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            عرض التفاصيل
          </button>
        </div>
      </div>

      {/* Recent Sales + Recent Orders + Low Stock List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Latest Sold Items */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-base text-[#111318]">
              آخر القطع المباعة
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('sales')}
              className="text-xs font-bold text-[#C8102E] hover:underline cursor-pointer"
            >
              عرض الكل
            </button>
          </div>

          {sales.length === 0 ? (
            <p className="text-sm text-neutral-500 py-6 text-center">
              لم يتم تسجيل مبيعات بعد.
            </p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {sales.slice(0, 5).map((sale) => (
                <div
                  key={sale.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-[#111318] truncate">
                      {sale.productName} × {sale.quantity}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {sale.employeeName} · {formatDateTime(sale.createdAt)}
                    </p>
                  </div>
                  <span className="font-num font-bold text-sm text-emerald-700 whitespace-nowrap tabular-nums">
                    {formatPrice(sale.totalAmount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest Orders */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-base text-[#111318]">
              آخر طلبات المتجر
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs font-bold text-[#C8102E] hover:underline cursor-pointer"
            >
              عرض الطلبات
            </button>
          </div>

          {orders.length === 0 ? (
            <p className="text-sm text-neutral-500 py-6 text-center">
              لا توجد طلبات واردة من المتجر حتى الآن.
            </p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-[#111318] truncate">
                      {order.customerName} — {order.items.map((i) => i.productName).join('، ')}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {ORDER_STATUS_LABELS[order.status]} · {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <span className="font-num font-bold text-sm text-[#C8102E] whitespace-nowrap tabular-nums">
                    {formatPrice(order.totalAmount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Watchlist */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <h3 className="font-display font-bold text-base text-[#111318] mb-3">
            تنبيه: قطع قربت تنفد أو تحتاج شراء ({lowStockProducts.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-red-200 bg-red-50/40 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm text-[#111318] truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-neutral-600 truncate">
                    {item.carMake} {item.carModel}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#C8102E] whitespace-nowrap tabular-nums">
                  {item.quantity === 0 ? 'نافدة (0)' : `باقي ${item.quantity}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
