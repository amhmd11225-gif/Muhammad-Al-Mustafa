import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  DEFAULT_STORE_SETTINGS,
  INITIAL_SEED_PRODUCTS,
} from './data/seedCatalog';
import type {
  CartItem,
  DashboardTab,
  Order,
  Product,
  Sale,
  StaffMember,
  StoreSettings,
  UserRole,
} from './types';
import { buildGeneralWhatsappUrl, safeEmailKey } from './utils/format';
import { StorefrontHeader } from './components/storefront/StorefrontHeader';
import { StorefrontHero } from './components/storefront/StorefrontHero';
import { StorefrontCatalog } from './components/storefront/StorefrontCatalog';
import { CartAndOrderDrawer } from './components/storefront/CartAndOrderDrawer';
import { StorefrontTrustAndFooter } from './components/storefront/StorefrontTrustAndFooter';
import { StaffLoginView } from './components/dashboard/StaffLoginView';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { DashboardHome } from './components/dashboard/DashboardHome';
import { AddProductView } from './components/dashboard/AddProductView';
import { InventoryView } from './components/dashboard/InventoryView';
import { InStoreSaleView } from './components/dashboard/InStoreSaleView';
import { OrdersView } from './components/dashboard/OrdersView';
import { SalesAndReportsView } from './components/dashboard/SalesAndReportsView';
import { StaffManagementView } from './components/dashboard/StaffManagementView';
import { SettingsView } from './components/dashboard/SettingsView';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const [viewMode, setViewMode] = useState<'storefront' | 'dashboard'>('storefront');
  const [activeTab, setActiveTab] = useState<DashboardTab>('home');

  // Auth & RBAC state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [role, setRole] = useState<UserRole>('guest');
  const [staffName, setStaffName] = useState<string>('');

  // Storefront & Dashboard data state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  // Storefront filter & cart state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedCarMake, setSelectedCarMake] = useState('الكل');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartToast, setCartToast] = useState('');

  // Quick photo handoff from Dashboard Home to AddProductView
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const seededOnceRef = useRef(false);

  // 1. Subscribe to public products catalog
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Product[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Product, 'id'>),
        }));
        setProducts(list);
        setProductsLoading(false);
      },
      (err) => {
        setProductsLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'products');
      }
    );
    return () => unsub();
  }, []);

  // 2. Subscribe to public store settings
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'store'),
      (snap) => {
        if (snap.exists()) {
          setSettings({
            ...DEFAULT_STORE_SETTINGS,
            ...(snap.data() as StoreSettings),
          });
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, 'settings/store');
      }
    );
    return () => unsub();
  }, []);

  // 3. Listen to Auth & resolve Admin / Employee role
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (!user || !user.email || !user.emailVerified) {
        setRole('guest');
        setStaffName('');
        setAuthReady(true);
        return;
      }

      const emailLower = user.email.trim().toLowerCase();
      if (emailLower === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
        setRole('admin');
        setStaffName(user.displayName || 'المدير');
        setActiveTab((prev) => (prev === 'pos' ? 'home' : prev));
        setAuthReady(true);
        return;
      }

      const staffKey = safeEmailKey(emailLower);
      try {
        const staffSnap = await getDoc(doc(db, 'staff', staffKey));
        if (staffSnap.exists()) {
          const data = staffSnap.data() as Omit<StaffMember, 'id'>;
          if (data.active) {
            setRole(data.role);
            setStaffName(data.name || user.displayName || emailLower);
            if (data.role === 'employee') {
              setActiveTab('pos');
            }
          } else {
            setRole('unauthorized');
            setStaffName(user.displayName || emailLower);
          }
        } else {
          setRole('unauthorized');
          setStaffName(user.displayName || emailLower);
        }
      } catch (err) {
        console.error('Role resolution error:', err);
        setRole('unauthorized');
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // 4. Role-gated Orders listener (Admin & Employee)
  useEffect(() => {
    if (!authReady || (role !== 'admin' && role !== 'employee')) {
      setOrders([]);
      return;
    }
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setOrders(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Order, 'id'>),
          }))
        );
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'orders');
      }
    );
    return () => unsub();
  }, [authReady, role]);

  // 5. Admin-only Sales & Staff listeners
  useEffect(() => {
    if (!authReady || role !== 'admin') {
      setSales([]);
      setStaffList([]);
      return;
    }

    const salesQ = query(collection(db, 'sales'), orderBy('createdAt', 'desc'));
    const unsubSales = onSnapshot(
      salesQ,
      (snapshot) => {
        setSales(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Sale, 'id'>),
          }))
        );
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'sales');
      }
    );

    const staffQ = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
    const unsubStaff = onSnapshot(
      staffQ,
      (snapshot) => {
        setStaffList(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<StaffMember, 'id'>),
          }))
        );
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'staff');
      }
    );

    return () => {
      unsubSales();
      unsubStaff();
    };
  }, [authReady, role]);

  // Seed initial catalog when Admin connects to an empty database
  const seedInitialCatalog = useCallback(async () => {
    if (!auth.currentUser || role !== 'admin') return;
    const batch = writeBatch(db);
    for (const item of INITIAL_SEED_PRODUCTS) {
      batch.set(doc(db, 'products', item.id), {
        name: item.name,
        category: item.category,
        carMake: item.carMake,
        carModel: item.carModel,
        condition: item.condition,
        price: item.price,
        quantity: item.quantity,
        minStock: item.minStock,
        soldCount: item.soldCount,
        imageUrl: item.imageUrl,
        notes: item.notes,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    batch.set(doc(db, 'settings', 'store'), {
      ...DEFAULT_STORE_SETTINGS,
      updatedAt: serverTimestamp(),
    });
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products');
    }
  }, [role]);

  useEffect(() => {
    if (
      authReady &&
      role === 'admin' &&
      !productsLoading &&
      products.length === 0 &&
      !seededOnceRef.current
    ) {
      seededOnceRef.current = true;
      void seedInitialCatalog();
    }
  }, [authReady, role, productsLoading, products.length, seedInitialCatalog]);

  // Keep cart quantities synced if live stock changes
  useEffect(() => {
    setCart((prev) =>
      prev
        .map((item) => {
          const live = products.find((p) => p.id === item.product.id);
          if (!live || live.quantity <= 0) return null;
          return {
            product: live,
            quantity: Math.min(item.quantity, live.quantity),
          };
        })
        .filter((x): x is CartItem => x !== null)
    );
  }, [products]);

  // Cart handlers
  const handleAddToCart = (product: Product, openDrawer = false) => {
    if (product.quantity <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(product.quantity, existing.quantity + 1);
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: nextQty } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });

    if (openDrawer) {
      setCartOpen(true);
    } else {
      setCartToast(`تمت إضافة "${product.name}" إلى السلة`);
      setTimeout(() => setCartToast(''), 2400);
    }
  };

  const handleUpdateCartQty = (productId: string, quantity: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        const bounded = Math.max(1, Math.min(item.product.quantity, quantity));
        return { ...item, quantity: bounded };
      })
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setRole('guest');
    setViewMode('storefront');
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const newOrdersCount = orders.filter((o) => o.status === 'new').length;
  const lowStockCount = products.filter((p) => p.quantity <= p.minStock).length;

  // Guard employee tabs
  const safeActiveTab: DashboardTab =
    role === 'employee' &&
    !['pos', 'inventory', 'orders'].includes(activeTab)
      ? 'pos'
      : activeTab;

  if (viewMode === 'dashboard') {
    if (!authReady) {
      return (
        <div className="min-h-screen bg-[#0F1115] flex items-center justify-center text-white text-sm">
          جاري التحقق من الحساب...
        </div>
      );
    }

    if (role !== 'admin' && role !== 'employee') {
      return (
        <StaffLoginView
          storeName={settings.storeName}
          currentRole={role}
          userEmail={authUser?.email || null}
          onBackToStore={() => setViewMode('storefront')}
          onSignOut={handleSignOut}
        />
      );
    }

    return (
      <DashboardLayout
        storeName={settings.storeName}
        role={role}
        userName={staffName || authUser?.displayName || 'مستخدم'}
        activeTab={safeActiveTab}
        onSelectTab={setActiveTab}
        newOrdersCount={newOrdersCount}
        lowStockCount={lowStockCount}
        onBackToStore={() => setViewMode('storefront')}
        onSignOut={handleSignOut}
      >
        <OfflineIndicator />
        {safeActiveTab === 'home' && role === 'admin' && (
          <DashboardHome
            products={products}
            orders={orders}
            sales={sales}
            currency={settings.currency}
            onNavigate={setActiveTab}
            onQuickPhotoSelected={(file) => {
              setPendingPhotoFile(file);
              setActiveTab('add-part');
            }}
          />
        )}

        {safeActiveTab === 'add-part' && role === 'admin' && (
          <AddProductView
            initialFile={pendingPhotoFile}
            onClearInitialFile={() => setPendingPhotoFile(null)}
            defaultMinStock={settings.defaultMinStock}
            currency={settings.currency}
            onSaved={() => {}}
          />
        )}

        {safeActiveTab === 'inventory' && (
          <InventoryView
            products={products}
            currency={settings.currency}
            role={role}
            onAddNewClick={() => setActiveTab('add-part')}
          />
        )}

        {safeActiveTab === 'pos' && (
          <InStoreSaleView
            products={products}
            currency={settings.currency}
            employeeName={staffName || authUser?.displayName || 'موظف'}
          />
        )}

        {safeActiveTab === 'orders' && (
          <OrdersView
            orders={orders}
            currency={settings.currency}
            role={role}
            userName={staffName || authUser?.displayName || 'موظف'}
          />
        )}

        {safeActiveTab === 'sales' && role === 'admin' && (
          <SalesAndReportsView
            mode="sales"
            sales={sales}
            products={products}
            currency={settings.currency}
          />
        )}

        {safeActiveTab === 'reports' && role === 'admin' && (
          <SalesAndReportsView
            mode="reports"
            sales={sales}
            products={products}
            currency={settings.currency}
          />
        )}

        {safeActiveTab === 'staff' && role === 'admin' && (
          <StaffManagementView staff={staffList} />
        )}

        {safeActiveTab === 'settings' && role === 'admin' && (
          <SettingsView
            settings={settings}
            onSeedCatalog={seedInitialCatalog}
            productsCount={products.length}
          />
        )}
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#111318] flex flex-col">
      <StorefrontHeader
        storeName={settings.storeName}
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
        }}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        onOpenDashboard={() => setViewMode('dashboard')}
        isStaffSignedIn={role === 'admin' || role === 'employee'}
        whatsappUrl={buildGeneralWhatsappUrl(settings.whatsappNumber)}
      />

      <main className="flex-1">
        <StorefrontHero
          storeName={settings.storeName}
          onBrowseClick={() =>
            document
              .getElementById('catalog-section')
              ?.scrollIntoView({ behavior: 'smooth' })
          }
        />

        <StorefrontCatalog
          products={products}
          loading={productsLoading}
          currency={settings.currency}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedCarMake={selectedCarMake}
          onSelectCarMake={setSelectedCarMake}
          onOrderNow={(product) => handleAddToCart(product, true)}
          onAddToCart={(product) => handleAddToCart(product, false)}
          onOpenAdminLogin={() => setViewMode('dashboard')}
        />

        <StorefrontTrustAndFooter settings={settings} />
      </main>

      {/* Subtle Cart Feedback Toast */}
      {cartToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-xl bg-[#11141A] text-white text-sm font-bold shadow-xl flex items-center gap-3">
          <span>{cartToast}</span>
          <button
            type="button"
            onClick={() => {
              setCartToast('');
              setCartOpen(true);
            }}
            className="text-[#C8102E] underline font-bold cursor-pointer"
          >
            عرض السلة
          </button>
        </div>
      )}

      <CartAndOrderDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCart([])}
        whatsappNumber={settings.whatsappNumber}
        currency={settings.currency}
      />

      <OfflineIndicator />
    </div>
  );
}
