import { PageComponent, Link, useNavigate } from 'rasengan';
import { useEffect, useState, useRef } from 'react';
import { ArrowRight, Sparkles, Leaf, Heart, ChevronRight, Play, CheckCircle2, Users, Zap, ShieldCheck, Sun, Moon, Plus, Mouse, ChevronDown, Menu, Phone, Mail, MapPin } from 'lucide-react';
import { useTheme } from '@rasenganjs/theme';
import { useAuthStore } from '@/stores/auth';
import { useFruitsRealtime } from '@/hooks/useFruitsRealtime';
import { useTranslation } from 'react-i18next';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { isUsableFruit, type Fruit, COLLECTIONS } from '@/entities';
import { Button } from '@/components/ui/button';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useQuery } from '@tanstack/react-query';
import { getLandingImagesSettings } from '@/services/settings';
import { DEFAULT_LANDING_IMAGES } from '@/entities';

/* ─────────────────────────────────────────────
   FYS Landing Page — Premium, Clean, Épurée
   Palette : Vert forêt #3F6D4E · Orange corail #F2694A · Doré #E0982E · Crème #FDFBF7 · Menthe #AECBB2
   ───────────────────────────────────────────── */

const RootIndex: PageComponent = () => {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();
  const { actualTheme, setTheme } = useTheme();
  const { fruits, isLoading: fruitsLoading } = useFruitsRealtime();
  const { t } = useTranslation();
  const [selectedFruit, setSelectedFruit] = useState<Fruit | null>(null);
  const [activeProcessStep, setActiveProcessStep] = useState(0);
  const [recipesCount, setRecipesCount] = useState<number | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeSection, setActiveSection] = useState('home');

  // Suivi de la section active
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['features', 'how-it-works', 'nutrifys'];
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

  // Animation au scroll pour "Comment ça marche"
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-step-index'));
            setActiveProcessStep(index);
          }
        });
      },
      {
        // On crée une "ligne de détection" très fine (1% de l'écran) exactement au milieu.
        // Ainsi, une étape ne devient active QUE lorsque son bord supérieur touche le milieu exact de l'écran.
        // Puisque l'étape 2 est grande quand elle est ouverte, elle restera active tant que l'étape 3 n'a pas atteint le milieu.
        rootMargin: '-50% 0px -49% 0px',
        threshold: 0
      }
    );

    stepRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const { data: landingImages = DEFAULT_LANDING_IMAGES } = useQuery({
    queryKey: ['landing-images'],
    queryFn: getLandingImagesSettings,
  });

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
        <img src="/logos/fys_logo.png" alt="FYS" className="h-16 w-auto animate-pulse" />
      </div>
    );
  }

  // Si connecté, on ne rend rien (la redirection est en cours)
  if (user) return null;

  const toggleTheme = () => setTheme(actualTheme === 'dark' ? 'light' : 'dark');

  return (
    <div className="min-h-dvh bg-background text-foreground overflow-x-hidden" style={{ fontFamily: 'var(--font-body)' }}>

      {/* ━━━ NAVBAR ━━━ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-5 md:px-8">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <img src="/logos/fys_logo.png" alt="FYS" className="h-9 w-auto" />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
            <a href="#features" className={`transition-colors ${activeSection === 'features' ? 'text-primary font-bold' : 'hover:text-foreground'}`}>Fonctionnalités</a>
            <a href="#how-it-works" className={`transition-colors ${activeSection === 'how-it-works' ? 'text-primary font-bold' : 'hover:text-foreground'}`}>Comment ça marche</a>
            <a href="#nutrifys" className={`transition-colors ${activeSection === 'nutrifys' ? 'text-primary font-bold' : 'hover:text-foreground'}`}>NutriFYS</a>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setTheme(actualTheme === 'dark' ? 'light' : 'dark')} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-all">
              {actualTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* ── Desktop Buttons ── */}
            <div className="hidden sm:flex items-center gap-4">
              <Link
                to="/auth/login"
                className="h-10 px-5 rounded-full border border-border/80 text-sm font-bold flex items-center gap-2 hover:bg-muted/50 transition-all text-foreground"
              >
                Se connecter
              </Link>
              <Link
                to="/lab"
                className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                Commencer
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* ── Mobile Hamburger Menu ── */}
            <div className="sm:hidden flex items-center">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="p-2 text-foreground rounded-full hover:bg-muted/50 transition-all flex items-center justify-center">
                    <Menu className="w-6 h-6" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85vw] sm:w-[400px] bg-background dark:bg-background/80 dark:backdrop-blur-[48px] dark:saturate-[180%] border-l border-border dark:border-white/10 p-6 flex flex-col gap-6 shadow-2xl">
                  <div className="flex items-center gap-3 pt-4">
                    <img src="/logos/fys_logo.png" alt="FYS Logo" className="h-8 w-auto" />
                    <span className="text-xl font-extrabold tracking-tight text-foreground font-display">FYS</span>
                  </div>
                  
                  <div className="flex flex-col gap-1 mt-6">
                    <SheetClose asChild>
                      <a href="#features" className={`text-lg font-medium px-4 py-3 rounded-xl transition-all ${activeSection === 'features' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'}`}>
                        Fonctionnalités
                      </a>
                    </SheetClose>
                    
                    <SheetClose asChild>
                      <a href="#how-it-works" className={`text-lg font-medium px-4 py-3 rounded-xl transition-all ${activeSection === 'how-it-works' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'}`}>
                        Comment ça marche
                      </a>
                    </SheetClose>
                    
                    <SheetClose asChild>
                      <a href="#nutrifys" className={`text-lg font-medium px-4 py-3 rounded-xl transition-all ${activeSection === 'nutrifys' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:text-foreground hover:bg-muted/50'}`}>
                        L'assistant NutriFYS
                      </a>
                    </SheetClose>
                  </div>
                  
                  <div className="mt-auto flex flex-col gap-4 pb-8">
                    <Link
                      to="/auth/login"
                      className="h-12 w-full rounded-full border-2 border-border/80 text-base font-bold flex items-center justify-center gap-2 hover:bg-muted/50 transition-all text-foreground"
                    >
                      Se connecter
                    </Link>
                    <Link
                      to="/lab"
                      className="h-12 w-full rounded-full bg-primary text-primary-foreground text-base font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                      Commencer maintenant
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* ━━━ HERO ━━━ */}
      <section className="relative w-full h-dvh min-h-[500px] flex flex-col justify-center bg-card overflow-hidden border-b border-border/40">
        
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent opacity-50 pointer-events-none" />
        
        {/* Subtle Background Image */}
        <div 
          className="absolute right-0 top-0 w-full lg:w-2/3 h-full bg-cover bg-center pointer-events-none opacity-[0.12] dark:opacity-[0.10] transition-opacity"
          style={{ 
            backgroundImage: `url('${landingImages.hero}')`,
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 60%)',
            maskImage: 'linear-gradient(to right, transparent, black 60%)' 
          }} 
        />

        {/* Mobile contrast overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-card/90 via-card/50 to-card/90 lg:hidden pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full px-6 md:px-12 lg:px-16 relative z-10 pt-16">
          <div className="w-full max-w-2xl space-y-6 text-center lg:text-left mx-auto lg:mx-0">
            <h1 className="text-[2.2rem] md:text-[3rem] lg:text-[3.8rem] font-extrabold leading-[1.1] tracking-tight text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Le Premier Bar à Jus <br className="hidden md:block"/>
              Piloté par <span className="text-primary brightness-110 dark:brightness-125">un nutritionniste</span>
            </h1>

            <p className="text-sm font-bold uppercase tracking-wider text-secondary">
              Votre santé mérite du sur-mesure
            </p>

            <p className="text-base md:text-lg text-foreground/90 dark:text-foreground/80 leading-relaxed max-w-lg mx-auto lg:mx-0 font-medium">
              Discutez avec NutriFYS, votre assistant nutritionniste, pour concevoir des cocktails santé uniques à partir de fruits frais du Cameroun. Recevez des jus pressés à froid, validés cliniquement pour répondre à vos objectifs : énergie, immunité ou détox.
            </p>

            <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start pt-4">
              <Link
                to="/lab"
                className="h-12 px-7 rounded-full text-sm font-bold flex items-center gap-2.5 active:scale-[0.97] transition-all shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Composez mon jus 100% naturel
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/lab?tab=nutrifys"
                className="h-12 px-7 rounded-full text-sm font-bold flex items-center gap-2.5 active:scale-[0.97] transition-all bg-background border border-border/80 hover:bg-muted/50 text-foreground shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-secondary" />
                Discuter avec l'assistant
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer z-20" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
          <Mouse className="w-5 h-5 text-foreground animate-bounce" />
          <ChevronDown className="w-4 h-4 text-foreground/70 -mt-2 animate-pulse" />
        </div>
      </section>

      {/* ━━━ STATS BAR ━━━ */}
      <section className="py-12 md:py-16 px-5 md:px-8 relative z-10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
          {[
            { value: fruitsLoading || fruits.length === 0 ? '30+' : `${fruits.length}+`, label: 'Fruits disponibles', icon: Leaf, color: '#3F6D4E' },
            { value: '2 min', label: 'Pour créer un jus', icon: Zap, color: '#E0982E' },
            { value: '100%', label: 'Naturel et frais', icon: ShieldCheck, color: '#F2694A' },
            { value: recipesCount === null ? '500+' : `${recipesCount}+`, label: 'Recettes créées', icon: Users, color: '#AECBB2' },
          ].map((stat, i) => (
            <div key={i} className="bg-card rounded-3xl p-6 md:p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-border/40 flex flex-col items-center gap-3 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2" style={{ background: `color-mix(in srgb, ${stat.color} 15%, transparent)`, color: stat.color }}>
                <stat.icon className="w-6 h-6" />
              </div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{stat.value}</p>
              <p className="text-xs md:text-sm text-muted-foreground font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ HOW IT WORKS ━━━ */}
      <div id="how-it-works" className="w-full overflow-hidden leading-none relative z-0 scroll-mt-24">
        <svg viewBox="0 0 1440 120" className="w-full h-[50px] md:h-[100px] block" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,96L80,85.3C160,75,320,53,480,58.7C640,64,800,96,960,101.3C1120,107,1280,85,1360,74.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" className="fill-[#E0982E]/[0.08] dark:fill-[#E0982E]/[0.10]"></path>
        </svg>
      </div>
      <section className="py-12 md:py-20 px-5 md:px-8 bg-[#E0982E]/[0.08] dark:bg-[#E0982E]/[0.10] relative overflow-hidden z-0">
        <div className="absolute inset-0 z-0 opacity-[0.10] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#E0982E 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Simple comme <span style={{ color: '#E0982E' }}>bonjour</span>
            </h2>
          </div>

          <div className="max-w-3xl mx-auto relative">
            {[
              {
                step: '01',
                title: 'Choisissez vos fruits',
                desc: 'Parcourez notre sélection de fruits de saison ou décrivez vos besoins à NutriFYS, votre assistant nutritionniste.',
                color: '#F2694A',
                img: landingImages.step1,
              },
              {
                step: '02',
                title: 'Validation nutritionnelle',
                desc: 'Votre assistant nutritionniste analyse votre mélange : score santé, bénéfices ciblés, interactions et précautions personnalisées.',
                color: '#3F6D4E',
                img: landingImages.step2,
              },
              {
                step: '03',
                title: 'Dégustez',
                desc: 'Commandez votre cocktail et recevez-le frais, pressé avec amour par notre équipe à Yaoundé.',
                color: '#E0982E',
                img: landingImages.step3,
              },
            ].map((item, i, arr) => {
              const isActive = activeProcessStep === i;
              const isLast = i === arr.length - 1;
              return (
                <div 
                  key={i} 
                  ref={(el) => { stepRefs.current[i] = el; }}
                  data-step-index={i}
                  className="relative pl-14 md:pl-24 pb-4 md:pb-8 group"
                >
                  {/* Ligne temporelle (Timeline) */}
                  {!isLast && (
                    <div className="absolute top-14 left-6 md:left-10 bottom-0 w-[2px] transition-colors duration-500" style={{ backgroundColor: isActive ? item.color : 'hsl(var(--border) / 0.8)' }} />
                  )}

                  {/* Point / Numéro */}
                  <div 
                    onClick={() => setActiveProcessStep(i)}
                    className={`absolute left-0 md:left-3 top-4 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-extrabold text-lg md:text-xl cursor-pointer shadow-sm z-10 transition-transform duration-700 ${isActive ? 'scale-110' : 'scale-100'}`}
                    style={{ 
                      background: isActive ? item.color : 'var(--muted)', 
                      color: isActive ? '#fff' : 'var(--muted-foreground)',
                      fontFamily: 'var(--font-display)',
                      boxShadow: isActive ? `0 0 0 6px color-mix(in srgb, ${item.color} 15%, transparent)` : 'none'
                    }}
                  >
                    {item.step}
                  </div>

                  {/* Contenu (Accordeon) */}
                  <div 
                    onClick={() => setActiveProcessStep(i)}
                    className={`cursor-pointer group rounded-[2.5rem] border transition-all duration-700 overflow-hidden
                      ${isActive 
                        ? 'bg-white/40 dark:bg-black/40 backdrop-blur-[32px] saturate-[150%] shadow-[0_8px_32px_rgba(0,0,0,0.08)] border-white/60 dark:border-white/10' 
                        : 'bg-transparent border-transparent hover:bg-white/20 dark:hover:bg-black/10 opacity-60 hover:opacity-90'
                      }`}
                  >
                    <div className="p-6 md:p-10 flex items-center justify-between gap-4">
                      <h3 className={`text-xl md:text-3xl font-extrabold tracking-tight transition-colors duration-500 ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground/80'}`} style={{ fontFamily: 'var(--font-display)' }}>
                        {item.title}
                      </h3>
                      {/* Indicateur d'état */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all duration-700 ${isActive ? 'bg-white/50 dark:bg-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]' : 'bg-muted/50 group-hover:bg-muted'}`}>
                        <ChevronDown className={`w-6 h-6 transition-transform duration-700 ${isActive ? 'rotate-180 text-foreground' : 'text-muted-foreground'}`} />
                      </div>
                    </div>

                    <div className={`grid transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden">
                        <div className="px-6 md:px-10 pb-10 space-y-8">
                          <p className="text-foreground/80 leading-relaxed font-medium text-lg">
                            {item.desc}
                          </p>
                          <div className="w-full aspect-[16/10] sm:aspect-[21/9] rounded-3xl overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] relative group/img">
                            <div className="absolute inset-0 bg-black/10 group-hover/img:bg-transparent transition-colors z-10" />
                            <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700" />
                          </div>
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


      {/* ━━━ FEATURES ━━━ */}
      <div className="w-full overflow-hidden leading-none relative z-0">
        <svg viewBox="0 0 1440 120" className="w-full h-[50px] md:h-[100px] block" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,64L80,53.3C160,43,320,21,480,26.7C640,32,800,64,960,74.7C1120,85,1280,75,1360,69.3L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" className="fill-[#3F6D4E]/[0.08] dark:fill-[#3F6D4E]/15"></path>
        </svg>
      </div>
      <section id="features" className="py-12 md:py-20 px-5 md:px-8 bg-[#3F6D4E]/[0.08] dark:bg-[#3F6D4E]/15 relative overflow-hidden z-0">
        <div className="absolute inset-0 z-0 opacity-[0.10] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3F6D4E 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Deux façons de <span style={{ color: '#F2694A' }}>créer</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Vous êtes l'artisan ou vous confiez la recette à votre assistant nutritionniste. À vous de choisir.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Card 1 — User Compose */}
            <Link to="/lab" className="block rounded-[2.5rem] border border-border/50 overflow-hidden bg-card/60 backdrop-blur-md group hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
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
                <h3 className="text-xl font-bold text-foreground">Composez vous-même</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Choisissez vos fruits préférés parmi notre sélection de saison. Ajoutez des compléments (gingembre, miel, citron…). NutriFYS valide automatiquement votre mélange et vous donne le score santé, les bénéfices et les précautions.
                </p>
                <div className="inline-flex items-center gap-1.5 text-sm font-bold group-hover:gap-3 transition-all" style={{ color: '#E0982E' }}>
                  Essayer le FYS Lab <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            {/* Card 2 — NutriFYS Compose */}
            <Link to="/lab?tab=nutrifys" className="block rounded-[2.5rem] border border-border/50 overflow-hidden bg-card/60 backdrop-blur-md group hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
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
                <h3 className="text-xl font-bold text-foreground">Confiez-le à NutriFYS</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Décrivez simplement ce que vous ressentez : fatigue, problème de digestion, besoin d'énergie… Votre assistant nutritionniste compose instantanément un jus adapté à votre profil de santé, vos allergies et vos objectifs.
                </p>
                <div className="inline-flex items-center gap-1.5 text-sm font-bold group-hover:gap-3 transition-all" style={{ color: '#3F6D4E' }}>
                  Parler à NutriFYS <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>
      <div className="w-full overflow-hidden leading-none bg-[#3F6D4E]/[0.08] dark:bg-[#3F6D4E]/15 relative z-0">
        <svg viewBox="0 0 1440 120" className="w-full h-[50px] md:h-[100px] block" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,32L80,42.7C160,53,320,75,480,74.7C640,75,800,53,960,42.7C1120,32,1280,32,1360,32L1440,32L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" className="fill-background"></path>
        </svg>
      </div>

      {/* ━━━ PRODUCT GALLERY ━━━ */}
      <section className="py-16 md:py-24 px-5 md:px-8 relative overflow-hidden z-0">
        <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(currentColor 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Nos <span style={{ color: '#3F6D4E' }}>créations</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Chaque bouteille est une œuvre unique, composée avec les meilleurs fruits du terroir camerounais.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { src: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=500&auto=format&fit=crop', label: 'Boost Énergie' },
              { src: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?q=80&w=500&auto=format&fit=crop', label: 'Détox Verte' },
              { src: 'https://images.unsplash.com/photo-1546173159-315724a31696?q=80&w=500&auto=format&fit=crop', label: 'Immunité Plus' },
              { src: 'https://images.unsplash.com/photo-1560717789-0ac7c58ac90a?q=80&w=500&auto=format&fit=crop', label: 'Tropical Sunset' },
            ].map((item, i) => (
              <div key={i} className="group relative rounded-[2rem] overflow-hidden aspect-[3/4] cursor-pointer border border-border/50 shadow-sm hover:shadow-xl transition-all duration-500">
                <img src={item.src} alt={item.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F3A28]/90 via-[#1F3A28]/20 to-transparent group-hover:from-[#1F3A28] transition-colors" />
                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                  <p className="text-white font-extrabold text-base md:text-lg tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ NUTRIFYS SECTION ━━━ */}
      <section id="nutrifys" className="py-20 md:py-24 px-5 md:px-8 relative overflow-hidden z-0">
        
        {/* Texture subtile en points (Nodes) */}
        <div className="absolute inset-0 z-0 opacity-[0.10] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#F2694A 2px, transparent 2px)', backgroundSize: '40px 40px' }} />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-[3rem] p-8 md:p-12 lg:p-16 shadow-2xl relative overflow-hidden">
            
            {/* Décoration d'arrière-plan de la carte */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
              {/* Visual */}
              <div className="order-2 lg:order-1 relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-2xl group-hover:bg-primary/30 transition-colors duration-700" />
                <img
                  src={landingImages.nutrifysAssistant}
                  alt="NutriFYS — votre assistant nutritionniste personnel"
                  className="w-full rounded-[2.5rem] shadow-2xl relative z-10 border border-border/40"
                />
              </div>

              {/* Content */}
              <div className="order-1 lg:order-2 space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{ background: '#F2694A20', color: '#F2694A' }}>
                  <Sparkles className="w-3.5 h-3.5" />
                  Assistant Nutritionniste
                </div>

                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]" style={{ fontFamily: 'var(--font-display)' }}>
                  Rencontrez <span className="text-primary">NutriFYS</span>
                </h2>

                <p className="text-lg text-muted-foreground leading-relaxed font-medium">
                  NutriFYS est votre assistant nutritionniste personnel. Dites-lui ce que vous ressentez, vos envies, vos contraintes. Il compose un cocktail adapté, valide chaque ingrédient, et vous fournit une fiche nutritionnelle complète.
                </p>

                <ul className="space-y-4">
                  {[
                    'Analyse en temps réel de votre mélange',
                    'Prise en compte de vos allergies et conditions',
                    'Score de santé et bénéfices ciblés',
                    'Fiche nutritionnelle téléchargeable en PDF',
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
                    Parler à NutriFYS
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
        <div className="absolute inset-0 z-0 opacity-[0.10] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3F6D4E 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Fruits & <span className="text-primary">Suppléments</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Découvrez la liste de nos ingrédients 100% naturels, soigneusement sélectionnés pour vos cocktails.
            </p>
          </div>

          {fruitsLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6 pb-8">
              {fruits.map((fruit) => {
                const unavailable = !isUsableFruit(fruit);
                return (
                  <div
                    key={fruit.id}
                    onClick={() => setSelectedFruit(fruit)}
                    className="relative bg-card/40 hover:bg-card/60 w-full p-2.5 rounded-[1.5rem] border border-border/40 shadow-sm transition-all duration-300 group flex flex-col items-center cursor-pointer hover:-translate-y-1"
                  >
                    <div className="w-full aspect-square rounded-[1.25rem] overflow-hidden mb-3 relative bg-muted">
                      {unavailable && (
                        <span className="absolute top-2 right-2 z-10 text-[8px] font-bold uppercase tracking-widest bg-black/70 text-white px-2 py-0.5 rounded-full backdrop-blur-md">
                          ÉPUISÉ
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

      {/* ━━━ CTA FINAL ━━━ */}
      <section className="py-24 px-5 md:px-8 relative overflow-hidden z-0">
        <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(currentColor 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
        <div className="max-w-5xl mx-auto bg-card rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden border border-border/50 shadow-2xl z-10">
          
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent opacity-50 pointer-events-none" />
          
          {/* Image de fond subtile (comme le Hero) */}
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center pointer-events-none opacity-[0.12] dark:opacity-[0.10] transition-opacity"
            style={{ 
              backgroundImage: `url('${landingImages.hero}')`,
              maskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)' 
            }} 
          />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]" style={{ fontFamily: 'var(--font-display)' }}>
              Prêt à créer <span className="text-primary brightness-110 dark:brightness-125">votre premier jus</span> ?
            </h2>
            <p className="text-lg md:text-xl text-foreground/80 font-medium">
              Rejoignez la communauté FYS et découvrez une nouvelle façon de prendre soin de votre santé, un cocktail à la fois.
            </p>
            <div className="pt-4 flex justify-center">
              <Link
                to="/lab"
                className="inline-flex h-16 px-12 items-center justify-center gap-3 rounded-full text-lg font-bold active:scale-95 transition-all shadow-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Commencer gratuitement
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
              <img src="/logos/fys_logo.png" alt="FYS Logo" className="h-8 w-auto grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all" />
              <span className="text-xl font-extrabold font-display tracking-tight text-foreground">FYS</span>
            </div>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-sm">
              Le premier bar à jus santé du Cameroun, piloté par un assistant nutritionniste. Des recettes 100% naturelles, pressées à froid, qui répondent vraiment à votre corps.
            </p>
          </div>
          
          <div className="lg:col-span-4 space-y-6 lg:ml-auto">
            <h4 className="font-bold text-foreground text-sm uppercase tracking-wider">Contact & Aide</h4>
            <ul className="text-sm md:text-base text-muted-foreground space-y-4">
              <li className="flex items-center gap-3 hover:text-foreground transition-colors cursor-pointer">
                <Phone className="w-4 h-4 text-primary" /> WhatsApp : +237 6 00 00 00 00
              </li>
              <li className="flex items-center gap-3 hover:text-foreground transition-colors cursor-pointer">
                <Mail className="w-4 h-4 text-primary" /> contact@fys.cm
              </li>
              <li className="flex items-center gap-3 hover:text-foreground transition-colors cursor-pointer">
                <MapPin className="w-4 h-4 text-primary" /> Yaoundé, Cameroun
              </li>
            </ul>
          </div>
          
          <div className="lg:col-span-3 space-y-6 lg:ml-auto">
            <h4 className="font-bold text-foreground text-sm uppercase tracking-wider">Liens Rapides</h4>
            <ul className="text-sm md:text-base text-muted-foreground space-y-4">
              <li><Link to="/lab" className="hover:text-primary transition-colors flex items-center gap-2">FYS Lab</Link></li>
              <li><Link to="/board/catalogue" className="hover:text-primary transition-colors flex items-center gap-2">Notre Catalogue</Link></li>
              <li><Link to="/board/profile" className="hover:text-primary transition-colors flex items-center gap-2">Mon Profil Santé</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs md:text-sm text-muted-foreground font-medium">
          <p>© {new Date().getFullYear()} FYS · Du made in Cameroun</p>
          <div className="flex items-center gap-6">
            <span className="cursor-pointer hover:text-foreground transition-colors">Mentions Légales</span>
            <span className="cursor-pointer hover:text-foreground transition-colors">Politique de Confidentialité</span>
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
