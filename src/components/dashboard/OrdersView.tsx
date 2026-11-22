import { useState } from 'react';
import {
  ClipboardList,
  MapPin,
  MessageCircle,
  Phone,
  Trash2,
} from 'lucide-react';
import {
  deleteDoc,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../../firebase';
import {
  ORDER_STATUS_LABELS,
  type Order,
  type OrderStatus,
  type Product,
  type UserRole,
} from '../../types';
import {
  buildGeneralWhatsappUrl,
  formatDateTime,
  formatPrice,
  generateDocId,
} from '../../utils/format';

interface OrdersViewProps {
  orders: Order[];
  currency: string;
  role: UserRole;
  userName: string;
}

const STATUS_ORDER: OrderStatus[] = [
  'new',
  'contacted',
  'preparing',
  'completed',
  'cancelled',
];

export function OrdersView({
  orders,
  currency,
  role,
  userName,
}: OrdersViewProps) {
  const isAdmin = role === 'admin';
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = orders.filter((o) =>
    filter === 'all' ? true : o.status === filter
  );

  const handleStatusChange = async (order: Order, nextStatus: OrderStatus) => {
    if (order.status === nextStatus) return;
    setBusyId(order.id);
    try {
      // If Admin completes an order, also log a sale entry if not previously completed
      if (isAdmin && nextStatus === 'completed' && order.status !== 'completed') {
        await runTransaction(db, async (transaction) => {
          transaction.update(doc(db, 'orders', order.id), {
            status: nextStatus,
            updatedAt: serverTimestamp(),
          });

          for (const item of order.items) {
            const pRef = doc(db, 'products', item.productId);
            const pSnap = await transaction.get(pRef);
            if (pSnap.exists() && auth.currentUser) {
              const saleId = generateDocId('sale');
              transaction.set(doc(db, 'sales', saleId), {
                productId: item.productId,
                productName: item.productName,
                carMake: item.carMake,
                carModel: item.carModel,
                quantity: item.quantity,
                unitPrice: item.price,
                totalAmount: item.subtotal,
                source: 'online',
                employeeUid: auth.currentUser.uid,
                employeeName: `${userName} (طلب إلكتروني)`.slice(0, 100),
                notes: `طلب زبون: ${order.customerName}`,
                createdAt: serverTimestamp(),
              });
            }
          }
        });
      } else if (
        isAdmin &&
        nextStatus === 'cancelled' &&
        order.status !== 'cancelled'
      ) {
        // Restore reserved stock when Admin cancels an order
        await runTransaction(db, async (transaction) => {
          const snaps = await Promise.all(
            order.items.map(async (item) => ({
              item,
              ref: doc(db, 'products', item.productId),
              snap: await transaction.get(doc(db, 'products', item.productId)),
            }))
          );

          for (const { item, ref, snap } of snaps) {
            if (snap.exists()) {
              const live = snap.data() as Product;
              transaction.update(ref, {
                quantity: live.quantity + item.quantity,
                soldCount: Math.max(0, (live.soldCount || 0) - item.quantity),
                updatedAt: serverTimestamp(),
              });
            }
          }

          transaction.update(doc(db, 'orders', order.id), {
            status: nextStatus,
            updatedAt: serverTimestamp(),
          });
        });
      } else {
        await updateDoc(doc(db, 'orders', order.id), {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!isAdmin) return;
    setBusyId(orderId);
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `orders/${orderId}`);
    } finally {
      setBusyId(null);
    }
  };

  const getStatusClass = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return 'text-[#C8102E] bg-red-50 border-red-200';
      case 'contacted':
        return 'text-sky-700 bg-sky-50 border-sky-200';
      case 'preparing':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'completed':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'cancelled':
        return 'text-neutral-600 bg-neutral-100 border-neutral-300';
    }
  };

  return (
    <div className="space-y-5">
      {/* Status Filter Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
            filter === 'all'
              ? 'bg-[#111318] text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          الكل ({orders.length})
        </button>
        {STATUS_ORDER.map((st) => {
          const count = orders.filter((o) => o.status === st).length;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setFilter(st)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                filter === st
                  ? 'bg-[#111318] text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {ORDER_STATUS_LABELS[st]} ({count})
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-10 text-center">
          <ClipboardList className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="font-display font-bold text-base text-[#111318]">
            لا توجد طلبات في هذا التصنيف
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => {
            const isTerminal =
              !isAdmin &&
              (order.status === 'completed' || order.status === 'cancelled');
            const customerWa = buildGeneralWhatsappUrl(
              order.customerPhone,
              `مرحباً ${order.customerName}، بخصوص طلبك من متجر قطع غيار السيارات.`
            );

            return (
              <div
                key={order.id}
                className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-extrabold text-base text-[#111318]">
                        {order.customerName}
                      </h3>
                      <span className="text-xs font-mono text-neutral-400">
                        {order.id}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {formatDateTime(order.createdAt)} · {order.paymentMethod}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      aria-label="تغيير حالة الطلب"
                      disabled={busyId === order.id || isTerminal}
                      value={order.status}
                      onChange={(e) =>
                        handleStatusChange(order, e.target.value as OrderStatus)
                      }
                      className={`h-9 px-3 rounded-lg border text-xs font-bold focus:outline-none cursor-pointer ${getStatusClass(
                        order.status
                      )}`}
                    >
                      {STATUS_ORDER.map((st) => (
                        <option key={st} value={st}>
                          {ORDER_STATUS_LABELS[st]}
                        </option>
                      ))}
                    </select>

                    {isAdmin && (
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => handleDeleteOrder(order.id)}
                        title="حذف الطلب"
                        className="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 text-[#C8102E] flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm py-1.5 px-3 rounded-xl bg-neutral-50"
                    >
                      <div>
                        <span className="font-bold text-[#111318]">
                          {item.productName}
                        </span>{' '}
                        <span className="text-xs text-neutral-500">
                          ({item.carMake} {item.carModel}) × {item.quantity}
                        </span>
                      </div>
                      <span className="font-num font-bold text-[#111318] tabular-nums">
                        {formatPrice(item.subtotal, currency)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Contact & Total */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs sm:text-sm">
                  <div className="space-y-1 text-neutral-600">
                    <div className="flex items-center gap-3 flex-wrap">
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="inline-flex items-center gap-1 font-bold text-[#111318] hover:text-[#C8102E]"
                        dir="ltr"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{order.customerPhone}</span>
                      </a>
                      <a
                        href={customerWa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-[#16A34A] hover:underline"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>واتساب الزبون</span>
                      </a>
                    </div>
                    <p className="inline-flex items-center gap-1 text-neutral-600">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{order.customerAddress}</span>
                    </p>
                    {order.notes && (
                      <p className="text-xs text-neutral-500">
                        ملاحظة: {order.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-xs text-neutral-500 block">
                      المبلغ المطلوب عند الاستلام
                    </span>
                    <span className="font-num font-extrabold text-lg text-[#C8102E] tabular-nums">
                      {formatPrice(order.totalAmount, currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
