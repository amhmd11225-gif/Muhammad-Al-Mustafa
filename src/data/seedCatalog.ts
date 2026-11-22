import type { PartCondition, StoreSettings } from '../types';

export const HERO_BANNER_IMAGE = '/src/assets/images/hero_all_cars_2023_1795386430751.jpg';

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'قطع غيار السيارات',
  whatsappNumber: '9647700000000',
  currency: 'د.ع',
  defaultMinStock: 3,
  address: 'المنطقة الصناعية — معارض قطع الغيار',
  aboutText:
    'متجر متخصص في بيع قطع غيار السيارات المستعملة والفرط الأصلية المفحوصة بأسعار مناسبة مع ضمان الفحص والتوصيل لجميع المحافظات والدفع عند الاستلام.',
};

export interface SeedProductInput {
  id: string;
  name: string;
  category: string;
  carMake: string;
  carModel: string;
  condition: PartCondition;
  price: number;
  quantity: number;
  minStock: number;
  soldCount: number;
  imageUrl: string;
  notes: string;
}

export const INITIAL_SEED_PRODUCTS: SeedProductInput[] = [
  {
    id: 'seed_ac_compressor_camry',
    name: 'كمبريسر تكييف',
    category: 'محرك وتبريد',
    carMake: 'تويوتا',
    carModel: 'كامري 2013',
    condition: 'فرط وكالة',
    price: 150000,
    quantity: 5,
    minStock: 2,
    soldCount: 4,
    imageUrl: '/src/assets/images/part_ac_compressor_1795384728121.jpg',
    notes: 'ضغط تبريد ممتاز، مفحوص مع ضمان التشغيل.',
  },
  {
    id: 'seed_front_door_camry',
    name: 'باب أمامي',
    category: 'هيكل وأبواب',
    carMake: 'تويوتا',
    carModel: 'كامري 2012',
    condition: 'مستعمل - نظيف',
    price: 250000,
    quantity: 2,
    minStock: 2,
    soldCount: 3,
    imageUrl: '/src/assets/images/part_front_door_1795384727444.jpg',
    notes: 'باب أصلي خالي من المعجون، متوفر باللون الرصاصي الغامق.',
  },
  {
    id: 'seed_alternator_camry',
    name: 'دينمو شحن',
    category: 'كهرباء',
    carMake: 'تويوتا',
    carModel: 'كامري 2012',
    condition: 'فرط وكالة',
    price: 120000,
    quantity: 6,
    minStock: 3,
    soldCount: 7,
    imageUrl: '/src/assets/images/part_alternator_1795384726224.jpg',
    notes: 'شحن ثابت 14.2 فولت، فحمات وبولي بحالة ممتازة.',
  },
  {
    id: 'seed_headlight_camry',
    name: 'كشاف أمامي',
    category: 'إضاءة',
    carMake: 'تويوتا',
    carModel: 'كامري 2012',
    condition: 'مستعمل - نظيف',
    price: 85000,
    quantity: 1,
    minStock: 2,
    soldCount: 5,
    imageUrl: '/src/assets/images/part_headlight_1795384727273.jpg',
    notes: 'عدسة صافية، قواعد التثبيت سليمة بالكامل.',
  },
  {
    id: 'seed_brake_disc_sonata',
    name: 'ديسك وكليبر بريك',
    category: 'فرامل وتعليق',
    carMake: 'هيونداي',
    carModel: 'سوناتا 2016',
    condition: 'فرط وكالة',
    price: 65000,
    quantity: 4,
    minStock: 2,
    soldCount: 6,
    imageUrl: '/src/assets/images/part_brake_disc_1795384726502.jpg',
    notes: 'سماكة ممتازة بدون خراط أو اهتزاز.',
  },
];
