import { useState } from 'react';
import { BarChart3, Calendar, TrendingUp } from 'lucide-react';
import type { Product, Sale } from '../../types';
import { formatDateTime, formatPrice, isSameDay } from '../../utils/format';

interface SalesAndReportsViewProps {
  mode: 'sales' | 'reports';
  sales: Sale[];
  products: Product[];
  currency: string;
}

export function SalesAndReportsView({
  mode,
  sales,
  products,
  currency,
}: SalesAndReportsViewProps) {
  const [period, setPeriod] = useState<'today' | 'week' | 'all'>('all');

  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);

  const todaySales = sales.filter((s) => isSameDay(s.createdAt, now));
  const weekSales = sales.filter(
    (s) => s.createdAt && s.createdAt.toDate() >= weekAgo
  );

  const visibleSales =
    period === 'today' ? todaySales : period === 'week' ? weekSales : sales;

  const totalRevenue = visibleSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalQty = visibleSales.reduce((sum, s) => sum + s.quantity, 0);

  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const weekRevenue = weekSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const allRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);

  const inventoryValue = products.reduce(
    (sum, p) => sum + p.price * p.quantity,
    0
  );

  // Top sold products
  const topProducts = [...products]
    .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
    .slice(0, 6);

  // Category breakdown
  const categoryStats = products.reduce<
    Record<string, { count: number; stock: number; sold: number }>
  >((acc, p) => {
    if (!acc[p.category]) {
      acc[p.category] = { count: 0, stock: 0, sold: 0 };
    }
    acc[p.category].count += 1;
    acc[p.category].stock += p.quantity;
    acc[p.category].sold += p.soldCount || 0;
    return acc;
  }, {});

  if (mode === 'reports') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <p className="text-xs text-neutral-500">مبيعات اليوم</p>
            <p className="font-num font-extrabold text-2xl text-[#16A34A] mt-1 tabular-nums">
              {formatPrice(todayRevenue, currency)}
            </p>
            <p className="text-xs text-neutral-500 mt-1 tabular-nums">
              {todaySales.length} عملية بيع
            </p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <p className="text-xs text-neutral-500">مبيعات آخر 7 أيام</p>
            <p className="font-num font-extrabold text-2xl text-[#0284C7] mt-1 tabular-nums">
              {formatPrice(weekRevenue, currency)}
            </p>
            <p className="text-xs text-neutral-500 mt-1 tabular-nums">
              {weekSales.length} عملية بيع
            </p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <p className="text-xs text-neutral-500">إجمالي المبيعات المسجلة</p>
            <p className="font-num font-extrabold text-2xl text-[#111318] mt-1 tabular-nums">
              {formatPrice(allRevenue, currency)}
            </p>
            <p className="text-xs text-neutral-500 mt-1 tabular-nums">
              {sales.length} عملية
            </p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <p className="text-xs text-neutral-500">القيمة التقديرية للمخزون الحالي</p>
            <p className="font-num font-extrabold text-2xl text-[#C8102E] mt-1 tabular-nums">
              {formatPrice(inventoryValue, currency)}
            </p>
            <p className="text-xs text-neutral-500 mt-1 tabular-nums">
              {products.reduce((s, p) => s + p.quantity, 0)} قطعة متبقية
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Selling Parts */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h3 className="font-display font-bold text-base text-[#111318] flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-[#C8102E]" />
              <span>أكثر القطع مبيعاً</span>
            </h3>
            <div className="divide-y divide-neutral-100">
              {topProducts.map((p) => (
                <div
                  key={p.id}
                  className="py-3 flex items-center justify-between gap-3 text-sm"
                >
                  <div>
                    <p className="font-bold text-[#111318]">{p.name}</p>
                    <p className="text-xs text-neutral-500">
                      {p.carMake} {p.carModel}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-num font-bold text-emerald-700 tabular-nums">
                      مباع: {p.soldCount || 0}
                    </p>
                    <p className="text-xs text-neutral-500 tabular-nums">
                      متبقي: {p.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Report */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h3 className="font-display font-bold text-base text-[#111318] flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-[#0284C7]" />
              <span>ملخص الأقسام والمخزون</span>
            </h3>
            <div className="divide-y divide-neutral-100">
              {Object.entries(categoryStats).map(([cat, stat]) => (
                <div
                  key={cat}
                  className="py-3 flex items-center justify-between text-sm"
                >
                  <span className="font-bold text-[#111318]">{cat}</span>
                  <div className="flex items-center gap-4 text-xs tabular-nums">
                    <span className="text-neutral-600">أصناف: {stat.count}</span>
                    <span className="text-emerald-700 font-bold">مباع: {stat.sold}</span>
                    <span className="text-[#111318] font-bold">متبقي: {stat.stock}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter & Totals */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(
            [
              { id: 'all', label: 'كل المبيعات' },
              { id: 'today', label: 'مبيعات اليوم' },
              { id: 'week', label: 'آخر 7 أيام' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriod(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                period === tab.id
                  ? 'bg-[#111318] text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-5 text-sm">
          <div>
            <span className="text-xs text-neutral-500 block">عدد القطع</span>
            <strong className="font-num text-[#111318] tabular-nums">
              {totalQty} قطعة
            </strong>
          </div>
          <div>
            <span className="text-xs text-neutral-500 block">إجمالي المبلغ</span>
            <strong className="font-num text-lg text-[#C8102E] tabular-nums">
              {formatPrice(totalRevenue, currency)}
            </strong>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
        {visibleSales.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
            <p className="font-display font-bold text-base text-[#111318]">
              لا توجد عمليات بيع مسجلة في هذه الفترة
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
                  <th className="py-3 px-4 font-bold">القطعة</th>
                  <th className="py-3 px-4 font-bold">السيارة</th>
                  <th className="py-3 px-4 font-bold">الكمية</th>
                  <th className="py-3 px-4 font-bold">الإجمالي</th>
                  <th className="py-3 px-4 font-bold">الموظف المسؤول</th>
                  <th className="py-3 px-4 font-bold">المصدر</th>
                  <th className="py-3 px-4 font-bold">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {visibleSales.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/70">
                    <td className="py-3 px-4 font-display font-bold text-[#111318]">
                      {s.productName}
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {s.carMake} {s.carModel}
                    </td>
                    <td className="py-3 px-4 font-num font-bold tabular-nums">
                      {s.quantity}
                    </td>
                    <td className="py-3 px-4 font-num font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                      {formatPrice(s.totalAmount, currency)}
                    </td>
                    <td className="py-3 px-4 text-neutral-800 font-medium">
                      {s.employeeName}
                    </td>
                    <td className="py-3 px-4 text-xs text-neutral-600">
                      {s.source === 'in_store' ? 'داخل المحل' : 'متجر إلكتروني'}
                    </td>
                    <td className="py-3 px-4 text-xs text-neutral-500 whitespace-nowrap">
                      {formatDateTime(s.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
