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
  GlassWater,
  Flame,
  Lock,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import {
  type FysEvent,
  type FysEventType,
  type FysEventStatus,
  type FysEventJuiceItem,
  type FysEventLogistics,
  type FysEventPricingSettings,
  type Cocktail,
  type Fruit,
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
import { getFruits } from '@/services/fruit';
import {
  CocktailBanner,
  buildFruitVisuals,
  shouldUseFruitCollage,
} from '@/components/features/cocktail/CocktailBanner';
import { ingredientSummary } from '@/components/features/catalogue/CocktailCard';

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

const WIZARD_STEPS = [
  {
    step: 1,
    title: 'Entreprise & Cadre',
    shortTitle: 'Entreprise',
    subtitle: 'Coordonnées & date',
    icon: Building2,
  },
  {
    step: 2,
    title: 'Sélection des Jus',
    shortTitle: 'Catalogue',
    subtitle: 'Formats & remises',
    icon: GlassWater,
  },
  {
    step: 3,
    title: 'Devis & Validation',
    shortTitle: 'Confirmation',
    subtitle: 'Récapitulatif final',
    icon: FileText,
  },
];

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

  // Catalogue cocktails & fruits
  const [catalogueCocktails, setCatalogueCocktails] = useState<Cocktail[]>([]);
  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [loadingCatalogue, setLoadingCatalogue] = useState(false);
  const [cocktailSearch, setCocktailSearch] = useState('');

  // Per-card container selection: Record<cocktailId, '500ml' | '1L'>
  const [cardVolumes, setCardVolumes] = useState<Record<string, '500ml' | '1L'>>({});

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
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<number>(1);
  const [touchedStep1, setTouchedStep1] = useState(false);

  // Load pricing settings, cocktails & fruits
  useEffect(() => {
    getFysEventPricingSettings().then(setPricingSettings).catch(console.error);

    setLoadingCatalogue(true);
    Promise.all([getPublicCocktails(), getFruits()])
      .then(([cocktails, loadedFruits]) => {
        setCatalogueCocktails(cocktails);
        setFruits(loadedFruits);
      })
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
  // selectedBottles keys: `${cocktailId}` only — volume comes from cardVolumes
  const juiceItems: FysEventJuiceItem[] = useMemo(() => {
    const items: FysEventJuiceItem[] = [];
    for (const [cocktailId, qty] of Object.entries(selectedBottles)) {
      if (qty <= 0) continue;
      const cocktail = catalogueCocktails.find((c) => c.id === cocktailId);
      if (!cocktail) continue;
      const volume: '500ml' | '1L' = cardVolumes[cocktailId] || '500ml';
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
  }, [selectedBottles, cardVolumes, catalogueCocktails]);

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

  // Quantity helpers — key is just cocktailId (volume lives in cardVolumes)
  const handleQuantityChange = (cocktailId: string, delta: number) => {
    const current = selectedBottles[cocktailId] || 0;
    const next = Math.max(0, current + delta);
    setSelectedBottles((prev) => ({
      ...prev,
      [cocktailId]: next,
    }));
  };

  const setExplicitQuantity = (cocktailId: string, qty: number) => {
    setSelectedBottles((prev) => ({
      ...prev,
      [cocktailId]: Math.max(0, qty),
    }));
  };

  const setCardVolume = (cocktailId: string, volume: '500ml' | '1L') => {
    setCardVolumes((prev) => ({ ...prev, [cocktailId]: volume }));
  };

  // Step 1 Validation logic
  const isStep1Valid = useMemo(() => {
    const hasCompany = companyName.trim().length >= 2;
    const hasTitle = eventTitle.trim().length >= 2;
    const hasDate = Boolean(eventDate);
    const hasLocation = location.trim().length >= 3;
    const hasContact = contactPerson.trim().length >= 2;
    const hasPhone = contactPhone.trim().length >= 6;
    const hasCustomType = eventType !== 'autre' || customEventType.trim().length >= 2;
    return Boolean(
      hasCompany &&
      hasTitle &&
      hasDate &&
      hasLocation &&
      hasContact &&
      hasPhone &&
      hasCustomType
    );
  }, [
    companyName,
    eventTitle,
    eventDate,
    location,
    contactPerson,
    contactPhone,
    eventType,
    customEventType,
  ]);

  // Step 2 Validation logic (at least 1 juice bottle selected)
  const isStep2Valid = useMemo(() => {
    return financials.totalBottles > 0;
  }, [financials.totalBottles]);

  const handleValidateAndProceedStep1 = () => {
    setTouchedStep1(true);
    if (!isStep1Valid) {
      const missing: string[] = [];
      if (companyName.trim().length < 2) missing.push('Entreprise / Organisation');
      if (eventTitle.trim().length < 2) missing.push('Titre de l’événement');
      if (!eventDate) missing.push('Date de l’événement');
      if (location.trim().length < 3) missing.push('Lieu ou adresse exacte');
      if (contactPerson.trim().length < 2) missing.push('Nom du contact');
      if (contactPhone.trim().length < 6) missing.push('Téléphone direct');
      if (eventType === 'autre' && customEventType.trim().length < 2) missing.push('Précision du type d’événement');

      setSubmitError(`Veuillez renseigner les champs obligatoires suivants : ${missing.join(', ')}.`);
      return;
    }
    setSubmitError(null);
    setMaxUnlockedStep((prev) => Math.max(prev, 2));
    setWizardStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleValidateAndProceedStep2 = () => {
    if (!isStep2Valid) {
      setSubmitError('Veuillez sélectionner au moins une bouteille de jus dans le catalogue pour votre événement.');
      return;
    }
    setSubmitError(null);
    setMaxUnlockedStep((prev) => Math.max(prev, 3));
    setWizardStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === wizardStep) return;
    if (targetStep <= maxUnlockedStep) {
      setSubmitError(null);
      setWizardStep(targetStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Prompt validation for current step to provide clear user feedback
      if (wizardStep === 1) handleValidateAndProceedStep1();
      else if (wizardStep === 2) handleValidateAndProceedStep2();
    }
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
        customEventType: eventType === 'autre' ? (customEventType.trim() || '') : '',
        eventTitle: eventTitle.trim(),
        eventDate,
        deliveryTime: deliveryTime.trim() || '',
        location: location.trim(),
        contactPerson: contactPerson.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim() || user.email || '',
        guestCount: Number(guestCount) || 1,
        items: juiceItems,
        totalBottles: financials.totalBottles,
        totalLiters: financials.totalLiters,
        rawJuiceTotal: financials.rawJuiceTotal,
        discountPercent: financials.discountPercent,
        discountAmount: financials.discountAmount,
        totalAmount: financials.rawJuiceTotal - financials.discountAmount,
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
                      {selectedEvent.totalBottles} bouteille{selectedEvent.totalBottles > 1 ? 's' : ''}
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
                          {item.quantity} bouteille{item.quantity > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs font-semibold text-muted-foreground">
                          {item.totalPrice.toLocaleString()} XAF
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Past Event Logistics & Equipment (safe optional rendering) */}
              {selectedEvent.logistics && (selectedEvent.logistics.needCoolerBoxes || selectedEvent.logistics.needEcoCups || selectedEvent.logistics.needBartenderService || selectedEvent.logistics.notes) && (
                <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/70 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 pb-4 border-b border-border/50">
                    <Package className="size-5 text-primary" />
                    <h3 className="font-display font-bold text-lg text-foreground">
                      Logistique & Matériel Associé
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {selectedEvent.logistics.needCoolerBoxes && (
                      <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-1">
                        <span className="text-xs font-medium text-muted-foreground block">Glacières isothermes</span>
                        <span className="font-bold text-foreground text-sm">
                          {selectedEvent.logistics.coolerBoxesCount} glacière(s) ({((selectedEvent.logistics.coolerBoxFee) || 0).toLocaleString()} XAF)
                        </span>
                      </div>
                    )}

                    {selectedEvent.logistics.needEcoCups && (
                      <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-1">
                        <span className="text-xs font-medium text-muted-foreground block">Gobelets écologiques</span>
                        <span className="font-bold text-foreground text-sm">
                          {selectedEvent.logistics.ecoCupsCount} gobelets ({((selectedEvent.logistics.ecoCupsFee) || 0).toLocaleString()} XAF)
                        </span>
                      </div>
                    )}

                    {selectedEvent.logistics.needBartenderService && (
                      <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-1">
                        <span className="text-xs font-medium text-muted-foreground block">Service Barman FYS</span>
                        <span className="font-bold text-foreground text-sm">
                          {selectedEvent.logistics.bartenderHours}h sur site ({((selectedEvent.logistics.bartenderFee) || 0).toLocaleString()} XAF)
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedEvent.logistics.notes && (
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-xs">
                      <span className="font-semibold text-muted-foreground block mb-1">Consignes spécifiques :</span>
                      <p className="text-foreground italic">{selectedEvent.logistics.notes}</p>
                    </div>
                  )}
                </div>
              )}
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
                      {(selectedEvent.rawJuiceTotal || 0).toLocaleString()} XAF
                    </span>
                  </div>

                  {(selectedEvent.discountPercent || 0) > 0 ? (
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                      <span>Remise sur volume ({selectedEvent.discountPercent}%)</span>
                      <span>-{(selectedEvent.discountAmount || 0).toLocaleString()} XAF</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-muted-foreground text-xs">
                      <span>Remise sur volume</span>
                      <span>0%</span>
                    </div>
                  )}

                  {(selectedEvent.totalLogisticsFee ?? 0) > 0 && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Prestations & logistique</span>
                      <span className="font-medium text-foreground">
                        {(selectedEvent.totalLogisticsFee || 0).toLocaleString()} XAF
                      </span>
                    </div>
                  )}

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
      <div className="max-w-6xl mx-auto space-y-8 pb-36 sm:pb-24">
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
                            <span className="font-semibold text-foreground">{ev.totalBottles} bouteille{ev.totalBottles > 1 ? 's' : ''} ({ev.totalLiters.toFixed(1)}L)</span>
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
            {/* ── HIGH-END STEPPER COMPONENT ───────────────────────────── */}
            <div className="bg-card rounded-3xl p-4 sm:p-6 border border-border/70 shadow-xs space-y-4">
              {/* Mobile View: High clarity, zero truncation */}
              <div className="sm:hidden space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="size-8 rounded-xl bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                      {wizardStep}
                    </span>
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Étape {wizardStep} sur 3
                      </span>
                      <h4 className="text-sm font-extrabold text-foreground leading-tight truncate">
                        {WIZARD_STEPS[wizardStep - 1]?.title}
                      </h4>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 shrink-0">
                    {Math.round((wizardStep / 3) * 100)}%
                  </span>
                </div>

                {/* Animated Linear Progress Bar */}
                <div className="w-full bg-muted/70 h-2 rounded-full overflow-hidden relative shadow-inner">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(wizardStep / 3) * 100}%` }}
                  />
                </div>

                {/* Mobile 3-step Pills */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {WIZARD_STEPS.map((s) => {
                    const isCompleted = s.step < wizardStep;
                    const isCurrent = wizardStep === s.step;
                    const isUnlocked = s.step <= maxUnlockedStep;

                    return (
                      <button
                        key={s.step}
                        type="button"
                        disabled={!isUnlocked}
                        onClick={() => handleStepClick(s.step)}
                        className={cn(
                          "py-2 px-1 rounded-xl text-center flex flex-col items-center gap-1 transition-all select-none",
                          isCurrent && "bg-primary text-primary-foreground font-bold shadow-xs ring-2 ring-primary/20",
                          !isCurrent && isCompleted && "bg-primary/15 text-primary hover:bg-primary/25 cursor-pointer font-bold",
                          !isCurrent && !isCompleted && isUnlocked && "bg-muted text-foreground cursor-pointer font-medium",
                          !isUnlocked && "bg-muted/30 text-muted-foreground/40 cursor-not-allowed border border-border/20 opacity-60"
                        )}
                      >
                        <div className="flex items-center justify-center">
                          {isCompleted ? (
                            <Check className="size-3.5 text-primary" strokeWidth={3} />
                          ) : !isUnlocked ? (
                            <Lock className="size-3" />
                          ) : (
                            <span className="text-xs font-black">{s.step}</span>
                          )}
                        </div>
                        <span className="text-[10px] truncate max-w-full leading-none font-bold">
                          {s.shortTitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desktop Stepper: Connecting Track & Interactive Cards */}
              <div className="hidden sm:block">
                <div className="grid grid-cols-3 gap-3.5">
                  {WIZARD_STEPS.map((s) => {
                    const isCompleted = s.step < wizardStep;
                    const isCurrent = wizardStep === s.step;
                    const isUnlocked = s.step <= maxUnlockedStep;
                    const Icon = s.icon;

                    return (
                      <button
                        key={s.step}
                        type="button"
                        disabled={!isUnlocked}
                        onClick={() => handleStepClick(s.step)}
                        className={cn(
                          "group p-4 rounded-2xl text-left border transition-all relative overflow-hidden select-none",
                          isCurrent && "bg-primary/10 border-primary text-primary ring-2 ring-primary/25 shadow-xs",
                          !isCurrent && isCompleted && "bg-card border-primary/30 text-foreground hover:border-primary/60 cursor-pointer shadow-xs",
                          !isCurrent && !isCompleted && isUnlocked && "bg-card border-border/70 text-foreground hover:border-primary/40 cursor-pointer",
                          !isUnlocked && "bg-muted/20 border-border/30 text-muted-foreground/50 cursor-not-allowed opacity-60"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "size-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                              isCurrent && "bg-primary text-primary-foreground shadow-xs",
                              !isCurrent && isCompleted && "bg-primary/20 text-primary font-black",
                              !isCurrent && !isCompleted && isUnlocked && "bg-muted text-foreground",
                              !isUnlocked && "bg-muted/40 text-muted-foreground/50"
                            )}
                          >
                            {isCompleted ? (
                              <Check className="size-5 text-primary" strokeWidth={2.5} />
                            ) : !isUnlocked ? (
                              <Lock className="size-4 text-muted-foreground/60" />
                            ) : (
                              <Icon className="size-5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                Étape 0{s.step}
                              </span>
                              {isCompleted && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                                  Validé
                                </span>
                              )}
                              {!isUnlocked && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                                  Verrouillé
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-bold truncate text-foreground mt-0.5">
                              {s.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {s.subtitle}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {submitError && (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3 animate-in fade-in-50">
                <AlertCircle className="size-5 shrink-0" />
                <span className="font-semibold text-xs sm:text-sm">{submitError}</span>
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
                      className={cn(
                        "h-11 rounded-xl transition-all",
                        touchedStep1 && companyName.trim().length < 2 && "border-destructive bg-destructive/5 focus-visible:ring-destructive"
                      )}
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
                        className={cn(
                          "h-11 rounded-xl transition-all",
                          touchedStep1 && customEventType.trim().length < 2 && "border-destructive bg-destructive/5 focus-visible:ring-destructive"
                        )}
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
                      className={cn(
                        "h-11 rounded-xl transition-all",
                        touchedStep1 && eventTitle.trim().length < 2 && "border-destructive bg-destructive/5 focus-visible:ring-destructive"
                      )}
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
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className={cn(
                        "w-full h-11 rounded-xl px-3 border bg-background text-foreground text-sm transition-all outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                        touchedStep1 && !eventDate
                          ? "border-destructive bg-destructive/5 focus:ring-destructive"
                          : "border-input"
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Heure de livraison souhaitée sur site
                    </label>
                    <input
                      type="time"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      className="w-full h-11 rounded-xl px-3 border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
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
                      className={cn(
                        "h-11 rounded-xl transition-all",
                        touchedStep1 && location.trim().length < 3 && "border-destructive bg-destructive/5 focus-visible:ring-destructive"
                      )}
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
                        className={cn(
                          "h-11 rounded-xl transition-all",
                          touchedStep1 && contactPerson.trim().length < 2 && "border-destructive bg-destructive/5 focus-visible:ring-destructive"
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Téléphone direct *</label>
                      <Input
                        placeholder="Ex: +237 690 00 00 00"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className={cn(
                          "h-11 rounded-xl transition-all",
                          touchedStep1 && contactPhone.trim().length < 6 && "border-destructive bg-destructive/5 focus-visible:ring-destructive"
                        )}
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

                <div className="flex justify-end pt-4 border-t border-border/50">
                  <Button
                    onClick={handleValidateAndProceedStep1}
                    className="w-full sm:w-auto rounded-2xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-7 shadow-sm transition-all active:scale-98 cursor-pointer"
                  >
                    <span>Valider & Choisir les Jus</span>
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
                        {financials.totalBottles} bouteille{financials.totalBottles > 1 ? 's' : ''} sélectionnée{financials.totalBottles > 1 ? 's' : ''} ({financials.totalLiters.toFixed(1)} Litres)
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
                            {tier.minBottles}+ bouteilles
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
                      Ajoutez encore <strong className="text-foreground">{nextDiscountInfo.needed} bouteille{nextDiscountInfo.needed > 1 ? 's' : ''}</strong> pour débloquer la remise de <strong className="text-primary">{nextDiscountInfo.nextPercent}%</strong> !
                    </p>
                  )}
                </div>

                {/* Catalogue Grid */}
                <div className="space-y-5">
                  {/* Header + Search */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold font-display text-foreground">
                        2. Sélection des Recettes FYS
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Choisissez le contenant et la quantité pour chaque recette — pressées le jour J.
                      </p>
                    </div>
                    <div className="relative shrink-0 w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Rechercher une recette…"
                        value={cocktailSearch}
                        onChange={(e) => setCocktailSearch(e.target.value)}
                        className="pl-9 h-10 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  {loadingCatalogue ? (
                    <div className="py-12 text-center space-y-3">
                      <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-muted-foreground font-medium">Chargement du catalogue FYS...</p>
                    </div>
                  ) : catalogueCocktails.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      Aucune recette publique disponible dans le catalogue.
                    </div>
                  ) : (
                    (() => {
                      const filtered = cocktailSearch.trim()
                        ? catalogueCocktails.filter((c) =>
                            c.name.toLowerCase().includes(cocktailSearch.toLowerCase()) ||
                            (c.description || '').toLowerCase().includes(cocktailSearch.toLowerCase())
                          )
                        : catalogueCocktails;
                      return filtered.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground text-sm">
                          Aucune recette ne correspond à votre recherche.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                          {filtered.map((cocktail) => {
                            const currentQty = selectedBottles[cocktail.id] || 0;
                            const vol: '500ml' | '1L' = cardVolumes[cocktail.id] || '500ml';
                            const basePrice = cocktail.totalPrice || 1500;
                            const price500 = basePrice;
                            const price1L = Math.round(basePrice * 1.8);
                            const currentPrice = vol === '1L' ? price1L : price500;
                            const useCollage = shouldUseFruitCollage(cocktail);
                            const fruitVisuals = buildFruitVisuals(cocktail.ingredients || [], fruits);
                            const summary = ingredientSummary(cocktail, fruits);

                            return (
                              <div
                                key={cocktail.id}
                                className={cn(
                                  'rounded-[1.75rem] overflow-hidden border bg-card shadow-sm transition-all duration-300',
                                  currentQty > 0
                                    ? 'border-primary/70 shadow-md ring-2 ring-primary/15'
                                    : 'border-border/50 hover:-translate-y-1 hover:shadow-lg'
                                )}
                              >
                                {/* Image zone — exactly like CocktailCard */}
                                <div className="relative h-52 overflow-hidden">
                                  {useCollage && fruitVisuals.length > 0 ? (
                                    <CocktailBanner
                                      cocktailName={cocktail.name}
                                      fruits={fruitVisuals}
                                      showText={false}
                                      heightClass="h-full"
                                      className="absolute inset-0 scale-100 group-hover:scale-105 transition-transform duration-700 origin-center"
                                    />
                                  ) : cocktail.imageUrl ? (
                                    <div
                                      className="absolute inset-0 bg-cover bg-center scale-100 hover:scale-105 transition-transform duration-700"
                                      style={{ backgroundImage: `url('${cocktail.imageUrl}')` }}
                                    />
                                  ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/30 to-secondary/15 flex items-center justify-center">
                                      <GlassWater className="size-10 text-primary/40" />
                                    </div>
                                  )}

                                  {/* Gradient scrim */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent pointer-events-none" />

                                  {/* Tag pill */}
                                  {cocktail.tag && (
                                    <div className="absolute top-3 left-3 z-10 bg-secondary text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md">
                                      {cocktail.tag}
                                    </div>
                                  )}

                                  {/* Selected badge */}
                                  {currentQty > 0 && (
                                    <div className="absolute top-3 right-3 z-10 bg-primary text-primary-foreground text-[10px] font-black px-2.5 py-1 rounded-full shadow-md">
                                      {currentQty} bt.
                                    </div>
                                  )}

                                  {/* Ingredient count pill */}
                                  {(cocktail.ingredients || []).length > 0 && (
                                    <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
                                      <Flame className="size-3 text-secondary" />
                                      {(cocktail.ingredients || []).length} ingrédient{(cocktail.ingredients || []).length > 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>

                                {/* Info zone */}
                                <div className="px-4 pt-4 pb-4 space-y-4">
                                  {/* Name + summary */}
                                  <div className="space-y-0.5">
                                    <h4 className="font-display font-bold text-[1.05rem] text-[#F2694A] leading-tight line-clamp-1">
                                      {cocktail.name}
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground line-clamp-1 font-medium">
                                      {summary || cocktail.description || '—'}
                                    </p>
                                  </div>

                                  {/* Container selector (500ml / 1L) */}
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setCardVolume(cocktail.id, '500ml')}
                                      className={cn(
                                        'flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                                        vol === '500ml'
                                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                          : 'bg-muted/60 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground'
                                      )}
                                    >
                                      500ml
                                      <span className={cn('block text-[10px] font-semibold mt-0.5', vol === '500ml' ? 'text-primary-foreground/80' : 'text-muted-foreground/70')}>
                                        {price500.toLocaleString()} XAF
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCardVolume(cocktail.id, '1L')}
                                      className={cn(
                                        'flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                                        vol === '1L'
                                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                          : 'bg-muted/60 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground'
                                      )}
                                    >
                                      1 Litre
                                      <span className={cn('block text-[10px] font-semibold mt-0.5', vol === '1L' ? 'text-primary-foreground/80' : 'text-muted-foreground/70')}>
                                        {price1L.toLocaleString()} XAF
                                      </span>
                                    </button>
                                  </div>

                                  {/* Quantity stepper */}
                                  <div className="space-y-2 pt-1 border-t border-border/40">
                                    {/* +/- row */}
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleQuantityChange(cocktail.id, -1)}
                                        disabled={currentQty === 0}
                                        className="size-9 rounded-xl bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 disabled:opacity-30 cursor-pointer transition-colors shrink-0"
                                        title="Retirer 1"
                                      >
                                        <Minus className="size-4" />
                                      </button>
                                      <input
                                        type="number"
                                        min={0}
                                        value={currentQty}
                                        onChange={(e) => setExplicitQuantity(cocktail.id, parseInt(e.target.value) || 0)}
                                        className="w-10 h-8 text-center rounded-lg border border-input bg-background text-foreground text-xs font-bold outline-none focus:ring-2 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleQuantityChange(cocktail.id, 1)}
                                        className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 cursor-pointer transition-colors shrink-0"
                                        title="Ajouter 1"
                                      >
                                        <Plus className="size-4" />
                                      </button>
                                    </div>

                                    {/* Price row — with discount applied live */}
                                    {currentQty > 0 && (() => {
                                      const rawTotal = currentPrice * currentQty;
                                      const disc = financials.discountPercent;
                                      const discountedTotal = disc > 0 ? Math.round(rawTotal * (1 - disc / 100)) : rawTotal;
                                      return (
                                        <div className="text-center space-y-0.5">
                                          {disc > 0 && (
                                            <p className="text-[10px] text-muted-foreground line-through">
                                              {rawTotal.toLocaleString()} XAF
                                            </p>
                                          )}
                                          <p className="text-xs font-bold text-primary">
                                            {discountedTotal.toLocaleString()} XAF
                                            {disc > 0 && (
                                              <span className="ml-1 text-emerald-500 text-[10px]">-{disc}%</span>
                                            )}
                                          </p>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}

                  <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-6 border-t border-border/50">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSubmitError(null);
                        setWizardStep(1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full sm:w-auto rounded-2xl font-semibold cursor-pointer"
                    >
                      <ArrowLeft className="size-4 mr-2" />
                      Précédent : Entreprise & Cadre
                    </Button>
                    <Button
                      onClick={handleValidateAndProceedStep2}
                      className="w-full sm:w-auto rounded-2xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-7 shadow-sm transition-all active:scale-98 cursor-pointer"
                    >
                      <span>Récapitulatif & Devis ({financials.totalBottles} bouteille{financials.totalBottles > 1 ? 's' : ''})</span>
                      <ArrowRight className="size-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: RÉCAPITULATIF & CONFIRMATION */}
            {wizardStep === 3 && (
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
                        onClick={() => {
                          setWizardStep(1);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
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
                          Bouteilles Commandées ({financials.totalBottles})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setWizardStep(2);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
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

                      <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                        <span className="font-display font-extrabold text-base text-foreground">Total à régler</span>
                        <span className="font-display font-black text-2xl text-primary">
                          {financials.totalAmount.toLocaleString()} XAF
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
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

                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => {
                          setSubmitError(null);
                          setWizardStep(2);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full rounded-2xl font-semibold text-xs h-11 cursor-pointer"
                      >
                        <ArrowLeft className="size-3.5 mr-2" />
                        Modifier la sélection des jus
                      </Button>
                    </div>

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
