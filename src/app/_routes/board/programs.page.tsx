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

const GOAL_FILTERS: { key: string; label: string; icon: any }[] = [
  { key: 'all', label: 'Toutes les cures', icon: Sparkles },
  { key: 'detox', label: 'Détox & Pureté', icon: Leaf },
  { key: 'immunity', label: 'Immunité & Vitalité', icon: Shield },
  { key: 'digestion', label: 'Digestion & Ventre', icon: HeartPulse },
  { key: 'energy', label: 'Énergie & Performance', icon: Flame },
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
        text: `Félicitations ! Vous êtes inscrit au programme "${program.title}". Votre cure commence ${startingToday ? "aujourd'hui" : 'demain'}.`,
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
        text: `Jour ${dayNumber} validé avec succès ! Continuez sur cette belle lancée.`,
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
        text: 'Votre programme a été interrompu.',
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
      eyebrow="COACHING SANTÉ & PROTOCOLES CIBLÉS"
      titleBefore="FYS "
      titleHighlight="Program"
      titleAfter=" — Vos Cures Détox & Vitalité"
      sectionBefore="Suivez une cure de jus frais "
      sectionHighlight="sur-mesure"
      subtitle="Des programmes structurés jour par jour pour purifier votre organisme, booster votre énergie et instaurer une routine saine."
      imageUrl="https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&w=1600&q=80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 pb-16">
        {/* ── Status Feedback Banner ── */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm shadow-xs transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Active Program Coach Section (if user is enrolled) ── */}
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

        {/* ── Catalog of Programs ── */}
        <section className="space-y-6 pt-2">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Catalogue des Cures</span>
                {userProgram && (
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                    Explorer d'autres programmes
                  </span>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Choisissez le protocole adapté à vos besoins actuels.
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une cure, un fruit..."
                className="pl-9 h-10 text-xs bg-background/80"
              />
            </div>
          </div>

          {/* Goal Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {GOAL_FILTERS.map((f) => {
              const Icon = f.icon;
              const isActive = selectedGoal === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSelectedGoal(f.key)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Programs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrograms.map((program) => {
              const isUserActiveThis = userProgram?.programId === program.id;

              return (
                <div
                  key={program.id}
                  className={`rounded-2xl border bg-card/80 backdrop-blur-xs flex flex-col justify-between overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-emerald-500/40 ${
                    isUserActiveThis ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-border/70'
                  }`}
                >
                  {/* Card Header Top */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        {program.goal}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {program.durationDays} jours
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-foreground hover:text-emerald-600 transition-colors">
                        {program.title}
                      </h3>
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {program.subtitle}
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {program.description}
                    </p>

                    {/* Benefits Tags */}
                    {program.benefits && program.benefits.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {program.benefits.slice(0, 2).map((b, bi) => (
                          <div
                            key={bi}
                            className="flex items-center gap-1.5 text-[11px] text-foreground/80"
                          >
                            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span className="line-clamp-1">{b}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="p-5 pt-3 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                        Pack complet {program.durationDays} jus
                      </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {program.bundlePrice
                          ? `${program.bundlePrice.toLocaleString()} XAF`
                          : 'Sur devis'}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setSelectedProgram(program)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                    >
                      {isUserActiveThis ? 'En cours' : 'Voir la cure'}
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPrograms.length === 0 && (
            <div className="text-center py-12 p-6 rounded-2xl border border-dashed border-border bg-card/40">
              <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-60" />
              <h4 className="text-sm font-semibold text-foreground">
                Aucune cure ne correspond à vos critères.
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Essayez d'ajuster votre recherche ou sélectionnez une autre catégorie.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedGoal('all');
                  setSearchQuery('');
                }}
                className="mt-4 text-xs"
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
    'Suivez des cures détox et des programmes santé structurés jour par jour avec FYS. Recettes fraîches, conseils nutritionnels et suivi quotidien.',
};

export default ProgramsPage;
