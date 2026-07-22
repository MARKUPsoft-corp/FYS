import { PageComponent } from 'rasengan';
import { useState, useEffect, useMemo } from 'react';
import {
  HeartPulse, Pencil, Check, Plus, X,
  Shield, Zap, Leaf, Droplets, Heart, Moon, Wind, Sparkles,
  AlertCircle, Loader2, Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore, isProfileComplete } from '@/stores/profile';
import { useClientTour, PageTour } from '@/components/features/tour/ClientTour';
import { buildProfileTourSteps } from '@/components/features/tour/pages/profile-tour';
import { UserRole } from '@/entities';
import { PushOptInButton } from '@/components/features/admin/PushNotificationPanel';

// ── Predefined options ────────────────────────────────────────────────────────

const HEALTH_CONDITIONS = [
  'Aucune condition particulière',
  'Diabète',
  'Insuffisance rénale',
  'Grossesse',
  'RGO / Gastrite',
  'Rhumatologie / Goutte',
  'Anticoagulants (Warfarine)',
  'Insomnie',
  'Hypotension',
  'Antiacides',
  'Diurétiques (Furosémide)',
  'Metformine',
  'Contraceptifs oraux',
];

const ALLERGIES = [
  'Aucune allergie connue',
  'Ananas',
  'Mangue',
  'Kiwi',
  'Fraise',
  'Agrumes (citron, orange)',
  'Noix de coco',
  'Papaye',
  'Gingembre',
  'Banane',
  'Latex (banane, avocat, kiwi)',
];

const GOALS = [
  { label: 'Immunité',         icon: Shield  },
  { label: 'Énergie',          icon: Zap     },
  { label: 'Peau',             icon: Sparkles },
  { label: 'Santé cardiaque',  icon: Heart   },
  { label: 'Antioxydants',     icon: Wind    },
  { label: 'Digestion',        icon: Leaf    },
  { label: 'Hydratation',      icon: Droplets },
  { label: 'Sommeil',          icon: Moon    },
];

// ── Multi-select chip group ───────────────────────────────────────────────────

function ChipGroup({
  options,
  selected,
  onToggle,
  exclusiveFirst = false,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  exclusiveFirst?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        const isExclusive = exclusiveFirst && opt === options[0];
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all active:scale-95 ${
              isSelected
                ? isExclusive
                  ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'
                  : 'bg-primary/10 text-primary border-primary/30'
                : 'bg-card text-muted-foreground border-border/60 hover:border-primary/30 hover:text-foreground'
            }`}
          >
            {isSelected && <Check className="size-3 shrink-0" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ── Custom tag input ──────────────────────────────────────────────────────────

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="h-9 rounded-xl text-sm"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={add}
          disabled={!input.trim()}
          className="rounded-xl gap-1 shrink-0"
        >
          <Plus className="size-3.5" /> Ajouter
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            >
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Edit profile sheet ────────────────────────────────────────────────────────

function EditProfileSheet({
  open,
  onOpenChange,
  uid,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  uid: string;
}) {
  const { profile, save } = useProfileStore();
  const [saving, setSaving] = useState(false);

  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);

  // Custom values not in the predefined lists
  const [customConditions, setCustomConditions] = useState<string[]>([]);
  const [customAllergies, setCustomAllergies] = useState<string[]>([]);

  // Sync state from store when sheet opens
  useEffect(() => {
    if (!open) return;
    setConditions(profile?.healthConditions ?? []);
    setAllergies(profile?.allergies ?? []);
    setGoals(profile?.goals ?? []);
    setCustomConditions(
      (profile?.healthConditions ?? []).filter((c) => !HEALTH_CONDITIONS.includes(c)),
    );
    setCustomAllergies(
      (profile?.allergies ?? []).filter((a) => !ALLERGIES.includes(a)),
    );
  }, [open, profile]);

  function toggleCondition(val: string) {
    const isExclusive = val === HEALTH_CONDITIONS[0];
    if (isExclusive) {
      setConditions(conditions.includes(val) ? [] : [val]);
    } else {
      const withoutExclusive = conditions.filter((c) => c !== HEALTH_CONDITIONS[0]);
      setConditions(
        withoutExclusive.includes(val)
          ? withoutExclusive.filter((c) => c !== val)
          : [...withoutExclusive, val],
      );
    }
  }

  function toggleAllergy(val: string) {
    const isExclusive = val === ALLERGIES[0];
    if (isExclusive) {
      setAllergies(allergies.includes(val) ? [] : [val]);
    } else {
      const withoutExclusive = allergies.filter((a) => a !== ALLERGIES[0]);
      setAllergies(
        withoutExclusive.includes(val)
          ? withoutExclusive.filter((a) => a !== val)
          : [...withoutExclusive, val],
      );
    }
  }

  function toggleGoal(val: string) {
    setGoals(goals.includes(val) ? goals.filter((g) => g !== val) : [...goals, val]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const allConditions = [
        ...conditions.filter((c) => HEALTH_CONDITIONS.includes(c)),
        ...customConditions,
      ];
      const allAllergies = [
        ...allergies.filter((a) => ALLERGIES.includes(a)),
        ...customAllergies,
      ];
      await save(uid, {
        healthConditions: allConditions.length ? allConditions : ['Aucune condition particulière'],
        allergies: allAllergies.length ? allAllergies : ['Aucune allergie connue'],
        goals,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const allConditionsSelected = [
    ...conditions.filter((c) => HEALTH_CONDITIONS.includes(c)),
    ...customConditions,
  ];
  const allAllergiesSelected = [
    ...allergies.filter((a) => ALLERGIES.includes(a)),
    ...customAllergies,
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[500px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <SheetTitle className="font-display text-xl font-bold">
            Modifier le profil santé
          </SheetTitle>
          <p className="text-[13px] text-muted-foreground">
            Ces informations permettent à NutriFYS de personnaliser vos recommandations.
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

          {/* Conditions de santé */}
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                Conditions de santé
              </p>
              <p className="text-[12px] text-muted-foreground">
                Sélectionnez tout ce qui vous concerne.
              </p>
            </div>
            <ChipGroup
              options={HEALTH_CONDITIONS}
              selected={allConditionsSelected}
              onToggle={toggleCondition}
              exclusiveFirst
            />
            <TagInput
              values={customConditions}
              onChange={setCustomConditions}
              placeholder="Autre condition…"
            />
          </div>

          {/* Allergies */}
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                Allergies alimentaires
              </p>
              <p className="text-[12px] text-muted-foreground">
                Indiquez vos allergies aux fruits ou ingrédients.
              </p>
            </div>
            <ChipGroup
              options={ALLERGIES}
              selected={allAllergiesSelected}
              onToggle={toggleAllergy}
              exclusiveFirst
            />
            <TagInput
              values={customAllergies}
              onChange={setCustomAllergies}
              placeholder="Autre allergie…"
            />
          </div>

          {/* Objectifs santé */}
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                Objectifs santé
              </p>
              <p className="text-[12px] text-muted-foreground">
                Ce que vous souhaitez améliorer en priorité.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(({ label, icon: Icon }) => {
                const isSelected = goals.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleGoal(label)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-[12px] font-semibold border transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-card text-muted-foreground border-border/60 hover:border-primary/30 hover:text-foreground'
                    }`}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {label}
                    {isSelected && <Check className="size-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border/40 px-6 py-5 space-y-2">
          <Button
            size="lg"
            className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold gap-2 shadow-[0_8px_25px_rgba(63,109,78,0.25)] active:scale-95 transition-all"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? (
              <><Loader2 className="size-4 animate-spin" /> Sauvegarde…</>
            ) : (
              <><Check className="size-4" /> Sauvegarder le profil</>
            )}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Vos données restent privées et ne sont jamais partagées.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Profile display chip ──────────────────────────────────────────────────────

function ProfileChip({ label, variant = 'default' }: { label: string; variant?: 'default' | 'goal' | 'allergy' }) {
  const styles = {
    default: 'bg-muted text-muted-foreground border border-border/60',
    goal:    'bg-primary/10 text-primary border border-primary/20',
    allergy: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[12px] font-semibold ${styles[variant]}`}>
      {label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const Profile: PageComponent = () => {
  const { user } = useAuthStore();
  const { profile, loading, fetch } = useProfileStore();
  const { startTour, isActive } = useClientTour();
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (user?.uid) fetch(user.uid);
  }, [user?.uid]);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const complete = isProfileComplete(profile);
  const isCustomer = user?.role === UserRole.CUSTOMER;
  const profileTourSteps = useMemo(() => buildProfileTourSteps(), []);

  const conditions = (profile?.healthConditions ?? []).filter(
    (c) => !c.toLowerCase().includes('aucune'),
  );
  const allergies = (profile?.allergies ?? []).filter(
    (a) => !a.toLowerCase().includes('aucune'),
  );
  const goals = profile?.goals ?? [];

  const completionSections = [
    { label: 'Conditions', done: profile?.healthConditions && profile.healthConditions.length > 0 },
    { label: 'Allergies', done: profile?.allergies && profile.allergies.length > 0 },
    { label: 'Objectifs', done: goals.length > 0 },
  ];
  const completionCount = completionSections.filter((s) => s.done).length;
  const completionPct = Math.round((completionCount / completionSections.length) * 100);

  return (
    <PageTour pageId="profile" steps={profileTourSteps} autoStartDelay={700}>
    <div className="min-h-dvh bg-background pb-4">

      {/* Hero banner */}
      <div
        className="relative w-full h-[220px] flex items-end px-3 md:px-6 pb-8 mb-16"
        style={{
          backgroundImage: "url('https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1200')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        {/* Avatar */}
        <div className="absolute -bottom-10 left-6 size-20 rounded-full bg-primary flex items-center justify-center border-4 border-background shadow-2xl z-20">
          <span className="font-display font-bold text-2xl text-white">{initials}</span>
        </div>
        <div className="relative z-10 ml-28">
          <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-1">NutriFYS</p>
          <h1 className="font-display font-extrabold text-3xl text-white">
            Mon <span className="text-secondary italic">Profil</span>
          </h1>
        </div>
      </div>

      <div className="px-3 md:px-4 space-y-6 mt-6">

        {/* Identity card */}
        <div id="tour-profile-identity" className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-xl text-foreground truncate">
              {user?.name ?? '—'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Membre FYS · {complete ? 'Profil complété' : 'Profil en cours de configuration'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setEditOpen(true)}
            className="rounded-full bg-primary text-white font-bold hover:bg-primary/90 px-4 gap-1.5 shrink-0"
          >
            <Pencil className="size-3.5" />
            Modifier
          </Button>
        </div>

        {/* App tour (clients only) */}
        {isCustomer && (
        <div id="tour-profile-app-tour" className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-secondary/10 flex items-center justify-center shrink-0">
            <Compass className="size-6 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-foreground">Visite guidée</p>
            <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
              Redécouvrez les essentiels de FYS en quelques étapes.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isActive}
            onClick={startTour}
            className="rounded-full font-bold border-border/60 shrink-0"
          >
            {isActive ? 'En cours…' : 'Lancer'}
          </Button>
        </div>
        )}

        {/* Push Notifications Opt-In */}
        {user?.uid && (
          <div className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display font-bold text-foreground">Notifications push</p>
              <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
                Recevez les mises à jour même quand l'application est fermée.
              </p>
            </div>
            <div className="shrink-0">
              <PushOptInButton uid={user.uid} />
            </div>
          </div>
        )}

        {/* Completion bar */}
        {!loading && (
          <div id="tour-profile-health" className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Complétude du profil santé</p>
              <span className="text-sm font-bold text-primary">{completionPct}%</span>
            </div>
            <div className="h-2 bg-border/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <div className="flex gap-3">
              {completionSections.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 text-[11px] font-medium">
                  <span className={`size-2 rounded-full ${s.done ? 'bg-primary' : 'bg-border'}`} />
                  <span className={s.done ? 'text-foreground' : 'text-muted-foreground'}>{s.label}</span>
                </div>
              ))}
            </div>
            {!complete && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                <AlertCircle className="size-3.5 shrink-0" />
                Un profil complet améliore la précision des analyses NutriFYS
              </p>
            )}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="h-32 rounded-[2rem] border border-border/50 bg-card p-5 animate-pulse" />
            <div className="h-32 rounded-[2rem] border border-border/50 bg-card p-5 animate-pulse" />
            <div className="h-32 rounded-[2rem] border border-border/50 bg-card p-5 animate-pulse" />
          </div>
        )}

        {/* Health profile sections */}
        {!loading && (
          <>
            {/* Conditions */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                  <HeartPulse className="size-4 text-red-500" />
                </div>
                <p className="font-bold text-sm text-foreground">Conditions de santé</p>
              </div>
              {conditions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {conditions.map((c) => <ProfileChip key={c} label={c} />)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {profile ? 'Aucune condition renseignée' : 'Non renseigné'}
                </p>
              )}
            </div>

            {/* Allergies */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                  <Shield className="size-4 text-amber-500" />
                </div>
                <p className="font-bold text-sm text-foreground">Allergies alimentaires</p>
              </div>
              {allergies.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {allergies.map((a) => <ProfileChip key={a} label={a} variant="allergy" />)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {profile ? 'Aucune allergie renseignée' : 'Non renseigné'}
                </p>
              )}
            </div>

            {/* Objectifs */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="size-4 text-primary" />
                </div>
                <p className="font-bold text-sm text-foreground">Objectifs santé</p>
              </div>
              {goals.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {goals.map((g) => <ProfileChip key={g} label={g} variant="goal" />)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {profile ? 'Aucun objectif renseigné' : 'Non renseigné'}
                </p>
              )}
            </div>

            {/* CTA if profile incomplete */}
            {!complete && (
              <div
                className="relative rounded-[2.5rem] overflow-hidden flex items-center px-8 py-10 cursor-pointer"
                style={{
                  backgroundImage: "url('https://images.pexels.com/photos/2294471/pexels-photo-2294471.jpeg?auto=compress&cs=tinysrgb&w=1200')",
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                onClick={() => setEditOpen(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/60" />
                <div className="relative z-10">
                  <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2">
                    Personnalisation
                  </p>
                  <h3 className="font-display font-extrabold text-2xl text-white leading-tight mb-4">
                    Complète ton profil pour des<br />
                    <span className="text-secondary italic">recommandations précises</span>
                  </h3>
                  <Button className="rounded-full bg-white text-primary font-bold hover:bg-white/90 active:scale-95 transition-all px-8 h-12 shadow-xl">
                    Configurer maintenant
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit sheet */}
      {user?.uid && (
        <EditProfileSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          uid={user.uid}
        />
      )}
    </div>
    </PageTour>
  );
};

Profile.metadata = {
  title: 'FYS — Profil santé',
  description: 'Profil santé FYS.',
};

export default Profile;
