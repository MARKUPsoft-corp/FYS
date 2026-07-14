import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CocktailType, BASE_COCKTAIL_PRICE, type Cocktail, type CocktailIngredient } from '@/entities';
import type { Fruit, Category } from '@/entities';

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  cocktail?: Cocktail | null;
  fruits: Fruit[];
  categories: Category[];
  createdBy: string;
  onClose: () => void;
  onSave: (
    data: Omit<Cocktail, 'id' | 'createdAt' | 'updatedAt'>,
    imageFile: File | null,
    cocktailId?: string,
  ) => Promise<void>;
};

// ── Fruit picker row ──────────────────────────────────────────────────────────

type IngredientRow = {
  fruitId: string;
  quantityGrams: string;
};

function IngredientPickerRow({
  row,
  fruits,
  usedIds,
  index,
  onChange,
  onRemove,
}: {
  row: IngredientRow;
  fruits: Fruit[];
  usedIds: string[];
  index: number;
  onChange: (row: IngredientRow) => void;
  onRemove: () => void;
}) {
  const selectedFruit = fruits.find((f) => f.id === row.fruitId);
  const available = fruits.filter((f) => !usedIds.includes(f.id) || f.id === row.fruitId);

  return (
    <div className="grid grid-cols-[1fr_100px_auto] gap-2 items-end">
      {/* Fruit select */}
      <div className="space-y-1">
        {index === 0 && <Label className="text-xs text-muted-foreground">Fruit</Label>}
        <Select value={row.fruitId} onValueChange={(v) => onChange({ ...row, fruitId: v })}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Choose a fruit…">
              {selectedFruit && (
                <span className="flex items-center gap-2">
                  {selectedFruit.imageUrl ? (
                    <img src={selectedFruit.imageUrl} alt="" className="size-4 rounded object-cover" />
                  ) : (
                    <ImageOff className="size-3.5 text-muted-foreground/40" />
                  )}
                  {selectedFruit.name}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {available.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                <span className="flex items-center gap-2">
                  {f.imageUrl ? (
                    <img src={f.imageUrl} alt="" className="size-4 rounded object-cover" />
                  ) : (
                    <ImageOff className="size-3.5 text-muted-foreground/40" />
                  )}
                  <span>{f.name}</span>
                  {f.price != null && (
                    <span className="text-muted-foreground text-xs ml-auto">{f.price.toLocaleString()} XAF</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quantity */}
      <div className="space-y-1">
        {index === 0 && <Label className="text-xs text-muted-foreground">Qty (g)</Label>}
        <Input
          type="number"
          min="1"
          value={row.quantityGrams}
          onChange={(e) => onChange({ ...row, quantityGrams: e.target.value })}
          className="h-9 text-sm"
          placeholder="g"
        />
      </div>

      {/* Remove */}
      <div className={index === 0 ? 'pt-5' : ''}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Image upload (inline, reuses same pattern as FruitImageUpload) ────────────

function CocktailImageUpload({
  currentUrl,
  onChange,
}: {
  currentUrl?: string;
  onChange: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);

  function handleFile(file: File) {
    setPreview(URL.createObjectURL(file));
    onChange(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function remove(e: React.MouseEvent) {
    e.stopPropagation();
    setPreview(null);
    onChange(null);
  }

  return (
    <label
      className="relative w-full h-36 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer overflow-hidden flex items-center justify-center bg-muted/30"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {preview ? (
        <>
          <img src={preview} alt="Cover" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={remove}
            className="absolute top-2 right-2 size-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
          >
            ×
          </button>
        </>
      ) : (
        <div className="text-center space-y-1 pointer-events-none">
          <ImageOff className="size-6 text-muted-foreground/40 mx-auto" />
          <p className="text-xs text-muted-foreground">Drop an image or click to browse</p>
        </div>
      )}
      <input type="file" accept="image/*" className="sr-only" onChange={handleChange} />
    </label>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CocktailFormDrawer({
  open, cocktail, fruits, categories, createdBy, onClose, onSave,
}: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([{ fruitId: '', quantityGrams: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Category map for display
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  // Populate form when editing
  useEffect(() => {
    if (!open) return;
    if (cocktail) {
      setName(cocktail.name);
      setDescription(cocktail.description ?? '');
      setTag(cocktail.tag ?? '');
      setIsPublic(cocktail.isPublic);
      setImageFile(null);
      setIngredientRows(
        cocktail.ingredients.length > 0
          ? cocktail.ingredients.map((ing) => ({
              fruitId: ing.fruitId,
              quantityGrams: String(ing.quantityGrams),
            }))
          : [{ fruitId: '', quantityGrams: '' }],
      );
    } else {
      setName(''); setDescription(''); setTag(''); setIsPublic(true);
      setImageFile(null);
      setIngredientRows([{ fruitId: '', quantityGrams: '' }]);
    }
    setError('');
  }, [cocktail, open]);

  // ── Derived: built ingredients + live price ───────────────────────────────

  const validRows = ingredientRows.filter((r) => r.fruitId && r.quantityGrams);

  const ingredients: CocktailIngredient[] = validRows.map((r) => {
    const fruit = fruits.find((f) => f.id === r.fruitId)!;
    return {
      fruitId: r.fruitId,
      fruitName: fruit.name,
      quantityGrams: parseFloat(r.quantityGrams) || 0,
      priceSnapshot: fruit.price ?? 0,
    };
  });

  const fruitsTotal = ingredients.reduce((sum, ing) => sum + ing.priceSnapshot, 0);
  const totalPrice = BASE_COCKTAIL_PRICE + fruitsTotal;

  const usedIds = ingredientRows.map((r) => r.fruitId).filter(Boolean);

  function addRow() {
    setIngredientRows((prev) => [...prev, { fruitId: '', quantityGrams: '' }]);
  }

  function updateRow(i: number, row: IngredientRow) {
    setIngredientRows((prev) => prev.map((r, idx) => idx === i ? row : r));
  }

  function removeRow(i: number) {
    setIngredientRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || ingredients.length === 0) return;

    const data: Omit<Cocktail, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      description: description.trim() || undefined,
      imageUrl: cocktail?.imageUrl,
      tag: tag.trim() || undefined,
      type: CocktailType.CATALOG,
      createdBy,
      isActive: cocktail?.isActive ?? true,
      isPublic,
      ingredients,
      basePrice: BASE_COCKTAIL_PRICE,
      totalPrice,
    };

    setLoading(true);
    setError('');
    try {
      await onSave(data, imageFile, cocktail?.id);
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = name.trim() && ingredients.length > 0 && !loading;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
          <SheetTitle className="font-display">
            {cocktail ? 'Edit cocktail' : 'New cocktail'}
          </SheetTitle>
        </SheetHeader>

        <form id="cocktail-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-8">

          {/* ── Basic info ── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Basic information</h3>
            <Separator />

            <CocktailImageUpload
              key={cocktail?.id ?? 'new'}
              currentUrl={cocktail?.imageUrl}
              onChange={setImageFile}
            />

            <div className="space-y-1">
              <Label htmlFor="c-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="c-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tropical Bliss"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="c-desc" className="text-xs text-muted-foreground">Description</Label>
              <textarea
                id="c-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="A short description shown in the detail drawer…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="c-tag" className="text-xs text-muted-foreground">Tag (optional)</Label>
                <Input
                  id="c-tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="e.g. New, Popular, Summer"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Visibility</Label>
                <Select value={isPublic ? 'public' : 'private'} onValueChange={(v) => setIsPublic(v === 'public')}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ── Ingredients ── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Ingredients <span className="text-destructive">*</span>
            </h3>
            <Separator />

            <div className="space-y-3">
              {ingredientRows.map((row, i) => (
                <IngredientPickerRow
                  key={i}
                  index={i}
                  row={row}
                  fruits={fruits}
                  usedIds={usedIds}
                  onChange={(r) => updateRow(i, r)}
                  onRemove={() => removeRow(i)}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addRow}
              disabled={ingredientRows.length >= fruits.length}
            >
              <Plus className="size-3.5 mr-1.5" />
              Add fruit
            </Button>

            {/* Preview of selected fruits by category */}
            {ingredients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ingredients.map((ing) => {
                  const fruit = fruits.find((f) => f.id === ing.fruitId);
                  const catName = fruit?.categoryIds[0] ? categoryMap[fruit.categoryIds[0]] : null;
                  return (
                    <span key={ing.fruitId} className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2.5 py-1">
                      {ing.fruitName}
                      {catName && <span className="text-muted-foreground">· {catName}</span>}
                    </span>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Price breakdown ── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Price breakdown</h3>
            <Separator />

            <div className="rounded-xl bg-muted/40 border border-border px-4 py-3 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Base (50cl)</span>
                <span>{BASE_COCKTAIL_PRICE.toLocaleString()} XAF</span>
              </div>
              {ingredients.map((ing) => (
                <div key={ing.fruitId} className="flex justify-between text-muted-foreground">
                  <span>{ing.fruitName}</span>
                  <span>+ {ing.priceSnapshot.toLocaleString()} XAF</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-semibold text-foreground">
                <span>Cocktail total</span>
                <span className="text-primary">{totalPrice.toLocaleString()} XAF</span>
              </div>
              <p className="text-xs text-muted-foreground">+ 500 XAF delivery if applicable</p>
            </div>
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>

        <SheetFooter className="px-6 py-4 border-t border-border shrink-0 flex flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" form="cocktail-form" disabled={!canSubmit}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {cocktail ? 'Save changes' : 'Create cocktail'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
