import { PageComponent } from 'rasengan';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useState, useEffect } from 'react';
import {
  HeartPulse, Pencil, Check, Plus, X,
  Shield, Zap, Leaf, Droplets, Heart, Moon, Wind, Sparkles,
  AlertCircle, Loader2, Music, Volume2, VolumeX, Sun,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore, isProfileComplete } from '@/stores/profile';
import { useAudioStore } from '@/stores/audio';
import { useTheme } from '@rasenganjs/theme';
import { PushOptInButton } from '@/components/features/admin/PushNotificationPanel';

// ── Predefined options ────────────────────────────────────────────────────────

const HEALTH_CONDITIONS = i18n.t('profile.healthConditionOptions', { returnObjects: true }) as string[];

const ALLERGIES = i18n.t('profile.allergyOptions', { returnObjects: true }) as string[];

const GOALS = (i18n.t('profile.goalOptions', { returnObjects: true }) as string[]).map((label, i) => ({
  label,
  icon: [Shield, Zap, Sparkles, Heart, Wind, Leaf, Droplets, Moon][i]!,
}));

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
  const { t } = useTranslation();
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
          <Plus className="size-3.5" /> {t('common.create')}
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
  const { t } = useTranslation();
  const { profile, save } = useProfileStore();
  const [saving, setSaving] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);

  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);

  // Custom values not in the predefined lists
  const [customConditions, setCustomConditions] = useState<string[]>([]);
  const [customAllergies, setCustomAllergies] = useState<string[]>([]);

  // Sync state from store when sheet opens
  useEffect(() => {
    if (!open) return;
    setFormStep(1);
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
        healthConditions: allConditions.length ? allConditions : [HEALTH_CONDITIONS[0]],
        allergies: allAllergies.length ? allAllergies : [ALLERGIES[0]],
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
            {t('profile.healthEditTitle')}
          </SheetTitle>
          <p className="text-[13px] text-muted-foreground">
            {t('profile.healthEditDesc')}
          </p>
          <div className="flex gap-1.5 mt-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  n <= formStep ? 'bg-primary' : 'bg-border'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] font-bold text-primary uppercase tracking-widest mt-2">
            {t('profile.stepProgress', { step: formStep, total: 3 })}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

          {/* Question 1 — Allergies */}
          {formStep === 1 && (
            <div className="space-y-3">
              <div className="text-center space-y-1.5">
                <p className="font-display font-bold text-lg text-foreground">
                  {t('profile.editStepAllergies')}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {t('profile.editStepAllergiesDesc')}
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
                placeholder={t('profile.otherAllergy')}
              />
            </div>
          )}

          {/* Question 2 — Conditions de santé */}
          {formStep === 2 && (
            <div className="space-y-3">
              <div className="text-center space-y-1.5">
                <p className="font-display font-bold text-lg text-foreground">
                  {t('profile.editStepConditions')}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {t('profile.editStepConditionsDesc')}
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
                placeholder={t('profile.otherCondition')}
              />
            </div>
          )}

          {/* Question 3 — Objectifs santé */}
          {formStep === 3 && (
            <div className="space-y-3">
              <div className="text-center space-y-1.5">
                <p className="font-display font-bold text-lg text-foreground">
                  {t('profile.editStepGoals')}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {t('profile.editStepGoalsDesc')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {GOALS.map(({ label, icon: Icon }) => {
                  const isSelected = goals.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleGoal(label)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-semibold border transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-card text-muted-foreground border-border/60 hover:border-primary/30 hover:text-foreground'
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      {label}
                      {isSelected && <Check className="size-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border/40 px-6 py-5 space-y-3">
          {formStep < 3 ? (
            <div className="flex items-center gap-3">
              {formStep > 1 && (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-2xl gap-2 font-bold border-border/60 text-foreground hover:bg-muted/50 shrink-0 px-5"
                  onClick={() => setFormStep((s) => (s - 1) as 1 | 2 | 3)}
                >
                  <ChevronLeft className="size-4" />
                  {t('common.back')}
                </Button>
              )}
              <Button
                size="lg"
                className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold gap-2 shadow-[0_8px_25px_rgba(63,109,78,0.25)] active:scale-95 transition-all"
                onClick={() => setFormStep((s) => Math.min(s + 1, 3) as 1 | 2 | 3)}
              >
                {t('profile.next')}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-2xl gap-2 font-bold border-border/60 text-foreground hover:bg-muted/50 shrink-0 px-5"
                onClick={() => setFormStep(2)}
              >
                <ChevronLeft className="size-4" />
                {t('common.back')}
              </Button>
              <Button
                size="lg"
                className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold gap-2 shadow-[0_8px_25px_rgba(63,109,78,0.25)] active:scale-95 transition-all"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? (
                  <><Loader2 className="size-4 animate-spin" /> {t('lab.saving')}</>
                ) : (
                  <><Check className="size-4" /> {t('common.save')}</>
                )}
              </Button>
            </div>
          )}
          <p className="text-center text-[11px] text-muted-foreground">
            {t('profile.privacyNote')}
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
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { profile, loading, fetch } = useProfileStore();
  const audio = useAudioStore();
  const { actualTheme, setTheme } = useTheme();
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (user?.uid) fetch(user.uid);
  }, [user?.uid]);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const complete = isProfileComplete(profile);

  const NONE_CONDITION = HEALTH_CONDITIONS[0]?.toLowerCase();
  const NONE_ALLERGY = ALLERGIES[0]?.toLowerCase();
  const conditions = (profile?.healthConditions ?? []).filter(
    (c) => c.toLowerCase() !== NONE_CONDITION,
  );
  const allergies = (profile?.allergies ?? []).filter(
    (a) => a.toLowerCase() !== NONE_ALLERGY,
  );
  const goals = profile?.goals ?? [];

  const completionSections = [
    { label: t('profile.conditions'), done: profile?.healthConditions && profile.healthConditions.length > 0 },
    { label: t('profile.allergies'), done: profile?.allergies && profile.allergies.length > 0 },
    { label: t('profile.goals'), done: goals.length > 0 },
  ];
  const completionCount = completionSections.filter((s) => s.done).length;
  const completionPct = Math.round((completionCount / completionSections.length) * 100);

  return (
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
            {t('profile.heroTitle')} <span className="text-secondary italic">{t('profile.heroTitleHighlight')}</span>
          </h1>
        </div>
      </div>

      <div className="px-3 md:px-4 space-y-6 mt-6">

        {/* Identity card */}
        <div  className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-xl text-foreground truncate">
              {user?.name ?? '—'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {complete ? t('profile.statusComplete') : t('profile.statusIncomplete')}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setEditOpen(true)}
            className="rounded-full bg-primary text-white font-bold hover:bg-primary/90 px-4 gap-1.5 shrink-0"
          >
            <Pencil className="size-3.5" />
            {t('common.edit')}
          </Button>
        </div>



        {/* Push Notifications Opt-In */}
        {user?.uid && (
          <div className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display font-bold text-foreground">{t('profile.pushNotifications')}</p>
              <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
                {t('profile.notifications')}
              </p>
            </div>
            <div className="shrink-0">
              <PushOptInButton uid={user.uid} />
            </div>
          </div>
        )}

        {/* Appearance / Theme Toggle */}
        <div className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                {actualTheme === 'dark' ? (
                  <Moon className="size-6 text-primary" />
                ) : (
                  <Sun className="size-6 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-foreground">{t('profile.appearance')}</p>
                <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
                  {t('profile.appearanceDesc')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTheme(actualTheme === 'dark' ? 'light' : 'dark')}
              aria-label={t('theme.switch')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                actualTheme === 'dark' ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                  actualTheme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-[12px] font-semibold text-primary mt-3">
            {actualTheme === 'dark' ? t('theme.dark') : t('theme.light')}
          </p>
        </div>

        {/* Ambient Music Toggle */}
        <div className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Music className="size-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-foreground">{t('profile.ambientMusic')}</p>
                <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
                  {t('profile.soundPreferences')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={audio.toggleEnabled}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                audio.enabled ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                  audio.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          
          {audio.enabled && (
            <div className="pt-2 border-t border-border/50 flex items-center gap-3">
              <VolumeX className="size-4 text-muted-foreground shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={audio.volume}
                onChange={(e) => audio.setVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-secondary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                style={{ WebkitAppearance: 'none' }}
              />
              <Volume2 className="size-4 text-muted-foreground shrink-0" />
            </div>
          )}
        </div>

        {/* Completion bar */}
        {!loading && (
          <div  className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">{t('profile.completeness')}</p>
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
                {t('profile.completenessDesc')}
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
                <p className="font-bold text-sm text-foreground">{t('profile.healthConditions')}</p>
              </div>
              {conditions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {conditions.map((c) => <ProfileChip key={c} label={c} />)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {profile ? t('profile.noConditions') : t('users.notSet')}
                </p>
              )}
            </div>

            {/* Allergies */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                  <Shield className="size-4 text-amber-500" />
                </div>
                <p className="font-bold text-sm text-foreground">{t('profile.allergies')}</p>
              </div>
              {allergies.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {allergies.map((a) => <ProfileChip key={a} label={a} variant="allergy" />)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {profile ? t('profile.noAllergies') : t('users.notSet')}
                </p>
              )}
            </div>

            {/* Objectifs */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="size-4 text-primary" />
                </div>
                <p className="font-bold text-sm text-foreground">{t('profile.goals')}</p>
              </div>
              {goals.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {goals.map((g) => <ProfileChip key={g} label={g} variant="goal" />)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {profile ? t('profile.noGoals') : t('users.notSet')}
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
                    {t('profile.personalization')}
                  </p>
                  <h3 className="font-display font-extrabold text-2xl text-white leading-tight mb-4">
                    {t('profile.completeProfile')}
                  </h3>
                  <Button className="rounded-full bg-white text-primary font-bold hover:bg-white/90 active:scale-95 transition-all px-8 h-12 shadow-xl">
                    {t('profile.configure')}
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
  );
};

Profile.metadata = {
  title: i18n.t('profile.pageTitle'),
  description: i18n.t('profile.pageDesc'),
};

export default Profile;
