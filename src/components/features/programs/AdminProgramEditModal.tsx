import { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Plus,
  Trash2,
  Save,
  Loader2,
  Calendar,
  DollarSign,
  Leaf,
  Layers,
  Sparkles,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Program, ProgramDayItem, ProgramGoal, ProgramTiming, Fruit } from '@/entities';
import { PROGRAM_TIMING_LABELS } from '@/entities';
import { uploadProgramImage } from '@/services/storage';

const GOAL_OPTIONS: { key: ProgramGoal; label: string }[] = [
  { key: 'detox', label: 'Détox & Élimination' },
  { key: 'immunity', label: 'Défenses & Énergie' },
  { key: 'digestion', label: 'Digestion & Confort' },
  { key: 'energy', label: 'Vitalité & Coup de fouet' },
  { key: 'weight_loss', label: 'Minceur & Ligne' },
  { key: 'glow', label: 'Éclat & Peau' },
];

const TIMING_OPTIONS: { key: ProgramTiming; label: string }[] = [
  { key: 'morning_empty_stomach', label: 'À jeun au réveil' },
  { key: 'morning', label: 'Au petit-déjeuner' },
  { key: 'afternoon', label: 'En collation (16h)' },
  { key: 'evening', label: 'En début de soirée' },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  program: Program | null; // null means create new
  onSave: (data: Partial<Program>, id?: string) => Promise<void>;
  availableFruits: Fruit[];
};

export function AdminProgramEditModal({
  isOpen,
  onClose,
  program,
  onSave,
  availableFruits,
}: Props) {
  const isEditing = !!program;

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState<ProgramGoal>('detox');
  const [durationDays, setDurationDays] = useState(3);
  const [price, setPrice] = useState(5500);
  const [originalPrice, setOriginalPrice] = useState<number | undefined>(6500);
  const [badge, setBadge] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [newBenefit, setNewBenefit] = useState('');
  const [days, setDays] = useState<ProgramDayItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingDayIdx, setUploadingDayIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (program) {
      setTitle(program.title || '');
      setSubtitle(program.subtitle || '');
      setDescription(program.description || '');
      setGoal(program.goal || 'detox');
      setDurationDays(program.durationDays || 3);
      setPrice(program.price || program.bundlePrice || 5000);
      setOriginalPrice(program.originalPrice);
      setBadge(program.badge || '');
      setImageUrl(program.imageUrl || '');
      setIsActive(program.isActive !== false);
      setBenefits(program.benefits || program.highlights || []);
      setDays(program.days ? JSON.parse(JSON.stringify(program.days)) : []);
    } else {
      // Default empty new program
      setTitle('');
      setSubtitle('');
      setDescription('');
      setGoal('detox');
      setDurationDays(3);
      setPrice(5500);
      setOriginalPrice(6500);
      setBadge('Nouvelle Cure');
      setImageUrl(
        'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1200'
      );
      setIsActive(true);
      setBenefits(['100% pressé à froid', 'Zéro sucre ajouté', 'Vitalité naturelle']);
      setDays([
        {
          dayNumber: 1,
          day: 1,
          cocktailName: 'Jus Frais J1',
          cocktailImage:
            'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=800',
          timing: 'morning_empty_stomach',
          timingLabel: 'À jeun au réveil',
          focus: 'Hydratation et réveil cellulaire',
          tasteProfile: 'Frais et équilibré',
          benefits: ['Hydratation'],
          advice: 'Boire lentement par petites gorgées.',
          fruitNames: ['Pomme Verte', 'Concombre'],
        },
      ]);
    }
  }, [program, isOpen]);

  const handleMainImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMain(true);
    setError(null);
    try {
      const url = await uploadProgramImage(
        `main-${program?.id || 'new'}-${Date.now()}`,
        file
      );
      setImageUrl(url);
    } catch (err: any) {
      setError(err.message || 'Échec de l’envoi de l’image principale.');
    } finally {
      setUploadingMain(false);
    }
  };

  const handleDayImageFileChange = async (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDayIdx(idx);
    setError(null);
    try {
      const url = await uploadProgramImage(`day-${idx + 1}-${Date.now()}`, file);
      setDays((prev) =>
        prev.map((d, i) => (i === idx ? { ...d, cocktailImage: url, imageUrl: url } : d))
      );
    } catch (err: any) {
      setError(err.message || 'Échec de l’envoi de l’image du jour.');
    } finally {
      setUploadingDayIdx(null);
    }
  };

  const handleAddBenefit = () => {
    if (!newBenefit.trim()) return;
    setBenefits((prev) => [...prev, newBenefit.trim()]);
    setNewBenefit('');
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddDay = () => {
    const nextDayNum = days.length + 1;
    setDays((prev) => [
      ...prev,
      {
        dayNumber: nextDayNum,
        day: nextDayNum,
        cocktailName: `Recette Jour ${nextDayNum}`,
        cocktailImage:
          'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=800',
        timing: 'morning_empty_stomach',
        timingLabel: 'À jeun au réveil',
        focus: 'Vitalité et équilibre',
        tasteProfile: 'Frais et équilibré',
        benefits: ['Énergie'],
        advice: 'Consommer à jeun pour une assimilation optimale.',
        fruitNames: ['Orange', 'Carotte'],
      },
    ]);
    if (days.length + 1 > durationDays) {
      setDurationDays(days.length + 1);
    }
  };

  const handleRemoveDay = (index: number) => {
    if (days.length <= 1) return;
    setDays((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((d, newIdx) => ({
          ...d,
          dayNumber: newIdx + 1,
          day: newIdx + 1,
        }))
    );
  };

  const handleDayFieldChange = (
    index: number,
    field: keyof ProgramDayItem,
    value: any
  ) => {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d;
        const updated = { ...d, [field]: value };
        if (field === 'timing') {
          updated.timingLabel = PROGRAM_TIMING_LABELS[value as ProgramTiming] || '';
        }
        return updated;
      })
    );
  };

  const handleToggleFruitInDay = (dayIndex: number, fruitName: string) => {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d;
        const currentFruits = d.fruitNames || d.fruits || [];
        const exists = currentFruits.includes(fruitName);
        const nextFruits = exists
          ? currentFruits.filter((f) => f !== fruitName)
          : [...currentFruits, fruitName];
        return {
          ...d,
          fruitNames: nextFruits,
          fruits: nextFruits,
        };
      })
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Le titre du programme est obligatoire.');
      return;
    }
    if (!imageUrl.trim()) {
      setError('L’image principale du programme est requise.');
      return;
    }
    if (days.length === 0) {
      setError('Vous devez définir au moins un jour dans le protocole.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const selectedGoalOption = GOAL_OPTIONS.find((g) => g.key === goal);
      const programData: Partial<Program> = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        description: description.trim(),
        goal,
        goalLabel: selectedGoalOption?.label || 'Cure Santé',
        durationDays: Number(durationDays) || days.length,
        bottlesTotal: Number(durationDays) || days.length,
        bottleSize: '500ml',
        price: Number(price) || 5000,
        bundlePrice: Number(price) || 5000,
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        badge: badge.trim() || undefined,
        imageUrl: imageUrl.trim(),
        isActive,
        benefits,
        highlights: benefits,
        colorAccent: goal === 'immunity' ? 'secondary' : 'primary',
        days: days.map((d, i) => ({
          ...d,
          dayNumber: i + 1,
          day: i + 1,
          timingLabel:
            d.timingLabel || PROGRAM_TIMING_LABELS[d.timing] || 'À jeun au réveil',
          fruitNames: d.fruitNames || d.fruits || [],
          fruits: d.fruitNames || d.fruits || [],
        })),
      };

      await onSave(programData, program?.id);
      onClose();
    } catch (err: any) {
      console.error('[AdminProgramEditModal error]', err);
      setError(err.message || 'Erreur lors de l’enregistrement de la cure.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-1.25rem)] sm:w-full max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-0 border border-border shadow-2xl rounded-3xl bg-background flex flex-col min-w-0"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/80 p-4 sm:p-6 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              {isEditing ? 'Éditeur de Cure' : 'Création de Cure'}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground">
              {isEditing ? `Modifier : ${program?.title}` : 'Nouvelle Cure FYS'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="size-9 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-7 space-y-7 min-w-0">
          {error && (
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Section 1 : Informations Générales & Publication */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Tag className="size-4 text-primary" />
              1. Informations Générales & Statut
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-foreground">Titre de la cure *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Cure Détox Éclair"
                  className="rounded-xl bg-card border-border/80 h-11 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Sous-titre accrocheur</label>
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Ex: Purifiez votre organisme et dégonflez en 3 jours."
                  className="rounded-xl bg-card border-border/80 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Objectif Santé</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as ProgramGoal)}
                  className="w-full h-10 px-3 rounded-xl bg-card border border-border/80 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {GOAL_OPTIONS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-foreground">Description complète</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explication détaillée des bienfaits physiologiques et de la cure..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-card border border-border/80 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Section 2 : Tarifs, Durée & Badges */}
          <div className="space-y-4 pt-4 border-t border-border/60">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <DollarSign className="size-4 text-primary" />
              2. Tarifs, Durée & Badges
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Durée (jours)</label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="rounded-xl bg-card border-border/80 h-10 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Prix du Pack (XAF) *</label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="rounded-xl bg-card border-border/80 h-10 text-xs font-bold text-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Prix barré (optionnel)</label>
                <Input
                  type="number"
                  value={originalPrice || ''}
                  onChange={(e) =>
                    setOriginalPrice(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="Ex: 6500"
                  className="rounded-xl bg-card border-border/80 h-10 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Badge marketing</label>
                <Input
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="Ex: Bestseller Express"
                  className="rounded-xl bg-card border-border/80 h-10 text-xs"
                />
              </div>
            </div>

            {/* Publication switch */}
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Statut de visibilité
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {isActive
                    ? 'La cure est active et visible par tous les clients au catalogue'
                    : 'La cure est masquée (mode brouillon)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                {isActive ? 'En ligne' : 'Masquée'}
              </button>
            </div>
          </div>

          {/* Section 3 : Image Principale de la Cure */}
          <div className="space-y-4 pt-4 border-t border-border/60">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Upload className="size-4 text-primary" />
              3. Image Principale de la Cure (Format paysage)
            </h3>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative size-28 sm:size-36 rounded-2xl overflow-hidden bg-muted border border-border shrink-0 shadow-xs">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Aperçu"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-medium">
                    Aucune image
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer hover:bg-primary/90 transition-all shadow-xs">
                    {uploadingMain ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {uploadingMain ? 'Téléversement...' : 'Téléverser via Cloudinary'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMainImageFileChange}
                      disabled={uploadingMain}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Ou URL directe :</label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.pexels.com/..."
                    className="rounded-xl bg-card border-border/80 text-xs h-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4 : Bénéfices Clés */}
          <div className="space-y-3 pt-4 border-t border-border/60">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              4. Atouts & Bénéfices Clés
            </h3>

            <div className="flex gap-2">
              <Input
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBenefit())}
                placeholder="Ex: Élimination accélérée des toxines métaboliques"
                className="rounded-xl bg-card border-border/80 text-xs h-10"
              />
              <Button
                type="button"
                onClick={handleAddBenefit}
                className="rounded-xl text-xs h-10 px-4 cursor-pointer shrink-0"
              >
                <Plus className="size-4 mr-1" />
                Ajouter
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {benefits.map((b, bi) => (
                <span
                  key={bi}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/60 border border-border/60 text-xs font-semibold text-foreground"
                >
                  <CheckCircle2 className="size-3.5 text-primary" />
                  {b}
                  <button
                    type="button"
                    onClick={() => handleRemoveBenefit(bi)}
                    className="ml-1 text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Section 5 : Protocole Jour par Jour */}
          <div className="space-y-4 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                5. Protocole Jour par Jour ({days.length} étapes)
              </h3>
              <Button
                type="button"
                size="sm"
                onClick={handleAddDay}
                className="rounded-xl text-xs cursor-pointer gap-1.5"
              >
                <Plus className="size-3.5" />
                Ajouter un jour
              </Button>
            </div>

            <div className="space-y-4">
              {days.map((day, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                    <span className="text-xs font-bold font-display uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Layers className="size-4" />
                      Jour {day.dayNumber || idx + 1}
                    </span>
                    {days.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDay(idx)}
                        className="text-muted-foreground hover:text-destructive text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                        Supprimer ce jour
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* Day Photo */}
                    <div className="sm:col-span-3 space-y-2">
                      <div className="relative h-24 sm:h-28 rounded-xl overflow-hidden bg-muted border border-border">
                        <img
                          src={day.cocktailImage || day.imageUrl}
                          alt="Jour"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <label className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-muted text-[10px] font-bold text-foreground cursor-pointer hover:bg-muted/80">
                        {uploadingDayIdx === idx ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Upload className="size-3" />
                        )}
                        Changer photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleDayImageFileChange(idx, e)}
                          disabled={uploadingDayIdx === idx}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Day Fields */}
                    <div className="sm:col-span-9 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-foreground block mb-0.5">
                            Nom du jus / cocktail *
                          </label>
                          <Input
                            value={day.cocktailName || day.title || ''}
                            onChange={(e) =>
                              handleDayFieldChange(idx, 'cocktailName', e.target.value)
                            }
                            placeholder="Ex: Élixir Vert Détox"
                            className="h-9 text-xs rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-foreground block mb-0.5">
                            Moment de prise
                          </label>
                          <select
                            value={day.timing || 'morning_empty_stomach'}
                            onChange={(e) =>
                              handleDayFieldChange(
                                idx,
                                'timing',
                                e.target.value as ProgramTiming
                              )
                            }
                            className="w-full h-9 px-2 rounded-lg bg-card border border-border/80 text-xs"
                          >
                            {TIMING_OPTIONS.map((to) => (
                              <option key={to.key} value={to.key}>
                                {to.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-foreground block mb-0.5">
                            Focus nutritionnel
                          </label>
                          <Input
                            value={day.focus || ''}
                            onChange={(e) =>
                              handleDayFieldChange(idx, 'focus', e.target.value)
                            }
                            placeholder="Ex: Hydratation et drainage rénal"
                            className="h-9 text-xs rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-foreground block mb-0.5">
                            Profil gustatif
                          </label>
                          <Input
                            value={day.tasteProfile || ''}
                            onChange={(e) =>
                              handleDayFieldChange(idx, 'tasteProfile', e.target.value)
                            }
                            placeholder="Ex: Frais, mentholé, très désaltérant"
                            className="h-9 text-xs rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Fruits multi-select chips */}
                      <div>
                        <label className="text-[11px] font-bold text-foreground block mb-1">
                          Fruits associés (cliquez pour ajouter/retirer) :
                        </label>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 rounded-lg bg-muted/30 border border-border/60">
                          {availableFruits.map((fruit) => {
                            const isSelected = (
                              day.fruitNames ||
                              day.fruits ||
                              []
                            ).includes(fruit.name);
                            return (
                              <button
                                key={fruit.id}
                                type="button"
                                onClick={() => handleToggleFruitInDay(idx, fruit.name)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-card text-muted-foreground hover:text-foreground border border-border/60'
                                }`}
                              >
                                <Leaf className="size-2.5" />
                                {fruit.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-foreground block mb-0.5">
                          Conseil NutriFYS pour ce jour
                        </label>
                        <Input
                          value={day.advice || day.nutrifysAdvice || ''}
                          onChange={(e) =>
                            handleDayFieldChange(idx, 'advice', e.target.value)
                          }
                          placeholder="Ex: Buvez par petites gorgées 20 min avant le petit-déjeuner..."
                          className="h-9 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 z-20 bg-background/95 backdrop-blur-md border-t border-border/80 p-4 sm:p-6 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl text-xs cursor-pointer"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm px-6 h-11 cursor-pointer gap-2"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? 'Enregistrement...' : 'Enregistrer la Cure'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
