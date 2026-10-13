import { PageComponent, Link } from 'rasengan';
import { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Users,
  Download,
  GlassWater,
  Phone,
  MessageCircle,
  Clock,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Search,
  ExternalLink,
  Trash2,
  FileSpreadsheet,
  Copy,
  Check,
  TrendingUp,
  Eye,
  Filter,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AfricanCornerPattern } from '@/components/common/AfricanCornerPattern';
import {
  subscribeToTastingRSVPs,
  subscribeToTastingOrders,
  subscribeToTastingDownloads,
  subscribeToTastingVisits,
  updateRSVPStatus,
  deleteRSVP,
  type TastingRSVP,
  type TastingDownload,
  type TastingVisit,
} from '@/services/tasting';
import type { Order } from '@/entities';

type Tab = 'rsvps' | 'orders' | 'broadcast';

function formatDateTime(ts: any): string {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : null;
  if (!d) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function cleanPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('237')) return digits;
  if (digits.length === 9 && digits.startsWith('6')) return `237${digits}`;
  return digits;
}

const DegustationAdminPage: PageComponent = () => {
  const [activeTab, setActiveTab] = useState<Tab>('rsvps');
  const [rsvps, setRsvps] = useState<TastingRSVP[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [downloads, setDownloads] = useState<TastingDownload[]>([]);
  const [visits, setVisits] = useState<TastingVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'downloaded' | 'attended' | 'not_downloaded'>('all');

  // Copy feedback state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Compte à rebours
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const targetDate = useMemo(() => new Date('2026-10-18T15:00:00'), []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  // Souscriptions Firestore en direct
  useEffect(() => {
    setIsLoading(true);
    const unsubRsvps = subscribeToTastingRSVPs((data) => {
      setRsvps(data);
      setIsLoading(false);
    });
    const unsubOrders = subscribeToTastingOrders((data) => {
      setOrders(data);
    });
    const unsubDownloads = subscribeToTastingDownloads((data) => {
      setDownloads(data);
    });
    const unsubVisits = subscribeToTastingVisits((data) => {
      setVisits(data);
    });

    return () => {
      unsubRsvps();
      unsubOrders();
      unsubDownloads();
      unsubVisits();
    };
  }, []);

  // Statistiques calculées
  const totalGuests = useMemo(() => {
    return rsvps.reduce((sum, r) => sum + (r.guests || 1), 0);
  }, [rsvps]);

  const totalDownloaded = useMemo(() => {
    return rsvps.filter((r) => r.invitationDownloaded).length;
  }, [rsvps]);

  const totalAttended = useMemo(() => {
    return rsvps.filter((r) => r.status === 'attended').length;
  }, [rsvps]);

  const totalOrdersRevenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  }, [orders]);

  // Filtrage des participants
  const filteredRsvps = useMemo(() => {
    return rsvps.filter((r) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.whatsapp.toLowerCase().includes(q) ||
        (r.preferences && r.preferences.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filter === 'downloaded') return r.invitationDownloaded;
      if (filter === 'not_downloaded') return !r.invitationDownloaded;
      if (filter === 'attended') return r.status === 'attended';
      return true;
    });
  }, [rsvps, search, filter]);

  // Actions
  async function handleToggleStatus(rsvp: TastingRSVP) {
    const nextStatus = rsvp.status === 'attended' ? 'confirmed' : 'attended';
    await updateRSVPStatus(rsvp.id, nextStatus);
  }

  async function handleDelete(rsvpId: string, name: string) {
    if (confirm(`Voulez-vous vraiment supprimer l'inscription de ${name} ?`)) {
      await deleteRSVP(rsvpId);
    }
  }

  function handleExportCSV() {
    if (!rsvps.length) {
      alert('Aucune réservation à exporter.');
      return;
    }
    const headers = ['Nom', 'WhatsApp', 'Nombre d invités', 'Invitation Téléchargée', 'Statut', 'Préférences', 'Date d inscription'];
    const rows = rsvps.map((r) => [
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.whatsapp}"`,
      r.guests,
      r.invitationDownloaded ? 'OUI' : 'NON',
      r.status === 'attended' ? 'PRÉSENT' : 'CONFIRMÉ',
      `"${(r.preferences || '').replace(/"/g, '""')}"`,
      `"${formatDateTime(r.createdAt)}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FYS_Invites_Degustation_18_Octobre_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleCopyText(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  // Modèles de messages WhatsApp
  const broadcastTemplates = [
    {
      title: '1. Confirmation & Bienvenue VIP',
      desc: 'À envoyer juste après l’inscription pour rassurer le client et lui transmettre ses détails.',
      text: (name: string) =>
        `Bonjour ${name} ! 🌿\n\nC'est avec un grand plaisir que nous confirmons votre accès VIP à la Dégustation Privée FYS ce Dimanche 18 Octobre 2026 à partir de 15h00.\n\nVotre invitation exclusive a bien été réservée. Nous vous révélerons l'adresse exacte du lieu secret la veille de l'événement.\n\nÀ très vite pour une expérience de saveurs pures et vivantes ! 🍍🥭✨\n— L'équipe FYS`,
    },
    {
      title: '2. Révélation du Lieu Secret & Rappel (J-1)',
      desc: 'À envoyer le samedi 17 octobre pour indiquer le quartier exact et les consignes.',
      text: (name: string) =>
        `Bonjour ${name} ! ✨\n\nLe grand jour est presque arrivé ! La Dégustation Privée FYS se déroule demain, Dimanche 18 Octobre, dès 15h00.\n\n📍 LIEU DE LA DÉGUSTATION :\n[Indiquer l'adresse exacte / Repère Yaoundé]\n\nN'oubliez pas de présenter votre Pass VIP numérique sur votre téléphone à l'accueil.\n\nToute notre équipe vous attend avec des créations fruitées inédites ! 🍹🌿\n— FYS`,
    },
    {
      title: '3. Invitation à Composer son Jus VIP à 1000F',
      desc: 'Pour inciter les inscrits à préparer et commander leur propre recette avant d’arriver.',
      text: (name: string) =>
        `Bonjour ${name} ! 🍍\n\nSaviez-vous qu'en tant qu'invité VIP, vous pouvez composer votre jus sur-mesure au tarif exceptionnel de 1 000 XAF pour la dégustation ?\n\nComposez vos fruits préférés ici : https://fys-web.vercel.app/lab?mode=degustation\n\nVotre bouteille personnalisée sera préparée avec amour spécialement pour vous ! 🥂\n— FYS`,
    },
  ];

  return (
    <BoardPageShell
      eyebrow="ÉVÉNEMENT EXCLUSIF"
      titleBefore="Monitoring VIP"
      titleHighlight="Dégustation 18 Octobre"
      sectionBefore="Suivi des"
      sectionHighlight="Réservations & Pass"
      subtitle="Gestion en direct des inscriptions, téléchargements de cartons VIP, commandes de jus et pointage des présences."
      imageUrl="/degustation/Bouteille FYS, ananas et gingembre-1.png"
      actions={
        <div className="flex flex-wrap items-center gap-2.5 pb-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCSV}
            className="rounded-2xl border-border/60 bg-background/80 hover:bg-muted text-foreground text-xs font-bold gap-2 h-10 shadow-xs"
          >
            <FileSpreadsheet className="size-4 text-emerald-600" />
            Exporter CSV
          </Button>

          <Button
            asChild
            className="rounded-2xl bg-[#3F6D4E] hover:bg-[#2c3e32] text-white text-xs font-bold gap-2 h-10 shadow-md"
          >
            <Link to="/degustation-18-octobre" target="_blank">
              <ExternalLink className="size-4" />
              Page publique
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        {/* ── BANNIÈRE COMPTE À REBOURS ÉVÉNEMENT ── */}
        <div className="relative rounded-[2.5rem] bg-gradient-to-br from-[#3F6D4E] via-[#2c3e32] to-[#1f2c23] text-white p-6 md:p-8 shadow-xl overflow-hidden border border-white/10">
          <AfricanCornerPattern variant="ndop-cross" size="lg" className="opacity-20 text-white pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[#AECBB2] text-xs font-bold uppercase tracking-wider border border-white/15">
                <Sparkles className="size-3.5 text-[#E0982E]" />
                Dimanche 18 Octobre 2026 · 15h00
              </div>
              <h2 className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight">
                Dégustation Privée & Immersion Sensorielle FYS
              </h2>
              <p className="text-[#AECBB2] text-sm max-w-xl font-medium flex items-center gap-2">
                <MapPin className="size-4 text-[#E0982E] shrink-0" />
                Lieu secret révélé par WhatsApp aux détenteurs de Pass VIP.
              </p>
            </div>

            {/* Compteur interactif */}
            <div className="flex items-center gap-2 sm:gap-3 bg-black/25 backdrop-blur-md p-3 sm:p-4 rounded-3xl border border-white/10 self-start lg:self-auto">
              <div className="text-center px-3 py-1.5 bg-white/10 rounded-2xl min-w-[56px]">
                <span className="block font-display font-black text-2xl sm:text-3xl text-white tabular-nums">{timeLeft.days}</span>
                <span className="text-[10px] font-bold text-white/70 uppercase">Jours</span>
              </div>
              <span className="text-xl font-bold text-white/40">:</span>
              <div className="text-center px-3 py-1.5 bg-white/10 rounded-2xl min-w-[56px]">
                <span className="block font-display font-black text-2xl sm:text-3xl text-white tabular-nums">{timeLeft.hours}</span>
                <span className="text-[10px] font-bold text-white/70 uppercase">Heures</span>
              </div>
              <span className="text-xl font-bold text-white/40">:</span>
              <div className="text-center px-3 py-1.5 bg-white/10 rounded-2xl min-w-[56px]">
                <span className="block font-display font-black text-2xl sm:text-3xl text-white tabular-nums">{timeLeft.minutes}</span>
                <span className="text-[10px] font-bold text-white/70 uppercase">Min</span>
              </div>
              <span className="text-xl font-bold text-white/40">:</span>
              <div className="text-center px-3 py-1.5 bg-white/10 rounded-2xl min-w-[56px]">
                <span className="block font-display font-black text-2xl sm:text-3xl text-[#E0982E] tabular-nums">{timeLeft.seconds}</span>
                <span className="text-[10px] font-bold text-[#E0982E] uppercase">Sec</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI CARDS EN TEMPS RÉEL ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 md:gap-5">
          {/* 1. Personnes attendues */}
          <div className="bg-card rounded-[2rem] p-5 border border-border/40 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <AfricanCornerPattern variant="elan-chevrons" size="sm" className="opacity-15" />
            <div className="size-10 rounded-xl bg-violet-50 dark:bg-violet-950/30 text-violet-600 flex items-center justify-center mb-4">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Personnes attendues</p>
              <p className="font-display font-extrabold text-2xl md:text-3xl text-foreground mt-1 tabular-nums">
                {totalGuests}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{rsvps.length} pass émis</p>
            </div>
          </div>

          {/* 2. Invitations téléchargées */}
          <div className="bg-card rounded-[2rem] p-5 border border-border/40 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <AfricanCornerPattern variant="centre-sun" size="sm" className="opacity-15" />
            <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center mb-4">
              <Download className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Invitations téléchargées</p>
              <p className="font-display font-extrabold text-2xl md:text-3xl text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                {totalDownloaded}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rsvps.length > 0 ? `${Math.round((totalDownloaded / rsvps.length) * 100)}% des inscrits` : '0%'}
              </p>
            </div>
          </div>

          {/* 3. Présents pointés */}
          <div className="bg-card rounded-[2rem] p-5 border border-border/40 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <AfricanCornerPattern variant="totem-seal" size="sm" className="opacity-15" />
            <div className="size-10 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-sky-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Présences validées</p>
              <p className="font-display font-extrabold text-2xl md:text-3xl text-sky-600 dark:text-sky-400 mt-1 tabular-nums">
                {totalAttended}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{rsvps.length - totalAttended} en attente</p>
            </div>
          </div>

          {/* 4. Commandes de jus VIP */}
          <div className="bg-card rounded-[2rem] p-5 border border-border/40 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <AfricanCornerPattern variant="creation-pyramids" size="sm" className="opacity-15" />
            <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center mb-4">
              <GlassWater className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Jus VIP commandés</p>
              <p className="font-display font-extrabold text-2xl md:text-3xl text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                {orders.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Tarif dégustation (1000F)</p>
            </div>
          </div>

          {/* 5. Ventes dégustation */}
          <div className="bg-card rounded-[2rem] p-5 border border-border/40 shadow-xs relative overflow-hidden flex flex-col justify-between col-span-2 lg:col-span-1">
            <AfricanCornerPattern variant="ndop-cross" size="sm" className="opacity-15" />
            <div className="size-10 rounded-xl bg-[#E0982E]/15 text-[#E0982E] flex items-center justify-center mb-4">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Recettes Dégustation</p>
              <p className="font-display font-extrabold text-2xl text-foreground mt-1 tabular-nums">
                {totalOrdersRevenue.toLocaleString()} <span className="text-xs font-semibold text-muted-foreground">XAF</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{visits.length} consultations</p>
            </div>
          </div>
        </div>

        {/* ── ONGLETS DE GESTION ── */}
        <div className="bg-card rounded-[2rem] border border-border/40 shadow-sm overflow-hidden">
          {/* Navigation onglets */}
          <div className="flex items-center gap-2 p-2 border-b border-border/40 bg-muted/20 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('rsvps')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'rsvps'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Users className="size-4" />
              Invités & Réservations ({rsvps.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <ShoppingBag className="size-4" />
              Commandes Jus VIP ({orders.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('broadcast')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'broadcast'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <MessageCircle className="size-4" />
              Diffusion WhatsApp & Modèles
            </button>
          </div>

          {/* ━━ TAB 1 : INVITÉS & RÉSERVATIONS ━━ */}
          {activeTab === 'rsvps' && (
            <div className="p-4 sm:p-6 space-y-4">
              {/* Filtres & Recherche */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un invité, téléphone ou préférence..."
                    className="pl-10 rounded-xl bg-background border-border/50 text-xs h-10"
                  />
                </div>

                <div className="inline-flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 overflow-x-auto self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filter === 'all' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Tous ({rsvps.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('downloaded')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filter === 'downloaded' ? 'bg-background text-emerald-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Téléchargés ({totalDownloaded})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('attended')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filter === 'attended' ? 'bg-background text-sky-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Présents ({totalAttended})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('not_downloaded')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filter === 'not_downloaded' ? 'bg-background text-amber-600 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    En attente ({rsvps.length - totalDownloaded})
                  </button>
                </div>
              </div>

              {/* Table / Liste des participants */}
              {isLoading ? (
                <div className="py-16 text-center text-muted-foreground font-medium flex items-center justify-center gap-2">
                  <RefreshCw className="size-5 animate-spin text-primary" />
                  Chargement des inscriptions...
                </div>
              ) : filteredRsvps.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground font-medium">
                  {search ? 'Aucun invité ne correspond à cette recherche.' : 'Aucune réservation enregistrée pour le moment.'}
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {filteredRsvps.map((rsvp) => {
                    const cleanPhone = cleanPhoneForWhatsApp(rsvp.whatsapp);
                    const isAttended = rsvp.status === 'attended';
                    const isDownloaded = rsvp.invitationDownloaded;
                    const defaultWaMsg = encodeURIComponent(
                      `Bonjour ${rsvp.name} ! C'est l'équipe FYS pour la Dégustation Privée du 18 Octobre. Nous confirmons avec joie votre Pass VIP pour ${rsvp.guests} personne(s).`
                    );

                    return (
                      <div
                        key={rsvp.id}
                        className="py-4.5 px-3 sm:px-4 rounded-2xl hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* Infos Invité */}
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div className={`size-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isAttended
                              ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300'
                              : isDownloaded
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}>
                            {rsvp.name.slice(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-foreground text-sm sm:text-base">{rsvp.name}</h4>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border/40">
                                <Users className="size-3" />
                                {rsvp.guests} {rsvp.guests > 1 ? 'personnes' : 'personne'}
                              </span>

                              {isDownloaded ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  <Download className="size-3" />
                                  Carton téléchargé
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                  Carton non téléchargé
                                </span>
                              )}

                              {isAttended && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
                                  <CheckCircle2 className="size-3" />
                                  Présent
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                              <span>Inscrit le {formatDateTime(rsvp.createdAt)}</span>
                              {rsvp.downloadedAt && (
                                <span>· Téléchargé le {formatDateTime(rsvp.downloadedAt)}</span>
                              )}
                            </p>

                            {rsvp.preferences && (
                              <p className="text-xs text-[#E0982E] font-medium bg-[#E0982E]/10 px-2.5 py-1 rounded-lg inline-block mt-1">
                                💬 Note : {rsvp.preferences}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions Rapides Invité */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          {/* Bouton WhatsApp */}
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${defaultWaMsg}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs"
                            title="Ouvrir WhatsApp"
                          >
                            <MessageCircle className="size-3.5" />
                            <span>WhatsApp</span>
                          </a>

                          {/* Bouton Appel */}
                          <a
                            href={`tel:${rsvp.whatsapp}`}
                            className="inline-flex items-center justify-center size-9 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-all"
                            title="Appeler"
                          >
                            <Phone className="size-3.5" />
                          </a>

                          {/* Bouton Check-in Présence */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(rsvp)}
                            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isAttended
                                ? 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-300'
                                : 'bg-background hover:bg-muted border border-border/60 text-muted-foreground'
                            }`}
                          >
                            <CheckCircle2 className={`size-3.5 ${isAttended ? 'text-sky-600' : 'text-muted-foreground'}`} />
                            <span>{isAttended ? 'Présent' : 'Pointer'}</span>
                          </button>

                          {/* Bouton Supprimer */}
                          <button
                            type="button"
                            onClick={() => handleDelete(rsvp.id, rsvp.name)}
                            className="inline-flex items-center justify-center size-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Supprimer la réservation"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ━━ TAB 2 : COMMANDES JUS VIP ━━ */}
          {activeTab === 'orders' && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-foreground text-base">Commandes de jus spéciales Dégustation</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Commandes passées via le Lab en mode dégustation au tarif VIP de 1000 XAF.
                  </p>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  Total : {orders.length}
                </span>
              </div>

              {orders.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground font-medium">
                  Aucune commande de jus VIP passée pour le moment.
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {orders.map((order) => (
                    <div key={order.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground text-sm">{order.userNameSnapshot}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          🍹 {order.cocktailNameSnapshot} · {formatDateTime(order.createdAt)}
                        </p>
                        {order.userPhoneSnapshot && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="size-3" /> {order.userPhoneSnapshot}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-bold text-foreground text-base tabular-nums">
                          {order.totalPrice.toLocaleString()} XAF
                        </p>
                        <p className="text-[11px] text-muted-foreground">{order.quantity} bouteille(s)</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ━━ TAB 3 : DIFFUSION WHATSAPP ━━ */}
          {activeTab === 'broadcast' && (
            <div className="p-4 sm:p-6 space-y-6">
              <div>
                <h3 className="font-bold text-foreground text-lg">Modèles de messages prêts pour WhatsApp</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Copiez ou adaptez ces messages pour informer tous les inscrits sur WhatsApp en un clic.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {broadcastTemplates.map((template, idx) => {
                  const sampleText = template.text('[Nom de l’invité]');
                  const isCopied = copiedIndex === idx;

                  return (
                    <div
                      key={template.title}
                      className="bg-card rounded-2xl border border-border/50 p-5 flex flex-col justify-between space-y-4 shadow-xs"
                    >
                      <div className="space-y-2">
                        <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                          <MessageCircle className="size-4 text-emerald-600" />
                          {template.title}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{template.desc}</p>
                        <div className="bg-muted/40 p-3.5 rounded-xl border border-border/30 text-xs text-foreground/80 font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                          {sampleText}
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={() => handleCopyText(sampleText, idx)}
                        variant="outline"
                        className="w-full rounded-xl text-xs font-bold gap-2 border-border/60"
                      >
                        {isCopied ? (
                          <>
                            <Check className="size-4 text-emerald-600" />
                            Copié dans le presse-papier !
                          </>
                        ) : (
                          <>
                            <Copy className="size-4" />
                            Copier le modèle
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </BoardPageShell>
  );
};

DegustationAdminPage.metadata = {
  title: 'Monitoring Dégustation 18 Octobre — FYS Admin',
  description: 'Suivi des réservations et invitations de la dégustation privée FYS.',
  metaTags: [{ name: 'robots', content: 'noindex, nofollow' }],
};

export default DegustationAdminPage;
