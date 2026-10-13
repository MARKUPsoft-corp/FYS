import { PageComponent, Link, useNavigate } from 'rasengan';
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublicCocktails } from '@/services/cocktail';
import {
  Plus,
  ArrowLeft,
  Sparkles,
  ArrowRight,
  GlassWater,
  MapPin,
  Users,
  Calendar,
  Download,
  X,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import { submitTastingRSVP, trackInvitationDownload, trackTastingVisit } from '@/services/tasting';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AfricanCornerPattern } from '@/components/common/AfricanCornerPattern';

const TastingPage: PageComponent = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Form state
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [guests, setGuests] = useState('1');
  const [preferences, setPreferences] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingRSVP, setIsEditingRSVP] = useState(false);

  // Success & modal state
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolledPastHero(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const targetDate = useMemo(() => new Date('2026-10-18T15:00:00'), []);

  // Synchronisation avec localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTicket = localStorage.getItem('fys_tasting_rsvp_id');
      const savedName = localStorage.getItem('fys_tasting_rsvp_name');
      const savedPhone = localStorage.getItem('fys_tasting_rsvp_whatsapp');
      const savedGuests = localStorage.getItem('fys_tasting_rsvp_guests');
      const savedPreferences = localStorage.getItem('fys_tasting_rsvp_preferences');

      if (savedTicket) {
        setTicketId(savedTicket);
        if (savedName) setName(savedName);
        if (savedPhone) setWhatsapp(savedPhone);
        if (savedGuests) setGuests(savedGuests);
        if (savedPreferences) setPreferences(savedPreferences);
      } else if (user) {
        if (user.name) setName(user.name);
        if (user.phone) setWhatsapp(user.phone);
      }
    }
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  useEffect(() => {
    trackTastingVisit(
      user ? { uid: user.uid, name: user.name, phone: user.phone, email: user.email } : undefined,
    );
  }, [user?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !whatsapp.trim()) return;

    setIsSubmitting(true);
    try {
      const id = await submitTastingRSVP({
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        guests: parseInt(guests) || 1,
        preferences: preferences.trim(),
      });
      setTicketId(id);
      setIsEditingRSVP(false);
      setShowTicketModal(true);

      if (typeof window !== 'undefined') {
        localStorage.setItem('fys_tasting_rsvp_id', id);
        localStorage.setItem('fys_tasting_rsvp_name', name.trim());
        localStorage.setItem('fys_tasting_rsvp_whatsapp', whatsapp.trim());
        localStorage.setItem('fys_tasting_rsvp_guests', guests);
        localStorage.setItem('fys_tasting_rsvp_preferences', preferences.trim());
      }
    } catch (error) {
      console.error(error);
      alert('Une erreur est survenue, veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-dvh bg-[#FAF9F6] dark:bg-[#0a0e0b] text-[#1a1f1b] dark:text-[#F4F6F4] overflow-x-hidden relative transition-colors duration-300"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {/* ── Topbar discrète & accessible ── */}
      <div className="absolute top-0 left-0 w-full p-4 sm:p-6 z-50 flex justify-between items-center max-w-7xl mx-auto">
        <Link
          to="/"
          className="flex items-center gap-2 text-[#3F6D4E] dark:text-[#AECBB2] hover:text-[#2c3e32] dark:hover:text-white transition-colors font-bold text-xs sm:text-sm bg-white/70 dark:bg-black/40 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#3F6D4E]/20 dark:border-white/10 shadow-xs"
        >
          <ArrowLeft className="size-4" /> Accueil
        </Link>

        <div className="flex items-center gap-3">
          {ticketId ? (
            <Button
              type="button"
              onClick={() => setShowTicketModal(true)}
              size="sm"
              className="rounded-xl border border-[#E0982E]/50 text-[#E0982E] bg-[#E0982E]/10 hover:bg-[#E0982E]/20 dark:bg-[#E0982E]/20 text-xs font-bold gap-1.5 shadow-xs"
            >
              <Sparkles className="size-3.5" />
              Mon Pass VIP
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth' })}
              size="sm"
              className="rounded-xl bg-[#3F6D4E] hover:bg-[#2c3e32] text-white text-xs font-bold shadow-xs"
            >
              Obtenir mon Pass
            </Button>
          )}

          <img src="/logos/Logo_fys.png" alt="FYS" className="h-10 sm:h-12 w-auto opacity-80 object-contain dark:hidden" />
          <img src="/logos/Logo_fys_creme.png" alt="FYS" className="h-10 sm:h-12 w-auto opacity-90 object-contain hidden dark:block" />
        </div>
      </div>

      {/* ── HERO SECTION ── */}
      <section className="relative w-full min-h-dvh flex flex-col justify-center items-center px-6 py-20 md:py-28 overflow-hidden text-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/degustation/Bouteille FYS, ananas et gingembre-1.png')" }}
        />
        <div className="absolute inset-0 bg-white/75 dark:bg-[#0a0e0b]/85 backdrop-blur-[2px]" />

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center w-full pt-4 sm:pt-0">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#E0982E]/40 text-[#E0982E] font-extrabold text-xs mb-4 bg-[#E0982E]/10 dark:bg-[#E0982E]/15 backdrop-blur-md shadow-sm uppercase tracking-wider animate-pop-in-cute">
            <Sparkles className="size-4 text-[#E0982E] animate-pulse" />
            Événement Exclusif sur Invitation
          </div>

          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#3F6D4E] dark:text-[#AECBB2] mb-3 sm:mb-4 leading-tight font-display"
          >
            Dégustation Privée <span className="text-[#E0982E]">FYS</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-gray-700 dark:text-gray-200 mb-6 max-w-lg mx-auto leading-relaxed font-medium">
            FYS vous convie à une expérience intime et multisensorielle de créations pressées à froid le <strong className="text-[#E0982E] font-bold">Dimanche 18 Octobre 2026</strong> à Yaoundé.
          </p>

          {/* Countdown (Même style que dans la slide de la landing : fond net, chiffres verts contrastés) */}
          <div className="flex gap-2 sm:gap-3 md:gap-4 mb-6 w-full justify-center">
            {[
              { label: 'Jours', value: timeLeft.days },
              { label: 'Heures', value: timeLeft.hours },
              { label: 'Minutes', value: timeLeft.minutes },
              { label: 'Secondes', value: timeLeft.seconds },
            ].map((unit, i) => (
              <div
                key={i}
                className="flex flex-col items-center bg-white/80 dark:bg-black/60 backdrop-blur-md p-2.5 sm:p-3.5 md:p-4 rounded-2xl border border-[#3F6D4E]/20 dark:border-white/10 min-w-[64px] sm:min-w-[76px] md:min-w-[88px] shadow-md"
              >
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-[#3F6D4E] dark:text-[#AECBB2] font-display leading-none mb-1">
                  {unit.value.toString().padStart(2, '0')}
                </div>
                <div className="text-[9px] sm:text-[10px] md:text-xs font-bold text-[#E0982E] uppercase tracking-wider">
                  {unit.label}
                </div>
              </div>
            ))}
          </div>

          {/* Boutons d'action Hero raccourcis pour éviter tout débordement sur mobile */}
          <div className="w-full max-w-sm sm:max-w-md mx-auto space-y-2.5">
            <Link
              to="/lab?mode=degustation"
              className="w-full h-13 sm:h-14 px-4 rounded-2xl text-sm sm:text-base font-bold bg-[#E0982E] hover:bg-[#c48225] text-white shadow-xl hover:-translate-y-0.5 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="size-4.5 shrink-0" />
              <span className="truncate">Composer mon jus (1 000 F)</span>
            </Link>

            <Button
              type="button"
              onClick={() => {
                if (ticketId) {
                  setShowTicketModal(true);
                } else {
                  document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              variant="outline"
              className="w-full h-12 px-4 rounded-2xl text-sm sm:text-base font-bold border-2 border-[#3F6D4E] dark:border-[#88b698] text-[#3F6D4E] dark:text-[#88b698] hover:bg-[#3F6D4E]/10 dark:hover:bg-[#88b698]/10 transition-all flex items-center justify-center gap-2"
            >
              <Calendar className="size-4 text-[#E0982E] shrink-0" />
              <span className="truncate">{ticketId ? 'Voir mon Pass VIP' : 'Obtenir mon Pass VIP'}</span>
            </Button>
          </div>
        </div>
      </section>

      {/* ── CONCEPT / EXPERIENCE ── */}
      <div className="w-full overflow-hidden leading-none relative z-0">
        <svg viewBox="0 0 1440 120" className="w-full h-[50px] md:h-[100px] block" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,64L80,53.3C160,43,320,21,480,26.7C640,32,800,64,960,74.7C1120,85,1280,75,1360,69.3L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
            className="fill-[#3F6D4E]/[0.05] dark:fill-[#121813]"
          />
        </svg>
      </div>

      <section className="py-20 px-6 relative z-0 bg-[#3F6D4E]/[0.05] dark:bg-[#121813]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-20">
          <div className="w-full md:w-1/2 rounded-3xl overflow-hidden shadow-2xl relative border border-black/5 dark:border-white/10">
            <div className="absolute inset-0 bg-[#3F6D4E]/20 dark:bg-[#88b698]/10 mix-blend-overlay z-10" />
            <img
              src="/degustation/Découpe artisanale d’ananas et de papaye-3.png"
              alt="Préparation FYS"
              className="w-full h-full object-cover aspect-[4/5] md:aspect-square hover:scale-105 transition-transform duration-700"
            />
          </div>

          <div className="w-full md:w-1/2 flex flex-col gap-8">
            <div className="flex gap-5 items-start">
              <div className="size-14 shrink-0 rounded-2xl bg-white dark:bg-[#18211a] shadow-md dark:shadow-none flex items-center justify-center border border-[#3F6D4E]/10 dark:border-white/10">
                <Sparkles className="size-6 text-[#E0982E]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#3F6D4E] dark:text-[#AECBB2] mb-2 font-display">Découvrir</h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                  Des associations inattendues de fruits locaux, cueillis à maturité pour révéler tout leur potentiel.
                </p>
              </div>
            </div>

            <div className="flex gap-5 items-start">
              <div className="size-14 shrink-0 rounded-2xl bg-white dark:bg-[#18211a] shadow-md dark:shadow-none flex items-center justify-center border border-[#3F6D4E]/10 dark:border-white/10">
                <GlassWater className="size-6 text-[#3F6D4E] dark:text-[#88b698]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#3F6D4E] dark:text-[#AECBB2] mb-2 font-display">Déguster</h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                  Une pureté absolue : zéro sucre ajouté, zéro pasteurisation. Juste le fruit, pressé à froid.
                </p>
              </div>
            </div>

            <div className="flex gap-5 items-start">
              <div className="size-14 shrink-0 rounded-2xl bg-white dark:bg-[#18211a] shadow-md dark:shadow-none flex items-center justify-center border border-[#3F6D4E]/10 dark:border-white/10">
                <Users className="size-6 text-[#F2694A]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#3F6D4E] dark:text-[#AECBB2] mb-2 font-display">Partager</h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                  Une ambiance chaleureuse, des discussions passionnantes, l'esprit de l'hospitalité camerounaise.
                </p>
              </div>
            </div>

            {/* In-content VIP invitation banner */}
            <div className="p-5 rounded-2xl bg-[#E0982E]/10 dark:bg-[#E0982E]/15 border border-[#E0982E]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#E0982E]">Accès sur invitation</p>
                <p className="text-sm font-semibold text-foreground dark:text-white">
                  Téléchargez votre pass officiel pour entrer au lieu secret
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  if (ticketId) setShowTicketModal(true);
                  else document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="shrink-0 rounded-xl bg-[#E0982E] hover:bg-[#c48225] text-white text-xs font-bold h-10 px-4"
              >
                <Download className="size-3.5 mr-1.5" />
                {ticketId ? 'Mon Pass VIP' : 'Obtenir mon Pass'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full overflow-hidden leading-none bg-[#3F6D4E]/[0.05] dark:bg-[#121813] relative z-0">
        <svg viewBox="0 0 1440 120" className="w-full h-[50px] md:h-[100px] block" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,32L80,42.7C160,53,320,75,480,74.7C640,75,800,53,960,42.7C1120,32,1280,32,1360,32L1440,32L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
            className="fill-[#FAF9F6] dark:fill-[#0a0e0b]"
          />
        </svg>
      </div>

      {/* ── RECIPES & CATALOGUE ── */}
      <section className="py-24 px-6 relative z-0">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E0982E]/10 border border-[#E0982E]/30 text-[#E0982E] font-bold text-xs uppercase tracking-wider mb-3">
              <Sparkles className="size-3.5" /> Carte de l'événement
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-[#3F6D4E] dark:text-[#AECBB2] font-display mb-4">
              À la carte ce jour-là
            </h2>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Laissez-vous guider par nos classiques ou composez votre propre jus sur-mesure pour 1 000 FCFA. Préparé sous vos yeux lors de la dégustation.
            </p>
          </div>

          <CataloguePreview />

          {/* VIP Action Banner under Catalogue */}
          <div className="mt-14 p-6 md:p-8 rounded-[2.5rem] bg-gradient-to-r from-[#3F6D4E]/15 via-[#E0982E]/10 to-[#3F6D4E]/10 dark:from-[#141d16] dark:to-[#172019] border border-[#3F6D4E]/20 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-sm">
            <AfricanCornerPattern variant="seed-chevron" size="md" className="opacity-15" />
            <div className="space-y-2 relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E0982E]/15 text-[#E0982E] text-xs font-extrabold uppercase tracking-wider">
                <Sparkles className="size-3.5" /> Privilège Invité VIP
              </div>
              <h3 className="text-xl md:text-2xl font-bold font-display text-foreground dark:text-white">
                Votre cocktail sur-mesure préparé sous vos yeux
              </h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                En tant qu'invité de la dégustation privée, composez votre recette personnalisée à seulement 1 000 FCFA ou téléchargez votre invitation officielle pour le jour J.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
              <Link
                to="/lab?mode=degustation"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-[#E0982E] hover:bg-[#c48225] text-white font-bold text-xs sm:text-sm shadow-md transition-transform hover:-translate-y-0.5"
              >
                <Sparkles className="size-4" /> Composer mon jus VIP
              </Link>
              <Button
                type="button"
                onClick={() => {
                  if (ticketId) setShowTicketModal(true);
                  else document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth' });
                }}
                variant="outline"
                className="h-12 px-6 rounded-xl border border-[#3F6D4E] dark:border-[#88b698] text-[#3F6D4E] dark:text-[#88b698] font-bold text-xs sm:text-sm"
              >
                <Download className="size-4 mr-1.5" />
                {ticketId ? 'Télécharger mon Pass' : 'Réserver mon Pass'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── RSVP FORM / CONFIRMED PASS SECTION ── */}
      <section id="rsvp" className="py-24 px-6 relative z-10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/degustation/Dégustation FYS ananas-gingembre-4.png')" }}
        />
        <div className="absolute inset-0 bg-[#0a0e0b]/85 backdrop-blur-sm" />

        {ticketId && !isEditingRSVP ? (
          /* ── PASS VIP CONFIRMÉ (si déjà inscrit) ── */
          <div className="max-w-2xl mx-auto bg-white dark:bg-[#141a16] p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative z-10 border border-[#E0982E]/30 dark:border-white/10 overflow-hidden text-center">
            <AfricanCornerPattern variant="ndop-cross" size="lg" className="opacity-20" />
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-6 border border-emerald-500/30">
              <CheckCircle2 className="size-4" />
              Vous êtes bien inscrit(e) sur la liste VIP
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold text-[#3F6D4E] dark:text-[#AECBB2] font-display mb-2">
              Votre Pass Dégustation
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm max-w-md mx-auto mb-8 font-medium">
              Présentez ce QR Code ou l'invitation téléchargée à l'entrée de la dégustation le Dimanche 18 Octobre.
            </p>

            <div className="w-40 h-40 mx-auto bg-white p-2 rounded-2xl border border-gray-200 dark:border-white/10 shadow-md mb-6 flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${ticketId}`}
                alt="QR Code Pass VIP"
                className="w-full h-full object-contain"
              />
            </div>

            <h3 className="text-2xl font-bold text-foreground dark:text-white mb-1 font-display">{name}</h3>
            <p className="text-sm font-semibold text-muted-foreground mb-6 flex items-center justify-center gap-2">
              <Users className="size-4 text-[#E0982E]" /> {guests} personne(s)
            </p>

            <div className="max-w-md mx-auto space-y-3.5 border-t border-border/40 pt-6 text-left text-xs mb-8">
              <div className="flex items-start gap-3">
                <Calendar className="size-4.5 text-[#E0982E] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-foreground dark:text-white">Dimanche 18 Octobre 2026</p>
                  <p className="text-muted-foreground">À partir de 15h00</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="size-4.5 text-[#E0982E] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-foreground dark:text-white">Lieu secret (Yaoundé)</p>
                  <p className="text-muted-foreground">L'adresse exacte vous sera envoyée par WhatsApp.</p>
                </div>
              </div>
            </div>

            <div className="max-w-md mx-auto space-y-3">
              <a
                href="/degustation/Invitation FYS au tissu ndop indigo.png"
                download="Invitation_FYS_VIP.png"
                onClick={() => trackInvitationDownload(ticketId, whatsapp)}
                className="w-full block"
              >
                <Button className="w-full h-13 rounded-2xl bg-[#3F6D4E] hover:bg-[#2c3e32] text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2">
                  <Download className="size-4.5 shrink-0" />
                  <span>Télécharger mon Pass VIP</span>
                </Button>
              </a>

              <Link
                to="/lab?mode=degustation"
                className="w-full h-12 rounded-2xl bg-[#E0982E] hover:bg-[#c48225] text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2"
              >
                <Sparkles className="size-4 shrink-0" />
                <span>Composer mon jus (1 000 F)</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsEditingRSVP(true)}
                className="w-full py-2 text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5"
              >
                <Pencil className="size-3.5 shrink-0" />
                <span>Modifier mes coordonnées</span>
              </button>
            </div>
          </div>
        ) : (
          /* ── FORMULAIRE D'INSCRIPTION ── */
          <div className="max-w-2xl mx-auto bg-white dark:bg-[#141a16] p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative z-10 border border-white/20 dark:border-white/10 overflow-hidden">
            <AfricanCornerPattern variant="totem-seal" size="lg" className="opacity-15" />
            <div className="text-center mb-10 relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E0982E]/10 border border-[#E0982E]/30 text-[#E0982E] font-bold text-xs uppercase tracking-wider mb-3">
                <Sparkles className="size-3.5" /> Inscription VIP
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#3F6D4E] dark:text-[#AECBB2] font-display mb-3">
                Rejoignez la Dégustation Privée
              </h2>
              <p className="text-gray-600 dark:text-gray-300 font-medium text-sm sm:text-base leading-relaxed">
                Remplissez ce formulaire pour recevoir votre billet numérique VIP et l'adresse secrète.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                  Nom et Prénom *
                </label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Paul Atangana"
                  className="h-14 rounded-xl bg-gray-50 dark:bg-[#18221b] border-gray-200 dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground focus:bg-white dark:focus:bg-[#141a16]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                  Numéro WhatsApp *
                </label>
                <Input
                  required
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ex: +237 6XX XX XX XX"
                  className="h-14 rounded-xl bg-gray-50 dark:bg-[#18221b] border-gray-200 dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground focus:bg-white dark:focus:bg-[#141a16]"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                  Nous l'utiliserons pour vous envoyer l'adresse secrète.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                    Nombre de personnes *
                  </label>
                  <select
                    className="w-full h-14 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#18221b] text-foreground dark:text-white px-4 text-sm font-medium focus:outline-none"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                  >
                    <option value="1">1 personne (moi seul)</option>
                    <option value="2">2 personnes (avec accompagnateur)</option>
                    <option value="3">3 personnes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                  Préférence ou Allergie (Optionnel)
                </label>
                <Input
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  placeholder="Ex: Pas de gingembre..."
                  className="h-14 rounded-xl bg-gray-50 dark:bg-[#18221b] border-gray-200 dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground focus:bg-white dark:focus:bg-[#141a16]"
                />
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-13 rounded-xl text-base font-bold bg-[#E0982E] hover:bg-[#c48225] text-white shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Obtenir mon Pass VIP'}
                </Button>

                {ticketId && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditingRSVP(false)}
                    className="w-full text-xs text-muted-foreground"
                  >
                    Annuler la modification et voir mon Pass
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}
      </section>

      {/* ── FLOATING PASS PILL (apparaît au défilement) ── */}
      {scrolledPastHero && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-md w-[92%] sm:w-auto bg-[#141a16]/95 text-white backdrop-blur-md border border-[#E0982E]/40 px-4 sm:px-5 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 sm:gap-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <p className="text-xs font-bold truncate">
              {ticketId ? `Pass VIP (${name || 'Invité'})` : 'Dégustation Privée 18 Octobre'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {ticketId ? (
              <>
                <a
                  href="/degustation/Invitation FYS au tissu ndop indigo.png"
                  download="Invitation_FYS_VIP.png"
                  onClick={() => trackInvitationDownload(ticketId, whatsapp)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E0982E] hover:bg-[#c48225] text-white text-xs font-bold shadow-xs transition-all"
                >
                  <Download className="size-3.5" /> Télécharger
                </a>
                <button
                  type="button"
                  onClick={() => setShowTicketModal(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
                >
                  Voir Pass
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/lab?mode=degustation"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#E0982E] hover:bg-[#c48225] text-white text-xs font-bold"
                >
                  Composer
                </Link>
                <button
                  type="button"
                  onClick={() => document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-3 py-1.5 rounded-xl bg-[#3F6D4E] hover:bg-[#2c3e32] text-xs font-bold"
                >
                  Pass VIP
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL DIALOG PASS VIP ── */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white dark:bg-[#141a16] rounded-[2.5rem] shadow-2xl overflow-hidden border border-[#3F6D4E]/20 dark:border-white/10 relative animate-pop-in-cute">
            <AfricanCornerPattern variant="ndop-cross" size="lg" className="opacity-20" />
            <button
              type="button"
              onClick={() => setShowTicketModal(false)}
              className="absolute top-4 right-4 z-20 size-9 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors"
            >
              <X className="size-5" />
            </button>

            <div className="bg-[#3F6D4E] dark:bg-[#1c2c20] text-white p-7 text-center relative overflow-hidden">
              <Sparkles className="size-16 absolute -top-2 -right-2 opacity-15" />
              <h2 className="text-xl sm:text-2xl font-bold font-display uppercase tracking-widest mb-1 text-white">
                Pass VIP Officiel
              </h2>
              <p className="text-[#AECBB2] text-xs sm:text-sm font-semibold">
                Dégustation Privée FYS • 18 Octobre 2026
              </p>
            </div>

            <div className="p-7 flex flex-col items-center">
              <div className="w-36 h-36 bg-white p-2 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm mb-4 flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticketId || 'FYS-VIP'}`}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <h3 className="text-2xl font-bold font-display text-foreground dark:text-white mb-1 text-center">
                {name}
              </h3>
              <p className="text-xs font-bold text-muted-foreground mb-5 flex items-center gap-1.5">
                <Users className="size-3.5 text-[#E0982E]" /> {guests} personne(s)
              </p>

              <div className="w-full space-y-3.5 border-t border-border/40 pt-5 text-xs">
                <div className="flex items-start gap-3">
                  <Calendar className="size-4 text-[#E0982E] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-foreground dark:text-white">Dimanche 18 Octobre 2026</p>
                    <p className="text-muted-foreground">À partir de 15h00</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="size-4 text-[#E0982E] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-foreground dark:text-white">Lieu secret (Yaoundé)</p>
                    <p className="text-muted-foreground">L'adresse exacte vous sera transmise sur WhatsApp.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-[#0f1411] p-6 border-t border-border/40 flex flex-col gap-3">
              <a
                href="/degustation/Invitation FYS au tissu ndop indigo.png"
                download="Invitation_FYS_VIP.png"
                onClick={() => trackInvitationDownload(ticketId, whatsapp)}
                className="w-full block"
              >
                <Button className="w-full h-13 rounded-2xl bg-[#3F6D4E] hover:bg-[#2c3e32] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2">
                  <Download className="size-4.5 shrink-0" />
                  <span>Télécharger mon Pass VIP</span>
                </Button>
              </a>

              <Link
                to="/lab?mode=degustation"
                onClick={() => setShowTicketModal(false)}
                className="w-full h-12 rounded-2xl bg-[#E0982E] hover:bg-[#c48225] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <Sparkles className="size-4 shrink-0" />
                <span>Composer mon jus (1 000 F)</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowTicketModal(false)}
                className="w-full py-2 text-xs font-semibold text-muted-foreground hover:text-foreground text-center"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="py-10 text-center text-muted-foreground bg-[#FAF9F6] dark:bg-[#0a0e0b] border-t border-border/30 relative z-10 pb-24 sm:pb-12">
        <p className="text-sm font-medium">Des fruits d'ici, une expérience pensée pour vous.</p>
        <p className="text-xs mt-2 opacity-70">© 2026 FYS. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

function CataloguePreview() {
  const { data: cocktails, isLoading } = useQuery({
    queryKey: ['cocktails', 'public'],
    queryFn: getPublicCocktails,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Ensure we only show actual catalogue cocktails
  const catalogList = (cocktails || []).filter((c) => c.type === 'CATALOG' || c.type === 'catalog');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {/* 1. Carte Sur-Mesure (FYS Lab) */}
      <div className="group relative bg-card dark:bg-[#141a16] border border-border/60 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
        <AfricanCornerPattern variant="centre-sun" size="md" className="opacity-40 z-20 text-white" />
        <div className="aspect-[4/5] bg-muted/30 relative overflow-hidden">
          <img
            src="/degustation/Création sur-mesure, ananas et gingembre.png"
            alt="FYS Lab"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-4 left-4 bg-[#E0982E] text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow-md z-10 flex items-center gap-1.5">
            <Sparkles className="size-3.5" /> VIP Dégustation
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-75 md:opacity-85 z-0" />

          <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
            <h3 className="text-white font-display font-bold text-xl md:text-2xl mb-1 drop-shadow-sm">
              Création Sur-Mesure
            </h3>
            <p className="text-white/85 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-4">
              Composez votre cocktail unique parmi notre sélection de fruits VIP. Préparé sous vos yeux.
            </p>

            <div className="flex items-center justify-between mt-auto">
              <span className="text-white font-bold text-xs sm:text-sm bg-black/50 backdrop-blur-md px-3 py-1 rounded-xl border border-white/20">
                1 000 XAF
              </span>
              <Link to="/lab?mode=degustation" className="inline-block">
                <Button className="rounded-full size-11 p-0 bg-[#E0982E] hover:bg-[#c48225] text-white shadow-lg transition-transform hover:scale-105">
                  <Plus className="size-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Cocktails du Catalogue */}
      {catalogList.map((cocktail) => (
        <div
          key={cocktail.id}
          className="group relative bg-card dark:bg-[#141a16] border border-border/60 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
        >
          <div className="aspect-[4/5] bg-muted/30 relative overflow-hidden">
            {cocktail.imageUrl ? (
              <img src={cocktail.imageUrl} alt={cocktail.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-primary/5">
                <GlassWater className="size-16 mb-4 opacity-20" />
                <span className="text-sm font-medium">Classique FYS</span>
              </div>
            )}
            {cocktail.tag && (
              <div className="absolute top-4 left-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-md z-10">
                {cocktail.tag}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-75 md:opacity-85 z-0" />

            <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
              <h3 className="text-white font-display font-bold text-xl md:text-2xl mb-1 drop-shadow-sm">
                {cocktail.name}
              </h3>
              {cocktail.description && (
                <p className="text-white/85 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-4">
                  {cocktail.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-auto">
                <span className="text-white font-bold text-xs sm:text-sm bg-black/50 backdrop-blur-md px-3 py-1 rounded-xl border border-white/20">
                  1 000 XAF
                </span>
                <Link to={`/lab?mode=degustation&load=${cocktail.id}`} className="inline-block">
                  <Button className="rounded-full size-11 p-0 bg-primary hover:bg-primary/90 text-white shadow-lg transition-transform hover:scale-105">
                    <Plus className="size-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TastingPage;
