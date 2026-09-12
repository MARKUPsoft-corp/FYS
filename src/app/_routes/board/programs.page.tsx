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
  Clock,
  ArrowRight,
  Check,
  AlertCircle,
  X,
  ShieldCheck,
  Star,
  Settings2,
  Bookmark,
  Trash2,
  Play,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore } from '@/stores/profile';
import {
  type Program,
  type UserProgram,
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
  subscribeToUserSavedPrograms,
  saveUserCustomProgram,
  activateUserSavedProgram,
  deleteUserProgram,
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
  { key: 'detox', label: 'Détox', icon: Leaf },
  { key: 'immunity', label: 'Immunité', icon: Shield },
  { key: 'digestion', label: 'Digestion', icon: HeartPulse },
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
  const [savedPrograms, setSavedPrograms] = useState<UserProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [isNutrifysModalOpen, setIsNutrifysModalOpen] = useState(false);

  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [activatingSavedId, setActivatingSavedId] = useState<string | null>(null);
  const [deletingSavedId, setDeletingSavedId] = useState<string | null>(null);
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

  // Subscribe to user's saved custom programs
  useEffect(() => {
    if (!user?.uid) {
      setSavedPrograms([]);
      return;
    }
    const unsub = subscribeToUserSavedPrograms(user.uid, (list) => {
      setSavedPrograms(list);
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
        text: `Félicitations ! Vous suivez la cure "${program.title}". Démarrage ${startingToday ? 'aujourd’hui' : 'demain matin'}.`,
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

  const handleSaveCustomProgram = async (program: Program) => {
    if (!user) {
      navigate('/auth/login');
      return;
    }
    try {
      await saveUserCustomProgram(
        user.uid,
        {
          name: user.name || 'Client',
          email: user.email || '',
          phone: user.phone || undefined,
        },
        program
      );
      setStatusMessage({
        type: 'success',
        text: `Votre cure "${program.title}" a été ajoutée à vos programmes enregistrés.`,
      });
    } catch (err) {
      console.error('Save program error:', err);
      setStatusMessage({
        type: 'error',
        text: "Impossible d'enregistrer la cure. Veuillez réessayer.",
      });
      throw err;
    }
  };

  const handleActivateSavedProgram = async (savedProg: UserProgram) => {
    if (!user) return;
    setActivatingSavedId(savedProg.id);
    try {
      await activateUserSavedProgram(savedProg.id, user.uid, true);
      setStatusMessage({
        type: 'success',
        text: `Votre cure "${savedProg.programTitle}" a démarré avec succès !`,
      });
    } catch (err) {
      console.error('Activate saved program error:', err);
      setStatusMessage({
        type: 'error',
        text: "Impossible de démarrer cette cure. Veuillez réessayer.",
      });
    } finally {
      setActivatingSavedId(null);
    }
  };

  const handleDeleteSavedProgram = async (savedProgId: string) => {
    setDeletingSavedId(savedProgId);
    try {
      await deleteUserProgram(savedProgId);
      setStatusMessage({
        type: 'success',
        text: 'Programme retiré de votre liste.',
      });
    } catch (err) {
      console.error('Delete saved program error:', err);
      setStatusMessage({
        type: 'error',
        text: 'Erreur lors de la suppression.',
      });
    } finally {
      setDeletingSavedId(null);
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
      eyebrow={pageSettings.eyebrow || 'CURES & PROTOCOLES BIEN-ÊTRE'}
      titleBefore={pageSettings.titleBefore || 'FYS '}
      titleHighlight={pageSettings.titleHighlight || 'Program'}
      titleAfter={pageSettings.titleAfter || ''}
      sectionBefore="Nos cures de jus frais "
      sectionHighlight="100% pressés à froid"
      subtitle={
        pageSettings.subtitle ||
        'Des protocoles de 3 à 7 jours conçus avec rigueur pour purifier votre organisme et instaurer une routine saine.'
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
              Gérer les Cures & Vitrine (Admin)
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 space-y-8 sm:space-y-12 pb-20">
        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm shadow-sm transition-all animate-pop-in-cute ${
              statusMessage.type === 'success'
                ? 'bg-primary/10 border border-primary/30 text-foreground'
                : 'bg-destructive/10 border border-destructive/30 text-destructive'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="size-4 text-primary shrink-0" />
              ) : (
                <AlertCircle className="size-4 text-destructive shrink-0" />
              )}
              <span className="font-semibold truncate">{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* ── 1. ACTIVE PROGRAM COACH (if enrolled) ── */}
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

        {/* ── 2. MES CURES ENREGISTRÉES (Approche NutriFYS) ── */}
        {savedPrograms.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                  <Bookmark className="size-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-display text-foreground">
                    Mes Cures Enregistrées ({savedPrograms.length})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Vos protocoles sur-mesure NutriFYS sauvegardés, prêts à être démarrés.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedPrograms.map((sp) => {
                const snapshot = sp.programSnapshot;
                const isActivating = activatingSavedId === sp.id;
                const isDeleting = deletingSavedId === sp.id;

                return (
                  <div
                    key={sp.id}
                    className="p-4 sm:p-5 rounded-3xl border border-primary/20 bg-card hover:border-primary/40 shadow-xs transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          <Sparkles className="size-3" />
                          Sur-Mesure NutriFYS
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                          <Calendar className="size-3 text-primary" />
                          {sp.durationDays} Jours
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold font-display text-foreground line-clamp-1">
                        {sp.programTitle}
                      </h4>

                      {snapshot?.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {snapshot.description}
                        </p>
                      )}

                      {/* Days preview pill list */}
                      {snapshot?.days && snapshot.days.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {snapshot.days.slice(0, 3).map((d, di) => (
                            <span
                              key={di}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted/60 text-foreground border border-border/50 truncate max-w-[130px]"
                            >
                              <Leaf className="size-2.5 text-primary shrink-0" />
                              <span className="truncate">{d.cocktailName || d.juiceName}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDeleting}
                        onClick={() => handleDeleteSavedProgram(sp.id)}
                        className="text-xs text-muted-foreground hover:text-destructive h-9 px-2.5 rounded-xl cursor-pointer"
                        title="Supprimer la cure"
                      >
                        {isDeleting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>

                      <div className="flex items-center gap-2">
                        {snapshot && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedProgram(snapshot)}
                            className="rounded-xl text-xs h-9 px-3 cursor-pointer"
                          >
                            Détails
                          </Button>
                        )}

                        <Button
                          size="sm"
                          disabled={isActivating}
                          onClick={() => handleActivateSavedProgram(sp)}
                          className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-9 px-3.5 shadow-xs cursor-pointer gap-1.5"
                        >
                          {isActivating ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              Lancement...
                            </>
                          ) : (
                            <>
                              <Play className="size-3.5 fill-current" />
                              Démarrer
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 3. NUTRIFYS SUR-MESURE INVITATION (Épurée & Percutante) ── */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-card via-card/95 to-primary/10 border border-primary/25 p-4 sm:p-6 shadow-xs">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground shadow-xs">
                  <Sparkles className="size-3.5" />
                  NutriFYS Intelligence
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  <ShieldCheck className="size-3.5" />
                  100% Adapté à votre santé
                </span>
              </div>

              <h3 className="text-lg sm:text-2xl font-bold font-display text-foreground leading-tight">
                Une cure sur-mesure conçue pour vous.
              </h3>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {activeConditions.length > 0 || activeAllergies.length > 0
                  ? `NutriFYS formule un protocole qui respecte scrupuleusement vos particularités (${[
                      ...activeConditions,
                      ...activeAllergies.map((a) => `sans ${a}`),
                    ].join(', ')}).`
                  : 'Laissez notre IA nutritionnelle élaborer votre cure personnalisée de 3, 5 ou 7 jours selon vos objectifs et les fruits frais disponibles.'}
              </p>
            </div>

            <div className="shrink-0">
              <Button
                onClick={() => setIsNutrifysModalOpen(true)}
                className="w-full sm:w-auto rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm h-11 px-6 shadow-md transition-all active:scale-98 cursor-pointer gap-2"
              >
                <Sparkles className="size-4" />
                Concevoir ma cure avec NutriFYS
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── 4. CATALOGUE DES CURES SIGNATURES (Lisible & Structuré) ── */}
        <section className="space-y-6 pt-2">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground">
              Cures Signatures FYS
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Des protocoles clés en main créés par nos maîtres jus.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full max-w-md mx-auto">
            <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher détox, immunité..."
              className="pl-9 h-10 text-xs rounded-xl bg-card border-border/80"
            />
          </div>

          {/* Goal Filter Chips */}
          <div className="w-full flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x min-w-0">
            {GOAL_FILTERS.map((f) => {
              const Icon = f.icon;
              const isActive = selectedGoal === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSelectedGoal(f.key)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredPrograms.map((program) => {
              const isUserActiveThis = userProgram?.programId === program.id;
              const currentPrice = program.bundlePrice || program.price;

              return (
                <div
                  key={program.id}
                  className={`group relative rounded-2xl sm:rounded-3xl border bg-card overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-primary/40 ${
                    isUserActiveThis
                      ? 'border-primary ring-2 ring-primary/30 shadow-xs'
                      : 'border-border/70'
                  }`}
                >
                  {/* Photo with Overlay */}
                  <div>
                    <div className="relative h-48 w-full overflow-hidden bg-muted">
                      <img
                        src={program.imageUrl}
                        alt={program.title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                        }}
                        className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {/* Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground shadow-xs">
                          {program.goalLabel || program.goal}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20">
                          <Calendar className="size-3 text-primary" />
                          {program.durationDays} jours
                        </span>
                      </div>

                      {/* Title on bottom of photo */}
                      <div className="absolute bottom-2.5 left-3 right-3 text-white z-10">
                        <h3 className="text-base sm:text-lg font-bold font-display leading-tight truncate">
                          {program.title}
                        </h3>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {program.description}
                      </p>

                      {/* 2 Key Benefits */}
                      {program.benefits && program.benefits.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {program.benefits.slice(0, 2).map((b, bi) => (
                            <div
                              key={bi}
                              className="flex items-center gap-1.5 text-xs text-foreground/90 font-medium"
                            >
                              <Check className="size-3 text-primary shrink-0" />
                              <span className="truncate">{b}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 pt-3 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Pack complet
                      </span>
                      <span className="text-base font-bold font-display text-primary">
                        {currentPrice.toLocaleString()} XAF
                      </span>
                    </div>

                    <Button
                      onClick={() => setSelectedProgram(program)}
                      className="rounded-xl text-xs font-bold h-9 px-4 shadow-xs cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isUserActiveThis ? 'Cure en cours' : 'Voir la cure'}
                      <ArrowRight className="size-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPrograms.length === 0 && (
            <div className="text-center py-12 p-6 rounded-3xl border border-dashed border-border bg-card/40 space-y-2">
              <Sparkles className="size-8 text-muted-foreground mx-auto opacity-50" />
              <h4 className="text-sm font-bold text-foreground">
                Aucune cure trouvée
              </h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Modifiez vos critères de recherche ou sélectionnez une autre catégorie.
              </p>
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

        {/* NutriFYS Custom Program Modal */}
        <NutrifysCustomProgramModal
          isOpen={isNutrifysModalOpen}
          onClose={() => setIsNutrifysModalOpen(false)}
          profile={profile}
          fruits={fruits}
          onEnroll={handleEnroll}
          onSaveProgram={handleSaveCustomProgram}
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
