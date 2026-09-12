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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { useAuthStore } from '@/stores/auth';
import {
  type Program,
  type UserProgram,
  type ProgramGoal,
  DEFAULT_PROGRAMS,
} from '@/entities';
import {
  getPrograms,
  subscribeToUserActiveProgram,
  enrollUserInProgram,
  checkinProgramDay,
  cancelUserProgram,
} from '@/services/program';
import { ProgramDetailModal } from '@/components/features/programs/ProgramDetailModal';
import { ActiveProgramCoach } from '@/components/features/programs/ActiveProgramCoach';

const GOAL_FILTERS: { key: string; label: string; icon: any; colorClass: string }[] = [
  { key: 'all', label: 'Toutes les cures', icon: Sparkles, colorClass: 'hover:border-primary' },
  { key: 'detox', label: 'Détox & Élimination', icon: Leaf, colorClass: 'hover:border-emerald-500' },
  { key: 'immunity', label: 'Immunité & Vitalité', icon: Shield, colorClass: 'hover:border-amber-500' },
  { key: 'digestion', label: 'Ventre Plat & Digestion', icon: HeartPulse, colorClass: 'hover:border-teal-500' },
];

const ProgramsPage: PageComponent = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [programs, setPrograms] = useState<Program[]>(DEFAULT_PROGRAMS);
  const [userProgram, setUserProgram] = useState<UserProgram | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load programs
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const list = await getPrograms();
        if (isMounted) setPrograms(list);
      } catch (err) {
        console.error('Error fetching programs:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

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

  // Featured flagship program (e.g. Détox Éclair)
  const flagshipProgram = programs.find((p) => p.slug === 'cure-detox-eclair') || programs[0];

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
      eyebrow="COACHING BIEN-ÊTRE & PROTOCOLES CIBLÉS"
      titleBefore="FYS "
      titleHighlight="Program"
      titleAfter=" — L'Art de la Cure Vivante"
      sectionBefore="Découvrez nos cures de jus frais "
      sectionHighlight="100% pressés à froid"
      subtitle="Des protocoles de 3 à 7 jours conçus avec rigueur pour purifier votre organisme, raviver votre énergie et instaurer une routine saine."
      imageUrl="https://images.unsplash.com/photo-1622597467836-f3885f2011ea?auto=format&fit=crop&w=1600&q=80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pb-20">
        {/* ── Status Feedback Banner ── */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm shadow-md transition-all animate-pop-in-cute ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-950 dark:text-emerald-100'
                : 'bg-rose-500/15 border border-rose-500/40 text-rose-950 dark:text-rose-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="size-5 text-rose-600 dark:text-rose-400 shrink-0" />
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

        {/* ── Active Program Coach Section (if user is currently enrolled) ── */}
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

        {/* ── Spotlight Bento Flagship (Only shown if user has no active program) ── */}
        {!userProgram && flagshipProgram && (
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-900/90 via-teal-950 to-emerald-950 text-white shadow-2xl border border-emerald-500/30 group">
            <div className="absolute -right-20 -top-20 size-80 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              {/* Left Photo */}
              <div className="lg:col-span-5 relative min-h-[320px] lg:min-h-[440px] overflow-hidden bg-muted">
                <img
                  src={flagshipProgram.imageUrl}
                  alt={flagshipProgram.title}
                  className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-1000 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                
                <div className="absolute top-5 left-5 z-10 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500 text-white shadow-lg">
                    <Star className="size-3.5 fill-white" />
                    Cure Signature
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-black/60 text-white backdrop-blur-md border border-white/20">
                    <Calendar className="size-3.5 text-emerald-400" />
                    {flagshipProgram.durationDays} jours
                  </span>
                </div>

                <div className="absolute bottom-5 left-5 right-5 text-white z-10 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
                    Pack complet {flagshipProgram.durationDays}x 500ml
                  </span>
                  <p className="text-xl font-bold font-display">
                    {flagshipProgram.title}
                  </p>
                </div>
              </div>

              {/* Right Content */}
              <div className="lg:col-span-7 p-7 sm:p-10 space-y-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    <Leaf className="size-3.5 text-emerald-300" />
                    Purification Hépatique & Ventre Léger
                  </div>
                  
                  <h3 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white leading-tight">
                    {flagshipProgram.title}
                  </h3>

                  <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed">
                    {flagshipProgram.subtitle} {flagshipProgram.description}
                  </p>
                </div>

                {/* Day-by-day preview pills */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                    Les 3 potions de votre cure :
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {flagshipProgram.days.map((d, di) => (
                      <div
                        key={di}
                        className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white flex items-center gap-2.5"
                      >
                        <span className="size-6 rounded-full bg-emerald-500 text-white font-extrabold flex items-center justify-center text-[10px] shrink-0">
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
                <div className="pt-4 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black font-display text-white">
                        {flagshipProgram.bundlePrice?.toLocaleString() || flagshipProgram.price.toLocaleString()} XAF
                      </span>
                      {flagshipProgram.originalPrice && (
                        <span className="text-sm line-through text-emerald-300/70 font-semibold">
                          {flagshipProgram.originalPrice.toLocaleString()} XAF
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-emerald-200">Livré frais avec protocole complet NutriFYS</span>
                  </div>

                  <Button
                    size="lg"
                    onClick={() => setSelectedProgram(flagshipProgram)}
                    className="rounded-2xl bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold text-xs sm:text-sm h-12 px-8 shadow-xl transition-all active:scale-98 cursor-pointer"
                  >
                    Découvrir & Démarrer
                    <ArrowRight className="size-4 ml-2 text-emerald-700" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Catalog of All Programs ── */}
        <section className="space-y-8 pt-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Formules Ciblées FYS
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-foreground flex items-center gap-3">
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
                placeholder="Rechercher détox, immunité, ventre plat..."
                className="pl-10 h-11 text-xs rounded-2xl bg-card border-border/80 shadow-xs"
              />
            </div>
          </div>

          {/* Goal Filter Chips */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {GOAL_FILTERS.map((f) => {
              const Icon = f.icon;
              const isActive = selectedGoal === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSelectedGoal(f.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer shadow-xs ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md scale-102 ring-2 ring-emerald-400/40'
                      : 'bg-card text-muted-foreground hover:text-foreground border border-border/70 hover:border-emerald-500/40'
                  }`}
                >
                  <Icon className="size-3.5" />
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Programs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPrograms.map((program) => {
              const isUserActiveThis = userProgram?.programId === program.id;
              const currentPrice = program.bundlePrice || program.price;

              return (
                <div
                  key={program.id}
                  className={`group relative rounded-[2.5rem] border bg-card overflow-hidden flex flex-col justify-between transition-all duration-500 hover:shadow-2xl hover:border-emerald-500/50 hover:-translate-y-1 ${
                    isUserActiveThis
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl'
                      : 'border-border/70 shadow-sm'
                  }`}
                >
                  {/* Card Top: Appetizing Photo with Overlay Badges */}
                  <div>
                    <div className="relative h-56 w-full overflow-hidden bg-muted">
                      <img
                        src={program.imageUrl}
                        alt={program.title}
                        className="w-full h-full object-cover object-center transform group-hover:scale-108 transition-transform duration-1000 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-600/90 text-white backdrop-blur-md shadow-md border border-emerald-400/30">
                          {program.goalLabel || program.goal}
                        </span>

                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-black/60 text-white backdrop-blur-md shadow-sm border border-white/20">
                          <Calendar className="size-3 text-emerald-400" />
                          {program.durationDays} jours
                        </span>
                      </div>

                      {/* Bottom Banner Over Photo */}
                      <div className="absolute bottom-3 left-4 right-4 text-white z-10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                          {program.bottlesTotal}x {program.bottleSize} • 100% Brut
                        </span>
                        <h3 className="text-xl font-black font-display leading-tight truncate">
                          {program.title}
                        </h3>
                      </div>
                    </div>

                    {/* Card Content Details */}
                    <div className="p-6 space-y-4">
                      <div>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
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
                              <Check className="size-3.5 text-emerald-500 shrink-0" />
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-muted/60 text-foreground border border-border/60 truncate"
                            >
                              <Leaf className="size-3 text-emerald-500 shrink-0" />
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
                  <div className="p-6 pt-3 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Pack Cure Complète
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black font-display text-emerald-600 dark:text-emerald-400">
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
                      className={`rounded-2xl text-xs font-bold h-10 px-5 shadow-sm transition-all active:scale-98 cursor-pointer ${
                        isUserActiveThis
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
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

        {/* ── Modal Detail ── */}
        <ProgramDetailModal
          program={selectedProgram}
          isOpen={!!selectedProgram}
          onClose={() => setSelectedProgram(null)}
          onEnroll={handleEnroll}
          isEnrolling={isEnrolling}
          hasActiveProgram={!!userProgram && userProgram.programId !== selectedProgram?.id}
          activeProgramTitle={userProgram?.programTitle}
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
