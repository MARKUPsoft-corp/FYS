import { PageComponent, Link, useNavigate } from 'rasengan';
import { useEffect, useState, useRef, useMemo } from 'react';
import { ArrowRight, Sparkles, Leaf, Heart, ChevronLeft, ChevronRight, Play, CheckCircle2, Users, Zap, ShieldCheck, Sun, Moon, Plus, Mouse, ChevronDown, Menu, Phone, Mail, MapPin, Clock, Building2, GlassWater, Package, Globe } from 'lucide-react';
import { useTheme } from '@rasenganjs/theme';
import { useAuthStore } from '@/stores/auth';
import { useFruitsRealtime } from '@/hooks/useFruitsRealtime';
import { useTranslation } from 'react-i18next';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet';
import { isUsableFruit, type Fruit, COLLECTIONS } from '@/entities';
import { Button } from '@/components/ui/button';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useQuery } from '@tanstack/react-query';
import { getLandingImagesSettings, getPricingSettings } from '@/services/settings';
import { getPublicCocktails } from '@/services/cocktail';
import { CocktailType, type Cocktail } from '@/entities/cocktail';
import { DEFAULT_LANDING_IMAGES } from '@/entities';
import { FysSignatureSection } from '@/components/features/landing/FysSignatureSection';
import { AfricanCornerPattern } from '@/components/common/AfricanCornerPattern';
import { AfricanSectionBackground } from '@/components/common/AfricanSectionBackground';

/* ─────────────────────────────────────────────
   FYS Landing Page — Premium, Clean, Épurée
   Palette : Vert forêt #3F6D4E · Orange corail #F2694A · Doré #E0982E · Crème #FDFBF7 · Menthe #AECBB2
   ───────────────────────────────────────────── */

const RootIndex: PageComponent = () => {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();
  const { actualTheme, setTheme } = useTheme();
  const { fruits, isLoading: fruitsLoading } = useFruitsRealtime();
  const { t, i18n } = useTranslation();
  const [selectedFruit, setSelectedFruit] = useState<Fruit | null>(null);
  const [recipesCount, setRecipesCount] = useState<number | null>(null);
  const [stackedState, setStackedState] = useState<{ c0: boolean; c1: boolean; c0Deep: boolean }>({
    c0: false,
    c1: false,
    c0Deep: false,
  });
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [activeSection, setActiveSection] = useState('home');
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  
  // Countdown state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
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

  const nextSlide = () => setCurrentHeroSlide((prev) => (prev + 1) % 2);
  const prevSlide = () => setCurrentHeroSlide((prev) => (prev === 0 ? 1 : 0));

  useEffect(() => {
    const timer = setInterval(nextSlide, 8000);
    return () => clearInterval(timer);
  }, [currentHeroSlide]);


  const { data: catalogCocktails = [] } = useQuery({
    queryKey: ['catalog-cocktails', 'public'],
    queryFn: async () => {
      const cocktails = await getPublicCocktails();
      return cocktails.filter((c) => c.type === CocktailType.CATALOG);
    },
    staleTime: 1000 * 60 * 5,
  });

  // Suivi de la section active
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['how-it-works', 'features', 'events', 'nutrifys', 'about'];
      let current = 'home';
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight * 0.3 && rect.bottom > 0) {
            current = section;
          }
        }
      }
      setActiveSection(current);
    };
    handleScroll(); // Init
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Détection du chevauchement des cartes pour l'effet d'empilement diagonal et rebond
  useEffect(() => {
    let ticking = false;

    const updateStackState = () => {
      const card1 = cardRefs.current[1];
      const card2 = cardRefs.current[2];
      if (!card1 && !card2) {
        ticking = false;
        return;
      }

      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const stickyTop1 = 4.75 * rem + 44;
      const stickyTop2 = 4.75 * rem + 88;

      let c0 = false;
      let c1 = false;
      let c0Deep = false;

      if (card1) {
        const top1 = card1.getBoundingClientRect().top;
        // La carte 0 commence à s'incliner dès que la carte 1 arrive à proximité de son ancrage
        c0 = top1 <= stickyTop1 + 55;
      }

      if (card2) {
        const top2 = card2.getBoundingClientRect().top;
        // La carte 1 commence à s'incliner dès que la carte 2 arrive à proximité de son ancrage
        c1 = top2 <= stickyTop2 + 55;
        c0Deep = c1;
      }

      setStackedState((prev) => {
        if (prev.c0 === c0 && prev.c1 === c1 && prev.c0Deep === c0Deep) return prev;
        return { c0, c1, c0Deep };
      });

      ticking = false;
    };

    const onScrollOrResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateStackState);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    updateStackState();

    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-pop-in-cute');
            entry.target.classList.remove('opacity-0');
            // Optionnel : ne jouer l'animation qu'une seule fois
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    
    // On observe un léger délai après le montage initial pour s'assurer que le DOM est prêt
    const timeout = setTimeout(() => {
      document.querySelectorAll('.scroll-animate').forEach((el) => {
        observer.observe(el);
      });
    }, 100);
    
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [fruitsLoading]); // On relance quand les fruits ont fini de charger


  const { data: landingImages = DEFAULT_LANDING_IMAGES } = useQuery({
    queryKey: ['landing-images'],
    queryFn: getLandingImagesSettings,
  });

  const { data: pricing } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: getPricingSettings,
  });

  const isNoticeActive = pricing ? pricing.launchNoticeActive !== false : true;
  const launchNoticeContent = (i18n.language.startsWith('en') ? pricing?.launchNoticeTextEn : pricing?.launchNoticeText)
    || pricing?.launchNoticeText
    || t('landing.launchDeliveryNotice', 'Pour le mois de démarrage, les livraisons se feront après 24h');

  // Écoute en temps réel des recettes créées
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, COLLECTIONS.COCKTAILS), (snap) => {
      setRecipesCount(snap.size);
    });
    return () => unsubscribe();
  }, []);

  // Si l'utilisateur est déjà connecté, on le redirige directement vers le dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/board', { replace: true });
    }
  }, [loading, user, navigate]);

  // Pendant le chargement de l'état d'auth, on affiche un écran minimal
  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <img src="/logos/Logo_fys.png" alt="FYS" className="h-20 w-auto object-contain animate-pulse dark:hidden" />
          <img src="/logos/Logo_fys_creme.png" alt="FYS" className="h-20 w-auto object-contain animate-pulse hidden dark:block" />
      </div>
    );
  }

  // Si connecté, on ne rend rien (la redirection est en cours)
  if (user) return null;

  const toggleTheme = () => setTheme(actualTheme === 'dark' ? 'light' : 'dark');

  return (
    <div className="min-h-dvh bg-background text-foreground" style={{ fontFamily: 'var(--font-body)' }}>

      {/* ━━━ NAVBAR ━━━ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 lg:h-18 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity shrink-0">
            <img src="/logos/Logo_fys.png" alt="FYS" className="h-11 sm:h-12 lg:h-[3.25rem] w-auto object-contain dark:hidden" />
            <img src="/logos/Logo_fys_creme.png" alt="FYS" className="h-11 sm:h-12 lg:h-[3.25rem] w-auto object-contain hidden dark:block" />
          </Link>

          {/* Central Nav Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2 text-[13px] xl:text-sm font-medium">
            <a
              href="#how-it-works"
              className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                activeSection === 'how-it-works'
                  ? 'text-primary font-bold bg-primary/10'
                  : 'text-foreground/70 hover:text-foreground hover:bg-muted/40'
              }`}
            >
              {t('landing.nav.howItWorks')}
            </a>
            <a
              href="#features"
              className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                activeSection === 'features'
                  ? 'text-primary font-bold bg-primary/10'
                  : 'text-foreground/70 hover:text-foreground hover:bg-muted/40'
              }`}
            >
              {t('landing.nav.features')}
            </a>
            <a
              href="#events"
              className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                activeSection === 'events'
                  ? 'text-primary font-bold bg-primary/10'
                  : 'text-foreground/70 hover:text-foreground hover:bg-muted/40'
              }`}
            >
              {t('landing.nav.events')}
            </a>
            <a
              href="#nutrifys"
              className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                activeSection === 'nutrifys'
                  ? 'text-primary font-bold bg-primary/10'
                  : 'text-foreground/70 hover:text-foreground hover:bg-muted/40'
              }`}
            >
              {t('landing.nav.nutrifys')}
            </a>
            <a
              href="#about"
              className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                activeSection === 'about'
                  ? 'text-primary font-bold bg-primary/10'
                  : 'text-foreground/70 hover:text-foreground hover:bg-muted/40'
              }`}
            >
              {t('landing.nav.about')}
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Language Switcher */}
            <button
              onClick={() => i18n.changeLanguage(i18n.language?.startsWith('fr') ? 'en' : 'fr')}
              className="flex items-center gap-1.5 h-8.5 px-2.5 rounded-full border border-border/70 hover:bg-muted/50 text-xs font-bold text-foreground transition-all cursor-pointer"
              title={i18n.language?.startsWith('fr') ? 'Switch to English' : 'Passer en Français'}
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span className="uppercase">{i18n.language?.startsWith('fr') ? 'EN' : 'FR'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(actualTheme === 'dark' ? 'light' : 'dark')}
              className="size-8.5 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-all cursor-pointer"
              aria-label="Toggle theme"
            >
              {actualTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Subtle Divider */}
            <div className="hidden sm:block h-5 w-px bg-border/60 mx-0.5" />

            {/* ── Desktop CTA Buttons ── */}
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/auth/login"
                className="h-9 px-3.5 rounded-full text-xs lg:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all whitespace-nowrap flex items-center"
              >
                {t('landing.nav.signIn')}
              </Link>
              <Link
                to="/lab"
                className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-xs lg:text-sm font-bold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-sm whitespace-nowrap"
              >
                {t('landing.nav.getStarted')}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* ── Mobile / Tablet Hamburger Menu ── */}
            <div className="lg:hidden flex items-center">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="size-9 flex items-center justify-center text-foreground rounded-full hover:bg-muted/50 transition-all cursor-pointer" aria-label="Open menu">
                    <Menu className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85vw] sm:w-[400px] bg-background dark:bg-background/80 dark:backdrop-blur-[48px] dark:saturate-[180%] border-l border-border dark:border-white/10 p-6 flex flex-col gap-6 shadow-2xl">
                  <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
                  <div className="flex items-center gap-3 pt-4">
                    <img src="/logos/Logo_fys.png" alt="FYS Logo" className="h-12 w-auto object-contain dark:hidden" />
                    <img src="/logos/Logo_fys_creme.png" alt="FYS Logo" className="h-12 w-auto object-contain hidden dark:block" />
                  </div>
                  
                  <div className="flex flex-col gap-1 mt-6">
                    <SheetClose asChild>
                      <a href="#how-it-works" className={`text-lg font-medium px-4 py-3 rounded-xl transition-all ${activeSection === 'how-it-works' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'}`}>
                        {t('landing.nav.howItWorks')}
                      </a>
                    </SheetClose>

                    <SheetClose asChild>
                      <a href="#features" className={`text-lg font-medium px-4 py-3 rounded-xl transition-all ${activeSection === 'features' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'}`}>
                        {t('landing.nav.features')}
                      </a>
                    </SheetClose>

                    <SheetClose asChild>
                      <a href="#events" className={`text-lg font-medium px-4 py-3 rounded-xl transition-all ${activeSection === 'events' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'}`}>
                        {t('landing.nav.events')}
                      </a>
                    </SheetClose>

                    <SheetClose asChild>
                      <a href="#nutrifys" className={`text-lg font-medium px-4 py-3 rounded-xl transition-all ${activeSection === 'nutrifys' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'}`}>
                        {t('landing.nav.nutrifys')}
                      </a>
                    </SheetClose>
                    
                    <SheetClose asChild>
                      <a href="#about" className={`text-lg font-medium px-4 py-3 rounded-xl transition-all ${activeSection === 'about' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'}`}>
                        {t('landing.nav.about')}
                      </a>
                    </SheetClose>
                  </div>

                  {/* Mobile Language Switcher */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/50">
                    <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      {i18n.language?.startsWith('fr') ? 'Langue' : 'Language'}
                    </span>
                    <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border/60">
                      <button
                        onClick={() => i18n.changeLanguage('fr')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${i18n.language?.startsWith('fr') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                      >
                        FR
                      </button>
                      <button
                        onClick={() => i18n.changeLanguage('en')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${i18n.language?.startsWith('en') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                      >
                        EN
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-auto flex flex-col gap-4 pb-8">
                    <Link
                      to="/auth/login"
                      className="h-12 w-full rounded-full border-2 border-border/80 text-base font-bold flex items-center justify-center gap-2 hover:bg-muted/50 transition-all text-foreground"
                    >
                      {t('landing.nav.signIn')}
                    </Link>
                    <Link
                      to="/lab"
                      className="h-12 w-full rounded-full bg-primary text-primary-foreground text-base font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                      {t('landing.nav.startNow')}
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      
      
      {/* ━━━ HERO SLIDER ━━━ */}
      <section className="relative w-full h-dvh min-h-[500px] bg-card overflow-hidden border-b border-border/40 group">
        
        {/* Slide 1: EVENT */}
        <div className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out flex flex-col justify-center bg-[#FAF9F6] dark:bg-[#0c100d] ${currentHeroSlide === 0 ? 'opacity-100 z-20 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/degustation/Bouteille FYS, ananas et gingembre-1.png')" }} />
          <div className="absolute inset-0 bg-white/70 dark:bg-black/75 backdrop-blur-[2px]" />
          
          <div className="max-w-7xl mx-auto w-full px-6 md:px-12 lg:px-16 relative z-10 pt-16 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#E0982E]/40 text-[#E0982E] font-extrabold text-xs mb-5 md:mb-6 bg-[#E0982E]/10 dark:bg-[#E0982E]/15 backdrop-blur-md shadow-sm animate-pop-in-cute tracking-wide uppercase">
              <Sparkles className="size-4 text-[#E0982E] animate-pulse" />
              Événement Exclusif • Dégustation Privée
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#3F6D4E] dark:text-[#AECBB2] mb-4 md:mb-6 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Dégustation Privée <span className="text-[#E0982E]">FYS</span>
            </h1>
            
            <p className="text-base md:text-2xl text-gray-700 dark:text-gray-200 mb-8 max-w-2xl mx-auto leading-relaxed font-medium">
              Une dégustation privée exclusive de créations pressées à froid le <span className="text-[#E0982E] font-bold">Dimanche 18 Octobre 2026</span> à Yaoundé. Réservez votre place, obtenez votre pass VIP et créez votre jus d'exception.
            </p>

            {/* Countdown in Hero */}
            <div className="flex gap-3 md:gap-4 mb-8 justify-center w-full">
              {[
                { label: 'Jours', value: timeLeft.days },
                { label: 'Heures', value: timeLeft.hours },
                { label: 'Minutes', value: timeLeft.minutes },
                { label: 'Secondes', value: timeLeft.seconds }
              ].map((unit, i) => (
                <div key={i} className="flex flex-col items-center bg-white/70 dark:bg-black/60 backdrop-blur-md p-3 md:p-4 rounded-2xl border border-[#3F6D4E]/20 dark:border-white/10 min-w-[70px] md:min-w-[90px] shadow-sm">
                  <div className="text-3xl md:text-4xl font-black text-[#3F6D4E] dark:text-[#AECBB2] font-display leading-none mb-1">
                    {unit.value.toString().padStart(2, '0')}
                  </div>
                  <div className="text-[10px] md:text-xs font-bold text-[#E0982E] uppercase">{unit.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/degustation-18-octobre" className="h-13 sm:h-14 px-6 sm:px-8 rounded-2xl text-sm sm:text-base md:text-lg font-bold bg-[#3F6D4E] hover:bg-[#2c3e32] text-white shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2.5">
                <Sparkles className="size-4.5 sm:size-5 text-[#E0982E] shrink-0" />
                <span>Accéder à la Dégustation Privée</span>
                <ArrowRight className="size-4.5 sm:size-5 shrink-0" />
              </Link>
            </div>
          </div>
        </div>

        {/* Slide 2: STANDARD HERO */}
        <div className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out flex flex-col justify-center ${currentHeroSlide === 1 ? 'opacity-100 z-20 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent opacity-50 pointer-events-none" />
          
          {/* Subtle Background Image */}
          <div 
            className="absolute right-0 top-0 w-full lg:w-2/3 h-full bg-cover bg-center pointer-events-none opacity-[0.25] dark:opacity-[0.10] transition-opacity"
            style={{ 
              backgroundImage: `url('${landingImages.hero}')`,
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 60%)',
              maskImage: 'linear-gradient(to right, transparent, black 60%)' 
            }} 
          />

          {/* African Cultural Watermark Overlay in Hero */}
          <AfricanSectionBackground pattern="ndop" color="forest" opacityClass="opacity-[0.035] dark:opacity-[0.05]" glowColor="terracotta" />

          {/* Mobile contrast overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-card/90 via-card/50 to-card/90 lg:hidden pointer-events-none" />

          <div className="max-w-7xl mx-auto w-full px-6 md:px-12 lg:px-16 relative z-10 pt-16">
            <div className="w-full max-w-2xl space-y-6 text-center lg:text-left mx-auto lg:mx-0">
              {/* Launch delivery notice pill */}
              {isNoticeActive && (
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs sm:text-sm font-semibold shadow-xs">
                  <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{launchNoticeContent}</span>
                </div>
              )}

              <h1 className="text-[2.2rem] md:text-[3rem] lg:text-[3.8rem] font-extrabold leading-[1.1] tracking-tight text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                {t('landing.hero.title1')} <br className="hidden md:block"/>
                <span className="text-primary brightness-110 dark:brightness-125">{t('landing.hero.titleHighlight')}</span>
                {t('landing.hero.title2')}
              </h1>

              <p className="text-sm font-bold uppercase tracking-wider text-secondary">
                {t('landing.hero.badge')}
              </p>

              <p className="text-base md:text-lg text-foreground/90 dark:text-foreground/80 leading-relaxed max-w-lg mx-auto lg:mx-0 font-medium">
                {t('landing.hero.subtitle')}
              </p>

              <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start pt-4">
                <Link
                  to="/lab"
                  className="h-12 px-7 rounded-full text-sm font-bold flex items-center gap-2.5 active:scale-[0.97] transition-all shadow-md bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5"
                >
                  {t('landing.hero.ctaPrimary')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/lab?tab=nutrifys"
                  className="h-12 px-7 rounded-full text-sm font-bold flex items-center gap-2.5 active:scale-[0.97] transition-all bg-background border border-border/80 hover:bg-muted/50 text-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <Sparkles className="w-4 h-4 text-secondary" />
                  {t('landing.nutrifys.cta')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Slider Controls & Arrows */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-6 z-40 bg-background/30 dark:bg-background/50 backdrop-blur-md px-4 py-2.5 rounded-full border border-border/30 shadow-sm">
          <button onClick={prevSlide} className="p-1.5 rounded-full hover:bg-background/80 text-foreground transition-all" aria-label="Précédent">
            <ChevronLeft className="size-5" />
          </button>

          <div className="flex gap-3 items-center">
            <button 
              onClick={() => setCurrentHeroSlide(0)} 
              className={`w-2.5 h-2.5 rounded-full transition-all ${currentHeroSlide === 0 ? 'bg-[#3F6D4E] w-6' : 'bg-[#3F6D4E]/30 dark:bg-white/30 hover:bg-[#3F6D4E]/50'}`}
              aria-label="Slide Événement"
            />
            <button 
              onClick={() => setCurrentHeroSlide(1)} 
              className={`w-2.5 h-2.5 rounded-full transition-all ${currentHeroSlide === 1 ? 'bg-primary w-6' : 'bg-primary/30 dark:bg-white/30 hover:bg-primary/50'}`}
              aria-label="Slide Bar à jus"
            />
          </div>

          <button onClick={nextSlide} className="p-1.5 rounded-full hover:bg-background/80 text-foreground transition-all" aria-label="Suivant">
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-0 animate-fade-in hover:opacity-100 transition-opacity cursor-pointer z-30" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} style={{ animationDelay: '800ms' }}>
          <Mouse className="w-5 h-5 text-foreground animate-bounce" />
          <ChevronDown className="w-4 h-4 text-foreground/70 -mt-2 animate-pulse" />
        </div>
      </section>
{/* ━━━ STATS BAR ━━━ */}
      <section className="py-12 md:py-16 px-5 md:px-8 relative z-10 overflow-hidden">
        <AfricanSectionBackground pattern="grassfields-chevrons" color="forest" opacityClass="opacity-[0.035] dark:opacity-[0.05]" glowColor="forest" />
        <div className="max-w-5xl mx-auto relative z-10">
          {/* ── Bouton express 'Composer mon jus' (accès direct sans scroll) ── */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 md:mb-10 text-center">
            <Link
              to="/lab"
              className="group inline-flex items-center justify-center gap-3.5 h-14 sm:h-16 px-8 sm:px-10 rounded-full bg-primary text-primary-foreground font-extrabold text-base sm:text-lg shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer ring-4 ring-primary/20"
            >
              <Sparkles className="size-5 text-[#E0982E] animate-pulse" />
              <span>{t('landing.hero.ctaPrimary', 'Composer mon jus')}</span>
              <ArrowRight className="size-5 group-hover:translate-x-1.5 transition-transform" />
            </Link>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground bg-card/60 backdrop-blur-xs px-4 py-2 rounded-full border border-border/40">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              <span>100% naturel • Pressé à froid • En 2 min</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
          {[
            { value: fruitsLoading || fruits.length === 0 ? '30+' : `${fruits.length}+`, label: t('home.customer.labStatsFruits'), icon: Leaf, color: '#3F6D4E' },
            { value: '2 min', label: t('home.customer.labStatsTime'), icon: Zap, color: '#E0982E' },
            { value: '100%', label: t('landing.hero.statsNatural'), icon: ShieldCheck, color: '#F2694A' },
            { value: recipesCount === null ? '500+' : `${recipesCount}+`, label: t('landing.hero.statsRecipes'), icon: Users, color: '#AECBB2' },
          ].map((stat, i) => (
            <div key={i} className="bg-card rounded-3xl p-6 md:p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-border/40 flex flex-col items-center gap-3 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 scroll-animate opacity-0 relative overflow-hidden group" style={{ animationDelay: `${i * 100}ms` }}>
              <AfricanCornerPattern section="stats" index={i} size="sm" className="opacity-15 group-hover:opacity-35" />
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2" style={{ background: `color-mix(in srgb, ${stat.color} 15%, transparent)`, color: stat.color }}>
                <stat.icon className="w-6 h-6" />
              </div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{stat.value}</p>
              <p className="text-xs md:text-sm text-muted-foreground font-medium">{stat.label}</p>
            </div>
          ))}
          </div>
        </div>
      </section>

      {/* ━━━ HOW IT WORKS ━━━ */}
      <div className="w-full overflow-hidden leading-none relative z-0 pointer-events-none">
        <svg viewBox="0 0 1440 120" className="w-full h-[50px] md:h-[100px] block" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,96L80,85.3C160,75,320,53,480,58.7C640,64,800,96,960,101.3C1120,107,1280,85,1360,74.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" className="fill-[#E0982E]/[0.08] dark:fill-[#E0982E]/[0.10]"></path>
        </svg>
      </div>
      <section id="how-it-works" className="py-12 md:py-24 px-4 sm:px-6 md:px-8 bg-[#E0982E]/[0.08] dark:bg-[#E0982E]/[0.10] relative overflow-visible z-0 scroll-mt-20">
        <AfricanSectionBackground pattern="ndop" color="terracotta" opacityClass="opacity-[0.055] dark:opacity-[0.07]" glowColor="terracotta" watermarkEmblem="ndop-mandala" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto mb-14 md:mb-20 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E0982E]/15 text-[#b27218] dark:text-[#f8be68] border border-[#E0982E]/30 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="size-3.5 text-[#E0982E]" />
              {t('landing.howItWorks.badge', 'Expérience Fluide')}
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-display)' }} dangerouslySetInnerHTML={{ __html: t('landing.howItWorks.title') }} />
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl">
              {t('landing.howItWorks.subtitle')}
            </p>
          </div>

          {/* ── STACKING CARDS CONTAINER ── */}
          <div className="relative max-w-4xl mx-auto space-y-12 sm:space-y-16 md:space-y-24 pb-20 md:pb-32">
            {[
              {
                step: '01',
                tagline: 'Composition sur-mesure',
                badgeText: 'Étape 01 · Votre Recette',
                title: t('landing.howItWorks.step1Title'),
                desc: t('landing.howItWorks.step1Desc'),
                color: '#F2694A',
                accentBorder: 'border-[#F2694A]/40 dark:border-[#F2694A]/50',
                headerBg: 'bg-[#F2694A]/12 dark:bg-[#F2694A]/20',
                cardBg: 'bg-card dark:bg-[#1a1715]',
                glowColor: 'rgba(242, 105, 74, 0.16)',
                img: landingImages.step1,
                imgBadge: '15+ Fruits du terroir',
                features: [
                  'Fruits frais cueillis à maturité',
                  'Boosters : Gingembre, Menthe, Foléré',
                  '100% Brut · Zéro sucre ni conservateur',
                ],
                ctaText: 'Créer ma formule au Lab',
                ctaLink: '/lab',
              },
              {
                step: '02',
                tagline: 'Intelligence & Pureté',
                badgeText: 'Étape 02 · Analyse & Pureté',
                title: t('landing.howItWorks.step2Title'),
                desc: t('landing.howItWorks.step2Desc'),
                color: '#3F6D4E',
                accentBorder: 'border-[#3F6D4E]/40 dark:border-[#3F6D4E]/50',
                headerBg: 'bg-[#3F6D4E]/12 dark:bg-[#3F6D4E]/20',
                cardBg: 'bg-card dark:bg-[#151c17]',
                glowColor: 'rgba(63, 109, 78, 0.18)',
                img: landingImages.step2,
                imgBadge: 'Extraction lente à froid',
                features: [
                  'Bilan vitamines, minéraux & glycémie',
                  'Conseils physiologiques sur-mesure',
                  'Pressage doux qui préserve les enzymes',
                ],
                ctaText: 'Explorer NutriFYS',
                ctaLink: '/lab?tab=nutrifys',
              },
              {
                step: '03',
                tagline: 'Fraîcheur & Dégustation',
                badgeText: 'Étape 03 · Dégustation',
                title: t('landing.howItWorks.step3Title'),
                desc: isNoticeActive
                  ? `${t('landing.howItWorks.step3Desc')} (${launchNoticeContent})`
                  : t('landing.howItWorks.step3Desc'),
                color: '#E0982E',
                accentBorder: 'border-[#E0982E]/45 dark:border-[#E0982E]/55',
                headerBg: 'bg-[#E0982E]/12 dark:bg-[#E0982E]/20',
                cardBg: 'bg-card dark:bg-[#1c1914]',
                glowColor: 'rgba(224, 152, 46, 0.18)',
                img: landingImages.step3,
                imgBadge: 'Bouteilles verre consignées',
                features: [
                  'Pressage artisanal à la commande',
                  'Livraison directe chez vous ou au bureau',
                  'Conservation optimale 100% fraîcheur',
                ],
                ctaText: 'Commander un cocktail',
                ctaLink: '#catalogue',
              },
            ].map((item, i) => {
              // Styles dynamiques pour l'effet d'inclinaison diagonale et rebond élastique
              let cardTransform = 'rotate(0deg) scale(1) translateY(0px)';
              let cardFilter = 'brightness(1)';
              let cardShadow = '0 -6px 25px rgba(0,0,0,0.08), 0 25px 60px rgba(0,0,0,0.18)';

              if (i === 0) {
                if (stackedState.c0Deep) {
                  // Couverte par les étapes 2 et 3 : inclinaison diagonale gauche accentuée
                  cardTransform = 'rotate(-4.2deg) scale(0.95) translateY(-8px)';
                  cardFilter = 'brightness(0.90)';
                  cardShadow = '0 -4px 18px rgba(0,0,0,0.14), 0 18px 40px rgba(0,0,0,0.22)';
                } else if (stackedState.c0) {
                  // Couverte par l'étape 2 : inclinaison diagonale gauche
                  cardTransform = 'rotate(-2.8deg) scale(0.97) translateY(-5px)';
                  cardFilter = 'brightness(0.94)';
                  cardShadow = '0 -4px 18px rgba(0,0,0,0.12), 0 20px 45px rgba(0,0,0,0.20)';
                }
              } else if (i === 1) {
                if (stackedState.c1) {
                  // Couverte par l'étape 3 : inclinaison diagonale droite
                  cardTransform = 'rotate(2.8deg) scale(0.97) translateY(-5px)';
                  cardFilter = 'brightness(0.94)';
                  cardShadow = '0 -4px 18px rgba(0,0,0,0.12), 0 20px 45px rgba(0,0,0,0.20)';
                }
              }

              return (
                <div
                  key={i}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  style={{
                    position: 'sticky',
                    top: `calc(4.75rem + ${i * 44}px)`,
                    zIndex: 10 + i,
                    transform: cardTransform,
                    transformOrigin: 'top center',
                    filter: cardFilter,
                    boxShadow: cardShadow,
                    transition: 'transform 0.75s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.4s ease, box-shadow 0.4s ease',
                    willChange: 'transform',
                  }}
                  className={`rounded-[2rem] sm:rounded-[2.4rem] md:rounded-[2.8rem] border-2 ${item.accentBorder} ${item.cardBg} overflow-hidden group`}
                >
                  <AfricanCornerPattern section="how-it-works" index={i} size="md" className="opacity-15 group-hover:opacity-30 pointer-events-none transition-opacity duration-500" />
                
                {/* Top Stacking Tab Strip (stays visible when next card stacks over this card) */}
                <div className={`px-4 sm:px-8 md:px-10 py-2.5 sm:py-3.5 flex items-center justify-between border-b border-border/40 ${item.headerBg} backdrop-blur-md`}>
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <span
                      className="inline-flex items-center justify-center size-6 sm:size-7 md:size-8 rounded-full text-white font-extrabold text-[11px] sm:text-xs md:text-sm shadow-xs font-display shrink-0"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.step}
                    </span>
                    <span className="font-display font-black text-xs sm:text-sm uppercase tracking-wider text-foreground">
                      {item.tagline}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-muted-foreground hidden sm:inline-flex items-center gap-1.5">
                    <span>Étape {item.step} / 03</span>
                  </span>
                </div>

                {/* Main Card Content */}
                <div className="p-4 sm:p-6 md:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-10 items-center">
                  {/* Left: Text & Features (7 cols) */}
                  <div className="lg:col-span-7 space-y-3 sm:space-y-4 md:space-y-5">
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${item.color} 15%, transparent)`, color: item.color }}>
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.badgeText}
                      </div>
                      <h3 className="font-display font-extrabold text-xl sm:text-2xl md:text-3xl lg:text-4xl text-foreground tracking-tight">
                        {item.title}
                      </h3>
                      <p className="text-muted-foreground text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed">
                        {item.desc}
                      </p>
                    </div>

                    {/* Feature pills */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
                      {item.features.map((feat, fIdx) => (
                        <span
                          key={fIdx}
                          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold border backdrop-blur-md bg-muted/40 text-foreground/80 border-border/50"
                        >
                          <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span>{feat}</span>
                        </span>
                      ))}
                    </div>

                    {/* CTA Link */}
                    <div className="pt-1 sm:pt-2">
                      <Link
                        to={item.ctaLink}
                        className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all cursor-pointer"
                        style={{ backgroundColor: item.color }}
                      >
                        <span>{item.ctaText}</span>
                        <ChevronRight className="size-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Right: Visual Image Card (5 cols) */}
                  <div className="lg:col-span-5">
                    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-[21/9] sm:aspect-[16/9] lg:aspect-[4/3] shadow-lg border border-white/20 group/img bg-muted/30">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10" />
                      <img
                        src={item.img}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 right-2.5 sm:right-3 z-20 flex items-center justify-between text-white text-[11px] sm:text-xs font-bold bg-black/40 backdrop-blur-md px-3 py-1.5 sm:py-2 rounded-xl border border-white/15">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="size-3.5" style={{ color: item.color }} />
                          <span>{item.imgBadge}</span>
                        </span>
                        <span className="text-[10px] opacity-75 uppercase tracking-wider font-semibold">FYS Signature</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </section>
      <div className="w-full overflow-hidden leading-none bg-[#E0982E]/[0.08] dark:bg-[#E0982E]/[0.10] relative z-0 mb-4">
        <svg viewBox="0 0 1440 120" className="w-full h-[50px] md:h-[100px] block" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,64L80,74.7C160,85,320,107,480,101.3C640,96,800,64,960,48C1120,32,1280,32,1360,32L1440,32L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" className="fill-background"></path>
        </svg>
      </div>


      {/* ━━━ NOS CRÉATIONS / CATALOGUE ━━━ */}
      {catalogCocktails.length > 0 && (
        <section id="catalogue" className="py-20 px-5 md:px-8 relative overflow-hidden bg-background scroll-mt-24">
          <AfricanSectionBackground pattern="seeds-sun" color="forest" opacityClass="opacity-[0.035] dark:opacity-[0.05]" glowColor="forest" />
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto mb-16 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm">
                <GlassWater className="size-4" />
                Notre Carte
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                Découvrez notre <span className="text-primary">catalogue</span>
              </h2>
              <p className="text-muted-foreground text-lg">
                Des recettes exclusives créées par nos experts, prêtes à être commandées et livrées chez vous.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {catalogCocktails.map((cocktail, i) => (
                <div key={cocktail.id} className="group relative bg-card border border-border/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                  <AfricanCornerPattern section="catalogue" index={i} size="md" className="z-20 text-white/40 group-hover:text-white/80" />
                  <div className="aspect-[4/5] bg-muted/30 relative overflow-hidden">
                    {cocktail.imageUrl ? (
                      <img src={cocktail.imageUrl} alt={cocktail.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-primary/5">
                        <GlassWater className="size-16 mb-4 opacity-20" />
                        <span className="text-sm font-medium">Image à venir</span>
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
                      
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-white font-bold text-sm bg-white/20 backdrop-blur-md px-3 py-1 rounded-xl">
                          {cocktail.containers && cocktail.containers.length > 0 
                            ? 'Dès ' + (cocktail.containers.find(c => c.price != null)?.price ?? cocktail.totalPrice) + ' XAF'
                            : cocktail.totalPrice + ' XAF'
                          }
                        </span>
                        
                        <Button onClick={() => navigate(`/auth/login?redirect=${encodeURIComponent('/board/catalogue?cocktail=' + cocktail.id)}`)} className="rounded-full size-10 p-0 bg-primary hover:bg-primary/90 text-white shadow-lg transition-transform hover:scale-105">
                          <Plus className="size-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-12 flex justify-center">
               <Button onClick={() => navigate('/auth/login?redirect=/board/catalogue')} size="lg" className="rounded-full font-bold h-14 px-8 text-base group cursor-pointer bg-primary text-primary-foreground">
                 Voir tout le catalogue
                 <ArrowRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
               </Button>
            </div>
          </div>
        </section>
      )}

      

      {/* ━━━ FEATURES ━━━ */}
      <div className="w-full overflow-hidden leading-none relative z-0">
        <svg viewBox="0 0 1440 120" className="w-full h-[50px] md:h-[100px] block" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,64L80,53.3C160,43,320,21,480,26.7C640,32,800,64,960,74.7C1120,85,1280,75,1360,69.3L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" className="fill-[#3F6D4E]/[0.08] dark:fill-[#3F6D4E]/15"></path>
        </svg>
      </div>
      <section id="features" className="py-12 md:py-20 px-5 md:px-8 bg-[#3F6D4E]/[0.08] dark:bg-[#3F6D4E]/15 relative overflow-hidden z-0">
        <AfricanSectionBackground pattern="signature-totem" color="forest" opacityClass="opacity-[0.05] dark:opacity-[0.07]" glowColor="forest" watermarkEmblem="totem" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto mb-16 space-y-4 scroll-animate opacity-0">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-display)' }} dangerouslySetInnerHTML={{ __html: t('landing.features.title') }} />
            <p className="text-muted-foreground text-lg">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Card 1 — User Compose */}
            <Link to="/lab" className="block rounded-[2.5rem] border border-border/50 overflow-hidden bg-card/60 backdrop-blur-md group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 scroll-animate opacity-0 relative" style={{ animationDelay: '100ms' }}>
              <AfricanCornerPattern section="features" index={0} size="lg" className="z-20 text-white/50 group-hover:text-white/90" />
              <div className="aspect-[16/10] overflow-hidden bg-muted">
                <img
                  src={landingImages.featureCatalog || 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=800&auto=format&fit=crop'}
                  alt="Composition manuelle de jus de fruits — FYS"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=800&auto=format&fit=crop'; }}
                />
              </div>
              <div className="p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#E0982E20', color: '#E0982E' }}>
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{t('landing.features.naturalTitle')}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t('landing.features.naturalDesc')}
                </p>
                <div className="inline-flex items-center gap-1.5 text-sm font-bold group-hover:gap-3 transition-all" style={{ color: '#E0982E' }}>
                  {t('home.customer.labCta')} <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            {/* Card 2 — NutriFYS Compose */}
            <Link to="/lab?tab=nutrifys" className="block rounded-[2.5rem] border border-border/50 overflow-hidden bg-card/60 backdrop-blur-md group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 scroll-animate opacity-0 relative" style={{ animationDelay: '200ms' }}>
              <AfricanCornerPattern section="features" index={1} size="lg" className="z-20 text-white/50 group-hover:text-white/90" />
              <div className="aspect-[16/10] overflow-hidden bg-muted">
                <img
                  src={landingImages.featureNutrify || 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=800&auto=format&fit=crop'}
                  alt="NutriFYS assistant nutritionniste — cocktail santé"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=800&auto=format&fit=crop'; }}
                />
              </div>
              <div className="p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#3F6D4E20', color: '#3F6D4E' }}>
                  <Heart className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{t('landing.features.nutrifysTitle')}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t('landing.features.nutrifysDesc')}
                </p>
                <div className="inline-flex items-center gap-1.5 text-sm font-bold group-hover:gap-3 transition-all" style={{ color: '#3F6D4E' }}>
                  {t('landing.nutrifys.cta')} <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>
      <div className="w-full overflow-hidden leading-none bg-[#3F6D4E]/[0.08] dark:bg-[#3F6D4E]/15 relative z-0">
        <svg viewBox="0 0 1440 120" className="w-full h-[50px] md:h-[100px] block" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,32L80,42.7C160,53,320,75,480,74.7C640,75,800,53,960,42.7C1120,32,1280,32,1360,32L1440,32L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" className="fill-[#E0982E]/[0.08] dark:fill-[#E0982E]/[0.12]"></path>
        </svg>
      </div>

      {/* ━━━ FYS EVENT (CORPORATE & B2B CATERING) ━━━ */}
      <section id="events" className="py-16 md:py-28 px-5 md:px-8 bg-[#E0982E]/[0.08] dark:bg-[#E0982E]/[0.12] relative overflow-hidden z-0">
        <AfricanSectionBackground pattern="royal-mosaic" color="terracotta" opacityClass="opacity-[0.06] dark:opacity-[0.08]" glowColor="terracotta" watermarkEmblem="ndop-mandala" />
        
        <div className="max-w-6xl mx-auto relative z-10 space-y-16">
          {/* Section Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto scroll-animate opacity-0">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/25">
              <Building2 className="w-3.5 h-3.5" />
              {t('landing.events.badge')}
            </div>

            <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]" style={{ fontFamily: 'var(--font-display)' }} dangerouslySetInnerHTML={{ __html: t('landing.events.title') }} />

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {t('landing.events.subtitle')}
            </p>
          </div>

          {/* 3 Pillars / Value Props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 scroll-animate opacity-0" style={{ animationDelay: '150ms' }}>
            <div className="bg-card/80 backdrop-blur-sm p-7 rounded-3xl border border-border/70 shadow-xs space-y-3 hover:border-primary/40 transition-all relative overflow-hidden group">
              <AfricanCornerPattern section="events" index={0} size="md" className="opacity-15 group-hover:opacity-35" />
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <GlassWater className="size-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-foreground">
                {t('landing.events.card1Title')}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t('landing.events.card1Desc')}
              </p>
            </div>

            <div className="bg-card/80 backdrop-blur-sm p-7 rounded-3xl border border-border/70 shadow-xs space-y-3 hover:border-primary/40 transition-all relative overflow-hidden group">
              <AfricanCornerPattern section="events" index={1} size="md" className="opacity-15 group-hover:opacity-35" />
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Sparkles className="size-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-foreground">
                {t('landing.events.card2Title')}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t('landing.events.card2Desc')}
              </p>
            </div>

            <div className="bg-card/80 backdrop-blur-sm p-7 rounded-3xl border border-border/70 shadow-xs space-y-3 hover:border-primary/40 transition-all relative overflow-hidden group">
              <AfricanCornerPattern section="events" index={2} size="md" className="opacity-15 group-hover:opacity-35" />
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Package className="size-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-foreground">
                {t('landing.events.card3Title')}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t('landing.events.card3Desc')}
              </p>
            </div>
          </div>

          {/* Hero Banner with Executive Photo & Direct Action */}
          <div className="relative rounded-[2.5rem] overflow-hidden border border-border/60 shadow-xl scroll-animate opacity-0 group" style={{ animationDelay: '250ms' }}>
            <AfricanCornerPattern section="events" index={3} size="xl" className="z-20 text-white/40 group-hover:text-white/80" />
            <div className="absolute inset-0 bg-muted">
              <img
                src="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1600"
                alt="FYS Event séminaire d'entreprise"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/40" />
            </div>

            <div className="relative z-10 p-8 sm:p-12 md:p-16 max-w-2xl text-white space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20 backdrop-blur-xs">
                <ShieldCheck className="size-3.5 text-secondary" />
                {t('landing.events.card3Title')}
              </div>

              <h3 className="text-2xl sm:text-4xl font-extrabold font-display leading-tight" dangerouslySetInnerHTML={{ __html: t('landing.events.title') }} />

              <p className="text-sm sm:text-base text-white/80 leading-relaxed">
                {t('landing.events.subtitle')}
              </p>

              <div className="pt-2">
                <Link
                  to="/auth/login?redirect=/board/events"
                  className="inline-flex items-center gap-3 h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-sm sm:text-base shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <Building2 className="size-5" />
                  {t('landing.events.cta')}
                  <ArrowRight className="size-4" />
                </Link>
                <p className="text-[11px] text-white/60 mt-2 font-medium">
                  {t('landing.events.card3Desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="w-full overflow-hidden leading-none bg-[#E0982E]/[0.08] dark:bg-[#E0982E]/[0.12] relative z-0">
        <svg viewBox="0 0 1440 120" className="w-full h-[50px] md:h-[100px] block" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,32L80,42.7C160,53,320,75,480,74.7C640,75,800,53,960,42.7C1120,32,1280,32,1360,32L1440,32L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" className="fill-background"></path>
        </svg>
      </div>

      {/* ━━━ NUTRIFYS SECTION ━━━ */}
      <section id="nutrifys" className="py-20 md:py-24 px-5 md:px-8 relative overflow-hidden z-0">
        <AfricanSectionBackground pattern="seeds-sun" color="coral" opacityClass="opacity-[0.045] dark:opacity-[0.06]" glowColor="coral" watermarkEmblem="sun" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-[3rem] p-8 md:p-12 lg:p-16 shadow-2xl relative overflow-hidden group">
            <AfricanCornerPattern section="nutrifys" index={0} size="xl" className="opacity-20 group-hover:opacity-40" />
            
            {/* Décoration d'arrière-plan de la carte */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
              {/* Visual */}
              <div className="order-2 lg:order-1 relative group scroll-animate opacity-0" style={{ animationDelay: '200ms' }}>
                <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-2xl group-hover:bg-primary/30 transition-colors duration-700" />
                <img
                  src={landingImages.nutrifysAssistant}
                  alt="NutriFYS — votre assistant nutritionniste personnel"
                  className="w-full rounded-[2.5rem] shadow-2xl relative z-10 border border-border/40"
                />
              </div>

              {/* Content */}
              <div className="order-1 lg:order-2 space-y-8 scroll-animate opacity-0" style={{ animationDelay: '100ms' }}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{ background: '#F2694A20', color: '#F2694A' }}>
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('landing.nutrifys.badge')}
                </div>

                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]" style={{ fontFamily: 'var(--font-display)' }} dangerouslySetInnerHTML={{ __html: t('landing.nutrifys.title') }} />

                <p className="text-lg text-muted-foreground leading-relaxed font-medium">
                  {t('landing.nutrifys.subtitle')}
                </p>

                <ul className="space-y-4">
                  {[
                    t('home.customer.featureAIAnalysis'),
                    t('nutrifys.cardDietary', 'Prise en compte de vos allergies et conditions'),
                    t('nutrifys.cardScore', 'Score de santé et bénéfices ciblés'),
                    t('orders.exportNutritionPDF', 'Fiche nutritionnelle téléchargeable en PDF'),
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-background/50 border border-border/40 hover:border-primary/30 hover:shadow-md transition-all">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-foreground font-bold mt-1">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  <Link
                    to="/lab?tab=nutrifys"
                    className="inline-flex h-14 px-8 items-center gap-3 rounded-full text-sm font-bold active:scale-95 transition-all shadow-xl bg-[#F2694A] hover:bg-[#e05f41] text-white"
                  >
                    {t('landing.nutrifys.cta')}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ FRUITS DISPONIBLES ━━━ */}
      <div className="w-full overflow-hidden leading-none relative z-0">
        <svg viewBox="0 0 1440 120" className="w-full h-[50px] md:h-[100px] block" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,64L80,53.3C160,43,320,21,480,26.7C640,32,800,64,960,74.7C1120,85,1280,75,1360,69.3L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" className="fill-[#3F6D4E]/[0.08] dark:fill-[#3F6D4E]/15"></path>
        </svg>
      </div>
      <section className="py-12 md:py-20 px-5 md:px-8 bg-[#3F6D4E]/[0.08] dark:bg-[#3F6D4E]/15 relative overflow-hidden z-0">
        <AfricanSectionBackground pattern="grassfields-chevrons" color="forest" opacityClass="opacity-[0.045] dark:opacity-[0.06]" glowColor="forest" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto mb-16 space-y-4 scroll-animate opacity-0">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              {t('nav.fruits')} & <span className="text-primary">{t('landing.fruitModal.vitamins')}</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              {t('fruits.description')}
            </p>
          </div>

          {fruitsLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6 pb-8">
              {fruits.map((fruit, i) => {
                const unavailable = !isUsableFruit(fruit);
                return (
                  <div
                    key={fruit.id}
                    onClick={() => setSelectedFruit(fruit)}
                    className="relative bg-card/40 hover:bg-card/60 w-full p-2.5 rounded-[1.5rem] border border-border/40 shadow-sm transition-all duration-300 group flex flex-col items-center cursor-pointer hover:-translate-y-1 scroll-animate opacity-0 overflow-hidden"
                    style={{ animationDelay: `${Math.min(i * 50, 500)}ms` }}
                  >
                    <AfricanCornerPattern section="fruits" index={i} size="sm" className="opacity-15 group-hover:opacity-35" />
                    <div className="w-full aspect-square rounded-[1.25rem] overflow-hidden mb-3 relative bg-muted">
                      {unavailable && (
                        <span className="absolute top-2 right-2 z-10 text-[8px] font-bold uppercase tracking-widest bg-black/70 text-white px-2 py-0.5 rounded-full backdrop-blur-md">
                          {t('catalogue.unavailable')}
                        </span>
                      )}
                      <img 
                        src={fruit.imageUrl || ''} 
                        alt={fruit.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-col items-center justify-center text-center px-1 pb-2 w-full">
                       <h5 className="font-bold text-[13px] text-foreground line-clamp-1 w-full">{fruit.name}</h5>
                       <p className="text-[10px] font-medium text-muted-foreground line-clamp-1 w-full mt-0.5">{fruit.benefits?.[0] || '100% Naturel'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <div className="w-full overflow-hidden leading-none bg-[#3F6D4E]/[0.08] dark:bg-[#3F6D4E]/15 relative z-0">
        <svg viewBox="0 0 1440 120" className="w-full h-[50px] md:h-[100px] block" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,32L80,42.7C160,53,320,75,480,74.7C640,75,800,53,960,42.7C1120,32,1280,32,1360,32L1440,32L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" className="fill-background"></path>
        </svg>
      </div>

      {/* ━━━ LA SIGNATURE FYS (SECTION INTERACTIVE) ━━━ */}
      <FysSignatureSection />

      {/* ━━━ ABOUT US (L'ÉQUIPE) ━━━ */}
      <section id="about" className="py-20 md:py-32 px-5 md:px-8 relative overflow-hidden z-0 bg-background">
        <AfricanSectionBackground pattern="ndop" color="forest" opacityClass="opacity-[0.04] dark:opacity-[0.055]" glowColor="forest" watermarkEmblem="totem" />

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center">
          
          {/* Main Section Title */}
          <div className="w-full text-center mb-12 md:mb-20 scroll-animate opacity-0" style={{ animationDelay: '50ms' }}>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]" style={{ fontFamily: 'var(--font-display)' }} dangerouslySetInnerHTML={{ __html: t('landing.about.title') }} />
          </div>

          {/* Founders Visuals (Top) */}
          <div className="w-full flex flex-col md:flex-row justify-center items-center md:items-stretch gap-6 md:gap-12 mb-16 md:mb-24">
            
            {/* Claudia (First) */}
            <div className="relative group w-[90vw] sm:w-full max-w-[340px] scroll-animate opacity-0" style={{ animationDelay: '100ms' }}>
              <div className="absolute inset-0 bg-secondary/15 rounded-[2.5rem] md:rounded-[3rem] blur-2xl group-hover:bg-secondary/30 transition-colors duration-700" />
              <div className="relative aspect-[4/5] rounded-[2.5rem] md:rounded-[3rem] overflow-hidden border border-border/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] group-hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.2)] transition-shadow duration-700">
                <AfricanCornerPattern variant="ndop-cross" size="md" className="z-20 text-white/50 group-hover:text-white/90" />
                <img src="/claudia.jpg" alt="Claudia NGASSA TAPAH" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s] ease-out" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F3A28]/95 via-[#1F3A28]/50 to-transparent" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[2.5rem] md:rounded-[3rem] pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 transform group-hover:-translate-y-2 transition-transform duration-700 flex flex-col justify-end h-full">
                  <div className="mt-auto">
                    <div className="inline-block px-3 py-1 mb-3 rounded-full bg-secondary/20 backdrop-blur-md border border-secondary/30 text-secondary text-[10px] sm:text-xs font-extrabold uppercase tracking-widest">
                      Co-fondatrice, Ops
                    </div>
                    <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-display leading-[1.1] mb-1 drop-shadow-md">Claudia<br/>Ngassa</h3>
                    <p className="text-secondary/90 font-bold text-[11px] sm:text-xs mb-3 italic">Master 2 en Data Science et Intelligence Artificielle</p>
                    <p className="text-white/85 text-xs sm:text-sm font-medium leading-relaxed">
                      Le cœur opérationnel, garante de l'excellence, de la qualité et de la logistique de chaque jus pressé.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Emmanuel (Second, staggered on desktop) */}
            <div className="relative group w-[90vw] sm:w-full max-w-[340px] mt-2 md:mt-20 scroll-animate opacity-0" style={{ animationDelay: '250ms' }}>
              <div className="absolute inset-0 bg-primary/15 rounded-[2.5rem] md:rounded-[3rem] blur-2xl group-hover:bg-primary/30 transition-colors duration-700" />
              <div className="relative aspect-[4/5] rounded-[2.5rem] md:rounded-[3rem] overflow-hidden border border-border/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] group-hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.2)] transition-shadow duration-700">
                <AfricanCornerPattern variant="heritage-diamond" size="md" className="z-20 text-white/50 group-hover:text-white/90" />
                <img src="/Emmanuel.jpg" alt="Emmanuel YAKAM TCHAMEGNI" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s] ease-out" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F3A28]/95 via-[#1F3A28]/50 to-transparent" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[2.5rem] md:rounded-[3rem] pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 transform group-hover:-translate-y-2 transition-transform duration-700 flex flex-col justify-end h-full">
                  <div className="mt-auto">
                    <div className="inline-block px-3 py-1 mb-3 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 text-primary-foreground text-[10px] sm:text-xs font-extrabold uppercase tracking-widest">
                      Co-fondateur, Tech
                    </div>
                    <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-display leading-[1.1] mb-1 drop-shadow-md">Emmanuel<br/>Yakam</h3>
                    <p className="text-primary-foreground/90 font-bold text-[11px] sm:text-xs mb-3 italic">Master 2 en Cryptographie et Sécurité Informatique</p>
                    <p className="text-white/85 text-xs sm:text-sm font-medium leading-relaxed">
                      L'architecte technique derrière l'IA NutriFYS et le développement de notre plateforme numérique.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Description (Bottom) */}
          <div className="max-w-4xl text-center space-y-8 md:space-y-10 scroll-animate opacity-0 px-2" style={{ animationDelay: '400ms' }}>
            <div className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider" style={{ background: '#3F6D4E15', color: '#3F6D4E' }}>
              <Heart className="w-4 h-4" />
              {t('landing.about.badge')}
            </div>
            
            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1] md:leading-[1.05]" style={{ fontFamily: 'var(--font-display)' }}>
              Né à <span className="text-primary brightness-110">Yaoundé</span>,<br className="hidden sm:block"/>pensé pour vous.
            </h2>
            
            <div className="space-y-6 md:space-y-8 relative px-4 md:px-12 bg-card/30 backdrop-blur-sm border border-border/30 p-8 md:p-10 rounded-[2rem] shadow-sm overflow-hidden group">
              <AfricanCornerPattern section="about" index={0} size="lg" className="opacity-20 group-hover:opacity-40" />
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-muted-foreground leading-relaxed font-medium">
                {t('landing.about.subtitle')}
              </p>
              <div className="w-12 md:w-16 h-1 bg-primary/30 rounded-full mx-auto" />
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground/80 leading-relaxed font-medium">
                {t('landing.features.subtitle')}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ━━━ CTA FINAL ━━━ */}
      <section className="py-24 px-5 md:px-8 relative overflow-hidden z-0">
        <AfricanSectionBackground pattern="signature-totem" color="terracotta" opacityClass="opacity-[0.04] dark:opacity-[0.06]" glowColor="terracotta" watermarkEmblem="ndop-mandala" />
        <div className="max-w-5xl mx-auto bg-card rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden border border-border/50 shadow-2xl z-10 scroll-animate opacity-0 group">
          <AfricanCornerPattern section="cta" index={0} size="xl" className="opacity-20 group-hover:opacity-40" />
          
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent opacity-50 pointer-events-none" />
          
          {/* Image de fond subtile (comme le Hero) */}
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center pointer-events-none opacity-[0.25] dark:opacity-[0.10] transition-opacity"
            style={{ 
              backgroundImage: `url('${landingImages.hero}')`,
              maskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)' 
            }} 
          />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]" style={{ fontFamily: 'var(--font-display)' }}>
              {t('landing.hero.title1')} <span className="text-primary brightness-110 dark:brightness-125">{t('landing.hero.titleHighlight')}</span> ?
            </h2>
            <p className="text-lg md:text-xl text-foreground/80 font-medium">
              {t('landing.hero.subtitle')}
            </p>
            <div className="pt-4 flex justify-center">
              <Link
                to="/lab"
                className="inline-flex h-16 px-12 items-center justify-center gap-3 rounded-full text-lg font-bold active:scale-95 transition-all shadow-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t('landing.nav.startNow')}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer className="border-t border-border/50 py-16 lg:py-20 px-6 md:px-12 lg:px-16 bg-card">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-3">
              <img src="/logos/Logo_fys_creme.png" alt="FYS Logo" className="h-12 w-auto object-contain opacity-90 hover:opacity-100 transition-all" />
              
            </div>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-sm">
              {t('landing.footer.tagline')}
            </p>
          </div>
          
          <div className="lg:col-span-4 space-y-6 lg:ml-auto">
            <h4 className="font-bold text-foreground text-sm uppercase tracking-wider">{t('landing.footer.contact')}</h4>
            <ul className="text-sm md:text-base text-muted-foreground space-y-4">
              <li className="flex flex-col gap-1.5 hover:text-foreground transition-colors cursor-pointer">
                <div className="flex items-center gap-3 font-bold text-foreground/90">
                  <Phone className="w-4 h-4 text-primary" /> Contacts WhatsApp / Appel
                </div>
                <div className="pl-7 space-y-1">
                  <div>+237 691 91 32 07</div>
                  <div>+237 675 10 88 76</div>
                </div>
              </li>
              <li className="flex items-center gap-3 hover:text-foreground transition-colors cursor-pointer pt-2">
                <Mail className="w-4 h-4 text-primary" /> fyscameroun@gmail.com
              </li>
              <li className="flex items-center gap-3 hover:text-foreground transition-colors cursor-pointer">
                <MapPin className="w-4 h-4 text-primary" /> Yaoundé, Cameroun
              </li>
            </ul>
          </div>
          
          <div className="lg:col-span-3 space-y-6 lg:ml-auto">
            <h4 className="font-bold text-foreground text-sm uppercase tracking-wider">{t('landing.footer.navigation')}</h4>
            <ul className="text-sm md:text-base text-muted-foreground space-y-4">
              <li><Link to="/lab" className="hover:text-primary transition-colors flex items-center gap-2">FYS Lab</Link></li>
              <li><Link to="/board/catalogue" className="hover:text-primary transition-colors flex items-center gap-2">{t('nav.catalogue')}</Link></li>
              <li><Link to="/board/profile" className="hover:text-primary transition-colors flex items-center gap-2">{t('nav.profile')}</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs md:text-sm text-muted-foreground font-medium">
          <p>© {new Date().getFullYear()} FYS · {t('landing.footer.rights')}</p>
          <div className="flex items-center gap-6">
            <span className="cursor-pointer hover:text-foreground transition-colors">{t('landing.footer.terms')}</span>
            <span className="cursor-pointer hover:text-foreground transition-colors">{t('landing.footer.privacy')}</span>
          </div>
        </div>
      </footer>

      {/* Fruit Details Bottom Sheet / Drawer */}
      <Drawer open={!!selectedFruit} onOpenChange={(open) => !open && setSelectedFruit(null)}>
        <DrawerContent className="max-w-md mx-auto bg-background/70 backdrop-blur-[48px] saturate-[180%] border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
          {selectedFruit && (
            <div className="overflow-y-auto max-h-[85vh] scrollbar-hide">
              {/* Image + Name row */}
              <div className="flex gap-5 pt-8 px-6 pb-4">
                <div
                  className="size-44 shrink-0 rounded-2xl shadow-lg bg-cover bg-center bg-muted border border-border/40"
                  style={{ backgroundImage: selectedFruit.imageUrl ? `url('${selectedFruit.imageUrl}')` : 'none' }}
                />
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">
                    {selectedFruit.cocktailRole || 'BASE'}
                  </span>
                  <h2 className="font-display font-bold text-2xl text-foreground leading-tight">
                    {selectedFruit.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">
                    {selectedFruit.nutrients?.macros?.calories_kcal || 50} kcal / 100g
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 space-y-5">
                {selectedFruit.healthProfile?.benefitBadges && selectedFruit.healthProfile.benefitBadges.length > 0 && (
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-secondary" />
                      {t('nutrition.targetedBenefits')}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFruit.healthProfile.benefitBadges.map((b, i) => (
                        <span key={i} className="text-[11px] bg-secondary/10 text-secondary font-bold px-2.5 py-1 rounded-lg border border-secondary/20">
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nutrition quick stats */}
                {selectedFruit.nutrients && (
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-primary" />
                      {t('nutrition.profileLabel')}
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedFruit.nutrients.macros && (
                        <>
                          {selectedFruit.nutrients.macros.protein_g && (
                            <div className="bg-muted/50 rounded-xl p-2.5 text-center">
                              <p className="text-sm font-bold text-foreground">{selectedFruit.nutrients.macros.protein_g}g</p>
                              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Prots</p>
                            </div>
                          )}
                          {selectedFruit.nutrients.macros.carbs_g && (
                            <div className="bg-muted/50 rounded-xl p-2.5 text-center">
                              <p className="text-sm font-bold text-foreground">{selectedFruit.nutrients.macros.carbs_g}g</p>
                              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Gluc</p>
                            </div>
                          )}
                          {selectedFruit.nutrients.macros.fat_g && (
                            <div className="bg-muted/50 rounded-xl p-2.5 text-center">
                              <p className="text-sm font-bold text-foreground">{selectedFruit.nutrients.macros.fat_g}g</p>
                              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Lip</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedFruit.healthProfile?.nutritionistNote && (
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      Conseil du Nutritionniste
                    </h4>
                    <p className="text-sm font-medium leading-relaxed bg-primary/5 p-4 rounded-2xl border border-primary/10">
                      {selectedFruit.healthProfile.nutritionistNote}
                    </p>
                  </div>
                )}
                
                {selectedFruit.warnings && selectedFruit.warnings.length > 0 && (
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      {t('home.customer.claimsTitle')}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFruit.warnings.map((w, i) => (
                        <span key={i} className="text-[11px] bg-amber-500/10 text-amber-600 font-semibold px-2.5 py-1 rounded-lg border border-amber-500/20">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
};

RootIndex.path = '/';
RootIndex.metadata = {
  title: 'FYS App — Cocktails Santé Personnalisés | Healthy Custom Juices',
  description:
    "FYS App (NutriFYS) : composez vos jus de fruits sur mesure ou laissez votre assistant nutritionniste créer la recette idéale. 100% fruits frais du Cameroun. Discover FYS: healthy custom fruit juices validated by your personal nutritionist assistant.",
};

export default RootIndex;
