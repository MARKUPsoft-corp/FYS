import { useState, useEffect, useMemo } from 'react';
import { PageComponent, useNavigate, useSearchParams } from 'rasengan';
import {
  Building2,
  CalendarCheck,
  Package,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Plus,
  Minus,
  Check,
  ChefHat,
  Truck,
  XCircle,
  FileText,
  Printer,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  GlassWater,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { useAuthStore } from '@/stores/auth';
import {
  type FysEvent,
  type FysEventType,
  type FysEventStatus,
  type FysEventJuiceItem,
  type FysEventLogistics,
  type FysEventPricingSettings,
  type Cocktail,
  DEFAULT_FYS_EVENT_PRICING,
} from '@/entities';
import {
  getFysEventPricingSettings,
  calculateVolumeDiscountPercent,
  calculateEventFinancials,
  createFysEvent,
  subscribeToUserFysEvents,
  getFysEventById,
} from '@/services/event';
import { getPublicCocktails } from '@/services/cocktail';

const EVENT_TYPE_LABELS: Record<FysEventType, string> = {
  seminaire: 'Séminaire d\'entreprise',
  conference: 'Conférence & Forum',
  team_building: 'Team Building',
  cocktail_entreprise: 'Cocktail d\'entreprise',
  lancement_produit: 'Lancement de produit',
  soiree_entreprise: 'Soirée d\'entreprise / Gala',
  mariage_prive: 'Événement privé / Réception',
  autre: 'Autre événement',
};

const STATUS_CONFIG: Record<
  FysEventStatus,
  { label: string; icon: React.ElementType; bg: string; text: string; border: string; dot: string; description: string }
> = {
  draft: {
    label: 'Brouillon',
    icon: Clock,
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border/60',
    dot: 'bg-muted-foreground',
    description: 'Votre commande est en cours de configuration.',
  },
  submitted: {
    label: 'Transmise',
    icon: Clock,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-700',
    dot: 'bg-amber-500',
    description: 'Demande transmise avec succès. Notre équipe logistique vérifie le planning de pressage.',
  },
  confirmed: {
    label: 'Confirmée',
    icon: CheckCircle2,
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    text: 'text-sky-700 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-700',
    dot: 'bg-sky-500',
    description: 'Événement confirmé et bloqué dans notre calendrier de production.',
  },
  in_preparation: {
    label: 'En préparation',
    icon: ChefHat,
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    text: 'text-violet-700 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-700',
    dot: 'bg-violet-500',
    description: 'Nos fruits frais sont sélectionnés et pressés à froid pour votre événement.',
  },
  delivered: {
    label: 'Livrée sur site',
    icon: Truck,
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-700',
    dot: 'bg-emerald-500',
    description: 'Les jus et la logistique ont été livrés et installés avec succès.',
  },
  cancelled: {
    label: 'Annulée',
    icon: XCircle,
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-700',
    dot: 'bg-rose-500',
    description: 'Cet événement a été annulé.',
  },
};

const EventsPage: PageComponent = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventIdParam = searchParams.get('id');

  // Active view states
  const [myEvents, setMyEvents] = useState<FysEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<FysEvent | null>(null);
  const [loadingSelectedEvent, setLoadingSelectedEvent] = useState(false);

  // Mode: 'list' or 'wizard'
  const [viewMode, setViewMode] = useState<'list' | 'wizard'>('list');
  const [wizardStep, setWizardStep] = useState<number>(1);

  // Catalogue cocktails
  const [catalogueCocktails, setCatalogueCocktails] = useState<Cocktail[]>([]);
  const [loadingCatalogue, setLoadingCatalogue] = useState(false);

  // Pricing settings
  const [pricingSettings, setPricingSettings] = useState<FysEventPricingSettings>(DEFAULT_FYS_EVENT_PRICING);

  // Wizard form state
  const [companyName, setCompanyName] = useState('');
  const [eventType, setEventType] = useState<FysEventType>('seminaire');
  const [customEventType, setCustomEventType] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('08:30');
  const [location, setLocation] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [guestCount, setGuestCount] = useState<number>(30);

  // Items selection: Record<`${cocktailId}_${bottleVolume}`, quantity>
  const [selectedBottles, setSelectedBottles] = useState<Record<string, number>>({});
  const [activeBottleVolume, setActiveBottleVolume] = useState<'500ml' | '1L'>('500ml');

  // Logistics
  const [needCoolerBoxes, setNeedCoolerBoxes] = useState(false);
  const [coolerBoxesCount, setCoolerBoxesCount] = useState(2);
  const [needEcoCups, setNeedEcoCups] = useState(true);
  const [ecoCupsCount, setEcoCupsCount] = useState(50);
  const [needBartenderService, setNeedBartenderService] = useState(false);
  const [bartenderHours, setBartenderHours] = useState(4);
  const [logisticsNotes, setLogisticsNotes] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load pricing settings & cocktails
  useEffect(() => {
    getFysEventPricingSettings().then(setPricingSettings).catch(console.error);

    setLoadingCatalogue(true);
    getPublicCocktails()
      .then((cocktails) => setCatalogueCocktails(cocktails))
      .catch(console.error)
      .finally(() => setLoadingCatalogue(false));
  }, []);

  // Subscribe to user's events
  useEffect(() => {
    if (!user?.uid) {
      setMyEvents([]);
      setLoadingEvents(false);
      return;
    }

    setLoadingEvents(true);
    const unsub = subscribeToUserFysEvents(user.uid, (events) => {
      setMyEvents(events);
      setLoadingEvents(false);
    });

    return () => unsub();
  }, [user?.uid]);

  // Prepopulate contact from logged in user
  useEffect(() => {
    if (user) {
      if (!contactPerson && user.name) setContactPerson(user.name);
      if (!contactEmail && user.email) setContactEmail(user.email);
      if (!contactPhone && user.phone) setContactPhone(user.phone);
    }
  }, [user]);

  // Handle URL ?id= param for Full Page Detail
  useEffect(() => {
    if (eventIdParam) {
      setLoadingSelectedEvent(true);
      getFysEventById(eventIdParam)
        .then((ev) => {
          setSelectedEvent(ev);
        })
        .catch(console.error)
        .finally(() => setLoadingSelectedEvent(false));
    } else {
      setSelectedEvent(null);
    }
  }, [eventIdParam]);

  // Convert selectedBottles into FysEventJuiceItem[]
  const juiceItems: FysEventJuiceItem[] = useMemo(() => {
    const items: FysEventJuiceItem[] = [];
    for (const [key, qty] of Object.entries(selectedBottles)) {
      if (qty <= 0) continue;
      const [cocktailId, volume] = key.split('_') as [string, '500ml' | '1L'];
      const cocktail = catalogueCocktails.find((c) => c.id === cocktailId);
      if (!cocktail) continue;

      const base500Price = cocktail.totalPrice || 1500;
      const unitPrice = volume === '1L' ? Math.round(base500Price * 1.8) : base500Price;

      items.push({
        cocktailId,
        name: cocktail.name,
        imageUrl: cocktail.imageUrl,
        bottleVolume: volume,
        quantity: qty,
        unitPrice,
        totalPrice: unitPrice * qty,
      });
    }
    return items;
  }, [selectedBottles, catalogueCocktails]);

  // Logistics object
  const logisticsData: FysEventLogistics = useMemo(() => {
    const coolerUnitPrice = pricingSettings?.coolerBoxPricePerUnit ?? pricingSettings?.coolerBoxUnitPrice ?? DEFAULT_FYS_EVENT_PRICING.coolerBoxUnitPrice;
    const ecoCupPrice = pricingSettings?.ecoCupPricePerUnit ?? pricingSettings?.ecoCupUnitPrice ?? DEFAULT_FYS_EVENT_PRICING.ecoCupUnitPrice;
    const bartenderRate = pricingSettings?.bartenderServiceHourlyRate ?? (pricingSettings?.bartenderHalfDayRate ? Math.round(pricingSettings.bartenderHalfDayRate / 4) : DEFAULT_FYS_EVENT_PRICING.bartenderServiceHourlyRate);

    const coolerBoxFee = needCoolerBoxes ? coolerBoxesCount * coolerUnitPrice : 0;
    const ecoCupsFee = needEcoCups ? ecoCupsCount * ecoCupPrice : 0;
    const bartenderFee = needBartenderService
      ? bartenderHours * bartenderRate
      : 0;

    return {
      needCoolerBoxes,
      coolerBoxesCount: needCoolerBoxes ? coolerBoxesCount : 0,
      coolerBoxFee,
      needEcoCups,
      ecoCupsCount: needEcoCups ? ecoCupsCount : 0,
      ecoCupsFee,
      needBartenderService,
      bartenderHours: needBartenderService ? bartenderHours : 0,
      bartenderHourlyRate: bartenderRate,
      bartenderFee,
      notes: logisticsNotes,
    };
  }, [
    needCoolerBoxes,
    coolerBoxesCount,
    needEcoCups,
    ecoCupsCount,
    needBartenderService,
    bartenderHours,
    logisticsNotes,
    pricingSettings,
  ]);

  // Real-time financial calculations
  const financials = useMemo(() => {
    return calculateEventFinancials(juiceItems, logisticsData, pricingSettings);
  }, [juiceItems, logisticsData, pricingSettings]);

  // Next discount tier calculation
  const nextDiscountInfo = useMemo(() => {
    const currentBottles = financials.totalBottles;
    const tiers = pricingSettings?.volumeDiscountTiers || pricingSettings?.volumeDiscounts || DEFAULT_FYS_EVENT_PRICING.volumeDiscountTiers || [];
    const sortedTiers = [...tiers].sort((a, b) => a.minBottles - b.minBottles);
    const nextTier = sortedTiers.find((tier) => tier.minBottles > currentBottles);

    if (!nextTier) {
      return { hasNext: false, needed: 0, nextPercent: financials.discountPercent };
    }

    return {
      hasNext: true,
      needed: nextTier.minBottles - currentBottles,
      nextPercent: nextTier.discountPercent,
      targetBottles: nextTier.minBottles,
    };
  }, [financials.totalBottles, financials.discountPercent, pricingSettings]);

  // Quantity helpers
  const handleQuantityChange = (cocktailId: string, volume: '500ml' | '1L', delta: number) => {
    const key = `${cocktailId}_${volume}`;
    const current = selectedBottles[key] || 0;
    const next = Math.max(0, current + delta);
    setSelectedBottles((prev) => ({
      ...prev,
      [key]: next,
    }));
  };

  const setExplicitQuantity = (cocktailId: string, volume: '500ml' | '1L', qty: number) => {
    const key = `${cocktailId}_${volume}`;
    setSelectedBottles((prev) => ({
      ...prev,
      [key]: Math.max(0, qty),
    }));
  };

  // Submit new event order
  const handleCreateEvent = async () => {
    if (!user) {
      navigate('/auth/login?redirect=/board/events');
      return;
    }

    if (!companyName.trim() || !eventTitle.trim() || !eventDate || !location.trim() || !contactPerson.trim() || !contactPhone.trim()) {
      setSubmitError('Veuillez remplir tous les champs obligatoires du formulaire.');
      return;
    }

    if (juiceItems.length === 0) {
      setSubmitError('Veuillez sélectionner au moins un jus pour votre événement.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const newEventId = await createFysEvent({
        userId: user.uid,
        userEmail: user.email,
        userName: user.name,
        userPhone: user.phone || contactPhone,
        companyName: companyName.trim(),
        eventType,
        customEventType: eventType === 'autre' ? customEventType.trim() : undefined,
        eventTitle: eventTitle.trim(),
        eventDate,
        deliveryTime: deliveryTime.trim() || undefined,
        location: location.trim(),
        contactPerson: contactPerson.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim() || user.email,
        guestCount: Number(guestCount) || 1,
        items: juiceItems,
        totalBottles: financials.totalBottles,
        totalLiters: financials.totalLiters,
        rawJuiceTotal: financials.rawJuiceTotal,
        discountPercent: financials.discountPercent,
        discountAmount: financials.discountAmount,
        logistics: logisticsData,
        totalLogisticsFee: financials.totalLogisticsFee,
        totalAmount: financials.totalAmount,
        status: 'submitted',
      });

      // Reset form and view event details
      setViewMode('list');
      navigate(`/board/events?id=${newEventId}`);
    } catch (err: any) {
      console.error('Error creating FYS Event:', err);
      setSubmitError(err.message || 'Une erreur est survenue lors de la validation de la commande.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER 1: FULL PAGE EVENT DETAILS VIEW (When ?id=xyz is in URL)
  // ─────────────────────────────────────────────────────────────────────────────
  if (eventIdParam) {
    if (loadingSelectedEvent) {
      return (
        <BoardPageShell
          eyebrow="FYS EVENT • DÉTAIL COMMANDE"
          titleBefore="Événement"
          titleHighlight="En chargement"
          imageUrl="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1600"
        >
          <div className="max-w-5xl mx-auto py-16 text-center space-y-4">
            <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground font-medium text-sm">Chargement des détails de l&apos;événement...</p>
          </div>
        </BoardPageShell>
      );
    }

    if (!selectedEvent) {
      return (
        <BoardPageShell
          eyebrow="FYS EVENT • INTROUVABLE"
          titleBefore="Événement"
          titleHighlight="Non trouvé"
          imageUrl="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1600"
        >
          <div className="max-w-xl mx-auto py-16 text-center space-y-6 bg-card border border-border/60 rounded-3xl p-8 shadow-sm">
            <AlertCircle className="size-12 text-muted-foreground mx-auto" />
            <div className="space-y-2">
              <h2 className="text-xl font-bold font-display">Événement introuvable</h2>
              <p className="text-sm text-muted-foreground">
                L&apos;événement demandé n&apos;existe pas ou vous n&apos;avez pas les autorisations nécessaires pour le consulter.
              </p>
            </div>
            <Button
              onClick={() => navigate('/board/events')}
              className="rounded-xl font-bold bg-primary text-primary-foreground"
            >
              <ArrowLeft className="size-4 mr-2" />
              Retour à mes événements
            </Button>
          </div>
        </BoardPageShell>
      );
    }

    const statusObj = STATUS_CONFIG[selectedEvent.status] || STATUS_CONFIG.submitted;
    const StatusIcon = statusObj.icon;

    return (
      <BoardPageShell
        eyebrow={`FYS EVENT • ${selectedEvent.companyName.toUpperCase()}`}
        titleBefore={selectedEvent.companyName}
        titleHighlight={selectedEvent.eventTitle}
        imageUrl="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1600"
      >
        <div className="max-w-6xl mx-auto space-y-8 pb-16">
          {/* Top Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-4 rounded-2xl border border-border/60">
            <Button
              variant="outline"
              onClick={() => navigate('/board/events')}
              className="rounded-xl font-semibold gap-2 border-border/80"
            >
              <ArrowLeft className="size-4" />
              Retour à la liste
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="rounded-xl font-semibold gap-2 border-border/80"
              >
                <Printer className="size-4" />
                Imprimer la fiche
              </Button>
              <span
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${statusObj.bg} ${statusObj.text} ${statusObj.border}`}
              >
                <span className={`size-2 rounded-full ${statusObj.dot}`} />
                <StatusIcon className="size-3.5" />
                {statusObj.label}
              </span>
            </div>
          </div>

          {/* Status banner description */}
          <div className={`p-5 rounded-2xl border ${statusObj.bg} ${statusObj.border} flex items-start gap-4`}>
            <StatusIcon className={`size-5 mt-0.5 shrink-0 ${statusObj.text}`} />
            <div>
              <h4 className={`text-sm font-bold ${statusObj.text}`}>
                Statut actuel : {statusObj.label}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {statusObj.description}
              </p>
              {selectedEvent.statusNotes && (
                <p className="text-xs font-medium text-foreground mt-2 bg-background/60 p-2.5 rounded-xl border border-border/50">
                  Note FYS : {selectedEvent.statusNotes}
                </p>
              )}
            </div>
          </div>

          {/* Main Detail Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col (2 spans): Event Details & Juice breakdown */}
            <div className="lg:col-span-2 space-y-8">
              {/* Event Metadata Card */}
              <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/70 shadow-xs space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-border/50">
                  <Building2 className="size-5 text-primary" />
                  <h3 className="font-display font-bold text-lg text-foreground">
                    Informations Générales
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block">Entreprise / Organisation</span>
                    <span className="font-bold text-foreground text-base">{selectedEvent.companyName}</span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block">Intitulé de l&apos;événement</span>
                    <span className="font-semibold text-foreground">{selectedEvent.eventTitle}</span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block">Type d&apos;événement</span>
                    <span className="font-semibold text-foreground">
                      {EVENT_TYPE_LABELS[selectedEvent.eventType] || selectedEvent.eventType}
                      {selectedEvent.customEventType ? ` (${selectedEvent.customEventType})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block">Convives attendus</span>
                    <span className="font-semibold text-foreground">{selectedEvent.guestCount} personnes</span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block">Date & Heure souhaitées</span>
                    <span className="font-bold text-primary">
                      {selectedEvent.eventDate} {selectedEvent.deliveryTime ? `à ${selectedEvent.deliveryTime}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block">Lieu de livraison</span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                      <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                      {selectedEvent.location}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Responsable sur place</span>
                    <span className="font-semibold text-foreground">{selectedEvent.contactPerson}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Téléphone contact</span>
                    <span className="font-semibold text-foreground">{selectedEvent.contactPhone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Email</span>
                    <span className="font-semibold text-foreground truncate block">{selectedEvent.contactEmail}</span>
                  </div>
                </div>
              </div>

              {/* Juice Breakdown Table */}
              <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/70 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <GlassWater className="size-5 text-primary" />
                    <h3 className="font-display font-bold text-lg text-foreground">
                      Jus Frais Sélectionnés
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">
                      {selectedEvent.totalBottles} flacons
                    </span>
                    <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full">
                      {selectedEvent.totalLiters.toFixed(1)} Litres
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-border/40">
                  {selectedEvent.items.map((item, idx) => (
                    <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="size-11 rounded-xl object-cover border border-border/40 shrink-0"
                          />
                        ) : (
                          <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <GlassWater className="size-5 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Format {item.bottleVolume} • {item.unitPrice.toLocaleString()} XAF / unité
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">
                          {item.quantity} flacon{item.quantity > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs font-semibold text-muted-foreground">
                          {item.totalPrice.toLocaleString()} XAF
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logistics & Equipment */}
              <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/70 shadow-xs space-y-5">
                <div className="flex items-center gap-2 pb-4 border-b border-border/50">
                  <Package className="size-5 text-primary" />
                  <h3 className="font-display font-bold text-lg text-foreground">
                    Logistique & Matériel Associé
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground block">Glacières isothermes</span>
                    <span className="font-bold text-foreground text-sm">
                      {selectedEvent.logistics.needCoolerBoxes
                        ? `${selectedEvent.logistics.coolerBoxesCount} glacière(s) (${selectedEvent.logistics.coolerBoxFee.toLocaleString()} XAF)`
                        : 'Non requis'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground block">Gobelets écologiques</span>
                    <span className="font-bold text-foreground text-sm">
                      {selectedEvent.logistics.needEcoCups
                        ? `${selectedEvent.logistics.ecoCupsCount} gobelets (${selectedEvent.logistics.ecoCupsFee.toLocaleString()} XAF)`
                        : 'Non requis'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground block">Service Barman FYS</span>
                    <span className="font-bold text-foreground text-sm">
                      {selectedEvent.logistics.needBartenderService
                        ? `${selectedEvent.logistics.bartenderHours}h sur site (${selectedEvent.logistics.bartenderFee.toLocaleString()} XAF)`
                        : 'Non requis'}
                    </span>
                  </div>
                </div>

                {selectedEvent.logistics.notes && (
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-xs">
                    <span className="font-semibold text-muted-foreground block mb-1">Consignes spécifiques :</span>
                    <p className="text-foreground italic">{selectedEvent.logistics.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Financial Summary Card */}
            <div className="space-y-6">
              <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/70 shadow-sm sticky top-28 space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-border/50">
                  <FileText className="size-5 text-primary" />
                  <h3 className="font-display font-bold text-lg text-foreground">
                    Récapitulatif Financier
                  </h3>
                </div>

                <div className="space-y-3.5 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Sous-total jus brut</span>
                    <span className="font-medium text-foreground">
                      {selectedEvent.rawJuiceTotal.toLocaleString()} XAF
                    </span>
                  </div>

                  {selectedEvent.discountPercent > 0 ? (
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                      <span>Remise sur volume ({selectedEvent.discountPercent}%)</span>
                      <span>-{selectedEvent.discountAmount.toLocaleString()} XAF</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-muted-foreground text-xs">
                      <span>Remise sur volume</span>
                      <span>0%</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Prestations & logistique</span>
                    <span className="font-medium text-foreground">
                      {selectedEvent.totalLogisticsFee.toLocaleString()} XAF
                    </span>
                  </div>

                  <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                    <span className="font-display font-extrabold text-base text-foreground">Total Net</span>
                    <span className="font-display font-black text-2xl text-primary">
                      {selectedEvent.totalAmount.toLocaleString()} XAF
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-xs text-muted-foreground leading-relaxed bg-muted/40 p-4 rounded-2xl border border-border/50 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <ShieldCheck className="size-4 text-primary" />
                    Engagement Fraîcheur 100% Garantie
                  </div>
                  <p>
                    Nos recettes sont pressées à froid quelques heures avant l&apos;événement pour préserver l&apos;intégralité des enzymes et nutriments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BoardPageShell>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER 2: LIST OF EVENTS OR CREATION WIZARD
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <BoardPageShell
      eyebrow="FYS EVENT • CORPORATE CATERING"
      titleBefore="Événements"
      titleHighlight="& Entreprises"
      imageUrl="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1600"
    >
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        {/* Navigation Tabs between List and Wizard */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-2xl border border-border/40">
            <button
              type="button"
              onClick={() => {
                setViewMode('list');
                setSubmitError(null);
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mes Événements ({myEvents.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('wizard');
                setSubmitError(null);
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                viewMode === 'wizard'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              + Nouvel Événement
            </button>
          </div>

          <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span>Catalogue officiel FYS • Remises dégressives jusqu&apos;à 30%</span>
          </div>
        </div>

        {/* ── LIST VIEW ──────────────────────────────────────────────────────── */}
        {viewMode === 'list' && (
          <div className="space-y-6">
            {loadingEvents ? (
              <div className="py-16 text-center space-y-4">
                <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground font-medium">Chargement de vos événements...</p>
              </div>
            ) : myEvents.length === 0 ? (
              <div className="py-16 text-center max-w-xl mx-auto space-y-6 bg-card border border-border/70 rounded-3xl p-8 shadow-xs">
                <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
                  <Building2 className="size-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold font-display text-foreground">
                    Aucun événement pour le moment
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Vous organisez un séminaire, une réunion de direction ou une soirée d&apos;entreprise ?
                    Configurez vos jus frais au tarif dégressif avec livraison sur site.
                  </p>
                </div>
                <Button
                  onClick={() => setViewMode('wizard')}
                  className="rounded-2xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-7"
                >
                  <Plus className="size-4 mr-2" />
                  Créer mon premier événement
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myEvents.map((ev) => {
                  const statusObj = STATUS_CONFIG[ev.status] || STATUS_CONFIG.submitted;
                  const StatusIcon = statusObj.icon;

                  return (
                    <div
                      key={ev.id}
                      onClick={() => navigate(`/board/events?id=${ev.id}`)}
                      className="bg-card rounded-3xl p-6 border border-border/70 shadow-xs hover:border-primary/50 transition-all cursor-pointer group flex flex-col justify-between gap-5"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Building2 className="size-3.5 text-primary" />
                            {ev.companyName}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusObj.bg} ${statusObj.text} ${statusObj.border}`}
                          >
                            <span className={`size-1.5 rounded-full ${statusObj.dot}`} />
                            <StatusIcon className="size-3" />
                            {statusObj.label}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                            {ev.eventTitle}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {EVENT_TYPE_LABELS[ev.eventType] || ev.eventType} • {ev.guestCount} convives
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                          <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40">
                            <span className="text-muted-foreground block text-[10px]">Date prévue</span>
                            <span className="font-semibold text-foreground">{ev.eventDate}</span>
                          </div>
                          <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40">
                            <span className="text-muted-foreground block text-[10px]">Volume commandé</span>
                            <span className="font-semibold text-foreground">{ev.totalBottles} flacons ({ev.totalLiters.toFixed(1)}L)</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase font-medium">Montant total</span>
                          <span className="font-display font-extrabold text-lg text-foreground">
                            {ev.totalAmount.toLocaleString()} XAF
                          </span>
                        </div>

                        <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Voir la commande
                          <ChevronRight className="size-4" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── WIZARD VIEW ────────────────────────────────────────────────────── */}
        {viewMode === 'wizard' && (
          <div className="space-y-8">
            {/* Stepper Progress Indicator */}
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              {[
                { step: 1, label: 'Événement' },
                { step: 2, label: 'Sélection Jus' },
                { step: 3, label: 'Logistique' },
                { step: 4, label: 'Confirmation' },
              ].map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setWizardStep(s.step)}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                    wizardStep === s.step
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                      : wizardStep > s.step
                      ? 'bg-card border-border/70 text-foreground'
                      : 'bg-card/40 border-border/30 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        wizardStep === s.step
                          ? 'bg-primary text-primary-foreground'
                          : wizardStep > s.step
                          ? 'bg-muted text-foreground'
                          : 'bg-muted/60 text-muted-foreground'
                      }`}
                    >
                      {wizardStep > s.step ? <Check className="size-3.5" /> : s.step}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold truncate">{s.label}</span>
                  </div>
                </button>
              ))}
            </div>

            {submitError && (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
                <AlertCircle className="size-5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* STEP 1: INFORMATIONS GÉNÉRALES */}
            {wizardStep === 1 && (
              <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/70 shadow-xs space-y-6">
                <div className="space-y-1 pb-4 border-b border-border/50">
                  <h3 className="text-xl font-bold font-display text-foreground">
                    1. Votre Entreprise & Votre Événement
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Renseignez les coordonnées de l&apos;entreprise hôte et le cadre de la réception.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Entreprise / Organisation *
                    </label>
                    <Input
                      placeholder="Ex: Orange Cameroun, MTN, Cabinet Deloitte..."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Type d&apos;événement *
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as FysEventType)}
                      className="w-full h-11 px-3 rounded-xl bg-background border border-input text-foreground text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  {eventType === 'autre' && (
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Précisez le type d&apos;événement *
                      </label>
                      <Input
                        placeholder="Ex: Assemblée générale des actionnaires"
                        value={customEventType}
                        onChange={(e) => setCustomEventType(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Titre de l&apos;événement *
                    </label>
                    <Input
                      placeholder="Ex: Séminaire Annuel Q4 & Stratégie"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Nombre de convives attendus *
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={guestCount}
                      onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Date de l&apos;événement *
                    </label>
                    <Input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Heure de livraison souhaitée sur site
                    </label>
                    <Input
                      type="time"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Lieu / Adresse précise de livraison *
                    </label>
                    <Input
                      placeholder="Ex: Douala, Bonanjo, Immeuble Krystal Palace, 3ème étage"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 space-y-4">
                  <h4 className="text-sm font-bold text-foreground">Contact Responsable sur Place</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Nom & Prénom *</label>
                      <Input
                        placeholder="Ex: Jean Dupont"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Téléphone direct *</label>
                      <Input
                        placeholder="Ex: +237 690 00 00 00"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Email de contact</label>
                      <Input
                        placeholder="Ex: contact@entreprise.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => {
                      if (!companyName.trim() || !eventTitle.trim() || !eventDate || !location.trim() || !contactPerson.trim() || !contactPhone.trim()) {
                        setSubmitError('Veuillez renseigner tous les champs obligatoires (*).');
                        return;
                      }
                      setSubmitError(null);
                      setWizardStep(2);
                    }}
                    className="rounded-xl font-bold bg-primary text-primary-foreground h-11 px-6"
                  >
                    Étape suivante : Sélection des Jus
                    <ArrowRight className="size-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: SÉLECTION DES JUS DU CATALOGUE */}
            {wizardStep === 2 && (
              <div className="space-y-6">
                {/* Dynamic Volume Discount Status Bar */}
                <div className="bg-card rounded-3xl p-6 border border-primary/40 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                        Barème Dégressif B2B
                      </span>
                      <h4 className="font-display font-bold text-lg text-foreground">
                        {financials.totalBottles} flacon{financials.totalBottles > 1 ? 's' : ''} sélectionné{financials.totalBottles > 1 ? 's' : ''} ({financials.totalLiters.toFixed(1)} Litres)
                      </h4>
                    </div>

                    <div className="flex items-center gap-3">
                      {financials.discountPercent > 0 ? (
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold px-3.5 py-1.5 rounded-full text-xs flex items-center gap-1.5">
                          <Sparkles className="size-3.5" />
                          Remise appliquée : {financials.discountPercent}%
                        </span>
                      ) : (
                        <span className="bg-muted text-muted-foreground font-semibold px-3 py-1 rounded-full text-xs">
                          Aucune remise pour l&apos;instant
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Visual Tier Milestones */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {(pricingSettings?.volumeDiscountTiers || pricingSettings?.volumeDiscounts || DEFAULT_FYS_EVENT_PRICING.volumeDiscountTiers || []).map((tier, idx) => {
                      const isActive = financials.totalBottles >= tier.minBottles;
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border text-center transition-all ${
                            isActive
                              ? 'bg-primary/10 border-primary text-primary font-bold'
                              : 'bg-muted/40 border-border/40 text-muted-foreground'
                          }`}
                        >
                          <span className="text-xs block font-bold">
                            {tier.minBottles}+ flacons
                          </span>
                          <span className="text-sm font-black">
                            -{tier.discountPercent}%
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {nextDiscountInfo.hasNext && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Flame className="size-3.5 text-amber-500" />
                      Ajoutez encore <strong className="text-foreground">{nextDiscountInfo.needed} flacon{nextDiscountInfo.needed > 1 ? 's' : ''}</strong> pour débloquer la remise de <strong className="text-primary">{nextDiscountInfo.nextPercent}%</strong> !
                    </p>
                  )}
                </div>

                {/* Catalogue Selection Controls */}
                <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/70 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
                    <div>
                      <h3 className="text-xl font-bold font-display text-foreground">
                        2. Sélection des Recettes FYS
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Jus 100% naturels pressés le jour de l&apos;événement. Choisissez le format et la quantité pour chaque recette.
                      </p>
                    </div>

                    {/* Format Selector Toggle */}
                    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/40 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveBottleVolume('500ml')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeBottleVolume === '500ml'
                            ? 'bg-card text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Format 500ml (Individuel)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveBottleVolume('1L')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeBottleVolume === '1L'
                            ? 'bg-card text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Format 1L (Partage)
                      </button>
                    </div>
                  </div>

                  {loadingCatalogue ? (
                    <div className="py-12 text-center space-y-3">
                      <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-muted-foreground font-medium">Chargement du catalogue FYS...</p>
                    </div>
                  ) : catalogueCocktails.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      Aucun cocktail public disponible dans le catalogue.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {catalogueCocktails.map((cocktail) => {
                        const key = `${cocktail.id}_${activeBottleVolume}`;
                        const currentQty = selectedBottles[key] || 0;
                        const basePrice = cocktail.totalPrice || 1500;
                        const price = activeBottleVolume === '1L' ? Math.round(basePrice * 1.8) : basePrice;

                        return (
                          <div
                            key={cocktail.id}
                            className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-4 ${
                              currentQty > 0
                                ? 'bg-primary/[0.03] border-primary/60 shadow-xs'
                                : 'bg-card border-border/60 hover:border-border'
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                                {cocktail.imageUrl ? (
                                  <img
                                    src={cocktail.imageUrl}
                                    alt={cocktail.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                                    <GlassWater className="size-8" />
                                  </div>
                                )}
                                <span className="absolute top-2 right-2 bg-background/80 backdrop-blur-xs text-foreground font-bold text-[11px] px-2 py-0.5 rounded-md border border-border/40">
                                  {price.toLocaleString()} XAF / {activeBottleVolume}
                                </span>
                              </div>

                              <div>
                                <h4 className="font-bold text-foreground text-sm leading-tight">
                                  {cocktail.name}
                                </h4>
                                {cocktail.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                    {cocktail.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Stepper */}
                            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-muted-foreground">
                                Qté ({activeBottleVolume})
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(cocktail.id, activeBottleVolume, -5)}
                                  disabled={currentQty === 0}
                                  className="size-8 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 disabled:opacity-30 cursor-pointer transition-colors"
                                  title="Retirer 5"
                                >
                                  <Minus className="size-3.5" />
                                </button>
                                <Input
                                  type="number"
                                  min={0}
                                  value={currentQty}
                                  onChange={(e) => setExplicitQuantity(cocktail.id, activeBottleVolume, parseInt(e.target.value) || 0)}
                                  className="w-14 h-8 text-center rounded-lg text-xs font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(cocktail.id, activeBottleVolume, 5)}
                                  className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 cursor-pointer transition-colors"
                                  title="Ajouter 5"
                                >
                                  <Plus className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-6 border-t border-border/50">
                    <Button
                      variant="outline"
                      onClick={() => setWizardStep(1)}
                      className="rounded-xl font-semibold"
                    >
                      <ArrowLeft className="size-4 mr-2" />
                      Précédent
                    </Button>
                    <Button
                      onClick={() => {
                        if (juiceItems.length === 0) {
                          setSubmitError('Veuillez sélectionner au moins un flacon de jus.');
                          return;
                        }
                        setSubmitError(null);
                        setWizardStep(3);
                      }}
                      className="rounded-xl font-bold bg-primary text-primary-foreground px-6"
                    >
                      Étape suivante : Logistique
                      <ArrowRight className="size-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: LOGISTIQUE & SERVICES */}
            {wizardStep === 3 && (
              <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/70 shadow-xs space-y-6">
                <div className="space-y-1 pb-4 border-b border-border/50">
                  <h3 className="text-xl font-bold font-display text-foreground">
                    3. Logistique & Services Complémentaires
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Garantissez la conservation optimale et un service irréprochable le jour J.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* Option 1: Cooler boxes */}
                  <div className="p-5 rounded-2xl border border-border/60 bg-muted/20 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Package className="size-4 text-primary" />
                          <h4 className="font-bold text-sm text-foreground">
                            Glacières Isothermes Professionnelles
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Maintien des jus à 4°C pendant 12 heures sans nécessité de branchement électrique. Recommandé pour séminaires et extérieurs.
                        </p>
                        <p className="text-xs font-semibold text-primary">
                          {(pricingSettings?.coolerBoxPricePerUnit ?? DEFAULT_FYS_EVENT_PRICING.coolerBoxPricePerUnit).toLocaleString()} XAF / glacière (consigne & location)
                        </p>
                      </div>

                      <input
                        type="checkbox"
                        checked={needCoolerBoxes}
                        onChange={(e) => setNeedCoolerBoxes(e.target.checked)}
                        className="size-5 accent-primary rounded-md cursor-pointer mt-1"
                      />
                    </div>

                    {needCoolerBoxes && (
                      <div className="pt-3 border-t border-border/40 flex items-center gap-3">
                        <span className="text-xs font-medium text-foreground">Nombre de glacières souhaité :</span>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={coolerBoxesCount}
                          onChange={(e) => setCoolerBoxesCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 h-9 rounded-xl text-center text-xs font-bold"
                        />
                        <span className="text-xs text-muted-foreground">
                          = {(coolerBoxesCount * (pricingSettings?.coolerBoxPricePerUnit ?? DEFAULT_FYS_EVENT_PRICING.coolerBoxPricePerUnit)).toLocaleString()} XAF
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Option 2: Eco cups */}
                  <div className="p-5 rounded-2xl border border-border/60 bg-muted/20 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <GlassWater className="size-4 text-primary" />
                          <h4 className="font-bold text-sm text-foreground">
                            Gobelets Écologiques Biodégradables
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Gobelets certifiés 100% compostables avec graduation FYS pour dégustation corporate élégante.
                        </p>
                        <p className="text-xs font-semibold text-primary">
                          {(pricingSettings?.ecoCupPricePerUnit ?? DEFAULT_FYS_EVENT_PRICING.ecoCupPricePerUnit).toLocaleString()} XAF / unité
                        </p>
                      </div>

                      <input
                        type="checkbox"
                        checked={needEcoCups}
                        onChange={(e) => setNeedEcoCups(e.target.checked)}
                        className="size-5 accent-primary rounded-md cursor-pointer mt-1"
                      />
                    </div>

                    {needEcoCups && (
                      <div className="pt-3 border-t border-border/40 flex items-center gap-3">
                        <span className="text-xs font-medium text-foreground">Nombre de gobelets :</span>
                        <Input
                          type="number"
                          min={10}
                          step={10}
                          value={ecoCupsCount}
                          onChange={(e) => setEcoCupsCount(Math.max(10, parseInt(e.target.value) || 10))}
                          className="w-24 h-9 rounded-xl text-center text-xs font-bold"
                        />
                        <span className="text-xs text-muted-foreground">
                          = {(ecoCupsCount * (pricingSettings?.ecoCupPricePerUnit ?? DEFAULT_FYS_EVENT_PRICING.ecoCupPricePerUnit)).toLocaleString()} XAF
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Option 3: Bartender service */}
                  <div className="p-5 rounded-2xl border border-border/60 bg-muted/20 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <ChefHat className="size-4 text-primary" />
                          <h4 className="font-bold text-sm text-foreground">
                            Service Barman / Animation FYS sur Place
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Un barman expert FYS en tenue professionnelle pour gérer le service, la présentation et animer l&apos;espace dégustation.
                        </p>
                        <p className="text-xs font-semibold text-primary">
                          {(pricingSettings?.bartenderServiceHourlyRate ?? DEFAULT_FYS_EVENT_PRICING.bartenderServiceHourlyRate).toLocaleString()} XAF / heure de prestation
                        </p>
                      </div>

                      <input
                        type="checkbox"
                        checked={needBartenderService}
                        onChange={(e) => setNeedBartenderService(e.target.checked)}
                        className="size-5 accent-primary rounded-md cursor-pointer mt-1"
                      />
                    </div>

                    {needBartenderService && (
                      <div className="pt-3 border-t border-border/40 flex items-center gap-3">
                        <span className="text-xs font-medium text-foreground">Nombre d&apos;heures prévues :</span>
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={bartenderHours}
                          onChange={(e) => setBartenderHours(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 h-9 rounded-xl text-center text-xs font-bold"
                        />
                        <span className="text-xs text-muted-foreground">
                          = {(bartenderHours * (pricingSettings?.bartenderServiceHourlyRate ?? DEFAULT_FYS_EVENT_PRICING.bartenderServiceHourlyRate)).toLocaleString()} XAF
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notes / specific requirements */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Consignes particulières de livraison ou restrictions d&apos;accès
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Badge requis à l'accueil, livraison impérativement avant 08h00, ascenseur côté parking..."
                      value={logisticsNotes}
                      onChange={(e) => setLogisticsNotes(e.target.value)}
                      className="w-full p-3 rounded-xl bg-background border border-input text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-border/50">
                  <Button
                    variant="outline"
                    onClick={() => setWizardStep(2)}
                    className="rounded-xl font-semibold"
                  >
                    <ArrowLeft className="size-4 mr-2" />
                    Précédent
                  </Button>
                  <Button
                    onClick={() => {
                      setSubmitError(null);
                      setWizardStep(4);
                    }}
                    className="rounded-xl font-bold bg-primary text-primary-foreground px-6"
                  >
                    Étape suivante : Récapitulatif
                    <ArrowRight className="size-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: RÉCAPITULATIF & CONFIRMATION */}
            {wizardStep === 4 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {/* Event summary box */}
                  <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/70 shadow-xs space-y-5">
                    <div className="flex items-center justify-between pb-4 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-5 text-primary" />
                        <h3 className="font-display font-bold text-lg text-foreground">
                          {companyName} • {eventTitle}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="text-xs text-primary hover:underline font-bold cursor-pointer"
                      >
                        Modifier
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Type & Convives</span>
                        <span className="font-semibold text-foreground">
                          {EVENT_TYPE_LABELS[eventType]} ({guestCount} pers.)
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Date & Heure</span>
                        <span className="font-semibold text-foreground">
                          {eventDate} à {deliveryTime}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground block">Lieu de livraison</span>
                        <span className="font-semibold text-foreground">{location}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground block">Contact sur site</span>
                        <span className="font-semibold text-foreground">
                          {contactPerson} ({contactPhone} • {contactEmail})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Juices summary */}
                  <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/70 shadow-xs space-y-5">
                    <div className="flex items-center justify-between pb-4 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <GlassWater className="size-5 text-primary" />
                        <h3 className="font-display font-bold text-lg text-foreground">
                          Flacons Commandés ({financials.totalBottles})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="text-xs text-primary hover:underline font-bold cursor-pointer"
                      >
                        Modifier
                      </button>
                    </div>

                    <div className="divide-y divide-border/40">
                      {juiceItems.map((item, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                          <div>
                            <span className="font-bold text-foreground text-sm block">{item.name}</span>
                            <span className="text-muted-foreground">
                              {item.quantity} x {item.bottleVolume} ({item.unitPrice.toLocaleString()} XAF)
                            </span>
                          </div>
                          <span className="font-bold text-foreground text-sm">
                            {item.totalPrice.toLocaleString()} XAF
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Financial Summary & Confirm */}
                <div className="space-y-6">
                  <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/70 shadow-sm space-y-6">
                    <h3 className="font-display font-bold text-lg text-foreground pb-3 border-b border-border/50">
                      Devis en Temps Réel
                    </h3>

                    <div className="space-y-3.5 text-sm">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Total brut jus</span>
                        <span className="font-medium text-foreground">
                          {financials.rawJuiceTotal.toLocaleString()} XAF
                        </span>
                      </div>

                      {financials.discountPercent > 0 && (
                        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                          <span>Remise dégressive ({financials.discountPercent}%)</span>
                          <span>-{financials.discountAmount.toLocaleString()} XAF</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Options logistiques</span>
                        <span className="font-medium text-foreground">
                          {financials.totalLogisticsFee.toLocaleString()} XAF
                        </span>
                      </div>

                      <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                        <span className="font-display font-extrabold text-base text-foreground">Total à régler</span>
                        <span className="font-display font-black text-2xl text-primary">
                          {financials.totalAmount.toLocaleString()} XAF
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={handleCreateEvent}
                      disabled={submitting}
                      className="w-full rounded-2xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground h-13 text-sm shadow-md transition-all active:scale-98 cursor-pointer"
                    >
                      {submitting ? (
                        <div className="size-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mx-auto" />
                      ) : (
                        <>
                          <CheckCircle2 className="size-4 mr-2" />
                          Confirmer & Transmettre la commande
                        </>
                      )}
                    </Button>

                    <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                      En validant, votre commande est directement transmise à l&apos;équipe FYS. Un récapitulatif vous sera envoyé et vous pourrez suivre l&apos;état en temps réel.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </BoardPageShell>
  );
};

EventsPage.metadata = {
  title: 'FYS Event — Restauration d\'Entreprise & Catering Jus Frais',
  description:
    'Commandez vos jus de fruits frais 100% naturels en volume pour vos séminaires, cocktails et événements professionnels avec remises dégressives et logistique dédiée.',
};

export default EventsPage;
