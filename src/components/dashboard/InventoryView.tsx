import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Edit3,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import {
  PART_CATEGORIES,
  PART_CONDITIONS,
  type PartCondition,
  type Product,
  type UserRole,
} from '../../types';
import { formatPrice } from '../../utils/format';
import { PartImage } from '../PartImage';

interface InventoryViewProps {
  products: Product[];
  currency: string;
  role: UserRole;
  onAddNewClick: () => void;
}

type StockFilter = 'all' | 'low' | 'out' | 'available';

export function InventoryView({
  products,
  currency,
  role,
  onAddNewClick,
}: InventoryViewProps) {
  const isAdmin = role === 'admin';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [editing, setEditing] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCarMake, setEditCarMake] = useState('');
  const [editCarModel, setEditCarModel] = useState('');
  const [editCondition, setEditCondition] = useState<PartCondition>('مستعمل - نظيف');
  const [editPrice, setEditPrice] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editMinStock, setEditMinStock] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const totalRemaining = products.reduce((s, p) => s + p.quantity, 0);
  const totalSold = products.reduce((s, p) => s + (p.soldCount || 0), 0);
  const lowCount = products.filter((p) => p.quantity > 0 && p.quantity <= p.minStock).length;
  const outCount = products.filter((p) => p.quantity === 0).length;

  const q = search.trim().toLowerCase();
  const filtered = products.filter((p) => {
    if (filter === 'low' && !(p.quantity > 0 && p.quantity <= p.minStock)) return false;
    if (filter === 'out' && p.quantity !== 0) return false;
    if (filter === 'available' && p.quantity <= p.minStock) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.carMake.toLowerCase().includes(q) ||
      p.carModel.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  const openEdit = (p: Product) => {
    if (!isAdmin) return;
    setEditing(p);
    setEditName(p.name);
    setEditCategory(p.category);
    setEditCarMake(p.carMake);
    setEditCarModel(p.carModel);
    setEditCondition(p.condition);
    setEditPrice(String(p.price));
    setEditQty(String(p.quantity));
    setEditMinStock(String(p.minStock));
    setEditNotes(p.notes || '');
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing || !isAdmin) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'products', editing.id), {
        name: editName.trim().slice(0, 140),
        category: editCategory,
        carMake: editCarMake.trim().slice(0, 60),
        carModel: editCarModel.trim().slice(0, 60),
        condition: editCondition,
        price: Math.max(0, Number(editPrice) || 0),
        quantity: Math.max(0, Math.floor(Number(editQty) || 0)),
        minStock: Math.max(0, Math.floor(Number(editMinStock) || 0)),
        notes: editNotes.trim().slice(0, 500),
        updatedAt: serverTimestamp(),
      });
      setEditing(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${editing.id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickRestock = async (product: Product, addAmount: number) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'products', product.id), {
        quantity: product.quantity + addAmount,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${product.id}`);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'products', product.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${product.id}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Summary Strip answering: شكد بالمخزن / شكد بعت / تحتاج شراء / نافدة */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4">
          <p className="text-xs text-neutral-500">المتوفر بالمخزن (المتبقي)</p>
          <p className="font-num font-extrabold text-2xl text-[#111318] mt-1 tabular-nums">
            {totalRemaining} قطعة
          </p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4">
          <p className="text-xs text-neutral-500">إجمالي القطع المباعة</p>
          <p className="font-num font-extrabold text-2xl text-emerald-700 mt-1 tabular-nums">
            {totalSold} قطعة
          </p>
        </div>
        <div className="bg-white border border-amber-200 rounded-2xl p-4">
          <p className="text-xs text-amber-700">تحتاج شراء وتوفير</p>
          <p className="font-num font-extrabold text-2xl text-amber-700 mt-1 tabular-nums">
            {lowCount} صنف
          </p>
        </div>
        <div className="bg-white border border-red-200 rounded-2xl p-4">
          <p className="text-xs text-[#C8102E]">قطع نافدة (0)</p>
          <p className="font-num font-extrabold text-2xl text-[#C8102E] mt-1 tabular-nums">
            {outCount} صنف
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم، نوع السيارة أو الموديل..."
            className="w-full h-10 pr-4 pl-10 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: `الكل (${products.length})` },
              { id: 'low', label: `تحتاج شراء (${lowCount})` },
              { id: 'out', label: `نافدة (${outCount})` },
              { id: 'available', label: 'متوفرة جيداً' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                filter === tab.id
                  ? 'bg-[#111318] text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {isAdmin && (
            <button
              type="button"
              onClick={onAddNewClick}
              className="h-9 px-3.5 rounded-lg bg-[#C8102E] hover:bg-[#A60D26] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة قطعة</span>
            </button>
          )}
        </div>
      </div>

      {/* Table / Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-10 text-center">
          <Package className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="font-display font-bold text-base text-[#111318]">
            لا توجد قطع مطابقة في هذا التصنيف
          </p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
                  <th className="py-3 px-4 font-bold">القطعة</th>
                  <th className="py-3 px-4 font-bold">السيارة والموديل</th>
                  <th className="py-3 px-4 font-bold">القسم</th>
                  <th className="py-3 px-4 font-bold">السعر</th>
                  <th className="py-3 px-4 font-bold">المباع</th>
                  <th className="py-3 px-4 font-bold">المتبقي</th>
                  <th className="py-3 px-4 font-bold">الحالة</th>
                  {isAdmin && <th className="py-3 px-4 font-bold">إجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {filtered.map((p) => {
                  const isOut = p.quantity === 0;
                  const isLow = p.quantity > 0 && p.quantity <= p.minStock;
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/70">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-10 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                            <PartImage
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-display font-bold text-[#111318] truncate max-w-[180px]">
                              {p.name}
                            </p>
                            <p className="text-xs text-neutral-500">{p.condition}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-neutral-700 whitespace-nowrap">
                        {p.carMake} {p.carModel}
                      </td>
                      <td className="py-3 px-4 text-neutral-600 whitespace-nowrap">
                        {p.category}
                      </td>
                      <td className="py-3 px-4 font-num font-bold text-[#111318] whitespace-nowrap tabular-nums">
                        {formatPrice(p.price, currency)}
                      </td>
                      <td className="py-3 px-4 font-num font-bold text-emerald-700 tabular-nums">
                        {p.soldCount || 0}
                      </td>
                      <td className="py-3 px-4 font-num font-extrabold text-[#111318] tabular-nums">
                        {p.quantity}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isOut ? (
                          <span className="text-xs font-bold text-[#C8102E] inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            نافدة
                          </span>
                        ) : isLow ? (
                          <span className="text-xs font-bold text-amber-700 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            تحتاج شراء
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700">
                            متوفرة
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(p, 1)}
                              title="زيادة المخزون +1"
                              className="h-8 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold cursor-pointer"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              title="تعديل السعر والبيانات"
                              className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
                              title="حذف القطعة"
                              className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-[#C8102E] flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Edit Modal */}
      {editing && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-[#11141A] text-white flex items-center justify-between">
              <h3 className="font-display font-bold text-base">
                تعديل بيانات القطعة والسعر
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  اسم القطعة
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    القسم
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm bg-white"
                  >
                    {PART_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    الحالة
                  </label>
                  <select
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value as PartCondition)}
                    className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm bg-white"
                  >
                    {PART_CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    نوع السيارة
                  </label>
                  <input
                    type="text"
                    required
                    value={editCarMake}
                    onChange={(e) => setEditCarMake(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    الموديل
                  </label>
                  <input
                    type="text"
                    required
                    value={editCarModel}
                    onChange={(e) => setEditCarModel(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    السعر ({currency})
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm tabular-nums"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      الكمية
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editQty}
                      onChange={(e) => setEditQty(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      التنبيه
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editMinStock}
                      onChange={(e) => setEditMinStock(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  ملاحظات
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-neutral-300 text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-11 rounded-xl bg-[#C8102E] hover:bg-[#A60D26] text-white font-display font-bold text-sm cursor-pointer"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="h-11 px-4 rounded-xl border border-neutral-300 text-neutral-700 text-sm font-medium cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
