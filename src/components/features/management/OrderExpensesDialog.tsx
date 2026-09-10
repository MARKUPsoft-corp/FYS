import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wine,
  Sparkles,
  ShoppingBag,
  DollarSign,
  PackageCheck,
  RotateCcw,
} from 'lucide-react';
import type { Order, OrderExpenseItem, OrderExpenses } from '@/entities/order';
import type { Fruit } from '@/entities/fruit';
import {
  type PricingSettings,
  getDefaultBottleCost,
} from '@/entities/settings';
import { isIngredientSupplement, type CocktailIngredient } from '@/entities/cocktail';
import { updateOrderExpenses } from '@/services/order';
import { useQuery } from '@tanstack/react-query';
import { getCocktailById } from '@/services/cocktail';

interface OrderExpensesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  fruits: Fruit[];
  pricingSettings?: PricingSettings | null;
  onSaved?: (orderId: string, expenses: OrderExpenses) => void;
}

export function OrderExpensesDialog({
  open,
  onOpenChange,
  order,
  fruits,
  pricingSettings,
  onSaved,
}: OrderExpensesDialogProps) {
  const [items, setItems] = useState<OrderExpenseItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Fruit name lookup map
  const fruitMap = useMemo(() => {
    const map = new Map<string, Fruit>();
    fruits.forEach((f) => map.set(f.id, f));
    return map;
  }, [fruits]);

  // Fetch cocktail document as fallback if order has cocktailId
  const { data: fetchedCocktail, isLoading: cocktailLoading } = useQuery({
    queryKey: ['cocktail', order?.cocktailId],
    queryFn: () => (order?.cocktailId ? getCocktailById(order.cocktailId) : null),
    enabled: !!order?.cocktailId && open,
    staleTime: 5 * 60_000,
  });

  // Resolve ingredients with 3-tier fallback (Snapshot -> Document -> Name Matching)
  const effectiveIngredients = useMemo((): CocktailIngredient[] => {
    if (!order) return [];

    // Tier 1: Snapshot directly on order
    if (order.cocktailIngredientsSnapshot && order.cocktailIngredientsSnapshot.length > 0) {
      return order.cocktailIngredientsSnapshot;
    }

    // Tier 2: Fetched cocktail document
    if (fetchedCocktail?.ingredients && fetchedCocktail.ingredients.length > 0) {
      return fetchedCocktail.ingredients;
    }

    // Tier 3: Parse from cocktail name using fruits database
    if (order.cocktailNameSnapshot && fruits.length > 0) {
      const nameLower = order.cocktailNameSnapshot.toLowerCase();
      const matched: CocktailIngredient[] = [];
      const seenIds = new Set<string>();

      // Sort fruits by name length descending so multi-word names match first
      const sortedFruits = [...fruits].sort((a, b) => b.name.length - a.name.length);

      for (const fruit of sortedFruits) {
        if (!fruit.name || fruit.name.trim().length < 2) continue;
        const fruitLower = fruit.name.toLowerCase().trim();
        const regex = new RegExp(`(^|[^a-zA-ZÀ-ÿ])${fruitLower}([^a-zA-ZÀ-ÿ]|$)`, 'i');
        if (regex.test(nameLower) || nameLower.includes(fruitLower)) {
          if (!seenIds.has(fruit.id)) {
            seenIds.add(fruit.id);
            const isSupp = fruit.isSupplement === true || fruit.categoryIds?.includes('supplement_herbe');
            matched.push({
              fruitId: fruit.id,
              fruitName: fruit.name,
              quantityGrams: isSupp ? 25 : 150,
              priceSnapshot: fruit.price || 0,
              role: isSupp ? 'supplement' : 'fruit',
            });
          }
        }
      }

      if (matched.length > 0) {
        return matched;
      }
    }

    return [];
  }, [order, fetchedCocktail, fruits]);

  // Generate initial default pre-filled items for this order
  const generateDefaultItems = (): OrderExpenseItem[] => {
    if (!order) return [];
    const result: OrderExpenseItem[] = [];

    // 1. Ingredients (Fruits & Supplements)
    effectiveIngredients.forEach((ing, index) => {
      const fruit = fruitMap.get(ing.fruitId);
      const name = ing.fruitName || fruit?.name || ing.fruitId || `Ingrédient ${index + 1}`;
      const isSupp = isIngredientSupplement(ing, fruits);
      const qty = ing.quantityGrams || (isSupp ? 25 : 150);
      result.push({
        id: `ing-${ing.fruitId || index}-${Date.now()}`,
        label: `${name} (${qty}g)`,
        type: isSupp ? 'supplement' : 'fruit',
        quantity: qty,
        unit: 'g',
        cost: 0,
      });
    });

    // 2. Packaging: Empty bottles with labels
    if (order.orderLines && order.orderLines.length > 0) {
      order.orderLines.forEach((line, idx) => {
        const unitCost = getDefaultBottleCost(pricingSettings, line.bottleSize);
        const qty = line.quantity || 1;
        result.push({
          id: `bottle-${line.bottleSize}-${idx}-${Date.now()}`,
          label: `Bouteille vide ${line.bottleSize} + étiquette (×${qty})`,
          type: 'packaging',
          quantity: qty,
          unit: 'bouteille',
          cost: qty * unitCost,
        });
      });
    } else {
      // Legacy fallback
      const size = order.bottleSize || '500ml';
      const qty = order.quantity || 1;
      const unitCost = getDefaultBottleCost(pricingSettings, size);
      result.push({
        id: `bottle-${size}-${Date.now()}`,
        label: `Bouteille vide ${size} + étiquette (×${qty})`,
        type: 'packaging',
        quantity: qty,
        unit: 'bouteille',
        cost: qty * unitCost,
      });
    }

    return result;
  };

  // Sync state when order changes or dialog opens
  useEffect(() => {
    if (!order || !open) return;
    if (cocktailLoading) return; // Wait for cocktail doc query if running

    if (order.expenses?.items && order.expenses.items.length > 0) {
      const hasFruitItem = order.expenses.items.some(
        (it) => it.type === 'fruit' || it.type === 'supplement'
      );
      if (hasFruitItem) {
        setItems(order.expenses.items.map((it) => ({ ...it })));
      } else {
        // Saved previously without fruits! Merge detected fruits with existing saved items
        const defaultFruits = generateDefaultItems().filter(
          (it) => it.type === 'fruit' || it.type === 'supplement'
        );
        setItems([...defaultFruits, ...order.expenses.items.map((it) => ({ ...it }))]);
      }
    } else {
      // Auto-prefill
      setItems(generateDefaultItems());
    }
  }, [order?.id, open, cocktailLoading, effectiveIngredients]);

  // Live financial metrics
  const totalExpenses = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.cost) || 0), 0);
  }, [items]);

  const totalRevenue = order?.totalPrice ?? 0;
  const netProfit = totalRevenue - totalExpenses;
  const marginPercentage =
    totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  const handleCostChange = (id: string, newCost: string) => {
    const val = Math.max(0, parseInt(newCost.replace(/\D/g, '') || '0', 10));
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, cost: val } : it))
    );
  };

  const handleLabelChange = (id: string, newLabel: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, label: newLabel } : it))
    );
  };

  const handleAddItem = (type: 'other' | 'packaging' | 'fruit' = 'other') => {
    const newItem: OrderExpenseItem = {
      id: `custom-${Date.now()}`,
      label: type === 'packaging' ? 'Emballage additionnel' : 'Autre dépense (glaçons, transport…)',
      type,
      cost: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleAddFruitById = (fruitId: string) => {
    const fruit = fruitMap.get(fruitId);
    if (!fruit) return;
    const isSupp = fruit.isSupplement === true || fruit.categoryIds?.includes('supplement_herbe');
    const newItem: OrderExpenseItem = {
      id: `fruit-manual-${fruit.id}-${Date.now()}`,
      label: `${fruit.name} (${isSupp ? 25 : 150}g)`,
      type: isSupp ? 'supplement' : 'fruit',
      quantity: isSupp ? 25 : 150,
      unit: 'g',
      cost: 0,
    };
    setItems((prev) => [newItem, ...prev]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleResetToDefaults = () => {
    setItems(generateDefaultItems());
    setFeedbackMsg({ type: 'info', text: 'Dépenses réinitialisées aux valeurs par défaut.' });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleSave = async () => {
    if (!order) return;
    setSaving(true);
    setFeedbackMsg(null);
    try {
      const expensesPayload: OrderExpenses = {
        items,
        totalExpenses,
        netProfit,
        marginPercentage,
      };

      await updateOrderExpenses(order.id, expensesPayload);
      setFeedbackMsg({ type: 'success', text: 'Dépenses et bénéfice enregistrés avec succès !' });
      onSaved?.(order.id, expensesPayload);
      setTimeout(() => {
        onOpenChange(false);
        setFeedbackMsg(null);
      }, 700);
    } catch (err) {
      console.error('Erreur enregistrement dépenses:', err);
      setFeedbackMsg({ type: 'error', text: 'Impossible d’enregistrer les dépenses.' });
    } finally {
      setSaving(false);
    }
  };

  if (!order) return null;

  const orderDate = order.createdAt?.toDate?.();
  const dateStr = orderDate
    ? orderDate.toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-[2rem] border border-border/50 shadow-2xl bg-card">
        {/* ── HEADER ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-xs font-black">
                  #{order.id.slice(0, 7).toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground">{dateStr}</span>
              </div>
              <DialogTitle className="font-display font-extrabold text-xl text-foreground truncate">
                Dépenses & Bénéfice — {order.userNameSnapshot}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate">
                Cocktail : <strong className="text-foreground">{order.cocktailNameSnapshot}</strong>
              </DialogDescription>
            </div>

            {/* Quick button to reset */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetToDefaults}
              className="rounded-full h-8 text-xs font-semibold gap-1.5 shrink-0 self-start sm:self-auto hover:bg-muted"
              title="Réinitialiser avec les ingrédients et bouteilles de base"
            >
              <RotateCcw className="size-3.5" />
              <span>Réinitialiser</span>
            </Button>
          </div>
        </DialogHeader>

        {/* ── BODY (SCROLLABLE) ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
          {feedbackMsg && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all animate-in fade-in ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                  : feedbackMsg.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <PackageCheck className="size-4 shrink-0" />
              ) : (
                <Sparkles className="size-4 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Order Summary Pill */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 rounded-2xl p-3 border border-border/40 text-xs">
            <div>
              <p className="text-muted-foreground font-medium">Client</p>
              <p className="font-bold text-foreground truncate">{order.userNameSnapshot}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium">Format(s)</p>
              <p className="font-bold text-foreground truncate">
                {order.orderLines?.map((l) => `${l.quantity}× ${l.bottleSize}`).join(', ') ||
                  `${order.quantity || 1}× ${order.bottleSize || '500ml'}`}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium">Livraison</p>
              <p className="font-bold text-foreground truncate">
                {order.deliveryDetails?.district || 'Emporté'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium">Prix payé (CA)</p>
              <p className="font-extrabold text-primary text-sm truncate">
                {order.totalPrice.toLocaleString()} XAF
              </p>
            </div>
          </div>

          {/* Table / List of Expenses */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                <DollarSign className="size-4 text-emerald-600" />
                <span>Détail des dépenses liées à la commande</span>
              </h4>
              <span className="text-xs font-semibold text-muted-foreground">
                {items.length} poste{items.length > 1 ? 's' : ''} de coût
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border/60 text-muted-foreground text-xs">
                Aucune dépense renseignée pour cette commande.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const isFruit = item.type === 'fruit';
                  const isSupp = item.type === 'supplement';
                  const isPackaging = item.type === 'packaging';

                  return (
                    <div
                      key={item.id || idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-card border border-border/40 hover:border-border/80 transition-colors shadow-xs"
                    >
                      {/* Left: Icon, Type Badge & Label */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div
                          className={`size-8 rounded-xl flex items-center justify-center shrink-0 text-xs ${
                            isFruit
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : isSupp
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              : isPackaging
                              ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isFruit ? '🍓' : isSupp ? '🌿' : isPackaging ? <Wine className="size-4" /> : <ShoppingBag className="size-4" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <Input
                            value={item.label}
                            onChange={(e) => handleLabelChange(item.id, e.target.value)}
                            className="h-8 text-xs font-semibold text-foreground bg-transparent border-transparent hover:border-border/40 focus:border-primary px-1.5 rounded-lg"
                            placeholder="Libellé de la dépense..."
                          />
                        </div>

                        <span
                          className={`hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase shrink-0 ${
                            isFruit
                              ? 'bg-emerald-100/60 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : isSupp
                              ? 'bg-amber-100/60 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              : isPackaging
                              ? 'bg-sky-100/60 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isFruit ? 'Fruit' : isSupp ? 'Supplément' : isPackaging ? 'Bouteille' : 'Autre'}
                        </span>
                      </div>

                      {/* Right: Cost input in XAF + Delete button */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <div className="relative w-36 sm:w-40">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={item.cost === 0 ? '' : item.cost.toLocaleString('fr-FR')}
                            onChange={(e) => handleCostChange(item.id, e.target.value)}
                            placeholder="0"
                            className="h-9 pr-12 text-right font-mono font-bold text-sm text-foreground bg-background rounded-xl"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground pointer-events-none">
                            XAF
                          </span>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          className="size-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                          title="Supprimer cette ligne"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick add action buttons */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <div className="relative">
                <select
                  onChange={(e) => {
                    if (!e.target.value) return;
                    handleAddFruitById(e.target.value);
                    e.target.value = '';
                  }}
                  defaultValue=""
                  className="h-8 px-3 rounded-full text-xs font-semibold border border-dashed border-border/70 bg-background text-foreground hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer focus:outline-hidden"
                >
                  <option value="" disabled>+ Ajouter un fruit du catalogue...</option>
                  {fruits.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.isSupplement ? '🌿' : '🍓'} {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddItem('packaging')}
                className="rounded-full h-8 text-xs font-semibold gap-1.5 border-dashed border-border/70 hover:border-sky-500 hover:text-sky-600"
              >
                <Plus className="size-3.5" />
                <span>Ajouter bouteille / étiquette</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddItem('other')}
                className="rounded-full h-8 text-xs font-semibold gap-1.5 border-dashed border-border/70 hover:border-primary hover:text-primary"
              >
                <Plus className="size-3.5" />
                <span>Ajouter un frais annexe</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ── FOOTER: FINANCIAL SUMMARY & SAVE ── */}
        <div className="border-t border-border/40 bg-muted/20 px-6 py-4 space-y-4 shrink-0">
          {/* Summary KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card rounded-2xl p-3.5 border border-border/50 shadow-sm">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Recette (CA)
              </p>
              <p className="font-display font-extrabold text-base text-foreground mt-0.5">
                {totalRevenue.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">XAF</span>
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Dépenses
              </p>
              <p className="font-display font-extrabold text-base text-foreground mt-0.5">
                {totalExpenses.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">XAF</span>
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Bénéfice Net
              </p>
              <p
                className={`font-display font-black text-lg mt-0.5 flex items-center gap-1 ${
                  netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {netProfit >= 0 ? (
                  <TrendingUp className="size-4 shrink-0" />
                ) : (
                  <TrendingDown className="size-4 shrink-0" />
                )}
                <span>{netProfit.toLocaleString()}</span>
                <span className="text-xs font-normal text-muted-foreground">XAF</span>
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Taux de Marge
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black ${
                    marginPercentage >= 40
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                      : marginPercentage > 0
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                  }`}
                >
                  {marginPercentage >= 0 ? `+${marginPercentage}%` : `${marginPercentage}%`}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="rounded-full px-5 text-sm font-semibold"
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full px-6 bg-primary text-white hover:bg-primary/90 font-bold gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>Enregistrer les dépenses</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
