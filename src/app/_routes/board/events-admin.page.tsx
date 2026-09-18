import { useState, useEffect, useMemo } from 'react';
import { PageComponent, useNavigate } from 'rasengan';
import {
  Building2,
  CalendarCheck,
  Package,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  ChefHat,
  Truck,
  XCircle,
  FileText,
  Sliders,
  Plus,
  Trash2,
  Save,
  Printer,
  ChevronRight,
  ShieldAlert,
  GlassWater,
  Flame,
  ArrowUpDown,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { useAuthStore } from '@/stores/auth';
import {
  UserRole,
  type FysEvent,
  type FysEventStatus,
  type FysEventType,
  type FysEventPricingSettings,
  type EventVolumeDiscountTier,
  DEFAULT_FYS_EVENT_PRICING,
} from '@/entities';
import {
  getAllFysEvents,
  subscribeToAllFysEvents,
  updateFysEventStatus,
  getFysEventPricingSettings,
  updateFysEventPricingSettings,
} from '@/services/event';

const EVENT_TYPE_LABELS: Record<FysEventType, string> = {
  seminaire: 'Séminaire',
  conference: 'Conférence',
  team_building: 'Team Building',
  cocktail_entreprise: 'Cocktail',
  lancement_produit: 'Lancement',
  soiree_entreprise: 'Soirée / Gala',
  mariage_prive: 'Réception privée',
  autre: 'Autre',
};

const STATUS_CONFIG: Record<
  FysEventStatus,
  { label: string; icon: React.ElementType; bg: string; text: string; border: string; dot: string }
> = {
  draft: {
    label: 'Brouillon',
    icon: Clock,
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border/60',
    dot: 'bg-muted-foreground',
  },
  submitted: {
    label: 'Transmise',
    icon: Clock,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-700',
    dot: 'bg-amber-500',
  },
  confirmed: {
    label: 'Confirmée',
    icon: CheckCircle2,
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    text: 'text-sky-700 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-700',
    dot: 'bg-sky-500',
  },
  in_preparation: {
    label: 'En préparation',
    icon: ChefHat,
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    text: 'text-violet-700 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-700',
    dot: 'bg-violet-500',
  },
  delivered: {
    label: 'Livrée',
    icon: Truck,
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-700',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Annulée',
    icon: XCircle,
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-700',
    dot: 'bg-rose-500',
  },
};

const EventsAdminPage: PageComponent = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Active admin tab: 'orders' | 'production' | 'pricing'
  const [activeTab, setActiveTab] = useState<'orders' | 'production' | 'pricing'>('orders');

  // Events list
  const [events, setEvents] = useState<FysEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Selected event for modal/drawer view & status edit
  const [detailEvent, setDetailEvent] = useState<FysEvent | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [adminStatusNotes, setAdminStatusNotes] = useState('');

  // Pricing configuration state
  const [pricingSettings, setPricingSettings] = useState<FysEventPricingSettings>(DEFAULT_FYS_EVENT_PRICING);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingSuccess, setPricingSuccess] = useState(false);

  // Check admin authorization
  useEffect(() => {
    if (user && user.role !== UserRole.ADMIN) {
      navigate('/board');
    }
  }, [user, navigate]);

  // Load and subscribe to all events
  useEffect(() => {
    if (!user || user.role !== UserRole.ADMIN) return;

    setLoadingEvents(true);
    const unsub = subscribeToAllFysEvents((data) => {
      setEvents(data);
      setLoadingEvents(false);
    });

    return () => unsub();
  }, [user]);

  // Load pricing settings
  useEffect(() => {
    getFysEventPricingSettings()
      .then((settings) => {
        setPricingSettings(settings);
      })
      .catch(console.error)
      .finally(() => setLoadingPricing(false));
  }, []);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (statusFilter !== 'all' && ev.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        ev.companyName.toLowerCase().includes(q) ||
        ev.eventTitle.toLowerCase().includes(q) ||
        ev.contactPerson.toLowerCase().includes(q) ||
        ev.contactPhone.includes(q) ||
        ev.location.toLowerCase().includes(q)
      );
    });
  }, [events, statusFilter, searchQuery]);

  // Production calculation: Aggregate recipes needed for active / confirmed / preparing events
  const productionAggregation = useMemo(() => {
    // Only aggregate events that are confirmed or in_preparation (or all if specified)
    const targetEvents = events.filter((e) =>
      ['submitted', 'confirmed', 'in_preparation'].includes(e.status)
    );

    const recipeMap = new Map<
      string,
      { name: string; bottles500ml: number; bottles1L: number; totalLiters: number }
    >();

    let grandTotalLiters = 0;
    let grandTotalBottles = 0;

    for (const ev of targetEvents) {
      for (const item of ev.items) {
        const existing = recipeMap.get(item.cocktailId) || {
          name: item.name,
          bottles500ml: 0,
          bottles1L: 0,
          totalLiters: 0,
        };

        if (item.bottleVolume === '1L') {
          existing.bottles1L += item.quantity;
          existing.totalLiters += item.quantity * 1.0;
          grandTotalLiters += item.quantity * 1.0;
        } else {
          existing.bottles500ml += item.quantity;
          existing.totalLiters += item.quantity * 0.5;
          grandTotalLiters += item.quantity * 0.5;
        }

        grandTotalBottles += item.quantity;
        recipeMap.set(item.cocktailId, existing);
      }
    }

    return {
      items: Array.from(recipeMap.values()).sort((a, b) => b.totalLiters - a.totalLiters),
      grandTotalLiters,
      grandTotalBottles,
      activeEventsCount: targetEvents.length,
    };
  }, [events]);

  // Handle status update
  const handleUpdateStatus = async (eventId: string, newStatus: FysEventStatus) => {
    setUpdatingStatus(true);
    try {
      await updateFysEventStatus(eventId, newStatus, adminStatusNotes.trim() || undefined);
      if (detailEvent && detailEvent.id === eventId) {
        setDetailEvent((prev) => (prev ? { ...prev, status: newStatus, statusNotes: adminStatusNotes } : null));
      }
    } catch (err) {
      console.error('Failed to update event status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Pricing settings handlers
  const handleAddTier = () => {
    const currentTiers = pricingSettings?.volumeDiscountTiers || pricingSettings?.volumeDiscounts || DEFAULT_FYS_EVENT_PRICING.volumeDiscountTiers || [];
    const lastTier = currentTiers[currentTiers.length - 1];
    const newMin = lastTier ? lastTier.minBottles + 50 : 20;
    const newPercent = lastTier ? Math.min(50, lastTier.discountPercent + 5) : 5;

    const updated = [
      ...currentTiers,
      { minBottles: newMin, discountPercent: newPercent },
    ].sort((a, b) => a.minBottles - b.minBottles);

    setPricingSettings((prev) => ({
      ...prev,
      volumeDiscounts: updated,
      volumeDiscountTiers: updated,
    }));
  };

  const handleRemoveTier = (index: number) => {
    const currentTiers = pricingSettings?.volumeDiscountTiers || pricingSettings?.volumeDiscounts || DEFAULT_FYS_EVENT_PRICING.volumeDiscountTiers || [];
    const updated = currentTiers.filter((_, i) => i !== index);
    setPricingSettings((prev) => ({
      ...prev,
      volumeDiscounts: updated,
      volumeDiscountTiers: updated,
    }));
  };

  const handleUpdateTier = (
    index: number,
    field: keyof EventVolumeDiscountTier,
    value: number
  ) => {
    setPricingSettings((prev) => {
      const currentTiers = prev?.volumeDiscountTiers || prev?.volumeDiscounts || DEFAULT_FYS_EVENT_PRICING.volumeDiscountTiers || [];
      const updated = [...currentTiers];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return {
        ...prev,
        volumeDiscounts: updated,
        volumeDiscountTiers: updated,
      };
    });
  };

  const handleSavePricing = async () => {
    setSavingPricing(true);
    setPricingSuccess(false);

    try {
      const currentTiers = pricingSettings?.volumeDiscountTiers || pricingSettings?.volumeDiscounts || DEFAULT_FYS_EVENT_PRICING.volumeDiscountTiers || [];
      // Sort tiers ascending by minBottles
      const sortedTiers = [...currentTiers].sort(
        (a, b) => a.minBottles - b.minBottles
      );
      const toSave: FysEventPricingSettings = {
        ...pricingSettings,
        volumeDiscounts: sortedTiers,
        volumeDiscountTiers: sortedTiers,
      };

      await updateFysEventPricingSettings(toSave);
      setPricingSettings(toSave);
      setPricingSuccess(true);
      setTimeout(() => setPricingSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save pricing settings:', err);
    } finally {
      setSavingPricing(false);
    }
  };

  if (!user || user.role !== UserRole.ADMIN) {
    return (
      <BoardPageShell
        eyebrow="ACCÈS RÉSERVÉ"
        titleBefore="Administration"
        titleHighlight="FYS Event"
        imageUrl="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1600"
      >
        <div className="max-w-md mx-auto py-16 text-center space-y-4">
          <ShieldAlert className="size-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold font-display">Accès Administrateur Requis</h2>
          <p className="text-sm text-muted-foreground">
            Vous devez posséder les droits administrateur pour accéder à cette interface.
          </p>
          <Button onClick={() => navigate('/board')} className="rounded-xl font-bold bg-primary">
            Retour au tableau de bord
          </Button>
        </div>
      </BoardPageShell>
    );
  }

  return (
    <BoardPageShell
      eyebrow="GESTION CORPORATE • B2B"
      titleBefore="FYS Event"
      titleHighlight="Pro"
      imageUrl="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1600"
    >
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-2xl border border-border/40">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'orders'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="size-4" />
              Commandes Événements ({events.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('production')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'production'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ChefHat className="size-4" />
              Fiche Production ({productionAggregation.grandTotalLiters.toFixed(0)}L)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'pricing'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sliders className="size-4" />
              Tarifs & Barèmes
            </button>
          </div>

          <div className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span>Gestion temps réel des prestations B2B</span>
          </div>
        </div>

        {/* ── TAB 1: ORDERS LIST & MANAGEMENT ───────────────────────────────── */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Search & Status Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-card p-4 rounded-3xl border border-border/70 shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher entreprise, titre, contact, ville..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-background"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'all', label: 'Tous' },
                  { id: 'submitted', label: 'Transmises' },
                  { id: 'confirmed', label: 'Confirmées' },
                  { id: 'in_preparation', label: 'En préparation' },
                  { id: 'delivered', label: 'Livrées' },
                  { id: 'cancelled', label: 'Annulées' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === st.id
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingEvents ? (
              <div className="py-16 text-center space-y-3">
                <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground font-medium">Chargement des événements...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="py-16 text-center bg-card border border-border/70 rounded-3xl p-8 max-w-md mx-auto space-y-3">
                <Building2 className="size-10 text-muted-foreground mx-auto" />
                <h4 className="font-bold text-foreground">Aucun événement trouvé</h4>
                <p className="text-xs text-muted-foreground">
                  Modifiez vos critères de recherche ou réinitialisez le filtre de statut.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredEvents.map((ev) => {
                  const statusObj = STATUS_CONFIG[ev.status] || STATUS_CONFIG.submitted;
                  const StatusIcon = statusObj.icon;

                  return (
                    <div
                      key={ev.id}
                      className="bg-card rounded-3xl p-6 border border-border/70 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between gap-5"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
                            {ev.companyName}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${statusObj.bg} ${statusObj.text} ${statusObj.border}`}
                          >
                            <span className={`size-1.5 rounded-full ${statusObj.dot}`} />
                            <StatusIcon className="size-3" />
                            {statusObj.label}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-display font-bold text-base text-foreground leading-snug">
                            {ev.eventTitle}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {EVENT_TYPE_LABELS[ev.eventType] || ev.eventType} • {ev.guestCount} convives
                          </p>
                        </div>

                        <div className="bg-muted/40 p-3 rounded-2xl border border-border/40 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Date & Heure :</span>
                            <strong className="text-foreground">{ev.eventDate} {ev.deliveryTime ? `à ${ev.deliveryTime}` : ''}</strong>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Volume :</span>
                            <strong className="text-foreground">{ev.totalBottles} flacons ({ev.totalLiters.toFixed(1)}L)</strong>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Lieu :</span>
                            <span className="text-foreground font-medium truncate max-w-[180px]">{ev.location}</span>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Contact :</span>
                            <span className="text-foreground font-medium truncate max-w-[180px]">{ev.contactPerson} ({ev.contactPhone})</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase font-medium">Total Facturé</span>
                          <span className="font-display font-extrabold text-base text-primary">
                            {ev.totalAmount.toLocaleString()} XAF
                          </span>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => {
                            setDetailEvent(ev);
                            setAdminStatusNotes(ev.statusNotes || '');
                          }}
                          className="rounded-xl font-bold bg-primary text-primary-foreground text-xs h-9 px-4"
                        >
                          Gérer
                          <ChevronRight className="size-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Detail & Status Update Drawer / Dialog */}
            {detailEvent && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-card rounded-3xl border border-border/70 max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-border/50">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        {detailEvent.companyName}
                      </span>
                      <h3 className="font-display font-bold text-xl text-foreground">
                        {detailEvent.eventTitle}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {detailEvent.eventDate} à {detailEvent.deliveryTime || 'Heure non spécifiée'} • {detailEvent.guestCount} convives
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetailEvent(null)}
                      className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <XCircle className="size-5" />
                    </button>
                  </div>

                  {/* Status update controller */}
                  <div className="p-5 rounded-2xl bg-muted/40 border border-border/50 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Mise à Jour du Statut
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(['submitted', 'confirmed', 'in_preparation', 'delivered', 'cancelled'] as FysEventStatus[]).map((st) => {
                        const isCurrent = detailEvent.status === st;
                        const stCfg = STATUS_CONFIG[st];

                        return (
                          <button
                            key={st}
                            type="button"
                            disabled={updatingStatus}
                            onClick={() => handleUpdateStatus(detailEvent.id, st)}
                            className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left flex items-center justify-between ${
                              isCurrent
                                ? `${stCfg.bg} ${stCfg.text} ${stCfg.border} ring-2 ring-primary/20`
                                : 'bg-card border-border/60 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span>{stCfg.label}</span>
                            {isCurrent && <CheckCircle2 className="size-3.5" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-[11px] font-semibold text-muted-foreground block">
                        Note ou consigne pour le client (visible sur son interface)
                      </label>
                      <Input
                        placeholder="Ex: Équipe de livraison en route. Chauffeur: Paul (690...)"
                        value={adminStatusNotes}
                        onChange={(e) => setAdminStatusNotes(e.target.value)}
                        className="h-10 rounded-xl bg-background text-xs"
                      />
                    </div>
                  </div>

                  {/* Juice Items List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Jus commandés ({detailEvent.totalBottles} flacons • {detailEvent.totalLiters.toFixed(1)}L)
                    </h4>
                    <div className="max-h-48 overflow-y-auto divide-y divide-border/40 pr-2">
                      {detailEvent.items.map((item, i) => (
                        <div key={i} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-foreground">{item.name}</span>
                            <span className="text-muted-foreground ml-2">
                              ({item.bottleVolume})
                            </span>
                          </div>
                          <span className="font-bold text-foreground">
                            {item.quantity} flacons • {item.totalPrice.toLocaleString()} XAF
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Logistics options */}
                  {detailEvent.logistics && (
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 grid grid-cols-3 gap-2 text-xs text-center">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Glacières</span>
                        <strong className="text-foreground">
                          {detailEvent.logistics.needCoolerBoxes
                            ? `${detailEvent.logistics.coolerBoxesCount} pcs`
                            : 'Aucune'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Gobelets</span>
                        <strong className="text-foreground">
                          {detailEvent.logistics.needEcoCups
                            ? `${detailEvent.logistics.ecoCupsCount} pcs`
                            : 'Aucun'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Service Barman</span>
                        <strong className="text-foreground">
                          {detailEvent.logistics.needBartenderService
                            ? `${detailEvent.logistics.bartenderHours}h`
                            : 'Non'}
                        </strong>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/board/events?id=${detailEvent.id}`)}
                      className="rounded-xl font-bold text-xs"
                    >
                      Ouvrir la vue complète client
                    </Button>

                    <Button
                      onClick={() => setDetailEvent(null)}
                      className="rounded-xl font-bold bg-primary text-primary-foreground text-xs"
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: KITCHEN / PRODUCTION SHEET ──────────────────────────────── */}
        {activeTab === 'production' && (
          <div className="space-y-6">
            <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/70 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
                <div>
                  <h3 className="text-xl font-bold font-display text-foreground">
                    Fiche de Production & Pressage
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Volumes cumulés à préparer pour les {productionAggregation.activeEventsCount} événements en cours / confirmés.
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="rounded-xl font-bold text-xs gap-2"
                >
                  <Printer className="size-4" />
                  Imprimer la fiche atelier
                </Button>
              </div>

              {/* Total Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Volume Total à Presser
                  </span>
                  <p className="font-display font-black text-3xl text-primary">
                    {productionAggregation.grandTotalLiters.toFixed(1)} Litres
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-muted/50 border border-border/50 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Flacons Totaux
                  </span>
                  <p className="font-display font-black text-3xl text-foreground">
                    {productionAggregation.grandTotalBottles} flacons
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-muted/50 border border-border/50 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Événements Rattachés
                  </span>
                  <p className="font-display font-black text-3xl text-foreground">
                    {productionAggregation.activeEventsCount} commandes
                  </p>
                </div>
              </div>

              {/* Table of recipes */}
              {productionAggregation.items.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Aucun événement actif nécessitant une préparation pour l&apos;instant.
                </div>
              ) : (
                <div className="divide-y divide-border/40 pt-2">
                  <div className="py-3 grid grid-cols-12 text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
                    <span className="col-span-6">Recette Catalogue FYS</span>
                    <span className="col-span-2 text-center">Flacons 500ml</span>
                    <span className="col-span-2 text-center">Flacons 1L</span>
                    <span className="col-span-2 text-right">Volume Total (L)</span>
                  </div>

                  {productionAggregation.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="py-3.5 grid grid-cols-12 items-center text-sm px-2 hover:bg-muted/30 rounded-xl transition-colors"
                    >
                      <div className="col-span-6 flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <span className="font-bold text-foreground">{item.name}</span>
                      </div>

                      <div className="col-span-2 text-center text-xs font-semibold text-foreground">
                        {item.bottles500ml}
                      </div>

                      <div className="col-span-2 text-center text-xs font-semibold text-foreground">
                        {item.bottles1L}
                      </div>

                      <div className="col-span-2 text-right font-display font-extrabold text-primary">
                        {item.totalLiters.toFixed(1)} L
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: PRICING & VOLUME DISCOUNT CONFIGURATION ─────────────────── */}
        {activeTab === 'pricing' && (
          <div className="space-y-8">
            <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/70 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
                <div>
                  <h3 className="text-xl font-bold font-display text-foreground">
                    Barèmes Dégressifs & Tarifs Logistique
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Modifiez les paliers de remises sur volume et les forfaits logistiques facturés aux entreprises.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {pricingSuccess && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1.5">
                      <CheckCircle2 className="size-4" />
                      Tarifs enregistrés avec succès !
                    </span>
                  )}
                  <Button
                    onClick={handleSavePricing}
                    disabled={savingPricing}
                    className="rounded-xl font-bold bg-primary text-primary-foreground h-11 px-6 shadow-sm cursor-pointer"
                  >
                    {savingPricing ? (
                      <RefreshCw className="size-4 animate-spin mr-2" />
                    ) : (
                      <Save className="size-4 mr-2" />
                    )}
                    Enregistrer les Tarifs
                  </Button>
                </div>
              </div>

              {/* Section 1: Discount Tiers Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    Paliers de Remises sur Volume (Flacons Totaux)
                  </h4>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddTier}
                    className="rounded-xl font-bold text-xs border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <Plus className="size-3.5 mr-1" />
                    Ajouter un palier
                  </Button>
                </div>

                <div className="divide-y divide-border/40 border border-border/60 rounded-2xl overflow-hidden bg-background">
                  <div className="grid grid-cols-12 bg-muted/50 p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="col-span-5">Flacons Minimum</span>
                    <span className="col-span-5">Remise Accordée (%)</span>
                    <span className="col-span-2 text-right">Actions</span>
                  </div>

                  {(pricingSettings?.volumeDiscountTiers || pricingSettings?.volumeDiscounts || DEFAULT_FYS_EVENT_PRICING.volumeDiscountTiers || []).map((tier, idx) => (
                    <div key={idx} className="grid grid-cols-12 p-3 items-center gap-3 text-sm">
                      <div className="col-span-5 flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={tier.minBottles}
                          onChange={(e) =>
                            handleUpdateTier(idx, 'minBottles', parseInt(e.target.value) || 1)
                          }
                          className="h-10 rounded-xl font-bold text-xs"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">flacons</span>
                      </div>

                      <div className="col-span-5 flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={90}
                          value={tier.discountPercent}
                          onChange={(e) =>
                            handleUpdateTier(idx, 'discountPercent', parseInt(e.target.value) || 0)
                          }
                          className="h-10 rounded-xl font-bold text-xs"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">%</span>
                      </div>

                      <div className="col-span-2 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveTier(idx)}
                          className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                          title="Supprimer ce palier"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Logistics Fees */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Package className="size-4 text-primary" />
                  Tarifs des Prestations Logistiques
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="space-y-2 p-5 rounded-2xl bg-muted/20 border border-border/50">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Glacière Isotherme (XAF / unité)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={pricingSettings?.coolerBoxPricePerUnit ?? DEFAULT_FYS_EVENT_PRICING.coolerBoxPricePerUnit}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setPricingSettings((prev) => ({
                          ...prev,
                          coolerBoxPricePerUnit: val,
                          coolerBoxUnitPrice: val,
                        }));
                      }}
                      className="h-11 rounded-xl font-bold text-sm bg-background"
                    />
                    <span className="text-[11px] text-muted-foreground block">
                      Forfait de location et consigne par glacière
                    </span>
                  </div>

                  <div className="space-y-2 p-5 rounded-2xl bg-muted/20 border border-border/50">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Gobelet Écologique (XAF / unité)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={pricingSettings?.ecoCupPricePerUnit ?? DEFAULT_FYS_EVENT_PRICING.ecoCupPricePerUnit}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setPricingSettings((prev) => ({
                          ...prev,
                          ecoCupPricePerUnit: val,
                          ecoCupUnitPrice: val,
                        }));
                      }}
                      className="h-11 rounded-xl font-bold text-sm bg-background"
                    />
                    <span className="text-[11px] text-muted-foreground block">
                      Tarif unitaire des gobelets compostables
                    </span>
                  </div>

                  <div className="space-y-2 p-5 rounded-2xl bg-muted/20 border border-border/50">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Service Barman (XAF / heure)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={pricingSettings?.bartenderServiceHourlyRate ?? DEFAULT_FYS_EVENT_PRICING.bartenderServiceHourlyRate}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setPricingSettings((prev) => ({
                          ...prev,
                          bartenderServiceHourlyRate: val,
                          bartenderHalfDayRate: val * 4,
                        }));
                      }}
                      className="h-11 rounded-xl font-bold text-sm bg-background"
                    />
                    <span className="text-[11px] text-muted-foreground block">
                      Taux horaire de l&apos;animateur / barman sur site
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: WhatsApp Customer Support */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <MessageCircle className="size-4 text-emerald-500" />
                  Service Client WhatsApp & Assistance Événements
                </h4>

                <div className="p-5 rounded-2xl bg-muted/20 border border-border/50 max-w-xl space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Numéro WhatsApp Service Client (avec indicatif pays)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="+237699000000"
                      value={pricingSettings?.whatsappNumber ?? DEFAULT_FYS_EVENT_PRICING.whatsappNumber}
                      onChange={(e) => {
                        setPricingSettings((prev) => ({
                          ...prev,
                          whatsappNumber: e.target.value.trim(),
                        }));
                      }}
                      className="h-11 rounded-xl font-bold text-sm bg-background"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Ce numéro permet aux entreprises de contacter directement l&apos;équipe FYS via un bouton WhatsApp intégré dans le devis, après la confirmation de commande et dans le récapitulatif financier.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BoardPageShell>
  );
};

EventsAdminPage.metadata = {
  title: 'FYS Event Pro — Administration & Configuration B2B',
  description:
    'Gestion administrative des événements d\'entreprise, suivi des commandes, feuille de production de jus cumulée et configuration des barèmes dégressifs FYS.',
};

export default EventsAdminPage;
