import { useState, useEffect } from 'react';
import { PageComponent, useNavigate } from 'rasengan';
import {
  Calendar,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Save,
  Loader2,
  Upload,
  CheckCircle2,
  Eye,
  EyeOff,
  Users,
  Settings2,
  Layers,
  Star,
  DollarSign,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth';
import { AdminProgramEditModal } from '@/components/features/programs/AdminProgramEditModal';
import {
  getProgramsSettings,
  updateProgramsSettings,
  getAllPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  seedDefaultPrograms,
  getAllUserPrograms,
  subscribeToAllUserPrograms,
  adminValidateProgramDay,
  adminUnvalidateProgramDay,
} from '@/services/program';
import { getFruits } from '@/services/fruit';
import { uploadProgramImage } from '@/services/storage';
import type {
  Program,
  ProgramsPageSettings,
  UserProgram,
  Fruit,
} from '@/entities';
import { DEFAULT_PROGRAMS_PAGE_SETTINGS } from '@/entities';

type Tab = 'showcase' | 'cures' | 'subscribers';

const ProgramsAdminPage: PageComponent = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('cures');

  // Showcase settings state
  const [settings, setSettings] = useState<ProgramsPageSettings>(
    DEFAULT_PROGRAMS_PAGE_SETTINGS
  );
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  // Programs state
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fruits, setFruits] = useState<Fruit[]>([]);

  // Subscribers state
  const [subscribers, setSubscribers] = useState<UserProgram[]>([]);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState<UserProgram | null>(null);
  const [actionLoadingDay, setActionLoadingDay] = useState<number | null>(null);

  // Notification feedback
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setStatusFeedback({ type, text });
    setTimeout(() => setStatusFeedback(null), 4000);
  };

  // Load all initial data
  const loadData = async () => {
    setSettingsLoading(true);
    setProgramsLoading(true);
    try {
      const [fetchedSettings, fetchedPrograms, fetchedFruits] =
        await Promise.all([
          getProgramsSettings(),
          getAllPrograms(true),
          getFruits(),
        ]);
      setSettings(fetchedSettings);
      setPrograms(fetchedPrograms);
      setFruits(fetchedFruits);
    } catch (e: any) {
      console.error('[ProgramsAdmin] Error loading initial data:', e);
      showFeedback('error', 'Erreur lors du chargement des données.');
    } finally {
      setSettingsLoading(false);
      setProgramsLoading(false);
    }
  };

  const loadSubscribers = async () => {
    setSubscribersLoading(true);
    try {
      const list = await getAllUserPrograms();
      setSubscribers(list);
    } catch (e) {
      console.error('[ProgramsAdmin] Error loading subscribers:', e);
    } finally {
      setSubscribersLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab !== 'subscribers') return;
    setSubscribersLoading(true);
    const unsubscribe = subscribeToAllUserPrograms(
      (list) => {
        setSubscribers(list);
        setSubscribersLoading(false);
      },
      (err) => {
        console.error('[ProgramsAdmin] Error in real-time subscribers sync:', err);
        setSubscribersLoading(false);
      }
    );
    return () => unsubscribe();
  }, [activeTab]);

  const handleAdminValidateDay = async (userProgramId: string, dayNumber: number) => {
    setActionLoadingDay(dayNumber);
    try {
      const adminName = user?.displayName || user?.email || 'Administrateur FYS';
      await adminValidateProgramDay(userProgramId, dayNumber, adminName);
      showFeedback('success', `Jour ${dayNumber} validé avec succès.`);
    } catch (err: any) {
      showFeedback('error', err.message || 'Erreur lors de la validation du jour.');
    } finally {
      setActionLoadingDay(null);
    }
  };

  const handleAdminUnvalidateDay = async (userProgramId: string, dayNumber: number) => {
    setActionLoadingDay(dayNumber);
    try {
      await adminUnvalidateProgramDay(userProgramId, dayNumber);
      showFeedback('success', `Validation du jour ${dayNumber} annulée.`);
    } catch (err: any) {
      showFeedback('error', err.message || 'Erreur lors de l’annulation.');
    } finally {
      setActionLoadingDay(null);
    }
  };

  // Handle Hero Image Upload
  const handleHeroImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    try {
      const url = await uploadProgramImage(`hero-${Date.now()}`, file);
      setSettings((prev) => ({ ...prev, heroImageUrl: url }));
      showFeedback('success', 'Image de couverture téléversée avec succès.');
    } catch (err: any) {
      showFeedback(
        'error',
        err.message || 'Échec du téléversement de l’image.'
      );
    } finally {
      setUploadingHero(false);
    }
  };

  // Save Showcase Settings
  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    setSettingsSaved(false);
    try {
      await updateProgramsSettings(settings);
      setSettingsSaved(true);
      showFeedback('success', 'Paramètres de la vitrine enregistrés avec succès.');
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (e: any) {
      showFeedback('error', e.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Seed default programs
  const handleSeedDefaults = async () => {
    if (
      !window.confirm(
        'Voulez-vous synchroniser les 3 cures officielles FYS dans la base de données ?'
      )
    ) {
      return;
    }
    setProgramsLoading(true);
    try {
      const count = await seedDefaultPrograms();
      const updated = await getAllPrograms(true);
      setPrograms(updated);
      showFeedback('success', `${count} cures FYS synchronisées avec succès.`);
    } catch (e: any) {
      showFeedback('error', 'Erreur lors de la synchronisation.');
    } finally {
      setProgramsLoading(false);
    }
  };

  // Toggle Program Active status
  const handleToggleActive = async (prog: Program) => {
    try {
      const nextActive = !prog.isActive;
      await updateProgram(prog.id, { isActive: nextActive });
      setPrograms((prev) =>
        prev.map((p) => (p.id === prog.id ? { ...p, isActive: nextActive } : p))
      );
      showFeedback(
        'success',
        nextActive ? 'Cure publiée en ligne.' : 'Cure masquée du catalogue.'
      );
    } catch (e: any) {
      showFeedback('error', 'Erreur lors du changement de statut.');
    }
  };

  // Delete Program
  const handleDeleteProgram = async (progId: string, title: string) => {
    if (
      !window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement la cure "${title}" ?`)
    ) {
      return;
    }
    try {
      await deleteProgram(progId);
      setPrograms((prev) => prev.filter((p) => p.id !== progId));
      showFeedback('success', 'Cure supprimée avec succès.');
    } catch (e: any) {
      showFeedback('error', 'Erreur lors de la suppression.');
    }
  };

  // Save from Program Edit Modal
  const handleSaveProgram = async (
    data: Partial<Program>,
    existingId?: string
  ) => {
    if (existingId) {
      await updateProgram(existingId, data);
      setPrograms((prev) =>
        prev.map((p) => (p.id === existingId ? ({ ...p, ...data } as Program) : p))
      );
      showFeedback('success', 'Cure mise à jour avec succès.');
    } else {
      const id = await createProgram(data as Omit<Program, 'id'>);
      const updated = await getAllPrograms(true);
      setPrograms(updated);
      showFeedback('success', 'Nouvelle cure créée avec succès.');
    }
  };

  return (
    <BoardPageShell
      eyebrow="Administration FYS"
      titleBefore="Gestion de"
      titleHighlight="FYS Program"
      sectionBefore="Pilotez la vitrine et les"
      sectionHighlight="protocoles de cure"
      subtitle="Contrôlez les visuels de la page publique, fixez les prix, configurez les recettes journalières et suivez les clients en cure."
      imageUrl={settings.heroImageUrl || DEFAULT_PROGRAMS_PAGE_SETTINGS.heroImageUrl}
      actions={
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tabs switch */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/70 border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab('cures')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cures'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="size-3.5" />
              Catalogue des Cures ({programs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('showcase')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'showcase'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings2 className="size-3.5" />
              Vitrine & Bannière Hero
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('subscribers')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'subscribers'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="size-3.5" />
              Clients en Cure
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/board/programs')}
              className="rounded-xl text-xs cursor-pointer gap-1.5"
            >
              <Eye className="size-3.5" />
              Voir la page publique
            </Button>
          </div>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto space-y-8 pb-20">
        {/* Status Feedback Toast */}
        {statusFeedback && (
          <div
            className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold shadow-xs animate-pop-in-cute ${
              statusFeedback.type === 'success'
                ? 'bg-primary/10 border border-primary/30 text-foreground'
                : 'bg-destructive/10 border border-destructive/30 text-destructive'
            }`}
          >
            {statusFeedback.type === 'success' ? (
              <CheckCircle2 className="size-4 text-primary shrink-0" />
            ) : (
              <AlertCircle className="size-4 text-destructive shrink-0" />
            )}
            <span>{statusFeedback.text}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 1 : CATALOGUE DES CURES (PROGRAMMES)
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'cures' && (
          <section className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-card border border-border shadow-xs">
              <div>
                <h3 className="text-base font-bold font-display text-foreground">
                  Gestion des Cures au Catalogue
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ajoutez de nouvelles cures, éditez les recettes jour par jour et fixez les tarifs.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedDefaults}
                  className="rounded-xl text-xs cursor-pointer gap-1.5"
                >
                  <Sparkles className="size-3.5 text-primary" />
                  Synchroniser les cures FYS
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    setEditingProgram(null);
                    setIsEditModalOpen(true);
                  }}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs cursor-pointer gap-1.5 shadow-xs"
                >
                  <Plus className="size-4" />
                  Créer une nouvelle cure
                </Button>
              </div>
            </div>

            {/* Programs List / Cards */}
            {programsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Chargement des cures...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {programs.map((prog) => {
                  const isFlagship = settings.flagshipProgramId === prog.id;

                  return (
                    <div
                      key={prog.id}
                      className={`group relative rounded-3xl border bg-card overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-xs hover:shadow-md ${
                        prog.isActive
                          ? 'border-border'
                          : 'border-dashed border-border/80 opacity-75'
                      }`}
                    >
                      {/* Card Visual Header */}
                      <div>
                        <div className="relative h-48 w-full overflow-hidden bg-muted">
                          <img
                            src={prog.imageUrl}
                            alt={prog.title}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                          {/* Top floating badges */}
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground shadow-xs">
                              {prog.goalLabel || prog.goal}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {isFlagship && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-secondary-foreground shadow-xs">
                                  <Star className="size-3 fill-current" />
                                  Vedette
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  prog.isActive
                                    ? 'bg-emerald-500/90 text-white'
                                    : 'bg-black/60 text-white/80'
                                }`}
                              >
                                {prog.isActive ? 'En ligne' : 'Brouillon'}
                              </span>
                            </div>
                          </div>

                          {/* Bottom info on photo */}
                          <div className="absolute bottom-3 left-3 right-3 text-white z-10">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                              {prog.durationDays} Jours • {prog.days?.length || 0} Flacons
                            </span>
                            <h4 className="text-base font-bold font-display text-white truncate">
                              {prog.title}
                            </h4>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 space-y-3">
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {prog.subtitle}
                          </p>

                          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                            <span className="font-bold text-primary font-display text-base">
                              {(prog.price || prog.bundlePrice || 0).toLocaleString()} XAF
                            </span>
                            {prog.originalPrice && (
                              <span className="line-through text-muted-foreground text-[11px]">
                                {prog.originalPrice.toLocaleString()} XAF
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="p-3 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(prog)}
                          className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                            prog.isActive
                              ? 'text-muted-foreground hover:text-foreground'
                              : 'text-primary hover:bg-primary/10'
                          }`}
                          title={prog.isActive ? 'Masquer du catalogue' : 'Mettre en ligne'}
                        >
                          {prog.isActive ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                          <span className="hidden sm:inline">
                            {prog.isActive ? 'Masquer' : 'Publier'}
                          </span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingProgram(prog);
                              setIsEditModalOpen(true);
                            }}
                            className="rounded-xl text-xs h-8 px-3 cursor-pointer gap-1"
                          >
                            <Edit2 className="size-3.5" />
                            Modifier
                          </Button>

                          <button
                            type="button"
                            onClick={() => handleDeleteProgram(prog.id, prog.title)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                            title="Supprimer la cure"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2 : VITRINE & BANNIÈRE HERO (PAGE SETTINGS)
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'showcase' && (
          <section className="space-y-6">
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold font-display text-foreground">
                  Configuration Visuelle & Textuelle de la Page FYS Program
                </h3>
                <p className="text-xs text-muted-foreground">
                  Modifiez l'image Hero principale, les slogans d'accroche et choisissez la cure phare mise en vedette.
                </p>
              </div>

              {/* Hero Image Modifier */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
                  Image Hero de la Page (Bannière tout en haut)
                </label>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="relative w-full sm:w-80 h-40 rounded-2xl overflow-hidden bg-muted border border-border shadow-xs shrink-0">
                    <img
                      src={settings.heroImageUrl || DEFAULT_PROGRAMS_PAGE_SETTINGS.heroImageUrl}
                      alt="Aperçu Hero"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                        Aperçu réel
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 flex-1 w-full">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer hover:bg-primary/90 transition-all shadow-xs">
                      {uploadingHero ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      {uploadingHero
                        ? 'Téléversement en cours...'
                        : 'Téléverser une image via Cloudinary'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleHeroImageUpload}
                        disabled={uploadingHero}
                        className="hidden"
                      />
                    </label>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        Ou URL externe directe :
                      </label>
                      <Input
                        value={settings.heroImageUrl}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, heroImageUrl: e.target.value }))
                        }
                        placeholder="https://images.pexels.com/..."
                        className="rounded-xl bg-card border-border/80 text-xs h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/60">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Surtitre (Eyebrow)</label>
                  <Input
                    value={settings.eyebrow}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, eyebrow: e.target.value }))
                    }
                    placeholder="Ex: FYS Program"
                    className="rounded-xl text-xs h-10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Cure Vedette (Bannière Signature Phare)
                  </label>
                  <select
                    value={settings.flagshipProgramId || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        flagshipProgramId: e.target.value,
                      }))
                    }
                    className="w-full h-10 px-3 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">-- Aucune cure mise en vedette --</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.durationDays} jours - {p.price.toLocaleString()} XAF)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Titre Hero - Début</label>
                  <Input
                    value={settings.titleBefore}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, titleBefore: e.target.value }))
                    }
                    placeholder="Ex: Votre Cure Santé"
                    className="rounded-xl text-xs h-10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Titre Hero - Mot mis en valeur (couleur)
                  </label>
                  <Input
                    value={settings.titleHighlight}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, titleHighlight: e.target.value }))
                    }
                    placeholder="Ex: 100% Fraîche"
                    className="rounded-xl text-xs h-10"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-foreground">
                    Sous-titre explicatif sous le hero
                  </label>
                  <textarea
                    value={settings.subtitle}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, subtitle: e.target.value }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Titre de section - Début
                  </label>
                  <Input
                    value={settings.sectionBefore}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, sectionBefore: e.target.value }))
                    }
                    placeholder="Ex: Découvrez nos cures de jus frais"
                    className="rounded-xl text-xs h-10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Titre de section - Highlight
                  </label>
                  <Input
                    value={settings.sectionHighlight}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        sectionHighlight: e.target.value,
                      }))
                    }
                    placeholder="Ex: 100% pressés à froid"
                    className="rounded-xl text-xs h-10"
                  />
                </div>
              </div>

              {/* Save button */}
              <div className="pt-4 border-t border-border/60 flex items-center justify-end">
                <Button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving || settingsLoading}
                  className="rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm h-12 px-8 shadow-md transition-all active:scale-98 cursor-pointer gap-2"
                >
                  {settingsSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {settingsSaved ? 'Modifications enregistrées !' : 'Enregistrer la Vitrine'}
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3 : SUIVI DES CLIENTS EN CURE
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'subscribers' && (
          <section className="space-y-6">
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold font-display text-foreground">
                    Clients Inscrits aux Cures FYS
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Suivez en direct les utilisateurs actifs, leur jour actuel de cure et leur régularité.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadSubscribers}
                  disabled={subscribersLoading}
                  className="rounded-xl text-xs cursor-pointer gap-1.5"
                >
                  {subscribersLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Clock className="size-3.5" />
                  )}
                  Actualiser
                </Button>
              </div>

              {subscribersLoading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Chargement des abonnés...</p>
                </div>
              ) : subscribers.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                  Aucun utilisateur n'a de cure active enregistrée pour le moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                      <tr>
                        <th className="py-3 px-3">Client</th>
                        <th className="py-3 px-3">Cure Suivie</th>
                        <th className="py-3 px-3">Progression</th>
                        <th className="py-3 px-3">Date de début</th>
                        <th className="py-3 px-3">Statut</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {subscribers.map((sub) => {
                        const completedCount = sub.checkins?.length || 0;
                        const pct = Math.min(
                          100,
                          Math.round((completedCount / (sub.durationDays || 1)) * 100)
                        );

                        return (
                          <tr key={sub.id} className="hover:bg-muted/30">
                            <td className="py-3 px-3 font-semibold text-foreground">
                              {sub.userName || sub.userEmail || `User ${sub.userId.slice(0, 6)}`}
                            </td>
                            <td className="py-3 px-3 font-bold text-primary">
                              {sub.programTitle}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold">
                                  J{sub.currentDay}/{sub.durationDays}
                                </span>
                                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground">{pct}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-muted-foreground">
                              {new Date(sub.startDate).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sub.status === 'completed'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : sub.status === 'cancelled'
                                    ? 'bg-destructive/15 text-destructive'
                                    : 'bg-primary/15 text-primary'
                                }`}
                              >
                                {sub.status === 'completed'
                                  ? 'Accomplie'
                                  : sub.status === 'cancelled'
                                  ? 'Annulée'
                                  : 'En cours'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedSubscriber(sub)}
                                className="h-8 rounded-xl text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                              >
                                <Eye className="size-3.5" />
                                <span>Gérer les jours</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Modal Admin Inspection & Day Validation for Subscriber */}
        {selectedSubscriber && (
          <Dialog
            open={!!selectedSubscriber}
            onOpenChange={(open) => !open && setSelectedSubscriber(null)}
          >
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-3xl border-primary/20 bg-background/95 backdrop-blur-xl">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    <Sparkles className="size-3 inline mr-1" />
                    Suivi FYS Programme
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      (subscribers.find((s) => s.id === selectedSubscriber.id)?.status || selectedSubscriber.status) === 'completed'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-primary/15 text-primary'
                    }`}
                  >
                    {(subscribers.find((s) => s.id === selectedSubscriber.id)?.status || selectedSubscriber.status) === 'completed'
                      ? 'Cure terminée'
                      : 'Cure en cours'}
                  </span>
                </div>
                <DialogTitle className="text-xl font-display font-bold text-foreground">
                  Suivi de cure : {selectedSubscriber.userName || selectedSubscriber.userEmail || `User ${selectedSubscriber.userId.slice(0, 6)}`}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Cure &laquo; {selectedSubscriber.programTitle} &raquo; &middot; {selectedSubscriber.durationDays} jours &middot; Démarré le {new Date(selectedSubscriber.startDate).toLocaleDateString('fr-FR')}
                </DialogDescription>
              </DialogHeader>

              {(() => {
                const liveSub = subscribers.find((s) => s.id === selectedSubscriber.id) || selectedSubscriber;
                const completedCheckins = liveSub.checkins || [];
                const duration = liveSub.durationDays || 7;
                const progressPct = Math.min(100, Math.round((completedCheckins.length / duration) * 100));

                return (
                  <div className="space-y-6 mt-4">
                    {/* Progress summary card */}
                    <div className="p-4 rounded-2xl bg-muted/50 border border-border/60 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-muted-foreground">Régularité et avancement</span>
                        <span className="text-foreground">
                          {completedCheckins.length} / {duration} jours validés ({progressPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Days grid */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Validation des jours de cure
                        </h4>
                        <span className="text-[11px] text-muted-foreground">
                          Mise à jour en temps réel
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {Array.from({ length: duration }).map((_, idx) => {
                          const dayNum = idx + 1;
                          const checkin = completedCheckins.find(
                            (c) => (c.dayNumber || c.day) === dayNum
                          );
                          const isValidated = !!checkin;
                          const isLoadingThisDay = actionLoadingDay === dayNum;

                          return (
                            <div
                              key={dayNum}
                              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                isValidated
                                  ? 'bg-emerald-500/5 border-emerald-500/30'
                                  : 'bg-card border-border/60'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-foreground">
                                    Jour {dayNum}
                                  </span>
                                  {isValidated ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                      <CheckCircle2 className="size-3" /> Validé
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                                      En attente
                                    </span>
                                  )}
                                </div>
                                {isValidated && checkin.completedAt && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                    Le {new Date(checkin.completedAt).toLocaleDateString('fr-FR')} {checkin.note || checkin.notes ? `· ${checkin.note || checkin.notes}` : ''}
                                  </p>
                                )}
                              </div>

                              <div className="shrink-0">
                                {isValidated ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={isLoadingThisDay}
                                    onClick={() => handleAdminUnvalidateDay(liveSub.id, dayNum)}
                                    className="h-8 px-2.5 text-[11px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer"
                                  >
                                    {isLoadingThisDay ? (
                                      <Loader2 className="size-3 animate-spin" />
                                    ) : (
                                      'Annuler'
                                    )}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    disabled={isLoadingThisDay}
                                    onClick={() => handleAdminValidateDay(liveSub.id, dayNum)}
                                    className="h-8 px-3 text-[11px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs transition-all cursor-pointer gap-1"
                                  >
                                    {isLoadingThisDay ? (
                                      <Loader2 className="size-3 animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle2 className="size-3" />
                                        <span>Valider</span>
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>
        )}

        {/* Modal Create/Edit Cure */}
        <AdminProgramEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          program={editingProgram}
          onSave={handleSaveProgram}
          availableFruits={fruits}
        />
      </div>
    </BoardPageShell>
  );
};

ProgramsAdminPage.metadata = {
  title: 'Administration FYS Program — Gestion des Cures & Vitrine',
  description:
    'Panneau d’administration complet pour piloter FYS Program : vitrine hero, catalogue de cures, recettes et abonnés.',
};

export default ProgramsAdminPage;
