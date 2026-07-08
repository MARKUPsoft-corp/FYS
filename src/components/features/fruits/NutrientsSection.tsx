import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// ── Collapsible wrapper ───────────────────────────────────────────────────

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
      >
        <span className="text-sm font-medium text-foreground">{title}</span>
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

// ── Single numeric input ──────────────────────────────────────────────────

function NumField({ label, id, value, onChange, unit }: {
  label: string; id: string; value: string;
  onChange: (v: string) => void; unit?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}{unit ? ` (${unit})` : ''}
      </Label>
      <Input
        id={id}
        type="number"
        step="any"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
        placeholder="—"
      />
    </div>
  );
}

// ── NRV pair input ─────────────────────────────────────────────────────────

function NrvField({ label, id, value, nrv, onValue, onNrv, unit }: {
  label: string; id: string; value: string; nrv: string;
  onValue: (v: string) => void; onNrv: (v: string) => void; unit: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            id={id}
            type="number"
            step="any"
            min="0"
            value={value}
            onChange={(e) => onValue(e.target.value)}
            className="h-8 text-sm"
            placeholder={`value (${unit})`}
          />
        </div>
        <div className="w-24">
          <Input
            type="number"
            step="any"
            min="0"
            max="999"
            value={nrv}
            onChange={(e) => onNrv(e.target.value)}
            className="h-8 text-sm"
            placeholder="NRV %"
          />
        </div>
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────

export type NutrientFields = {
  // Macros
  calories: string; water: string; carbs: string; sugar: string;
  fiber: string; fat: string; saturatedFat: string; protein: string;
  // Vitamins
  vitC: string; vitC_nrv: string;
  vitA: string; vitA_nrv: string;
  vitB1: string; vitB1_nrv: string;
  vitB2: string; vitB2_nrv: string;
  vitB3: string; vitB3_nrv: string;
  vitB5: string; vitB5_nrv: string;
  vitB6: string; vitB6_nrv: string;
  vitB9: string; vitB9_nrv: string;
  vitE: string; vitE_nrv: string;
  vitK1: string; vitK1_nrv: string;
  // Minerals
  calcium: string; calcium_nrv: string;
  iron: string; iron_nrv: string;
  magnesium: string; magnesium_nrv: string;
  phosphorus: string; phosphorus_nrv: string;
  potassium: string; potassium_nrv: string;
  zinc: string; zinc_nrv: string;
  copper: string; copper_nrv: string;
  manganese: string; manganese_nrv: string;
  sodium: string; sodium_nrv: string;
};

type Props = {
  fields: NutrientFields;
  onChange: (key: keyof NutrientFields, value: string) => void;
};

export function NutrientsSection({ fields, onChange }: Props) {
  const f = fields;
  const set = (k: keyof NutrientFields) => (v: string) => onChange(k, v);

  return (
    <div className="space-y-3">
      {/* Macros */}
      <Collapsible title="Macronutrients (per 100g)">
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Calories"      id="calories"     value={f.calories}     onChange={set('calories')}     unit="kcal" />
          <NumField label="Water"         id="water"        value={f.water}        onChange={set('water')}        unit="g" />
          <NumField label="Carbohydrates" id="carbs"        value={f.carbs}        onChange={set('carbs')}        unit="g" />
          <NumField label="Sugar"         id="sugar"        value={f.sugar}        onChange={set('sugar')}        unit="g" />
          <NumField label="Fiber"         id="fiber"        value={f.fiber}        onChange={set('fiber')}        unit="g" />
          <NumField label="Fat"           id="fat"          value={f.fat}          onChange={set('fat')}          unit="g" />
          <NumField label="Saturated fat" id="saturatedFat" value={f.saturatedFat} onChange={set('saturatedFat')} unit="g" />
          <NumField label="Protein"       id="protein"      value={f.protein}      onChange={set('protein')}      unit="g" />
        </div>
      </Collapsible>

      {/* Vitamins */}
      <Collapsible title="Vitamins — value + NRV %">
        <p className="text-xs text-muted-foreground -mt-2 mb-1">Left: value, Right: NRV %</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NrvField label="Vitamin C"  id="vitC"  unit="mg" value={f.vitC}  nrv={f.vitC_nrv}  onValue={set('vitC')}  onNrv={set('vitC_nrv')} />
          <NrvField label="Vitamin A"  id="vitA"  unit="µg" value={f.vitA}  nrv={f.vitA_nrv}  onValue={set('vitA')}  onNrv={set('vitA_nrv')} />
          <NrvField label="Vitamin B1" id="vitB1" unit="mg" value={f.vitB1} nrv={f.vitB1_nrv} onValue={set('vitB1')} onNrv={set('vitB1_nrv')} />
          <NrvField label="Vitamin B2" id="vitB2" unit="mg" value={f.vitB2} nrv={f.vitB2_nrv} onValue={set('vitB2')} onNrv={set('vitB2_nrv')} />
          <NrvField label="Vitamin B3" id="vitB3" unit="mg" value={f.vitB3} nrv={f.vitB3_nrv} onValue={set('vitB3')} onNrv={set('vitB3_nrv')} />
          <NrvField label="Vitamin B5" id="vitB5" unit="mg" value={f.vitB5} nrv={f.vitB5_nrv} onValue={set('vitB5')} onNrv={set('vitB5_nrv')} />
          <NrvField label="Vitamin B6" id="vitB6" unit="mg" value={f.vitB6} nrv={f.vitB6_nrv} onValue={set('vitB6')} onNrv={set('vitB6_nrv')} />
          <NrvField label="Vitamin B9" id="vitB9" unit="µg" value={f.vitB9} nrv={f.vitB9_nrv} onValue={set('vitB9')} onNrv={set('vitB9_nrv')} />
          <NrvField label="Vitamin E"  id="vitE"  unit="mg" value={f.vitE}  nrv={f.vitE_nrv}  onValue={set('vitE')}  onNrv={set('vitE_nrv')} />
          <NrvField label="Vitamin K1" id="vitK1" unit="µg" value={f.vitK1} nrv={f.vitK1_nrv} onValue={set('vitK1')} onNrv={set('vitK1_nrv')} />
        </div>
      </Collapsible>

      {/* Minerals */}
      <Collapsible title="Minerals — value + NRV %">
        <p className="text-xs text-muted-foreground -mt-2 mb-1">Left: value, Right: NRV %</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NrvField label="Calcium"    id="calcium"    unit="mg" value={f.calcium}    nrv={f.calcium_nrv}    onValue={set('calcium')}    onNrv={set('calcium_nrv')} />
          <NrvField label="Iron"       id="iron"       unit="mg" value={f.iron}       nrv={f.iron_nrv}       onValue={set('iron')}       onNrv={set('iron_nrv')} />
          <NrvField label="Magnesium"  id="magnesium"  unit="mg" value={f.magnesium}  nrv={f.magnesium_nrv}  onValue={set('magnesium')}  onNrv={set('magnesium_nrv')} />
          <NrvField label="Phosphorus" id="phosphorus" unit="mg" value={f.phosphorus} nrv={f.phosphorus_nrv} onValue={set('phosphorus')} onNrv={set('phosphorus_nrv')} />
          <NrvField label="Potassium"  id="potassium"  unit="mg" value={f.potassium}  nrv={f.potassium_nrv}  onValue={set('potassium')}  onNrv={set('potassium_nrv')} />
          <NrvField label="Zinc"       id="zinc"       unit="mg" value={f.zinc}       nrv={f.zinc_nrv}       onValue={set('zinc')}       onNrv={set('zinc_nrv')} />
          <NrvField label="Copper"     id="copper"     unit="mg" value={f.copper}     nrv={f.copper_nrv}     onValue={set('copper')}     onNrv={set('copper_nrv')} />
          <NrvField label="Manganese"  id="manganese"  unit="mg" value={f.manganese}  nrv={f.manganese_nrv}  onValue={set('manganese')}  onNrv={set('manganese_nrv')} />
          <NrvField label="Sodium"     id="sodium"     unit="mg" value={f.sodium}     nrv={f.sodium_nrv}     onValue={set('sodium')}     onNrv={set('sodium_nrv')} />
        </div>
      </Collapsible>
    </div>
  );
}
