import { Timestamp } from 'firebase/firestore';
import type { AIAnalysis, CocktailIngredient, Cocktail } from './cocktail';
import { partitionCocktailIngredients } from './cocktail';
import type { Fruit } from './fruit';
import type { BottleSize } from './settings';

export enum OrderStatus {
  PENDING   = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY     = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

/** Ligne de commande pour un format de bouteille spécifique ou un cocktail individuel */
export interface OrderLine {
  bottleSize: BottleSize;
  bottleSizeLabel: string;
  quantity: number;
  bottleBasePriceSnapshot: number;
  pricePerBottle: number;
  lineTotal: number;
  cocktailName?: string;
  fruits?: string[];
  ingredients?: CocktailIngredient[];
  isCatalog?: boolean;
  catalogCocktailId?: string | null;
  hasAddedSugar?: boolean;
  imageUrl?: string;
}

/** Dépense individuelle enregistrée pour une commande */
export interface OrderExpenseItem {
  id: string;
  label: string;
  type: 'fruit' | 'supplement' | 'packaging' | 'other';
  quantity?: number;
  unit?: string;
  cost: number; // en XAF
}

/** Jus individuel commandé dans le cadre d'un programme de cure */
export interface ProgramJuiceOrderItem {
  id: string;
  dayNumber: number;
  juiceName: string;
  timingLabel?: string;
  fruitNames?: string[];
  quantity: number;
  bottleSize: BottleSize;
  pricePerBottle: number;
  totalPrice: number;
  orderedAt: string; // ISO string
}

/** Bilan des dépenses réelles et rentabilité de la commande */
export interface OrderExpenses {
  items: OrderExpenseItem[];
  totalExpenses: number; // Somme des coûts en XAF
  netProfit: number; // totalPrice - totalExpenses
  marginPercentage: number; // (netProfit / totalPrice) * 100
  updatedAt?: Timestamp;
  updatedBy?: string;
}

export interface Order {
  id: string;
  /** Code de commande court et lisible (ex: FYS-7K2X) pour suivi WhatsApp */
  orderCode?: string;
  userId: string;
  userNameSnapshot: string;
  userEmailSnapshot: string;
  userPhoneSnapshot?: string;
  cocktailId: string;
  cocktailNameSnapshot: string;
  /** Ingrédients figés à la commande avec grammage et rôles (fruits vs suppléments) */
  cocktailIngredientsSnapshot?: CocktailIngredient[];
  
  /** Lignes de commande (500ml + 1L possibles dans la même commande) */
  orderLines: OrderLine[];
  
  /** Legacy fields for backward compatibility — optionnel pour les anciennes commandes */
  quantity?: number;
  bottleSize?: BottleSize;
  bottleSizeLabel?: string;
  bottleBasePriceSnapshot?: number;
  cocktailPriceSnapshot?: number;
  
  deliveryFee: number;
  totalPrice: number;
  discountAmount?: number;
  promoCodeApplied?: string;
  status: OrderStatus;
  deliveryDetails?: {
    district: string;
    phone: string;
    instructions: string;
    coordinates?: { lat: number; lng: number };
  };
  aiAnalysisSnapshot?: AIAnalysis;
  /** Option sucre (false ou undefined = 100% naturel sans sucre) */
  hasAddedSugar?: boolean;
  /** Canal ou origine de la commande : 'web' (site web) ou 'whatsapp' (assistant NutriFYS WhatsApp) */
  source?: 'web' | 'whatsapp';
  /** Type de commande : 'classic' (cocktails à la carte) ou 'program' (cure FYS Programme) */
  type?: 'classic' | 'program';
  /** Référence du programme si type === 'program' */
  programId?: string;
  programTitleSnapshot?: string;
  programGoal?: string;
  programDurationDays?: number;
  programBottlesTotal?: number;
  userProgramId?: string;
  startingDate?: string;
  /** Jus individuels commandés pour cette cure (regroupés au fur et à mesure) */
  programJuiceItems?: ProgramJuiceOrderItem[];

  /** Image figée à la commande (catalogue ou fruit principal / collage source) */
  cocktailImageSnapshot?: string;
  /** Photos fruits figées pour collage si pas d'image cocktail */
  ingredientImageSnapshots?: string[];
  /** Dépenses réelles et bénéfice calculé pour la commande */
  expenses?: OrderExpenses;
  /** Précommande spéciale pour l'événement Dégustation Privée (18 Octobre) */
  isDegustation?: boolean;
  orderType?: 'classic' | 'program' | 'degustation';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Détermine de manière fiable si une commande est une précommande pour l'événement
 * Dégustation Privée (18 Octobre 2026).
 */
export function isTastingOrder(order?: Partial<Order> | null): boolean {
  if (!order) return false;
  if (order.isDegustation === true) return true;
  if ((order as any).orderType === 'degustation') return true;
  const district = order.deliveryDetails?.district?.toLowerCase() || '';
  const instructions = order.deliveryDetails?.instructions?.toLowerCase() || '';
  const name = order.cocktailNameSnapshot?.toLowerCase() || '';
  const promo = order.promoCodeApplied?.toLowerCase() || '';
  return (
    district.includes('dégustation') ||
    district.includes('degustation') ||
    instructions.includes('dégustation') ||
    instructions.includes('degustation') ||
    name.includes('dégustation') ||
    name.includes('degustation') ||
    promo.includes('degust')
  );
}

export interface SplittedCocktailItem {
  id: string;
  index: number; // 1, 2, 3...
  name: string;
  quantity: number;
  bottleSizeLabel: string;
  pricePerBottle: number;
  lineTotal: number;
  mainFruits: CocktailIngredient[];
  supplements: CocktailIngredient[];
  allIngredients: CocktailIngredient[];
  hasAddedSugar?: boolean;
  isCatalog?: boolean;
  catalogCocktailId?: string | null;
  imageUrl?: string;
}

/**
 * Scinde une commande multi-cocktails ou mono-cocktail en une liste distincte d'articles :
 * Cocktail 1 : fruits et suppléments, quantité, format, prix
 * Cocktail 2 : fruits et suppléments, quantité, format, prix
 */
export function splitOrderCocktails(
  order: Order | null | undefined,
  allFruits: Fruit[] = [],
  catalogCocktails: Cocktail[] = []
): SplittedCocktailItem[] {
  if (!order) return [];

  // 1. Cures / Programmes FYS avec jus individuels
  if (order.type === 'program' && Array.isArray(order.programJuiceItems) && order.programJuiceItems.length > 0) {
    return order.programJuiceItems.map((j, idx) => {
      const ingList: CocktailIngredient[] = (j.fruitNames || []).map((fn) => {
        const found = allFruits.find((f) => f.name.toLowerCase() === fn.toLowerCase() || f.id === fn);
        return {
          fruitId: found?.id || fn,
          fruitName: found?.name || fn,
          quantityGrams: 0,
          priceSnapshot: Number(found?.price) || 0,
          isSupplement: !!found?.isSupplement,
        };
      });
      const { mainFruits, supplements } = partitionCocktailIngredients(ingList, allFruits);
      return {
        id: j.id || `prog_j_${idx + 1}`,
        index: idx + 1,
        name: `Jour ${j.dayNumber} : ${j.juiceName}${j.timingLabel ? ` (${j.timingLabel})` : ''}`,
        quantity: j.quantity || 1,
        bottleSizeLabel: String(j.bottleSize || '500ml'),
        pricePerBottle: j.pricePerBottle || 0,
        lineTotal: j.totalPrice || ((j.pricePerBottle || 0) * (j.quantity || 1)),
        mainFruits,
        supplements,
        allIngredients: ingList,
        hasAddedSugar: false,
      };
    });
  }

  // Découpage éventuel du nom combiné ("Papaye orange + Ananas papaye" -> ["Papaye orange", "Ananas papaye"])
  const rawCombinedName = order.cocktailNameSnapshot || '';
  const nameParts = rawCombinedName
    .split(/\s*\+\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  // 2. Si orderLines est présent (cas classique web et WhatsApp multi-cocktails)
  if (Array.isArray(order.orderLines) && order.orderLines.length > 0) {
    return order.orderLines.map((line, idx) => {
      const explicitName = line.cocktailName || (nameParts[idx] ? nameParts[idx] : (nameParts[0] && order.orderLines.length === 1 ? nameParts[0] : `Cocktail ${idx + 1}`));
      const lineName = explicitName || 'Cocktail FYS';

      // Résolution des ingrédients pour cette ligne spécifique
      let lineIngs: CocktailIngredient[] = [];
      if (Array.isArray(line.ingredients) && line.ingredients.length > 0) {
        lineIngs = line.ingredients;
      } else if (Array.isArray(line.fruits) && line.fruits.length > 0) {
        lineIngs = line.fruits.map((fn) => {
          const found = allFruits.find((f) => f.name.toLowerCase() === fn.toLowerCase() || f.id === fn);
          return {
            fruitId: found?.id || fn,
            fruitName: found?.name || fn,
            quantityGrams: 0,
            priceSnapshot: Number(found?.price) || 0,
            isSupplement: !!found?.isSupplement,
          };
        });
      } else {
        // Recherche dans le catalogue si jus signature
        const catMatch = catalogCocktails.find(
          (c) => (line.catalogCocktailId && c.id === line.catalogCocktailId) ||
                 (c.name.toLowerCase() === lineName.toLowerCase())
        );
        if (catMatch && Array.isArray(catMatch.ingredients) && catMatch.ingredients.length > 0) {
          lineIngs = catMatch.ingredients;
        } else if (Array.isArray(order.cocktailIngredientsSnapshot) && order.cocktailIngredientsSnapshot.length > 0) {
          // Filtrer les ingrédients du snapshot global dont le nom de fruit correspond au nom de ce cocktail
          const normLineName = lineName.toLowerCase();
          const matching = order.cocktailIngredientsSnapshot.filter((ing) => {
            const fn = (ing.fruitName || '').toLowerCase();
            return fn.length >= 3 && normLineName.includes(fn);
          });
          if (matching.length > 0) {
            lineIngs = matching;
          } else if (order.orderLines.length === 1) {
            lineIngs = order.cocktailIngredientsSnapshot;
          } else {
            // Partition ordonnée si noms non recoupés
            const chunkSize = Math.max(1, Math.ceil(order.cocktailIngredientsSnapshot.length / order.orderLines.length));
            lineIngs = order.cocktailIngredientsSnapshot.slice(idx * chunkSize, (idx + 1) * chunkSize);
          }
        }
      }

      const { mainFruits, supplements } = partitionCocktailIngredients(lineIngs, allFruits);
      const qty = Math.max(1, Number(line.quantity) || 1);
      const unitPrice = Number(line.pricePerBottle) || Number(line.bottleBasePriceSnapshot) || 500;
      const lineTotal = Number(line.lineTotal) || (unitPrice * qty);

      return {
        id: `order_line_${idx + 1}`,
        index: idx + 1,
        name: lineName,
        quantity: qty,
        bottleSizeLabel: line.bottleSizeLabel || String(line.bottleSize) || '350ml',
        pricePerBottle: unitPrice,
        lineTotal,
        mainFruits,
        supplements,
        allIngredients: lineIngs,
        hasAddedSugar: line.hasAddedSugar !== undefined ? !!line.hasAddedSugar : !!order.hasAddedSugar,
        isCatalog: Boolean(line.isCatalog || line.catalogCocktailId),
        catalogCocktailId: line.catalogCocktailId || null,
        imageUrl: line.imageUrl || (idx === 0 ? order.cocktailImageSnapshot : undefined),
      };
    });
  }

  // 3. Fallback sans orderLines mais avec nom scindé ("Papaye orange + Ananas papaye")
  if (nameParts.length > 1) {
    const totalQty = Math.max(1, order.quantity || nameParts.length);
    const avgQty = Math.max(1, Math.floor(totalQty / nameParts.length));
    const allIngs = order.cocktailIngredientsSnapshot || [];

    return nameParts.map((pName, idx) => {
      const normPart = pName.toLowerCase();
      let matchedIngs = allIngs.filter((ing) => {
        const fn = (ing.fruitName || '').toLowerCase();
        return fn.length >= 3 && normPart.includes(fn);
      });
      if (matchedIngs.length === 0) {
        const chunkSize = Math.max(1, Math.ceil(allIngs.length / nameParts.length));
        matchedIngs = allIngs.slice(idx * chunkSize, (idx + 1) * chunkSize);
      }
      const { mainFruits, supplements } = partitionCocktailIngredients(matchedIngs, allFruits);
      const lineQty = (idx === nameParts.length - 1) ? (totalQty - avgQty * (nameParts.length - 1)) : avgQty;
      const unitPrice = order.cocktailPriceSnapshot || (order.totalPrice ? Math.round(order.totalPrice / totalQty) : 500);

      return {
        id: `split_part_${idx + 1}`,
        index: idx + 1,
        name: pName,
        quantity: Math.max(1, lineQty),
        bottleSizeLabel: order.bottleSizeLabel || '350ml',
        pricePerBottle: unitPrice,
        lineTotal: unitPrice * Math.max(1, lineQty),
        mainFruits,
        supplements,
        allIngredients: matchedIngs,
        hasAddedSugar: !!order.hasAddedSugar,
        imageUrl: idx === 0 ? order.cocktailImageSnapshot : undefined,
      };
    });
  }

  // 4. Commande mono-cocktail standard
  const singleIngs = order.cocktailIngredientsSnapshot || [];
  const { mainFruits, supplements } = partitionCocktailIngredients(singleIngs, allFruits);
  const qty = Math.max(1, order.quantity || 1);
  const unitPrice = order.cocktailPriceSnapshot || (order.totalPrice ? Math.round(order.totalPrice / qty) : 500);

  return [
    {
      id: `single_cocktail_1`,
      index: 1,
      name: order.cocktailNameSnapshot || 'Cocktail Santé Sur-Mesure',
      quantity: qty,
      bottleSizeLabel: order.bottleSizeLabel || (order.bottleSize === '1L' ? '1 Litre' : '500ml'),
      pricePerBottle: unitPrice,
      lineTotal: unitPrice * qty,
      mainFruits,
      supplements,
      allIngredients: singleIngs,
      hasAddedSugar: !!order.hasAddedSugar,
      imageUrl: order.cocktailImageSnapshot,
    },
  ];
}


