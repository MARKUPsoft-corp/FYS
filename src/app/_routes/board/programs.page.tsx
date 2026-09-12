import { useState, useEffect, useMemo } from 'react';
import { PageComponent, useNavigate } from 'rasengan';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Calendar,
  Search,
  CheckCircle2,
  Leaf,
  Shield,
  HeartPulse,
  Flame,
  Clock,
  Droplets,
  ArrowRight,
  Filter,
  Check,
  AlertCircle,
  X,
  Award,
  Zap,
  ShieldCheck,
  Star,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore } from '@/stores/profile';
import {
  type Program,
  type UserProgram,
  type ProgramGoal,
  type ProgramsPageSettings,
  type Fruit,
  UserRole,
  DEFAULT_PROGRAMS,
  DEFAULT_PROGRAMS_PAGE_SETTINGS,
} from '@/entities';
import {
  getPrograms,
  getProgramsSettings,
  subscribeToUserActiveProgram,
  enrollUserInProgram,
  checkinProgramDay,
  cancelUserProgram,
} from '@/services/program';
import { getFruits } from '@/services/fruit';
import { ProgramDetailModal } from '@/components/features/programs/ProgramDetailModal';
import { ActiveProgramCoach } from '@/components/features/programs/ActiveProgramCoach';
import { NutrifysCustomProgramModal } from '@/components/features/programs/NutrifysCustomProgramModal';

const GOAL_FILTERS: { key: string; label: string; icon: any }[] = [
  { key: 'all', label: 'Toutes les cures', icon: Sparkles },
  { key: 'detox', label: 'Détox et Élimination', icon: Leaf },
  { key: 'immunity', label: 'Immunité et Vitalité', icon: Shield },
  { key: 'digestion', label: 'Ventre Plat et Digestion', icon: HeartPulse },
];

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1200';

const ProgramsPage: PageComponent = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { profile, fetch: fetchProfile } = useProfileStore();
  const navigate = useNavigate();

  const [pageSettings, setPageSettings] = useState<ProgramsPageSettings>(
    DEFAULT_PROGRAMS_PAGE_SETTINGS
  );
  const [programs, setPrograms] = useState<Program[]>(DEFAULT_PROGRAMS);
  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [userProgram, setUserProgram] = useState<UserProgram | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [isNutrifysModalOpen, setIsNutrifysModalOpen] = useState(false);

  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load programs, settings and fruits
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [list, fetchedSettings, fetchedFruits] = await Promise.all([
          getPrograms(),
          getProgramsSettings(),
          getFruits(),
        ]);
        if (isMounted) {
          setPrograms(list);
          setPageSettings(fetchedSettings);
          setFruits(fetchedFruits);
        }
      } catch (err) {
        console.error('Error fetching programs or settings:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch health profile
  useEffect(() => {
    if (user?.uid) {
      fetchProfile(user.uid);
    }
  }, [user?.uid]);

  const activeConditions = useMemo(() => {
    return (profile?.healthConditions ?? []).filter(
      (c) => !c.toLowerCase().includes('aucune') && !c.toLowerCase().includes('none')
    );
  }, [profile?.healthConditions]);

  const activeAllergies = useMemo(() => {
    return (profile?.allergies ?? []).filter(
      (a) => !a.toLowerCase().includes('aucune') && !a.toLowerCase().includes('none')
    );
  }, [profile?.allergies]);

  // Subscribe to user's active program
  useEffect(() => {
    if (!user?.uid) {
      setUserProgram(null);
      return;
    }
    const unsub = subscribeToUserActiveProgram(user.uid, (up) => {
      setUserProgram(up);
    });
    return () => unsub();
  }, [user?.uid]);

  // Filter programs
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      const matchGoal = selectedGoal === 'all' || p.goal === selectedGoal;
      const matchSearch =
        !searchQuery.trim() ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGoal && matchSearch;
    });
  }, [programs, selectedGoal, searchQuery]);

  // Featured flagship program
  const flagshipProgram = useMemo(() => {
    if (pageSettings.flagshipProgramId) {
      const found = programs.find((p) => p.id === pageSettings.flagshipProgramId);
      if (found) return found;
    }
    return programs.find((p) => p.slug === 'cure-detox-eclair') || programs[0];
  }, [programs, pageSettings.flagshipProgramId]);

  // Handlers
  const handleEnroll = async (program: Program, startingToday: boolean) => {
    if (!user) {
      navigate('/auth/login');
      return;
    }
    setIsEnrolling(true);
    setStatusMessage(null);
    try {
      await enrollUserInProgram(
        user.uid,
        {
          name: user.name || 'Client',
          email: user.email || '',
          phone: user.phone || undefined,
        },
        program,
        startingToday
      );
      setSelectedProgram(null);
      setStatusMessage({
        type: 'success',
        text: `Félicitations ! Vous êtes inscrit à la cure "${program.title}". Votre accompagnement démarre ${startingToday ? "immédiatement" : 'demain matin'}.`,
      });
    } catch (err: any) {
      console.error('Enrollment error:', err);
      setStatusMessage({
        type: 'error',
        text: "Impossible de s'inscrire au programme. Veuillez réessayer.",
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleCheckin = async (dayNumber: number, notes?: string) => {
    if (!userProgram) return;
    setIsCheckingIn(true);
    try {
      await checkinProgramDay(userProgram, dayNumber, notes);
      setStatusMessage({
        type: 'success',
        text: `Jour ${dayNumber} validé avec brio ! Savourez chaque instant de votre cure.`,
      });
    } catch (err: any) {
      console.error('Checkin error:', err);
      setStatusMessage({
        type: 'error',
        text: 'Une erreur est survenue lors de la validation.',
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCancel = async () => {
    if (!userProgram) return;
    setIsCancelling(true);
    try {
      await cancelUserProgram(userProgram.id);
      setStatusMessage({
        type: 'success',
        text: 'Votre programme a été interrompu et archivé.',
      });
    } catch (err: any) {
      console.error('Cancellation error:', err);
      setStatusMessage({
        type: 'error',
        text: "Impossible d'interrompre le programme.",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <BoardPageShell
      eyebrow={pageSettings.eyebrow || 'COACHING BIEN-ÊTRE ET PROTOCOLES CIBLÉS'}
      titleBefore={pageSettings.titleBefore || 'FYS '}
      titleHighlight={pageSettings.titleHighlight || 'Program'}
      titleAfter={pageSettings.titleAfter || " — L'Art de la Cure Vivante"}
      sectionBefore={pageSettings.sectionBefore || 'Découvrez nos cures de jus frais '}
      sectionHighlight={pageSettings.sectionHighlight || '100% pressés à froid'}
      subtitle={
        pageSettings.subtitle ||
        'Des protocoles de 3 à 7 jours conçus avec rigueur pour purifier votre organisme, raviver votre énergie et instaurer une routine saine.'
      }
      imageUrl={
        pageSettings.heroImageUrl ||
        'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=1600'
      }
      actions={
        user?.role === UserRole.ADMIN ? (
          <div className="flex justify-end pb-2">
            <Button
              onClick={() => navigate('/board/programs-admin')}
              className="rounded-2xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs font-bold h-10 px-4 shadow-sm cursor-pointer gap-1.5"
            >
              <Settings2 className="size-4" />
              Mode Administrateur (Gérer Cures & Vitrine)
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 space-y-8 sm:space-y-12 pb-20">
        {/* Status Feedback Banner */}
        {statusMessage && (
          <div
            className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm shadow-sm transition-all animate-pop-in-cute ${
              statusMessage.type === 'success'
                ? 'bg-primary/10 border border-primary/30 text-foreground'
                : 'bg-destructive/10 border border-destructive/30 text-destructive'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="size-5 text-primary shrink-0" />
              ) : (
                <AlertCircle className="size-5 text-destructive shrink-0" />
              )}
              <span className="font-semibold">{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Active Program Coach Section (if user is currently enrolled) */}
        {userProgram && (
          <section className="space-y-4">
            <ActiveProgramCoach
              userProgram={userProgram}
              onCheckin={handleCheckin}
              onCancel={handleCancel}
              isCheckingIn={isCheckingIn}
              isCancelling={isCancelling}
            />
          </section>
        )}

        {/* Spotlight Bento Flagship (Only shown if user has no active program) */}
        {!userProgram && flagshipProgram && (
          <div className="relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] bg-gradient-to-br from-[#1F3326] via-[#28422F] to-[#142219] text-white shadow-xl border border-primary/30 group">
            <div className="absolute -right-20 -top-20 size-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              {/* Left Photo */}
              <div className="lg:col-span-5 relative min-h-[220px] sm:min-h-[320px] lg:min-h-[440px] overflow-hidden bg-muted">
                <img
                  src={flagshipProgram.imageUrl}
                  alt={flagshipProgram.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                  }}
                  className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-1000 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

                <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-10 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-secondary text-secondary-foreground shadow-md">
                    <Star className="size-3.5 fill-white" />
                    Cure Signature
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-black/60 text-white backdrop-blur-md border border-white/20">
                    <Calendar className="size-3.5 text-primary" />
                    {flagshipProgram.durationDays} jours
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 sm:bottom-5 sm:left-5 sm:right-5 text-white z-10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Pack complet {flagshipProgram.durationDays}x 500ml
                  </span>
                  <p className="text-xl font-bold font-display">
                    {flagshipProgram.title}
                  </p>
                </div>
              </div>

              {/* Right Content */}
              <div className="lg:col-span-7 p-3.5 sm:p-10 space-y-4 sm:space-y-6">
                <div className="space-y-2 sm:space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-primary/20 text-white border border-primary/30">
                    <Leaf className="size-3.5 text-primary" />
                    Purification Hépatique et Ventre Léger
                  </div>

                  <h3 className="text-2xl sm:text-4xl font-bold font-display tracking-tight text-white leading-tight">
                    {flagshipProgram.title}
                  </h3>

                  <p className="text-white/80 text-xs sm:text-base leading-relaxed">
                    {flagshipProgram.subtitle} {flagshipProgram.description}
                  </p>
                </div>

                {/* Day-by-day preview pills */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                    Les 3 étapes de votre cure :
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {flagshipProgram.days.map((d, di) => (
                      <div
                        key={di}
                        className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white flex items-center gap-2"
                      >
                        <span className="size-5 sm:size-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-[10px] shrink-0">
                          J{d.dayNumber || d.day || di + 1}
                        </span>
                        <span className="font-bold truncate text-[11px]">
                          {d.cocktailName || d.juiceName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing & CTA */}
                <div className="pt-3 sm:pt-4 border-t border-white/15 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="text-center sm:text-left">
                    <div className="flex items-baseline justify-center sm:justify-start gap-2">
                      <span className="text-2xl sm:text-3xl font-bold font-display text-white">
                        {flagshipProgram.bundlePrice?.toLocaleString() || flagshipProgram.price.toLocaleString()} XAF
                      </span>
                      {flagshipProgram.originalPrice && (
                        <span className="text-xs sm:text-sm line-through text-white/50 font-semibold">
                          {flagshipProgram.originalPrice.toLocaleString()} XAF
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-white/70">Livré frais avec protocole complet NutriFYS</span>
                  </div>

                  <Button
                    size="lg"
                    onClick={() => setSelectedProgram(flagshipProgram)}
                    className="w-full sm:w-auto rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm h-12 px-6 sm:px-8 shadow-md transition-all active:scale-98 cursor-pointer"
                  >
                    Découvrir et Démarrer
                    <ArrowRight className="size-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NutriFYS Custom Cure Callout Card (Approach B) */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] bg-gradient-to-br from-card via-card/95 to-primary/10 border border-primary/30 p-4 sm:p-8 shadow-sm">
          <div className="absolute -right-12 -top-12 size-48 rounded-full bg-primary/15 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2.5 max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-secondary text-secondary-foreground shadow-xs">
                  <Sparkles className="size-3.5 fill-current" />
                  NutriFYS Approche Sur-Mesure
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  <ShieldCheck className="size-3.5" />
                  Adapté à votre santé
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold font-display text-foreground leading-tight">
                Besoin d'un protocole unique ? Laissez NutriFYS composer votre cure.
              </h3>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {activeConditions.length > 0 || activeAllergies.length > 0
                  ? `NutriFYS prend en compte vos particularités médicales (${[
                      ...activeConditions,
                      ...activeAllergies.map((a) => `sans ${a}`),
                    ].join(', ')}) pour formuler un protocole 100% sécurisé et ultra-efficace.`
                  : 'Formulez une cure sur-mesure de 3, 5 ou 7 jours calibrée exactement selon votre métabolisme, vos préférences et les récoltes fraîches du moment.'}
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row gap-2.5">
              <Button
                onClick={() => setIsNutrifysModalOpen(true)}
                className="rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm h-12 px-6 shadow-md transition-all active:scale-98 cursor-pointer gap-2"
              >
                <Sparkles className="size-4" />
                Formuler ma cure avec NutriFYS
                <ArrowRight className="size-4 ml-auto sm:ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Catalog of All Programs */}
        <section className="space-y-8 pt-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  Formules Ciblées FYS
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground flex items-center gap-3">
                <span>Catalogue des Programmes</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Choisissez la cure qui répond exactement à votre besoin de santé actuel.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher détox, immunité, digestion..."
                className="pl-10 h-11 text-xs rounded-2xl bg-card border-border/80 shadow-xs"
              />
            </div>
          </div>

          {/* Goal Filter Chips */}
          <div className="w-full flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none touch-pan-x min-w-0">
            {GOAL_FILTERS.map((f) => {
              const Icon = f.icon;
              const isActive = selectedGoal === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSelectedGoal(f.key)}
                  className={`inline-flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer shadow-xs shrink-0 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md scale-102 ring-2 ring-primary/40'
                      : 'bg-card text-muted-foreground hover:text-foreground border border-border/70 hover:border-primary/40'
                  }`}
                >
                  <Icon className="size-3.5" />
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Programs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            {filteredPrograms.map((program) => {
              const isUserActiveThis = userProgram?.programId === program.id;
              const currentPrice = program.bundlePrice || program.price;

              return (
                <div
                  key={program.id}
                  className={`group relative rounded-2xl sm:rounded-[2.5rem] border bg-card overflow-hidden flex flex-col justify-between transition-all duration-500 hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 ${
                    isUserActiveThis
                      ? 'border-primary ring-2 ring-primary/40 shadow-md'
                      : 'border-border/70 shadow-xs'
                  }`}
                >
                  {/* Card Top: Photo with Overlay Badges */}
                  <div>
                    <div className="relative h-52 sm:h-56 w-full overflow-hidden bg-muted">
                      <img
                        src={program.imageUrl}
                        alt={program.title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                        }}
                        className="w-full h-full object-cover object-center transform group-hover:scale-108 transition-transform duration-1000 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground backdrop-blur-md shadow-xs">
                          {program.goalLabel || program.goal}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-black/60 text-white backdrop-blur-md shadow-xs border border-white/20">
                          <Calendar className="size-3 text-primary" />
                          {program.durationDays} jours
                        </span>
                      </div>

                      {/* Bottom Banner Over Photo */}
                      <div className="absolute bottom-3 left-4 right-4 text-white z-10">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                          {program.bottlesTotal}x {program.bottleSize} • 100% Brut
                        </span>
                        <h3 className="text-lg sm:text-xl font-bold font-display leading-tight truncate">
                          {program.title}
                        </h3>
                      </div>
                    </div>

                    {/* Card Content Details */}
                    <div className="p-3.5 sm:p-6 space-y-3 sm:space-y-4">
                      <div>
                        <p className="text-xs font-bold text-primary">
                          {program.subtitle}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 line-clamp-2">
                          {program.description}
                        </p>
                      </div>

                      {/* Benefits preview */}
                      {program.benefits && program.benefits.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {program.benefits.slice(0, 2).map((b, bi) => (
                            <div
                              key={bi}
                              className="flex items-center gap-2 text-xs font-medium text-foreground/90"
                            >
                              <Check className="size-3.5 text-primary shrink-0" />
                              <span className="truncate">{b}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Days preview thumbnails chain */}
                      <div className="pt-2 border-t border-border/50">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                          Recettes incluses ({program.days.length}) :
                        </span>
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {program.days.slice(0, 3).map((d, di) => (
                            <span
                              key={di}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold bg-muted/60 text-foreground border border-border/60 truncate"
                            >
                              <Leaf className="size-3 text-primary shrink-0" />
                              <span className="truncate">{d.cocktailName || d.juiceName}</span>
                            </span>
                          ))}
                          {program.days.length > 3 && (
                            <span className="text-[10px] font-bold text-muted-foreground px-1.5">
                              +{program.days.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-3.5 sm:p-6 pt-3 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-2.5 sm:gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Pack Cure Complète
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base sm:text-lg font-bold font-display text-primary">
                          {currentPrice.toLocaleString()} XAF
                        </span>
                        {program.originalPrice && (
                          <span className="text-xs line-through text-muted-foreground font-medium">
                            {program.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={() => setSelectedProgram(program)}
                      className={`rounded-2xl text-xs font-bold h-10 px-4 sm:px-5 shadow-xs transition-all active:scale-98 cursor-pointer ${
                        isUserActiveThis
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      }`}
                    >
                      {isUserActiveThis ? 'Cure en cours' : 'Voir la cure'}
                      <ArrowRight className="size-3.5 ml-1.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPrograms.length === 0 && (
            <div className="text-center py-16 p-8 rounded-[2.5rem] border border-dashed border-border bg-card/40 space-y-3">
              <Sparkles className="size-10 text-muted-foreground mx-auto opacity-50" />
              <h4 className="text-base font-bold text-foreground">
                Aucune cure ne correspond à vos critères.
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Essayez d'ajuster vos mots-clés de recherche ou sélectionnez une autre catégorie.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedGoal('all');
                  setSearchQuery('');
                }}
                className="rounded-xl text-xs cursor-pointer mt-2"
              >
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </section>

        {/* Modal Detail */}
        <ProgramDetailModal
          program={selectedProgram}
          isOpen={!!selectedProgram}
          onClose={() => setSelectedProgram(null)}
          onEnroll={handleEnroll}
          isEnrolling={isEnrolling}
          hasActiveProgram={!!userProgram && userProgram.programId !== selectedProgram?.id}
          activeProgramTitle={userProgram?.programTitle}
        />

        {/* NutriFYS Custom Program Modal (Approach B) */}
        <NutrifysCustomProgramModal
          isOpen={isNutrifysModalOpen}
          onClose={() => setIsNutrifysModalOpen(false)}
          profile={profile}
          fruits={fruits}
          onEnroll={handleEnroll}
          isEnrolling={isEnrolling}
        />
      </div>
    </BoardPageShell>
  );
};

ProgramsPage.metadata = {
  title: 'FYS Program — Cures Détox & Coaching Jus Frais',
  description:
    'Suivez des cures détox et des programmes santé structurés jour par jour avec FYS. Recettes fraîches pressées à froid, conseils nutritionnels et suivi quotidien.',
};

export default ProgramsPage;
