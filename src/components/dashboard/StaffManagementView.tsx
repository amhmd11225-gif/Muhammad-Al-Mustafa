import { useState, type FormEvent } from 'react';
import { Shield, Trash2, UserCheck, UserPlus, UserX } from 'lucide-react';
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../../firebase';
import type { StaffMember } from '../../types';
import { safeEmailKey } from '../../utils/format';

interface StaffManagementViewProps {
  staff: StaffMember[];
}

export function StaffManagementView({ staff }: StaffManagementViewProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'employee' | 'admin'>('employee');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAddStaff = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    if (!cleanEmail.includes('@') || cleanEmail.length < 5) {
      setError('يرجى إدخال بريد إلكتروني صحيح (حساب Google للموظف).');
      return;
    }
    if (cleanName.length < 2) {
      setError('يرجى إدخال اسم الموظف الكامل.');
      return;
    }

    const staffId = safeEmailKey(cleanEmail);
    setSaving(true);
    try {
      await setDoc(doc(db, 'staff', staffId), {
        name: cleanName.slice(0, 100),
        email: cleanEmail.slice(0, 150),
        ...(phone.trim() ? { phone: phone.trim().slice(0, 30) } : {}),
        role,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSuccess(`تمت إضافة ${cleanName} (${role === 'admin' ? 'مدير' : 'موظف'}) بنجاح.`);
      setName('');
      setEmail('');
      setPhone('');
      setRole('employee');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `staff/${staffId}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member: StaffMember) => {
    try {
      await updateDoc(doc(db, 'staff', member.id), {
        active: !member.active,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `staff/${member.id}`);
    }
  };

  const toggleRole = async (member: StaffMember) => {
    const nextRole = member.role === 'admin' ? 'employee' : 'admin';
    try {
      await updateDoc(doc(db, 'staff', member.id), {
        role: nextRole,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `staff/${member.id}`);
    }
  };

  const handleDelete = async (member: StaffMember) => {
    try {
      await deleteDoc(doc(db, 'staff', member.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `staff/${member.id}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Add Staff Form */}
      <div className="lg:col-span-5">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <h2 className="font-display font-bold text-base text-[#111318] flex items-center gap-2 mb-1">
            <UserPlus className="w-5 h-5 text-[#C8102E]" />
            <span>إضافة موظف أو مدير جديد</span>
          </h2>
          <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
            أدخل البريد الإلكتروني لحساب Google الخاص بالموظف ليتمكن من تسجيل الدخول بصلاحياته المحددة.
          </p>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-[#C8102E] mb-3">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 mb-3">
              {success}
            </div>
          )}

          <form onSubmit={handleAddStaff} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                الاسم الكامل *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: علي حسين"
                className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                البريد الإلكتروني (Google) *
              </label>
              <input
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="employee@gmail.com"
                className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                رقم الهاتف (اختياري)
              </label>
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0770xxxxxxx"
                className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                نوع الحساب والصلاحيات *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'employee' | 'admin')}
                className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm bg-white"
              >
                <option value="employee">
                  موظف (مشاهدة المخزون + تسجيل البيع داخل المحل فقط)
                </option>
                <option value="admin">مدير (صلاحية كاملة على جميع الصفحات)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full h-11 rounded-xl bg-[#C8102E] hover:bg-[#A60D26] text-white font-display font-bold text-sm cursor-pointer"
            >
              {saving ? 'جاري الحفظ...' : 'إضافة الحساب'}
            </button>
          </form>
        </div>
      </div>

      {/* Staff Directory */}
      <div className="lg:col-span-7 space-y-4">
        {/* Owner Card */}
        <div className="bg-[#11141A] text-white rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8102E] flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="font-display font-bold text-sm">
                المدير الرئيسي للمتجر
              </p>
              <p className="text-xs text-neutral-400 font-mono" dir="ltr">
                {BOOTSTRAPPED_ADMIN_EMAIL}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-400">نشط دائماً</span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100">
          {staff.length === 0 ? (
            <p className="p-8 text-center text-sm text-neutral-500">
              لم تقم بإضافة موظفين إضافيين بعد.
            </p>
          ) : (
            staff.map((member) => (
              <div
                key={member.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display font-bold text-sm text-[#111318]">
                      {member.name}
                    </p>
                    <span className="text-xs text-neutral-500">
                      · {member.role === 'admin' ? 'مدير' : 'موظف'}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        member.active ? 'text-emerald-700' : 'text-[#C8102E]'
                      }`}
                    >
                      · {member.active ? 'مفعّل' : 'موقوف'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5" dir="ltr">
                    {member.email}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleRole(member)}
                    className="h-8 px-3 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-[#111318] cursor-pointer"
                  >
                    تبديل لـ {member.role === 'admin' ? 'موظف' : 'مدير'}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(member)}
                    title={member.active ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer ${
                      member.active
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {member.active ? (
                      <UserX className="w-4 h-4" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(member)}
                    title="حذف الحساب"
                    className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-[#C8102E] flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
