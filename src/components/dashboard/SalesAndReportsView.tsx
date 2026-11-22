import { useMemo, useState } from 'react';
import { BarChart3, Calendar, ShoppingBag, Store, TrendingUp } from 'lucide-react';
import type { Product, Sale } from '../../types';
import { formatDateTime, formatPrice, isSameDay } from '../../utils/format';

interface SalesAndReportsViewProps {
  mode: 'sales' | 'reports';
  sales: Sale[];
  products: Product[];
  currency: string;
}

type PeriodFilter =
  | 'all'
  | 'today'
  | 'week'
  | 'this_month'
  | 'last_month'
  | 'month_year'
  | 'custom_range';

type SourceFilter = 'all' | 'in_store' | 'online';

const ARABIC_MONTHS = [
  { value: 1, label: 'كانون الثاني (شهر 1)' },
  { value: 2, label: 'شباط (شهر 2)' },
  { value: 3, label: 'آذار (شهر 3)' },
  { value: 4, label: 'نيسان (شهر 4)' },
  { value: 5, label: 'أيار (شهر 5)' },
  { value: 6, label: 'حزيران (شهر 6)' },
  { value: 7, label: 'تموز (شهر 7)' },
  { value: 8, label: 'آب (شهر 8)' },
  { value: 9, label: 'أيلول (شهر 9)' },
  { value: 10, label: 'تشرين الأول (شهر 10)' },
  { value: 11, label: 'تشرين الثاني (شهر 11)' },
  { value: 12, label: 'كانون الأول (شهر 12)' },
];

export function SalesAndReportsView({
  mode,
  sales,
  products,
  currency,
}: SalesAndReportsViewProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  // For month/year picker (0 = all months of selected year)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  // For custom date range
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // For annual reports breakdown
  const [reportYear, setReportYear] = useState<number>(currentYear);

  // Available years dynamically collected from sales + last 4 years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([
      currentYear,
      currentYear - 1,
      currentYear - 2,
      currentYear - 3,
    ]);
    for (const s of sales) {
      if (s.createdAt) {
        yearsSet.add(s.createdAt.toDate().getFullYear());
      }
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [sales, currentYear]);

  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthYear = lastMonthDate.getFullYear();
  const lastMonthNum = lastMonthDate.getMonth() + 1;

  // Date-filtered sales (before source filter, so we can show in_store vs online breakdown for that date)
  const dateFilteredSales = useMemo(() => {
    return sales.filter((s) => {
      const saleDate = s.createdAt ? s.createdAt.toDate() : null;
      if (period === 'all') return true;
      if (!saleDate) return false;

      if (period === 'today') {
        return isSameDay(s.createdAt, now);
      }
      if (period === 'week') {
        return saleDate >= weekAgo;
      }
      if (period === 'this_month') {
        return (
          saleDate.getFullYear() === currentYear &&
          saleDate.getMonth() + 1 === currentMonth
        );
      }
      if (period === 'last_month') {
        return (
          saleDate.getFullYear() === lastMonthYear &&
          saleDate.getMonth() + 1 === lastMonthNum
        );
      }
      if (period === 'month_year') {
        if (saleDate.getFullYear() !== selectedYear) return false;
        if (selectedMonth !== 0 && saleDate.getMonth() + 1 !== selectedMonth) {
          return false;
        }
        return true;
      }
      if (period === 'custom_range') {
        if (fromDate) {
          const start = new Date(`${fromDate}T00:00:00`);
          if (saleDate < start) return false;
        }
        if (toDate) {
          const end = new Date(`${toDate}T23:59:59.999`);
          if (saleDate > end) return false;
        }
        return true;
      }
      return true;
    });
  }, [
    sales,
    period,
    selectedYear,
    selectedMonth,
    fromDate,
    toDate,
    currentYear,
    currentMonth,
    lastMonthYear,
    lastMonthNum,
  ]);

  const visibleSales = useMemo(() => {
    if (sourceFilter === 'all') return dateFilteredSales;
    return dateFilteredSales.filter((s) => s.source === sourceFilter);
  }, [dateFilteredSales, sourceFilter]);

  const inStorePeriodSales = dateFilteredSales.filter(
    (s) => s.source === 'in_store'
  );
  const onlinePeriodSales = dateFilteredSales.filter((s) => s.source === 'online');

  const inStorePeriodRevenue = inStorePeriodSales.reduce(
    (sum, s) => sum + s.totalAmount,
    0
  );
  const onlinePeriodRevenue = onlinePeriodSales.reduce(
    (sum, s) => sum + s.totalAmount,
    0
  );

  const totalRevenue = visibleSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalQty = visibleSales.reduce((sum, s) => sum + s.quantity, 0);

  const todaySales = sales.filter((s) => isSameDay(s.createdAt, now));
  const weekSales = sales.filter(
    (s) => s.createdAt && s.createdAt.toDate() >= weekAgo
  );
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

  // Monthly breakdown for Reports mode
  const monthlyReportRows = useMemo(() => {
    return ARABIC_MONTHS.map((m) => {
      const monthSales = sales.filter((s) => {
        if (!s.createdAt) return false;
        const d = s.createdAt.toDate();
        return d.getFullYear() === reportYear && d.getMonth() + 1 === m.value;
      });
      const inStoreAmt = monthSales
        .filter((s) => s.source === 'in_store')
        .reduce((sum, s) => sum + s.totalAmount, 0);
      const onlineAmt = monthSales
        .filter((s) => s.source === 'online')
        .reduce((sum, s) => sum + s.totalAmount, 0);
      const qty = monthSales.reduce((sum, s) => sum + s.quantity, 0);
      return {
        month: m.value,
        label: m.label,
        count: monthSales.length,
        qty,
        inStoreAmt,
        onlineAmt,
        totalAmt: inStoreAmt + onlineAmt,
      };
    });
  }, [sales, reportYear]);

  const reportYearTotal = monthlyReportRows.reduce(
    (sum, r) => sum + r.totalAmt,
    0
  );

  const activePeriodLabel = useMemo(() => {
    switch (period) {
      case 'all':
        return 'جميع الفترات';
      case 'today':
        return 'اليوم';
      case 'week':
        return 'آخر 7 أيام';
      case 'this_month':
        return `${ARABIC_MONTHS[currentMonth - 1]?.label} ${currentYear}`;
      case 'last_month':
        return `الشهر الفائت (${ARABIC_MONTHS[lastMonthNum - 1]?.label} ${lastMonthYear})`;
      case 'month_year':
        return selectedMonth === 0
          ? `سنة ${selectedYear} كاملة`
          : `${ARABIC_MONTHS[selectedMonth - 1]?.label} ${selectedYear}`;
      case 'custom_range':
        return fromDate || toDate
          ? `${fromDate || '...'} إلى ${toDate || '...'}`
          : 'فترة مخصصة';
    }
  }, [
    period,
    currentMonth,
    currentYear,
    lastMonthNum,
    lastMonthYear,
    selectedYear,
    selectedMonth,
    fromDate,
    toDate,
  ]);

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

        {/* Monthly Breakdown by Selected Year */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-base text-[#111318] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#C8102E]" />
                <span>تقرير المبيعات الشهري لسنة {reportYear}</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                إجمالي مبيعات السنة المختارة:{' '}
                <strong className="font-num text-[#C8102E]">
                  {formatPrice(reportYearTotal, currency)}
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="report-year-select" className="text-xs font-bold text-neutral-600">
                اختر السنة:
              </label>
              <select
                id="report-year-select"
                value={reportYear}
                onChange={(e) => setReportYear(Number(e.target.value))}
                className="h-9 px-3 rounded-lg border border-neutral-300 bg-white text-sm font-bold text-[#111318]"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
                  <th className="py-2.5 px-3 font-bold">الشهر</th>
                  <th className="py-2.5 px-3 font-bold">العمليات</th>
                  <th className="py-2.5 px-3 font-bold">القطع</th>
                  <th className="py-2.5 px-3 font-bold">داخل المحل</th>
                  <th className="py-2.5 px-3 font-bold">طلبات المتجر</th>
                  <th className="py-2.5 px-3 font-bold">إجمالي الشهر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {monthlyReportRows.map((row) => (
                  <tr
                    key={row.month}
                    className={row.totalAmt > 0 ? 'bg-white' : 'bg-neutral-50/40 text-neutral-400'}
                  >
                    <td className="py-2.5 px-3 font-bold">{row.label}</td>
                    <td className="py-2.5 px-3 tabular-nums">{row.count}</td>
                    <td className="py-2.5 px-3 tabular-nums">{row.qty}</td>
                    <td className="py-2.5 px-3 font-num tabular-nums whitespace-nowrap">
                      {formatPrice(row.inStoreAmt, currency)}
                    </td>
                    <td className="py-2.5 px-3 font-num tabular-nums whitespace-nowrap">
                      {formatPrice(row.onlineAmt, currency)}
                    </td>
                    <td className="py-2.5 px-3 font-num font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                      {formatPrice(row.totalAmt, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      {/* Period & Date Filter Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              { id: 'all', label: 'كل المبيعات' },
              { id: 'today', label: 'اليوم' },
              { id: 'week', label: 'آخر 7 أيام' },
              { id: 'this_month', label: 'هذا الشهر' },
              { id: 'last_month', label: 'الشهر الفائت' },
              { id: 'month_year', label: 'تحديد شهر وسنة' },
              { id: 'custom_range', label: 'من تاريخ - إلى تاريخ' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriod(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                period === tab.id
                  ? 'bg-[#C8102E] text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Month & Year Picker */}
        {period === 'month_year' && (
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="sales-year" className="text-xs font-bold text-neutral-700">
                السنة:
              </label>
              <select
                id="sales-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-9 px-3 rounded-lg border border-neutral-300 bg-white text-xs sm:text-sm font-bold text-[#111318]"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="sales-month" className="text-xs font-bold text-neutral-700">
                الشهر:
              </label>
              <select
                id="sales-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="h-9 px-3 rounded-lg border border-neutral-300 bg-white text-xs sm:text-sm font-bold text-[#111318]"
              >
                <option value={0}>كل أشهر سنة {selectedYear}</option>
                {ARABIC_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Custom Date Range Picker */}
        {period === 'custom_range' && (
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="sales-from" className="text-xs font-bold text-neutral-700">
                من تاريخ:
              </label>
              <input
                id="sales-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 px-3 rounded-lg border border-neutral-300 bg-white text-xs sm:text-sm text-[#111318]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="sales-to" className="text-xs font-bold text-neutral-700">
                إلى تاريخ:
              </label>
              <input
                id="sales-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 px-3 rounded-lg border border-neutral-300 bg-white text-xs sm:text-sm text-[#111318]"
              />
            </div>
          </div>
        )}

        {/* Source Filter (All vs In-Store vs Online Orders) */}
        <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-neutral-500">المصدر:</span>
            {(
              [
                { id: 'all', label: 'الكل (المحل + الطلبات)' },
                { id: 'in_store', label: 'داخل المحل' },
                { id: 'online', label: 'الطلبات الإلكترونية' },
              ] as const
            ).map((src) => (
              <button
                key={src.id}
                type="button"
                onClick={() => setSourceFilter(src.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  sourceFilter === src.id
                    ? 'bg-[#111318] text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {src.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-neutral-500 font-medium">
            الفترة المعروضة: <strong className="text-[#111318]">{activePeriodLabel}</strong>
          </span>
        </div>
      </div>

      {/* Period Summary Cards (Always shows total, quantity, in-store & online split) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4">
          <span className="text-xs text-neutral-500 block">إجمالي المبيعات</span>
          <strong className="font-num font-extrabold text-lg sm:text-xl text-[#C8102E] tabular-nums block mt-1">
            {formatPrice(totalRevenue, currency)}
          </strong>
          <span className="text-[11px] text-neutral-500 tabular-nums">
            {visibleSales.length} عملية بيع
          </span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4">
          <span className="text-xs text-neutral-500 block">عدد القطع المباعة</span>
          <strong className="font-num font-extrabold text-lg sm:text-xl text-[#111318] tabular-nums block mt-1">
            {totalQty} قطعة
          </strong>
          <span className="text-[11px] text-neutral-500">في الفترة المحددة</span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4">
          <span className="text-xs text-neutral-500 flex items-center gap-1">
            <Store className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>داخل المحل</span>
          </span>
          <strong className="font-num font-extrabold text-base sm:text-lg text-[#0284C7] tabular-nums block mt-1">
            {formatPrice(inStorePeriodRevenue, currency)}
          </strong>
          <span className="text-[11px] text-neutral-500 tabular-nums">
            {inStorePeriodSales.length} عملية
          </span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4">
          <span className="text-xs text-neutral-500 flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>طلبات المتجر المكتملة</span>
          </span>
          <strong className="font-num font-extrabold text-base sm:text-lg text-[#16A34A] tabular-nums block mt-1">
            {formatPrice(onlinePeriodRevenue, currency)}
          </strong>
          <span className="text-[11px] text-neutral-500 tabular-nums">
            {onlinePeriodSales.length} عملية
          </span>
        </div>
      </div>

      {/* Sales Table / Mobile List */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
        {visibleSales.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
            <p className="font-display font-bold text-base text-[#111318]">
              لا توجد عمليات بيع مسجلة في هذه الفترة
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              ملاحظة: طلبات الزبائن تظهر هنا فور تحويل حالتها إلى &quot;مكتمل&quot; في صفحة الطلبات.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="divide-y divide-neutral-100 sm:hidden">
              {visibleSales.map((s) => (
                <div key={s.id} className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm text-[#111318] truncate">
                        {s.productName} × {s.quantity}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {s.carMake} {s.carModel}
                      </p>
                    </div>
                    <span className="font-num font-bold text-sm text-emerald-700 tabular-nums whitespace-nowrap">
                      {formatPrice(s.totalAmount, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        s.source === 'in_store'
                          ? 'bg-sky-50 text-sky-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {s.source === 'in_store' ? 'داخل المحل' : 'طلب إلكتروني'}
                    </span>
                    <span>{s.employeeName}</span>
                    <span>{formatDateTime(s.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
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
                      <td className="py-3 px-4 text-xs">
                        <span
                          className={`px-2 py-1 rounded-md font-bold ${
                            s.source === 'in_store'
                              ? 'bg-sky-50 text-sky-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {s.source === 'in_store' ? 'داخل المحل' : 'طلب إلكتروني'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-500 whitespace-nowrap">
                        {formatDateTime(s.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
