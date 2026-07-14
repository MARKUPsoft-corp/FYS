import { useState, useEffect } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Separator } from '@/components/ui/separator';
import { NutrientsSection, type NutrientFields } from './NutrientsSection';
import { FruitImageUpload } from './FruitImageUpload';
import type { Fruit, Category, CocktailRole, DataStatus, GlycemicBadge, Bioactive } from '@/entities';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toNum(s: string): number | undefined {
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

function numStr(n: number | undefined): string {
  return n != null ? String(n) : '';
}

const EMPTY_NUTRIENTS: NutrientFields = {
  calories: '', water: '', carbs: '', sugar: '',
  fiber: '', fat: '', saturatedFat: '', protein: '',
  vitC: '', vitC_nrv: '', vitA: '', vitA_nrv: '',
  vitB1: '', vitB1_nrv: '', vitB2: '', vitB2_nrv: '',
  vitB3: '', vitB3_nrv: '', vitB5: '', vitB5_nrv: '',
  vitB6: '', vitB6_nrv: '', vitB9: '', vitB9_nrv: '',
  vitE: '', vitE_nrv: '', vitK1: '', vitK1_nrv: '',
  calcium: '', calcium_nrv: '', iron: '', iron_nrv: '',
  magnesium: '', magnesium_nrv: '', phosphorus: '', phosphorus_nrv: '',
  potassium: '', potassium_nrv: '', zinc: '', zinc_nrv: '',
  copper: '', copper_nrv: '', manganese: '', manganese_nrv: '',
  sodium: '', sodium_nrv: '',
};

function fruitToNutrients(fruit: Fruit): NutrientFields {
  const m = fruit.nutrients.macros;
  const v = fruit.nutrients.vitamins;
  const mn = fruit.nutrients.minerals;
  return {
    calories: numStr(m.calories_kcal), water: numStr(m.water_g),
    carbs: numStr(m.carbs_g), sugar: numStr(m.sugar_g),
    fiber: numStr(m.fiber_g), fat: numStr(m.fat_g),
    saturatedFat: numStr(m.saturatedFat_g), protein: numStr(m.protein_g),
    vitC: numStr(v.vitaminC_mg?.value), vitC_nrv: numStr(v.vitaminC_mg?.nrvPercent),
    vitA: numStr(v.vitaminA_ug?.value), vitA_nrv: numStr(v.vitaminA_ug?.nrvPercent),
    vitB1: numStr(v.vitaminB1_mg?.value), vitB1_nrv: numStr(v.vitaminB1_mg?.nrvPercent),
    vitB2: numStr(v.vitaminB2_mg?.value), vitB2_nrv: numStr(v.vitaminB2_mg?.nrvPercent),
    vitB3: numStr(v.vitaminB3_mg?.value), vitB3_nrv: numStr(v.vitaminB3_mg?.nrvPercent),
    vitB5: numStr(v.vitaminB5_mg?.value), vitB5_nrv: numStr(v.vitaminB5_mg?.nrvPercent),
    vitB6: numStr(v.vitaminB6_mg?.value), vitB6_nrv: numStr(v.vitaminB6_mg?.nrvPercent),
    vitB9: numStr(v.vitaminB9_ug?.value), vitB9_nrv: numStr(v.vitaminB9_ug?.nrvPercent),
    vitE: numStr(v.vitaminE_mg?.value), vitE_nrv: numStr(v.vitaminE_mg?.nrvPercent),
    vitK1: numStr(v.vitaminK1_ug?.value), vitK1_nrv: numStr(v.vitaminK1_ug?.nrvPercent),
    calcium: numStr(mn.calcium_mg?.value), calcium_nrv: numStr(mn.calcium_mg?.nrvPercent),
    iron: numStr(mn.iron_mg?.value), iron_nrv: numStr(mn.iron_mg?.nrvPercent),
    magnesium: numStr(mn.magnesium_mg?.value), magnesium_nrv: numStr(mn.magnesium_mg?.nrvPercent),
    phosphorus: numStr(mn.phosphorus_mg?.value), phosphorus_nrv: numStr(mn.phosphorus_mg?.nrvPercent),
    potassium: numStr(mn.potassium_mg?.value), potassium_nrv: numStr(mn.potassium_mg?.nrvPercent),
    zinc: numStr(mn.zinc_mg?.value), zinc_nrv: numStr(mn.zinc_mg?.nrvPercent),
    copper: numStr(mn.copper_mg?.value), copper_nrv: numStr(mn.copper_mg?.nrvPercent),
    manganese: numStr(mn.manganese_mg?.value), manganese_nrv: numStr(mn.manganese_mg?.nrvPercent),
    sodium: numStr(mn.sodium_mg?.value), sodium_nrv: numStr(mn.sodium_mg?.nrvPercent),
  };
}

function nv(val: string, nrv: string) {
  const v = toNum(val);
  if (v == null) return undefined;
  return { value: v, nrvPercent: toNum(nrv) };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-semibold text-foreground">{children}</h3>
      <Separator />
    </div>
  );
}

/** Editable tag list (benefits, warnings, avoidIf, etc.) */
function TagListField({
  label, values, onChange,
}: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');

  function add() {
    const t = draft.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setDraft('');
  }

  function remove(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5 min-h-8 p-2 rounded-md border border-border bg-background">
        {values.map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5">
            {v}
            <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Type and press Enter"
          className="h-8 text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Dynamic bioactives list */
function BioactivesField({
  items, onChange,
}: { items: Bioactive[]; onChange: (v: Bioactive[]) => void }) {
  function addRow() {
    onChange([...items, { name: '', approximateValue: '', description: '' }]);
  }
  function removeRow(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function update(i: number, field: keyof Bioactive, val: string) {
    onChange(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
          <div className="space-y-1">
            {i === 0 && <Label className="text-xs text-muted-foreground">Name</Label>}
            <Input
              value={item.name}
              onChange={(e) => update(i, 'name', e.target.value)}
              className="h-8 text-sm"
              placeholder="e.g. Lycopene"
            />
          </div>
          <div className="space-y-1">
            {i === 0 && <Label className="text-xs text-muted-foreground">Approx. value</Label>}
            <Input
              value={item.approximateValue ?? ''}
              onChange={(e) => update(i, 'approximateValue', e.target.value)}
              className="h-8 text-sm"
              placeholder="e.g. ~4.2 mg/100g"
            />
          </div>
          <div className={i === 0 ? 'pt-5' : ''}>
            <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => removeRow(i)}>
              <X className="size-3.5" />
            </Button>
          </div>
          <div className="col-span-2">
            <Input
              value={item.description ?? ''}
              onChange={(e) => update(i, 'description', e.target.value)}
              className="h-8 text-sm"
              placeholder="Description (optional)"
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={addRow}>
        <Plus className="size-3.5 mr-1" /> Add bioactive
      </Button>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  fruit?: Fruit | null;
  categories: Category[];
  onClose: () => void;
  onSave: (data: Omit<Fruit, 'id' | 'createdAt' | 'updatedAt'>, imageFile: File | null, fruitId?: string) => Promise<void>;
};

// ── Main component ────────────────────────────────────────────────────────────

export function FruitFormDrawer({ open, fruit, categories, onClose, onSave }: Props) {
  // Basic info
  const [name, setName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [price, setPricePerGram] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [cocktailRole, setCocktailRole] = useState<CocktailRole | ''>('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Cocktail profile
  const [benefits, setBenefits] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [avoidIf, setAvoidIf] = useState<string[]>([]);
  const [timing, setTiming] = useState('');

  // Glycemic index
  const [giMin, setGiMin] = useState('');
  const [giMax, setGiMax] = useState('');
  const [giBadge, setGiBadge] = useState<GlycemicBadge | ''>('');
  const [giLoad, setGiLoad] = useState('');
  const [giNote, setGiNote] = useState('');

  // Nutrients
  const [nutrients, setNutrients] = useState<NutrientFields>(EMPTY_NUTRIENTS);

  // Bioactives
  const [bioactives, setBioactives] = useState<Bioactive[]>([]);

  // Health profile
  const [benefitBadges, setBenefitBadges] = useState<string[]>([]);
  const [okRules, setOkRules] = useState('');
  const [precautions, setPrecautions] = useState('');
  const [contraindications, setContraindications] = useState('');
  const [nutritionistNote, setNutritionistNote] = useState('');

  // Metadata
  const [dataStatus, setDataStatus] = useState<DataStatus>('partial');
  const [sources, setSources] = useState<string[]>([]);
  const [validatedByNutritionist, setValidatedByNutritionist] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (!open) return;
    if (fruit) {
      setName(fruit.name);
      setScientificName(fruit.scientificName ?? '');
      setPricePerGram(numStr(fruit.price));
      setCategoryIds(fruit.categoryIds);
      setCocktailRole(fruit.cocktailRole ?? '');
      setImageFile(null);
      setBenefits(fruit.benefits);
      setWarnings(fruit.warnings);
      setAvoidIf(fruit.avoidIf ?? []);
      setTiming(fruit.timing ?? '');
      setGiMin(numStr(fruit.glycemicIndex?.min));
      setGiMax(numStr(fruit.glycemicIndex?.max));
      setGiBadge(fruit.glycemicIndex?.badge ?? '');
      setGiLoad(numStr(fruit.glycemicIndex?.glycemicLoad));
      setGiNote(fruit.glycemicIndex?.note ?? '');
      setNutrients(fruitToNutrients(fruit));
      setBioactives(fruit.bioactives ?? []);
      setBenefitBadges(fruit.healthProfile?.benefitBadges ?? []);
      setOkRules(fruit.healthProfile?.okRules ?? '');
      setPrecautions(fruit.healthProfile?.precautions ?? '');
      setContraindications(fruit.healthProfile?.contraindications ?? '');
      setNutritionistNote(fruit.healthProfile?.nutritionistNote ?? '');
      setDataStatus(fruit.dataStatus);
      setSources(fruit.sources ?? []);
      setValidatedByNutritionist(fruit.validatedByNutritionist);
    } else {
      setName(''); setScientificName(''); setPricePerGram('');
      setCategoryIds([]); setCocktailRole(''); setImageFile(null);
      setBenefits([]); setWarnings([]); setAvoidIf([]); setTiming('');
      setGiMin(''); setGiMax(''); setGiBadge(''); setGiLoad(''); setGiNote('');
      setNutrients(EMPTY_NUTRIENTS);
      setBioactives([]);
      setBenefitBadges([]); setOkRules(''); setPrecautions('');
      setContraindications(''); setNutritionistNote('');
      setDataStatus('partial'); setSources([]); setValidatedByNutritionist(false);
    }
    setError('');
  }, [fruit, open]);

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function setNutrientField(key: keyof NutrientFields, value: string) {
    setNutrients((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const data: Omit<Fruit, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      scientificName: scientificName.trim() || undefined,
      price: toNum(price),
      categoryIds,
      imageUrl: fruit?.imageUrl,
      benefits,
      warnings,
      cocktailRole: (cocktailRole as CocktailRole) || undefined,
      avoidIf: avoidIf.length ? avoidIf : undefined,
      timing: timing.trim() || undefined,
      glycemicIndex: giBadge ? {
        min: toNum(giMin), max: toNum(giMax),
        badge: giBadge as GlycemicBadge,
        glycemicLoad: toNum(giLoad),
        note: giNote.trim() || undefined,
      } : undefined,
      nutrients: {
        macros: {
          calories_kcal: toNum(nutrients.calories),
          water_g: toNum(nutrients.water),
          carbs_g: toNum(nutrients.carbs),
          sugar_g: toNum(nutrients.sugar),
          fiber_g: toNum(nutrients.fiber),
          fat_g: toNum(nutrients.fat),
          saturatedFat_g: toNum(nutrients.saturatedFat),
          protein_g: toNum(nutrients.protein),
        },
        vitamins: {
          vitaminC_mg: nv(nutrients.vitC, nutrients.vitC_nrv),
          vitaminA_ug: nv(nutrients.vitA, nutrients.vitA_nrv),
          vitaminB1_mg: nv(nutrients.vitB1, nutrients.vitB1_nrv),
          vitaminB2_mg: nv(nutrients.vitB2, nutrients.vitB2_nrv),
          vitaminB3_mg: nv(nutrients.vitB3, nutrients.vitB3_nrv),
          vitaminB5_mg: nv(nutrients.vitB5, nutrients.vitB5_nrv),
          vitaminB6_mg: nv(nutrients.vitB6, nutrients.vitB6_nrv),
          vitaminB9_ug: nv(nutrients.vitB9, nutrients.vitB9_nrv),
          vitaminE_mg: nv(nutrients.vitE, nutrients.vitE_nrv),
          vitaminK1_ug: nv(nutrients.vitK1, nutrients.vitK1_nrv),
        },
        minerals: {
          calcium_mg: nv(nutrients.calcium, nutrients.calcium_nrv),
          iron_mg: nv(nutrients.iron, nutrients.iron_nrv),
          magnesium_mg: nv(nutrients.magnesium, nutrients.magnesium_nrv),
          phosphorus_mg: nv(nutrients.phosphorus, nutrients.phosphorus_nrv),
          potassium_mg: nv(nutrients.potassium, nutrients.potassium_nrv),
          zinc_mg: nv(nutrients.zinc, nutrients.zinc_nrv),
          copper_mg: nv(nutrients.copper, nutrients.copper_nrv),
          manganese_mg: nv(nutrients.manganese, nutrients.manganese_nrv),
          sodium_mg: nv(nutrients.sodium, nutrients.sodium_nrv),
        },
      },
      bioactives: bioactives.filter((b) => b.name.trim()),
      healthProfile: {
        benefitBadges,
        okRules: okRules.trim() || undefined,
        precautions: precautions.trim() || undefined,
        contraindications: contraindications.trim() || undefined,
        nutritionistNote: nutritionistNote.trim() || undefined,
      },
      dataStatus,
      sources: sources.length ? sources : undefined,
      validatedByNutritionist,
    };

    setLoading(true);
    setError('');
    try {
      await onSave(data, imageFile, fruit?.id);
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
          <SheetTitle className="font-display">
            {fruit ? 'Edit fruit' : 'New fruit'}
          </SheetTitle>
        </SheetHeader>

        <form id="fruit-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-8">

          {/* ── Basic info ── */}
          <section className="space-y-4">
            <SectionTitle>Basic information</SectionTitle>

            <div className="flex gap-4 items-start">
              <FruitImageUpload key={fruit?.id ?? 'new'} currentUrl={fruit?.imageUrl} onChange={setImageFile} />
              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="f-name">Name <span className="text-destructive">*</span></Label>
                  <Input id="f-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mango" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="f-sci" className="text-xs text-muted-foreground">Scientific name</Label>
                  <Input id="f-sci" value={scientificName} onChange={(e) => setScientificName(e.target.value)} placeholder="e.g. Mangifera indica" className="text-sm italic" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="f-price" className="text-xs text-muted-foreground">Price (XAF)</Label>
                  <Input id="f-price" type="number" step="any" min="0" value={price} onChange={(e) => setPricePerGram(e.target.value)} placeholder="0.00" className="h-9" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Categories</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const active = categoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cocktail role</Label>
              <Select value={cocktailRole} onValueChange={(v) => setCocktailRole(v as CocktailRole)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select role…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acid">Acid</SelectItem>
                  <SelectItem value="sweet">Sweet</SelectItem>
                  <SelectItem value="antioxidant">Antioxidant</SelectItem>
                  <SelectItem value="mineral">Mineral</SelectItem>
                  <SelectItem value="base">Base</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* ── Cocktail profile ── */}
          <section className="space-y-4">
            <SectionTitle>Cocktail profile</SectionTitle>
            <TagListField label="Benefits" values={benefits} onChange={setBenefits} />
            <TagListField label="Warnings" values={warnings} onChange={setWarnings} />
            <TagListField label="Avoid if" values={avoidIf} onChange={setAvoidIf} />
            <div className="space-y-1">
              <Label htmlFor="f-timing" className="text-xs text-muted-foreground">Best timing</Label>
              <Input id="f-timing" value={timing} onChange={(e) => setTiming(e.target.value)} placeholder="e.g. Morning, before meals" className="h-9 text-sm" />
            </div>
          </section>

          {/* ── Glycemic index ── */}
          <section className="space-y-4">
            <SectionTitle>Glycemic index</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="gi-min" className="text-xs text-muted-foreground">GI min</Label>
                <Input id="gi-min" type="number" step="any" min="0" value={giMin} onChange={(e) => setGiMin(e.target.value)} className="h-8 text-sm" placeholder="—" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gi-max" className="text-xs text-muted-foreground">GI max</Label>
                <Input id="gi-max" type="number" step="any" min="0" value={giMax} onChange={(e) => setGiMax(e.target.value)} className="h-8 text-sm" placeholder="—" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Badge</Label>
                <Select value={giBadge} onValueChange={(v) => setGiBadge(v as GlycemicBadge)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="variable">Variable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="gi-load" className="text-xs text-muted-foreground">Glycemic load</Label>
                <Input id="gi-load" type="number" step="any" min="0" value={giLoad} onChange={(e) => setGiLoad(e.target.value)} className="h-8 text-sm" placeholder="—" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="gi-note" className="text-xs text-muted-foreground">Note</Label>
              <Input id="gi-note" value={giNote} onChange={(e) => setGiNote(e.target.value)} className="h-8 text-sm" placeholder="Optional note" />
            </div>
          </section>

          {/* ── Nutrients ── */}
          <section className="space-y-4">
            <SectionTitle>Nutrients (per 100g)</SectionTitle>
            <NutrientsSection fields={nutrients} onChange={setNutrientField} />
          </section>

          {/* ── Bioactives ── */}
          <section className="space-y-4">
            <SectionTitle>Bioactive compounds</SectionTitle>
            <BioactivesField items={bioactives} onChange={setBioactives} />
          </section>

          {/* ── Health profile ── */}
          <section className="space-y-4">
            <SectionTitle>Health profile</SectionTitle>
            <TagListField label="Benefit badges" values={benefitBadges} onChange={setBenefitBadges} />
            {[
              { id: 'hp-ok', label: 'OK rules (best combinations)', val: okRules, set: setOkRules },
              { id: 'hp-pre', label: 'Precautions', val: precautions, set: setPrecautions },
              { id: 'hp-contra', label: 'Contraindications', val: contraindications, set: setContraindications },
              { id: 'hp-note', label: 'Nutritionist note', val: nutritionistNote, set: setNutritionistNote },
            ].map(({ id, label, val, set }) => (
              <div key={id} className="space-y-1">
                <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
                <textarea
                  id={id}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="—"
                />
              </div>
            ))}
          </section>

          {/* ── Metadata ── */}
          <section className="space-y-4">
            <SectionTitle>Data quality</SectionTitle>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Data status</Label>
              <Select value={dataStatus} onValueChange={(v) => setDataStatus(v as DataStatus)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <TagListField label="Sources" values={sources} onChange={setSources} />
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={validatedByNutritionist}
                onChange={(e) => setValidatedByNutritionist(e.target.checked)}
                className="size-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">Validated by nutritionist</span>
            </label>
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>

        <SheetFooter className="px-6 py-4 border-t border-border shrink-0 flex flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="fruit-form" disabled={loading || !name.trim()}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {fruit ? 'Save changes' : 'Create fruit'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
