import { Timestamp } from 'firebase/firestore';

export interface FruitNutrients {
  caloriesPer100g?: number;
  sugarG?: number;
  vitaminC_mg?: number;
  potassium_mg?: number;
  fiberG?: number;
}

export interface Fruit {
  id: string;
  name: string;
  pricePerGram: number;
  categoryIds: string[]; // many-to-many avec Category, dénormalisé
  benefits: string[];    // ex: ["anti-inflammatory", "rich in vitamin C"]
  warnings: string[];    // ex: ["avoid with kidney disease", "high sugar"]
  nutrients: FruitNutrients;
  imageUrl?: string;
  createdAt: Timestamp;
}

// collection: "categories/{id}"
export interface Category {
  id: string;
  name: string; // ex: "citrus", "tropical", "low_sugar"
}
