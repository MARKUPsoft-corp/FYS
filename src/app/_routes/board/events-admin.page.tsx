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
  ExternalLink,
  Wine,
  Edit2,
  Check,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { downloadEventFacturePdf, printEventFacturePdf } from '@/lib/pdf';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { useAuthStore } from '@/stores/auth';
import {
  UserRole,
  type FysEvent,
  type FysEventStatus,
  type FysEventType,
  type FysEventPricingSettings,
  type FysEventFormat,
  type EventVolumeDiscountTier,
  DEFAULT_FYS_EVENT_PRICING,
  DEFAULT_FYS_EVENT_FORMATS,
} from '@/entities';
import {
  getAllFysEvents,
  subscribeToAllFysEvents,
  updateFysEventStatus,
  getFysEventPricingSettings,
  subscribeToFysEventPricingSettings,
  updateFysEventPricingSettings,
  normalizeWhatsAppNumber,
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
  const [pricingError, setPricingError] = useState<string | null>(null);

  // Format modal state
  const [formatModalOpen, setFormatModalOpen] = useState(false);
  const [editingFormat, setEditingFormat] = useState<FysEventFormat | null>(null);
  const [formatFormData, setFormatFormData] = useState<FysEventFormat>({
    id: '',
    name: '',
    shortLabel: '',
    volumeLiters: 0.5,
    priceMultiplier: 1.0,
    isActive: true,
    description: '',
  });

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

  // Subscribe in real-time to pricing settings & WhatsApp number
  useEffect(() => {
    setLoadingPricing(true);
    const unsub = subscribeToFysEventPricingSettings((settings) => {
      setPricingSettings(settings);
      setLoadingPricing(false);
    });

    return () => unsub();
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
      {
        name: string;
        formats: Record<string, number>;
        totalLiters: number;
        totalBottles: number;
      }
    >();

    let grandTotalLiters = 0;
    let grandTotalBottles = 0;
    const formatKeys = new Set<string>();

    for (const ev of targetEvents) {
      for (const item of ev.items) {
        const existing = recipeMap.get(item.cocktailId) || {
          name: item.name,
          formats: {},
          totalLiters: 0,
          totalBottles: 0,
        };

        const fmtKey = item.bottleVolume || item.bottleSize || '500ml';
        formatKeys.add(fmtKey);

        existing.formats[fmtKey] = (existing.formats[fmtKey] || 0) + item.quantity;
        existing.totalBottles += item.quantity;

        let liters = item.volumeLiters;
        if (!liters || liters <= 0) {
          const lower = fmtKey.toLowerCase();
          if (lower.includes('1l') || lower.includes('1 l') || lower.includes('1000')) liters = 1.0;
          else if (lower.includes('250')) liters = 0.25;
          else if (lower.includes('330')) liters = 0.33;
          else if (lower.includes('750')) liters = 0.75;
          else if (lower.includes('2l') || lower.includes('2 l')) liters = 2.0;
          else liters = 0.5;
        }

        const itemLiters = item.quantity * liters;
        existing.totalLiters += itemLiters;
        grandTotalLiters += itemLiters;
        grandTotalBottles += item.quantity;

        recipeMap.set(item.cocktailId, existing);
      }
    }

    const sortedFormats = Array.from(formatKeys);
    if (sortedFormats.length === 0) {
      sortedFormats.push('500ml', '1L');
    }

    return {
      items: Array.from(recipeMap.values()).sort((a, b) => b.totalLiters - a.totalLiters),
      formatKeys: sortedFormats,
      grandTotalLiters,
      grandTotalBottles,
      activeEventsCount: targetEvents.length,
    };
  }, [events]);

  const handleOpenAddFormat = () => {
    setEditingFormat(null);
    setFormatFormData({
      id: '',
      name: '',
      shortLabel: '',
      volumeLiters: 0.5,
      priceMultiplier: 1.0,
      isActive: true,
      description: '',
    });
    setFormatModalOpen(true);
  };

  const handleOpenEditFormat = (fmt: FysEventFormat) => {
    setEditingFormat(fmt);
    setFormatFormData({ ...fmt });
    setFormatModalOpen(true);
  };

  const handleSaveFormatForm = () => {
    if (!formatFormData.name.trim()) return;
    const cleanId = (formatFormData.id || formatFormData.shortLabel || formatFormData.name)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    const currentFormats = pricingSettings.availableFormats || DEFAULT_FYS_EVENT_FORMATS;
    let updated: FysEventFormat[];

    if (editingFormat) {
      updated = currentFormats.map((f) =>
        f.id === editingFormat.id ? { ...formatFormData, id: editingFormat.id } : f
      );
    } else {
      const newFmt: FysEventFormat = {
        ...formatFormData,
        id: cleanId || `fmt_${Date.now()}`,
      };
      updated = [...currentFormats, newFmt];
    }

    setPricingSettings((prev) => ({
      ...prev,
      availableFormats: updated,
    }));
    setFormatModalOpen(false);
  };

  const handleToggleFormatActive = (formatId: string) => {
    setPricingSettings((prev) => {
      const currentFormats = prev.availableFormats || DEFAULT_FYS_EVENT_FORMATS;
      const updated = currentFormats.map((f) =>
        f.id === formatId ? { ...f, isActive: !f.isActive } : f
      );
      return {
        ...prev,
        availableFormats: updated,
      };
    });
  };

  const handleDeleteFormat = (formatId: string) => {
    setPricingSettings((prev) => {
      const currentFormats = prev.availableFormats || DEFAULT_FYS_EVENT_FORMATS;
      return {
        ...prev,
        availableFormats: currentFormats.filter((f) => f.id !== formatId),
      };
    });
  };

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
    setPricingError(null);

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
        availableFormats: pricingSettings.availableFormats || DEFAULT_FYS_EVENT_FORMATS,
        whatsappNumber: (pricingSettings.whatsappNumber || '').trim() || DEFAULT_FYS_EVENT_PRICING.whatsappNumber,
      };

      await updateFysEventPricingSettings(toSave);
      setPricingSettings(toSave);
      setPricingSuccess(true);
      setTimeout(() => setPricingSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to save pricing settings:', err);
      setPricingError(err?.message || 'Une erreur est survenue lors de l’enregistrement.');
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

                      <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase font-medium">Total Facturé</span>
                          <span className="font-display font-extrabold text-base text-primary">
                            {ev.totalAmount.toLocaleString()} XAF
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadEventFacturePdf(ev, pricingSettings?.whatsappNumber, 'facture')}
                            title="Télécharger la Facture PDF"
                            className="rounded-xl font-bold text-xs h-9 px-2.5 sm:px-3 gap-1.5 border-border/80 text-foreground hover:border-primary/50 cursor-pointer"
                          >
                            <Printer className="size-3.5 text-primary" />
                            <span className="hidden sm:inline">Facture</span>
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => {
                              setDetailEvent(ev);
                              setAdminStatusNotes(ev.statusNotes || '');
                            }}
                            className="rounded-xl font-bold bg-primary text-primary-foreground text-xs h-9 px-3.5 cursor-pointer"
                          >
                            Gérer
                            <ChevronRight className="size-3.5 ml-1" />
                          </Button>
                        </div>
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

                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t border-border/50">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => downloadEventFacturePdf(detailEvent, pricingSettings?.whatsappNumber, 'facture')}
                        className="rounded-xl font-bold text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                      >
                        <Download className="size-3.5" />
                        Télécharger Facture (PDF)
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => printEventFacturePdf(detailEvent, pricingSettings?.whatsappNumber, 'facture')}
                        className="rounded-xl font-bold text-xs gap-1.5 border-border/80 text-foreground hover:border-primary/50 cursor-pointer"
                      >
                        <Printer className="size-3.5 text-primary" />
                        Imprimer
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => navigate(`/board/events?id=${detailEvent.id}`)}
                        className="rounded-xl font-bold text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Vue client
                      </Button>

                      <Button
                        onClick={() => setDetailEvent(null)}
                        className="rounded-xl font-bold bg-primary text-primary-foreground text-xs cursor-pointer"
                      >
                        Fermer
                      </Button>
                    </div>
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
                <div className="divide-y divide-border/40 pt-2 overflow-x-auto">
                  <div className="py-3 min-w-[600px] flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
                    <span className="flex-1">Recette Catalogue FYS</span>
                    <div className="flex items-center gap-4 sm:gap-8 mr-4">
                      {productionAggregation.formatKeys.map((fmtKey) => (
                        <span key={fmtKey} className="min-w-[80px] text-center">
                          Flacons {fmtKey}
                        </span>
                      ))}
                    </div>
                    <span className="w-24 text-right">Volume Total (L)</span>
                  </div>

                  {productionAggregation.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="py-3.5 min-w-[600px] flex items-center justify-between text-sm px-2 hover:bg-muted/30 rounded-xl transition-colors"
                    >
                      <div className="flex-1 flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <span className="font-bold text-foreground">{item.name}</span>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-8 mr-4">
                        {productionAggregation.formatKeys.map((fmtKey) => (
                          <span
                            key={fmtKey}
                            className="min-w-[80px] text-center text-xs font-semibold text-foreground"
                          >
                            {item.formats[fmtKey] ? `${item.formats[fmtKey]} fl.` : '—'}
                          </span>
                        ))}
                      </div>

                      <div className="w-24 text-right font-display font-extrabold text-primary">
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

              {/* Section 1: Formats de Bouteilles Disponibles pour le Catalogue */}
              <div className="space-y-4 pb-6 border-b border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Wine className="size-4 text-primary" />
                      Formats de Bouteilles Disponibles pour le Catalogue
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Définissez les formats proposés aux entreprises dans le catalogue. Activez ou désactivez chaque format en un clic.
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenAddFormat}
                    className="rounded-xl font-bold text-xs border-primary/40 text-primary hover:bg-primary/10 cursor-pointer shrink-0"
                  >
                    <Plus className="size-3.5 mr-1" />
                    Ajouter un format
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {(pricingSettings.availableFormats || DEFAULT_FYS_EVENT_FORMATS).map((fmt) => {
                    const sampleBasePrice = 1500;
                    const sampleCalcPrice = Math.round(sampleBasePrice * (fmt.priceMultiplier || 1.0));

                    return (
                      <div
                        key={fmt.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          fmt.isActive
                            ? 'bg-card border-primary/40 shadow-xs'
                            : 'bg-muted/30 border-border/60 opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`size-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              fmt.isActive
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {fmt.shortLabel || fmt.id}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-sm text-foreground">
                                  {fmt.name}
                                </h5>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  {fmt.volumeLiters} L
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                {fmt.description || `Volume unitaire : ${fmt.volumeLiters} Litre(s)`}
                              </p>
                            </div>
                          </div>

                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                            fmt.isActive
                              ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                              : 'bg-muted text-muted-foreground border border-border/50'
                          }`}>
                            {fmt.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Tarification (coef. {fmt.priceMultiplier}×)
                            </span>
                            <span className="text-xs font-semibold text-foreground">
                              Ex. base 1 500 XAF → <strong className="text-primary font-bold">{sampleCalcPrice.toLocaleString()} XAF</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant={fmt.isActive ? 'secondary' : 'outline'}
                              onClick={() => handleToggleFormatActive(fmt.id)}
                              className="h-8 px-2.5 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              {fmt.isActive ? 'Désactiver' : 'Activer'}
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEditFormat(fmt)}
                              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Modifier ce format"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>

                            {!['500ml', '1L'].includes(fmt.id) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteFormat(fmt.id)}
                                className="h-8 w-8 p-0 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                title="Supprimer ce format"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Discount Tiers Table */}
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
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <MessageCircle className="size-4 text-emerald-500" />
                    Service Client WhatsApp & Assistance Événements
                  </h4>
                  {pricingSuccess && (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-pulse">
                      <CheckCircle2 className="size-3.5" /> Enregistré avec succès !
                    </span>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-muted/20 border border-border/50 max-w-2xl space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                      Numéro WhatsApp Service Client (avec ou sans indicatif pays)
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <Input
                        type="text"
                        placeholder="+237 6 99 00 00 00 ou 699000000"
                        value={pricingSettings?.whatsappNumber ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPricingSettings((prev) => ({
                            ...prev,
                            whatsappNumber: val,
                          }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSavePricing();
                          }
                        }}
                        className="h-11 rounded-xl font-bold text-sm bg-background flex-1"
                      />

                      <Button
                        type="button"
                        onClick={handleSavePricing}
                        disabled={savingPricing}
                        className="h-11 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer px-5 shrink-0 shadow-xs"
                      >
                        {savingPricing ? (
                          <RefreshCw className="size-4 animate-spin mr-2" />
                        ) : (
                          <Save className="size-4 mr-2" />
                        )}
                        Enregistrer
                      </Button>
                    </div>
                  </div>

                  {/* WhatsApp Live Preview & Test Link */}
                  <div className="p-3.5 rounded-xl bg-card border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Lien WhatsApp direct généré pour les clients
                      </span>
                      <code className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs break-all">
                        https://wa.me/{normalizeWhatsAppNumber(pricingSettings?.whatsappNumber)}
                      </code>
                    </div>

                    <a
                      href={`https://wa.me/${normalizeWhatsAppNumber(pricingSettings?.whatsappNumber)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 font-bold text-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <ExternalLink className="size-3.5" />
                      Tester le lien
                    </a>
                  </div>

                  {pricingError && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium">
                      {pricingError}
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Ce numéro permet aux entreprises de contacter directement l&apos;équipe FYS via un bouton WhatsApp intégré dans le devis (PDF), après la confirmation de commande, à chaque étape du formulaire et dans le récapitulatif financier.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Format Add / Edit Dialog */}
      <Dialog open={formatModalOpen} onOpenChange={setFormatModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-lg">
              {editingFormat ? 'Modifier le Format de Bouteille' : 'Ajouter un Nouveau Format'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Définissez les propriétés de ce format de bouteille pour le catalogue d&apos;événements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Nom complet affiché *</Label>
              <Input
                placeholder="Ex: 250 ml (Dégustation)"
                value={formatFormData.name}
                onChange={(e) => setFormatFormData({ ...formatFormData, name: e.target.value })}
                className="rounded-xl h-10 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Libellé court (badge) *</Label>
                <Input
                  placeholder="Ex: 250ml"
                  value={formatFormData.shortLabel}
                  onChange={(e) => setFormatFormData({ ...formatFormData, shortLabel: e.target.value })}
                  className="rounded-xl h-10 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Volume réel (Litres) *</Label>
                <Input
                  type="number"
                  step="0.05"
                  min="0.05"
                  placeholder="Ex: 0.25"
                  value={formatFormData.volumeLiters}
                  onChange={(e) =>
                    setFormatFormData({
                      ...formatFormData,
                      volumeLiters: parseFloat(e.target.value) || 0.5,
                    })
                  }
                  className="rounded-xl h-10 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Coefficient multiplicateur de prix *</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="Ex: 0.6 ou 1.8"
                  value={formatFormData.priceMultiplier}
                  onChange={(e) =>
                    setFormatFormData({
                      ...formatFormData,
                      priceMultiplier: parseFloat(e.target.value) || 1.0,
                    })
                  }
                  className="rounded-xl h-10 text-sm flex-1"
                />
                <span className="text-xs text-muted-foreground font-semibold shrink-0">
                  = {Math.round(1500 * (formatFormData.priceMultiplier || 1.0)).toLocaleString()} XAF (base 1 500)
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Description / Usage (facultatif)</Label>
              <Input
                placeholder="Ex: Idéal pour les pauses dégustation"
                value={formatFormData.description || ''}
                onChange={(e) => setFormatFormData({ ...formatFormData, description: e.target.value })}
                className="rounded-xl h-10 text-sm"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="fmt-active-check"
                checked={formatFormData.isActive}
                onChange={(e) => setFormatFormData({ ...formatFormData, isActive: e.target.checked })}
                className="rounded size-4 text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="fmt-active-check" className="text-xs font-bold text-foreground cursor-pointer">
                Activer immédiatement ce format dans le catalogue
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setFormatModalOpen(false)}
              className="rounded-xl cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleSaveFormatForm}
              disabled={!formatFormData.name.trim() || !formatFormData.shortLabel.trim()}
              className="rounded-xl bg-primary text-primary-foreground font-bold cursor-pointer"
            >
              {editingFormat ? 'Mettre à jour' : 'Ajouter le format'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BoardPageShell>
  );
};

EventsAdminPage.metadata = {
  title: 'FYS Event Pro — Administration & Configuration B2B',
  description:
    'Gestion administrative des événements d\'entreprise, suivi des commandes, feuille de production de jus cumulée et configuration des barèmes dégressifs FYS.',
};

export default EventsAdminPage;
