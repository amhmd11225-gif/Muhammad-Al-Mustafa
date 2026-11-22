import { useState, type ReactNode } from 'react';
import {
  BarChart3,
  Bell,
  Camera,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import type { DashboardTab, UserRole } from '../../types';
import { BrandLogo } from '../BrandLogo';
import { PWAInstallButton } from '../PWAInstallButton';

interface DashboardLayoutProps {
  storeName: string;
  role: UserRole;
  userName: string;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  newOrdersCount: number;
  lowStockCount: number;
  onBackToStore: () => void;
  onSignOut: () => void;
  children: ReactNode;
}

interface NavItem {
  id: DashboardTab;
  label: string;
  icon: typeof Home;
  adminOnly: boolean;
  badge?: number;
}

export function DashboardLayout({
  storeName,
  role,
  userName,
  activeTab,
  onSelectTab,
  newOrdersCount,
  lowStockCount,
  onBackToStore,
  onSignOut,
  children,
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { id: 'home', label: 'الرئيسية', icon: Home, adminOnly: true },
    { id: 'add-part', label: 'إضافة قطعة', icon: Camera, adminOnly: true },
    { id: 'pos', label: 'البيع داخل المحل', icon: ShoppingBag, adminOnly: false },
    {
      id: 'inventory',
      label: 'المخزون',
      icon: Package,
      adminOnly: false,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    {
      id: 'orders',
      label: 'الطلبات',
      icon: ClipboardList,
      adminOnly: false,
      badge: newOrdersCount > 0 ? newOrdersCount : undefined,
    },
    { id: 'sales', label: 'المبيعات', icon: TrendingUp, adminOnly: true },
    { id: 'staff', label: 'الموظفين', icon: Users, adminOnly: true },
    { id: 'reports', label: 'التقارير', icon: BarChart3, adminOnly: true },
    { id: 'settings', label: 'الإعدادات', icon: Settings, adminOnly: true },
  ];

  const visibleNav = navItems.filter((item) =>
    role === 'admin' ? true : !item.adminOnly
  );

  const handleSelect = (id: DashboardTab) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F3F5F8] flex flex-col lg:flex-row overflow-x-clip w-full">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Right-hand Dark Sidebar (RTL) matching reference */}
      <aside
        className={`fixed lg:sticky top-0 right-0 z-50 h-screen w-64 bg-[#11141A] text-white flex flex-col justify-between transition-transform duration-200 shrink-0 ${
          mobileMenuOpen
            ? 'translate-x-0 visible pointer-events-auto'
            : 'translate-x-full invisible pointer-events-none lg:translate-x-0 lg:visible lg:pointer-events-auto'
        }`}
      >
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Logo Header */}
          <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
            <BrandLogo storeName={storeName} />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white cursor-pointer"
              aria-label="إغلاق القائمة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav List */}
          <nav className="py-4 space-y-1">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`w-full px-5 py-3 flex items-center justify-between text-sm font-display transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#C8102E] text-white font-bold'
                      : 'text-neutral-300 hover:bg-white/5 hover:text-white font-medium'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums ${
                        isActive
                          ? 'bg-white text-[#C8102E]'
                          : 'bg-[#C8102E] text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <PWAInstallButton variant="sidebar" />

          <button
            type="button"
            onClick={onBackToStore}
            className="w-full h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Store className="w-4 h-4" />
            <span>معاينة المتجر الإلكتروني</span>
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full h-10 px-4 rounded-xl border border-white/15 hover:bg-white/10 text-neutral-300 hover:text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-[#0F1115] lg:bg-white text-white lg:text-[#111318] border-b border-neutral-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="فتح القائمة"
              className="lg:hidden w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display font-bold text-base sm:text-lg">
                {visibleNav.find((n) => n.id === activeTab)?.label || 'لوحة التحكم'}
              </h1>
              <p className="text-[11px] sm:text-xs text-neutral-400 lg:text-neutral-500">
                {role === 'admin' ? 'صلاحية المدير الكاملة' : 'صلاحية الموظف — البيع والمخزون'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSelect('orders')}
              title="الطلبات الجديدة"
              className="relative w-10 h-10 rounded-xl bg-white/10 lg:bg-neutral-100 hover:bg-white/20 lg:hover:bg-neutral-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {newOrdersCount > 0 && (
                <span className="absolute -top-1 -left-1 min-w-5 h-5 px-1 rounded-full bg-[#C8102E] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {newOrdersCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl bg-white/10 lg:bg-neutral-100">
              <div className="w-8 h-8 rounded-lg bg-[#C8102E] text-white font-display font-bold text-sm flex items-center justify-center">
                {userName.trim().charAt(0) || 'م'}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold leading-tight">{userName}</p>
                <p className="text-[11px] text-neutral-400 lg:text-neutral-500">
                  {role === 'admin' ? 'المدير' : 'موظف'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
