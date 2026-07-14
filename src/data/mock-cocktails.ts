import { Timestamp } from 'firebase/firestore';
import { CocktailType, type Cocktail } from '@/entities';
import { BASE_COCKTAIL_PRICE } from '@/entities';

const now = Timestamp.now();

// totalPrice = BASE_COCKTAIL_PRICE (1500) + sum of ingredient priceSnapshots
export const MOCK_COCKTAILS: Cocktail[] = [
  {
    id: 'mock-1',
    name: 'Glow Up',
    description: 'A vitamin-C powerhouse for radiant skin and immunity.',
    imageUrl: 'https://images.pexels.com/photos/109275/pexels-photo-109275.jpeg?auto=compress&cs=tinysrgb&w=800',
    tag: 'New',
    type: CocktailType.CATALOG,
    createdBy: 'admin',
    isActive: true,
    isPublic: true,
    ingredients: [
      { fruitId: 'orange', fruitName: 'Orange', quantityGrams: 150, priceSnapshot: 500 },
      { fruitId: 'kiwi',   fruitName: 'Kiwi',   quantityGrams: 80,  priceSnapshot: 400 },
      { fruitId: 'citron', fruitName: 'Lemon',  quantityGrams: 50,  priceSnapshot: 200 },
    ],
    basePrice: BASE_COCKTAIL_PRICE,
    totalPrice: BASE_COCKTAIL_PRICE + 500 + 400 + 200, // 2600
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-2',
    name: 'Detox Green',
    description: 'Light and cleansing — reset your system.',
    imageUrl: 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=800',
    type: CocktailType.CATALOG,
    createdBy: 'admin',
    isActive: true,
    isPublic: true,
    ingredients: [
      { fruitId: 'pomme',     fruitName: 'Apple',  quantityGrams: 120, priceSnapshot: 400 },
      { fruitId: 'celeri',    fruitName: 'Celery', quantityGrams: 60,  priceSnapshot: 200 },
      { fruitId: 'gingembre', fruitName: 'Ginger', quantityGrams: 20,  priceSnapshot: 150 },
    ],
    basePrice: BASE_COCKTAIL_PRICE,
    totalPrice: BASE_COCKTAIL_PRICE + 400 + 200 + 150, // 2250
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-3',
    name: 'Tropical Bliss',
    description: 'Escape to the tropics with every sip.',
    imageUrl: 'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=800',
    tag: 'Summer',
    type: CocktailType.CATALOG,
    createdBy: 'admin',
    isActive: true,
    isPublic: true,
    ingredients: [
      { fruitId: 'mangue', fruitName: 'Mango',     quantityGrams: 130, priceSnapshot: 500 },
      { fruitId: 'ananas', fruitName: 'Pineapple', quantityGrams: 100, priceSnapshot: 500 },
      { fruitId: 'coco',   fruitName: 'Coconut',   quantityGrams: 50,  priceSnapshot: 300 },
    ],
    basePrice: BASE_COCKTAIL_PRICE,
    totalPrice: BASE_COCKTAIL_PRICE + 500 + 500 + 300, // 2800
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-4',
    name: 'Sun Berry',
    description: 'Antioxidant-rich berry blend with a fresh mint finish.',
    imageUrl: 'https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=800',
    tag: 'Popular',
    type: CocktailType.CATALOG,
    createdBy: 'admin',
    isActive: true,
    isPublic: true,
    ingredients: [
      { fruitId: 'fraise',    fruitName: 'Strawberry', quantityGrams: 100, priceSnapshot: 500 },
      { fruitId: 'framboise', fruitName: 'Raspberry',  quantityGrams: 80,  priceSnapshot: 500 },
      { fruitId: 'menthe',    fruitName: 'Mint',       quantityGrams: 10,  priceSnapshot: 100 },
    ],
    basePrice: BASE_COCKTAIL_PRICE,
    totalPrice: BASE_COCKTAIL_PRICE + 500 + 500 + 100, // 2600
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-5',
    name: 'Power Shot',
    description: 'A concentrated energy shot — warming and invigorating.',
    imageUrl: 'https://images.pexels.com/photos/2090902/pexels-photo-2090902.jpeg?auto=compress&cs=tinysrgb&w=800',
    tag: 'Boost',
    type: CocktailType.CATALOG,
    createdBy: 'admin',
    isActive: true,
    isPublic: true,
    ingredients: [
      { fruitId: 'citron',    fruitName: 'Lemon',    quantityGrams: 80, priceSnapshot: 200 },
      { fruitId: 'gingembre', fruitName: 'Ginger',   quantityGrams: 30, priceSnapshot: 150 },
      { fruitId: 'curcuma',   fruitName: 'Turmeric', quantityGrams: 10, priceSnapshot: 200 },
    ],
    basePrice: BASE_COCKTAIL_PRICE,
    totalPrice: BASE_COCKTAIL_PRICE + 200 + 150 + 200, // 2050
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-6',
    name: 'Minty Fresh',
    description: 'Cool and hydrating — perfect on a hot day.',
    imageUrl: 'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=800',
    type: CocktailType.CATALOG,
    createdBy: 'admin',
    isActive: true,
    isPublic: true,
    ingredients: [
      { fruitId: 'concombre', fruitName: 'Cucumber', quantityGrams: 100, priceSnapshot: 200 },
      { fruitId: 'menthe',    fruitName: 'Mint',     quantityGrams: 15,  priceSnapshot: 100 },
      { fruitId: 'citron_v',  fruitName: 'Lime',     quantityGrams: 60,  priceSnapshot: 200 },
    ],
    basePrice: BASE_COCKTAIL_PRICE,
    totalPrice: BASE_COCKTAIL_PRICE + 200 + 100 + 200, // 2000
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-7',
    name: 'Sunrise Blend',
    description: 'Vibrant carrot-orange blend to start your morning right.',
    imageUrl: 'https://images.pexels.com/photos/1000084/pexels-photo-1000084.jpeg?auto=compress&cs=tinysrgb&w=800',
    type: CocktailType.CATALOG,
    createdBy: 'admin',
    isActive: true,
    isPublic: true,
    ingredients: [
      { fruitId: 'carotte',   fruitName: 'Carrot', quantityGrams: 100, priceSnapshot: 200 },
      { fruitId: 'orange',    fruitName: 'Orange', quantityGrams: 120, priceSnapshot: 500 },
      { fruitId: 'gingembre', fruitName: 'Ginger', quantityGrams: 20,  priceSnapshot: 150 },
    ],
    basePrice: BASE_COCKTAIL_PRICE,
    totalPrice: BASE_COCKTAIL_PRICE + 200 + 500 + 150, // 2350
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-8',
    name: 'Berry Power',
    description: 'Deep purple superfruit blend — high in antioxidants.',
    imageUrl: 'https://images.pexels.com/photos/1153655/pexels-photo-1153655.jpeg?auto=compress&cs=tinysrgb&w=800',
    tag: 'Top',
    type: CocktailType.CATALOG,
    createdBy: 'admin',
    isActive: true,
    isPublic: true,
    ingredients: [
      { fruitId: 'myrtille', fruitName: 'Blueberry', quantityGrams: 80,  priceSnapshot: 600 },
      { fruitId: 'acai',     fruitName: 'Açaí',      quantityGrams: 50,  priceSnapshot: 800 },
      { fruitId: 'banane',   fruitName: 'Banana',    quantityGrams: 100, priceSnapshot: 200 },
    ],
    basePrice: BASE_COCKTAIL_PRICE,
    totalPrice: BASE_COCKTAIL_PRICE + 600 + 800 + 200, // 3100
    createdAt: now,
    updatedAt: now,
  },
];
