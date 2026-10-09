import { PageComponent, Link, useNavigate } from 'rasengan';
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublicCocktails } from '@/services/cocktail';
import { Plus, ArrowLeft, Sparkles, BookOpen, Star, Beaker, ArrowRight, CheckCircle2, GlassWater, Clock, MapPin, Users, Phone, Calendar, Download } from 'lucide-react';
import { submitTastingRSVP } from '@/services/tasting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TastingPage: PageComponent = () => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // Form state
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [guests, setGuests] = useState('1');
  const [preferences, setPreferences] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Success state
  const [ticketId, setTicketId] = useState<string | null>(null);

  const targetDate = useMemo(() => new Date('2026-10-18T15:00:00'), []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !whatsapp) return;
    
    setIsSubmitting(true);
    try {
      const id = await submitTastingRSVP({
        name,
        whatsapp,
        guests: parseInt(guests),
        preferences
      });
      setTicketId(id);
    } catch (error) {
      console.error(error);
      alert('Une erreur est survenue, veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDynamicMessage = () => {
    if (timeLeft.days > 7) return "Quelque chose de spécial se prépare...";
    if (timeLeft.days > 5) return "Les recettes prennent forme.";
    if (timeLeft.days > 3) return "Les bouteilles sont bientôt prêtes.";
    if (timeLeft.days > 0) return "Demain, on déguste.";
    return "Bienvenue à la dégustation FYS.";
  };

  const recipes = [
    { id: 1, name: 'Ananas · Papaye', desc: 'Douceur tropicale et vivacité', blurred: false },
    { id: 2, name: 'Bissap · Menthe', desc: "L'infusion rouge fraîche", blurred: false },
    { id: 3, name: 'Papaye · Orange', desc: 'Le soleil en bouteille', blurred: false },
    { id: 4, name: 'Bissap · Ananas', desc: "L'alliance parfaite acidulée", blurred: false },
    { id: 5, name: 'Ananas · Gingembre', desc: 'Le coup de fouet épicé', blurred: false },
    { id: 6, name: 'Création Mystère', desc: 'Une surprise sera révélée sur place', blurred: true },
  ];

  if (ticketId) {
    // Ticket numérique
    return (
      <div className="min-h-dvh bg-[#FAF9F6] text-[#2c3e32] flex flex-col items-center justify-center p-6 relative" style={{ fontFamily: 'var(--font-body)' }}>
        {/* Motif traditionnel discret */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3F6D4E 2px, transparent 2px)', backgroundSize: '30px 30px' }} />
        
        <div className="max-w-md w-full bg-white dark:bg-[#151916] rounded-3xl shadow-2xl overflow-hidden border border-[#3F6D4E]/20 z-10 animate-pop-in-cute">
          <div className="bg-[#3F6D4E] text-white p-8 text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-20">
               <Sparkles className="size-16" />
             </div>
             <h2 className="text-2xl font-bold font-display uppercase tracking-widest mb-1">Pass VIP</h2>
             <p className="text-[#AECBB2] font-medium">Dégustation Privée FYS</p>
          </div>
          
          <div className="p-8 flex flex-col items-center">
            <div className="w-40 h-40 bg-white dark:bg-[#151916] p-2 rounded-xl border border-gray-100 shadow-sm mb-6">
              {/* QR Code dynamique */}
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticketId}`} alt="QR Code" className="w-full h-full" />
            </div>
            
            <h3 className="text-2xl font-bold mb-2">{name}</h3>
            <p className="text-gray-500 mb-6 flex items-center gap-2"><Users className="size-4" /> {guests} personne(s)</p>
            
            <div className="w-full space-y-4 border-t border-gray-100 pt-6">
              <div className="flex items-start gap-3">
                <Calendar className="size-5 text-[#E0982E] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Dimanche 18 Octobre 2026</p>
                  <p className="text-sm text-gray-500">À partir de 15h00</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="size-5 text-[#E0982E] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Le lieu secret</p>
                  <p className="text-sm text-gray-500">Vous recevrez l'adresse exacte par WhatsApp.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-[#151916] p-6 flex flex-col gap-3">
             <Link to="/lab?mode=degustation" className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#E0982E] hover:bg-[#c48225] text-white h-14 font-bold shadow-md hover:shadow-lg transition-all animate-pulse hover:animate-none">
               <Sparkles className="size-5" /> Créer mon jus VIP (1000F)
             </Link>
             <a href="/degustation/Invitation FYS au tissu ndop indigo.png" download="Invitation_FYS_VIP.png" className="w-full block">
               <Button type="button" className="w-full rounded-xl bg-[#3F6D4E] hover:bg-[#3F6D4E]/90 text-white h-12 mt-2 pointer-events-none">
                 <Download className="mr-2 size-4" /> Télécharger l'invitation
               </Button>
             </a>
             <Link to="/" className="w-full flex justify-center py-2 text-[#3F6D4E] dark:text-[#88b698] font-semibold hover:underline">
               Retour à l'accueil
             </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#FAF9F6] dark:bg-[#0f1210] text-[#1a1f1b] dark:text-[#FAF9F6] overflow-x-hidden relative" style={{ fontFamily: 'var(--font-body)' }}>
      {/* ── Topbar discrète ── */}
      <div className="absolute top-0 left-0 w-full p-6 z-50 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-[#3F6D4E] dark:text-[#88b698] hover:text-[#2c3e32] dark:hover:text-[#a0cba0] transition-colors font-bold text-sm">
          <ArrowLeft className="size-4" /> Retour
        </Link>
        <img src="/logos/Logo_fys.png" alt="FYS" className="h-12 w-auto opacity-80 object-contain dark:hidden" />
        <img src="/logos/Logo_fys_creme.png" alt="FYS" className="h-12 w-auto opacity-90 object-contain hidden dark:block" />
      </div>

      {/* ── HERO SECTION ── */}
      <section className="relative w-full min-h-dvh flex flex-col justify-center items-center px-6 py-12 md:py-20 overflow-hidden text-center">
        {/* Subtle texture instead of heavy dots */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/degustation/Bouteille FYS, ananas et gingembre-1.png')" }} />
        <div className="absolute inset-0 bg-[#FAF9F6]/80 dark:bg-[#0f1210]/85 backdrop-blur-[2px]" />
        
        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center w-full">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#3F6D4E]/20 dark:border-[#88b698]/20 text-[#3F6D4E] dark:text-[#88b698] font-bold text-xs mb-8 bg-white dark:bg-[#151916]/50 shadow-sm">
            <Sparkles className="size-4 text-[#E0982E]" />
            Événement Exclusif
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-[#3F6D4E] dark:text-[#88b698] mb-6 leading-[1.1]" style={{ fontFamily: 'var(--font-display)' }}>
            Le goût de nos fruits.<br/>
            <span className="text-[#E0982E]">L'âme de notre terroir.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-xl mx-auto leading-relaxed">
            FYS présente une dégustation privée de créations pressées à froid. Une expérience intime autour des saveurs du Cameroun.
          </p>

          {/* Countdown */}
          <div className="flex gap-4 md:gap-6 mb-10 w-full justify-center">
            {[
              { label: 'Jours', value: timeLeft.days },
              { label: 'Heures', value: timeLeft.hours },
              { label: 'Minutes', value: timeLeft.minutes },
              { label: 'Secondes', value: timeLeft.seconds }
            ].map((unit, i) => (
              <div key={i} className="flex flex-col items-center p-3 md:p-4 rounded-2xl shadow-lg border border-white/20 min-w-[70px] md:min-w-[90px] relative overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/degustation/Texture verte forestière pour compte à rebours-2.png')" }} />
                <div className="absolute inset-0 bg-[#3F6D4E]/40 mix-blend-multiply" />
                <div className="relative z-10 text-3xl md:text-4xl font-black text-[#FAF9F6] dark:text-white font-display mb-1 drop-shadow-md">
                  {unit.value.toString().padStart(2, '0')}
                </div>
                <div className="relative z-10 text-[10px] md:text-xs uppercase tracking-widest text-[#E0982E] font-extrabold">{unit.label}</div>
              </div>
            ))}
          </div>

          <div className="w-full max-w-md mx-auto">
            <p className="text-[#E0982E] font-bold text-base mb-5 italic bg-[#E0982E]/10 py-2 rounded-full">"{getDynamicMessage()}"</p>
            <Button onClick={() => document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth' })} className="w-full h-14 rounded-2xl text-lg font-bold bg-[#3F6D4E] dark:bg-[#4a805a] hover:bg-[#2c3e32] dark:hover:bg-[#3F6D4E] text-white shadow-xl hover:-translate-y-1 transition-all">
              Réserver ma place (Places limitées)
            </Button>
          </div>
        </div>
      </section>

      {/* ── CONCEPT ── */}
      <div className="w-full overflow-hidden leading-none relative z-0">
        <svg viewBox="0 0 1440 120" className="w-full h-[50px] md:h-[100px] block" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,64L80,53.3C160,43,320,21,480,26.7C640,32,800,64,960,74.7C1120,85,1280,75,1360,69.3L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" className="fill-[#3F6D4E]/[0.05] dark:fill-[#88b698]/[0.05]"></path>
        </svg>
      </div>
      <section className="py-20 px-6 relative z-0 bg-[#3F6D4E]/[0.05] dark:bg-[#88b698]/[0.05]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-20">
          <div className="w-full md:w-1/2 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 bg-[#3F6D4E]/20 dark:bg-[#88b698]/20 mix-blend-overlay z-10" />
            <img src="/degustation/Découpe artisanale d’ananas et de papaye-3.png" alt="Préparation FYS" className="w-full h-full object-cover aspect-[4/5] md:aspect-square hover:scale-105 transition-transform duration-700" />
          </div>
          
          <div className="w-full md:w-1/2 flex flex-col gap-10">
            <div className="flex gap-6 items-start">
              <div className="size-14 shrink-0 rounded-2xl bg-white dark:bg-[#1a1f1b] shadow-md dark:shadow-none flex items-center justify-center border border-[#3F6D4E]/10 dark:border-[#88b698]/20">
                <Sparkles className="size-6 text-[#E0982E]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#3F6D4E] dark:text-[#88b698] mb-2 font-display">Découvrir</h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">Des associations inattendues de fruits locaux, cueillis à maturité pour révéler tout leur potentiel.</p>
              </div>
            </div>
            
            <div className="flex gap-6 items-start">
              <div className="size-14 shrink-0 rounded-2xl bg-white dark:bg-[#1a1f1b] shadow-md dark:shadow-none flex items-center justify-center border border-[#3F6D4E]/10 dark:border-[#88b698]/20">
                <GlassWater className="size-6 text-[#3F6D4E]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#3F6D4E] dark:text-[#88b698] mb-2 font-display">Déguster</h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">Une pureté absolue : zéro sucre ajouté, zéro pasteurisation. Juste le fruit, pressé à froid.</p>
              </div>
            </div>
            
            <div className="flex gap-6 items-start">
              <div className="size-14 shrink-0 rounded-2xl bg-white dark:bg-[#1a1f1b] shadow-md dark:shadow-none flex items-center justify-center border border-[#3F6D4E]/10 dark:border-[#88b698]/20">
                <Users className="size-6 text-[#F2694A]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#3F6D4E] dark:text-[#88b698] mb-2 font-display">Partager</h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">Une ambiance chaleureuse, des discussions passionnantes, l'esprit de l'hospitalité camerounaise.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="w-full overflow-hidden leading-none bg-[#3F6D4E]/[0.05] dark:bg-[#88b698]/[0.05] relative z-0">
        <svg viewBox="0 0 1440 120" className="w-full h-[50px] md:h-[100px] block" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,32L80,42.7C160,53,320,75,480,74.7C640,75,800,53,960,42.7C1120,32,1280,32,1360,32L1440,32L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" className="fill-[#FAF9F6] dark:fill-[#0f1210]"></path>
        </svg>
      </div>

      {/* ── RECIPES ── */}
      <section className="py-24 px-6 relative z-0">
        <div className="max-w-6xl mx-auto">
<div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-[#3F6D4E] dark:text-[#88b698] font-display mb-4">À la carte ce jour-là</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-12">Laissez-vous guider par nos classiques ou composez votre propre jus. Préparé sous vos yeux.</p>
          </div>
          
          <CataloguePreview />
        </div>
      </section>

      {/* ── RSVP FORM ── */}
      <section id="rsvp" className="py-24 px-6 relative z-10">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/degustation/Dégustation FYS ananas-gingembre-4.png')" }} />
        <div className="absolute inset-0 bg-[#1a1f1b]/80 backdrop-blur-sm" />
        
        <div className="max-w-2xl mx-auto bg-white dark:bg-[#151916]/95 dark:bg-[#1a1f1b]/95 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative z-10 border border-white/20">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#3F6D4E] dark:text-[#88b698] font-display mb-4">Rejoignez-nous</h2>
            <p className="text-gray-600 dark:text-gray-300 font-medium">Remplissez ce formulaire pour recevoir votre billet numérique VIP.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nom et Prénom *</label>
              <Input 
                required 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Paul Atangana"
                className="h-14 rounded-xl bg-gray-50 dark:bg-[#151916]/50 border-gray-200 focus:bg-white dark:bg-[#151916]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Numéro WhatsApp *</label>
              <Input 
                required 
                type="tel"
                value={whatsapp} 
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="Ex: +237 6XX XX XX XX"
                className="h-14 rounded-xl bg-gray-50 dark:bg-[#151916]/50 border-gray-200 focus:bg-white dark:bg-[#151916]"
              />
              <p className="text-xs text-gray-500 mt-2 font-medium">Nous l'utiliserons pour vous envoyer l'adresse secrète.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Personnes *</label>
                <select 
                  className="w-full h-14 rounded-xl border border-gray-200 bg-gray-50 dark:bg-[#151916]/50 focus:bg-white dark:bg-[#151916] px-4 text-sm font-medium"
                  value={guests}
                  onChange={e => setGuests(e.target.value)}
                >
                  <option value="1">1 personne</option>
                  <option value="2">2 personnes</option>
                  <option value="3">3 personnes</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Préférence ou Allergie (Optionnel)</label>
              <Input 
                value={preferences} 
                onChange={e => setPreferences(e.target.value)}
                placeholder="Ex: Pas de gingembre..."
                className="h-14 rounded-xl bg-gray-50 dark:bg-[#151916]/50 border-gray-200 focus:bg-white dark:bg-[#151916]"
              />
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full h-14 rounded-xl text-lg font-bold bg-[#E0982E] hover:bg-[#c48225] text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all mt-6"
            >
              {isSubmitting ? 'Enregistrement...' : 'Confirmer ma présence'}
            </Button>
          </form>
        </div>
      </section>
      
      {/* ── FOOTER ── */}
      <footer className="py-8 text-center text-white/60 bg-[#1a1f1b] relative z-10">
        <p className="text-sm font-medium">Des fruits d'ici, une expérience pensée pour vous.</p>
        <p className="text-xs mt-2">© 2026 FYS. Tous droits réservés.</p>
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
  const catalogList = (cocktails || []).filter(c => c.type === 'CATALOG' || c.type === 'catalog');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {/* 1. Carte Sur-Mesure (FYS Lab) */}
      <div className="group relative bg-card border border-border/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
        <div className="aspect-[4/5] bg-muted/30 relative overflow-hidden">
          <img 
            src="/degustation/Dégustation FYS ananas-gingembre-1.png" 
            alt="FYS Lab" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
          <div className="absolute top-4 left-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-md z-10 flex items-center gap-1.5">
            <Sparkles className="size-3.5" /> VIP
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 md:opacity-80 z-0" />
          
          <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
            <h3 className="text-white font-display font-bold text-xl md:text-2xl mb-1 drop-shadow-sm">Création Sur-Mesure</h3>
            <p className="text-white/80 text-sm line-clamp-2 leading-relaxed mb-4">
              Composez votre cocktail unique parmi notre sélection de fruits VIP. Préparé sous vos yeux.
            </p>
            
            <div className="flex items-center justify-between mt-auto">
              <span className="text-white font-bold text-sm bg-white dark:bg-[#151916]/20 backdrop-blur-md px-3 py-1 rounded-xl">
                1000 XAF
              </span>
              <Link to="/lab?mode=degustation" className="inline-block">
                <Button className="rounded-full size-10 p-0 bg-primary hover:bg-primary/90 text-white shadow-lg transition-transform hover:scale-105">
                  <Plus className="size-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Cocktails du Catalogue */}
      {catalogList.map((cocktail) => (
        <div key={cocktail.id} className="group relative bg-card border border-border/60 rounded-3xl overflow-hidden shadow-sm">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 md:opacity-80 z-0" />
            
            <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
              <h3 className="text-white font-display font-bold text-xl md:text-2xl mb-1 drop-shadow-sm">{cocktail.name}</h3>
              {cocktail.description && (
                <p className="text-white/80 text-sm line-clamp-2 leading-relaxed mb-4">
                  {cocktail.description}
                </p>
              )}
              
              <div className="flex items-center mt-auto">
                <span className="text-white font-bold text-sm bg-black/40 backdrop-blur-md px-3 py-1 rounded-xl border border-white/20">
                  1000 XAF
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TastingPage;
