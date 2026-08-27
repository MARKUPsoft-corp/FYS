import { PageComponent, Link, useNavigate } from 'rasengan';
import { useEffect } from 'react';
import { ArrowRight, Sparkles, Leaf, Heart, ChevronRight, Play, CheckCircle2, Users, Zap, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useTheme } from '@rasenganjs/theme';
import { useAuthStore } from '@/stores/auth';

/* ─────────────────────────────────────────────
   FYS Landing Page — Premium, Clean, Épurée
   Palette : Vert forêt #3F6D4E · Orange corail #F2694A · Doré #E0982E · Crème #FDFBF7 · Menthe #AECBB2
   ───────────────────────────────────────────── */

const RootIndex: PageComponent = () => {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();
  const { actualTheme, setTheme } = useTheme();

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
            <a href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">Comment ça marche</a>
            <a href="#nutrifys" className="hover:text-foreground transition-colors">NutriFYS</a>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="size-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              aria-label="Changer le thème"
            >
              {actualTheme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            </button>

            <Link
              to="/auth/login"
              className="hidden sm:flex h-10 px-5 rounded-full border-2 border-primary text-primary text-sm font-bold items-center gap-2 hover:bg-primary/5 active:scale-95 transition-all"
            >
              Se connecter
            </Link>

            <Link
              to="/board"
              className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              Commencer
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ━━━ HERO ━━━ */}
      <section className="pt-24 md:pt-28 px-4 md:px-8 pb-8">
        <div
          className="max-w-7xl mx-auto rounded-[2rem] md:rounded-[2.5rem] overflow-hidden relative px-6 md:px-12 lg:px-16 pt-12 pb-8 md:pt-16 md:pb-10"
          style={{ background: 'color-mix(in srgb, var(--muted) 40%, var(--background))' }}
        >
          {/* Decorative circles — hidden on mobile */}
          <div className="hidden md:block absolute top-8 left-8 w-20 h-20 rounded-full opacity-20" style={{ background: '#AECBB2' }} />
          <div className="hidden md:block absolute bottom-12 right-16 w-14 h-14 rounded-full opacity-15" style={{ background: '#E0982E' }} />
          <div className="hidden md:block absolute top-1/3 right-1/4 w-8 h-8 rounded-full opacity-10" style={{ background: '#F2694A' }} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-6 items-center relative z-10">

            {/* Left — Text Content */}
            <div className="space-y-6 text-center lg:text-left order-1">
              <h1 className="text-[2.2rem] md:text-[3rem] lg:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Des Fruits{' '}
                <span style={{ color: '#3F6D4E' }}>Frais</span>,{'\n'}
                Un Jus{' '}
                <span style={{ color: '#F2694A' }}>Sur Mesure</span>
              </h1>

              <p className="text-sm font-bold uppercase tracking-wider" style={{ color: '#F2694A' }}>
                Votre bien-être, notre recette
              </p>

              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0">
                Composez votre cocktail ou laissez NutriFYS, votre assistant nutritionniste, créer la recette idéale selon votre santé.
              </p>

              <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start pt-1">
                <Link
                  to="/board"
                  className="h-12 px-7 rounded-full text-sm font-bold flex items-center gap-2.5 active:scale-[0.97] transition-all shadow-md"
                  style={{ background: '#3F6D4E', color: '#fff' }}
                >
                  Commencer
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="h-12 px-5 rounded-full text-sm font-semibold flex items-center gap-2 bg-card border border-border hover:shadow-md transition-all"
                >
                  <Play className="w-3.5 h-3.5" fill="currentColor" />
                  Voir comment
                </a>
              </div>
            </div>

            {/* Right — Hero Visual (hidden on mobile) */}
            <div className="hidden lg:flex relative justify-center order-2 py-4">
              {/* Main circular image — clean, no badges */}
              <div className="w-[380px] h-[380px] rounded-full overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1610970881699-44a5587cabec?q=80&w=800&auto=format&fit=crop"
                  alt="Bol de fruits frais — FYS App"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Bottom — Product Thumbnails */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 mt-8 md:mt-10 relative z-10">
            {[
              { src: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=300&auto=format&fit=crop', name: 'Boost Énergie', tag: 'Populaire' },
              { src: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?q=80&w=300&auto=format&fit=crop', name: 'Détox Verte', tag: 'Nouveau' },
              { src: 'https://images.unsplash.com/photo-1546173159-315724a31696?q=80&w=300&auto=format&fit=crop', name: 'Immunité +', tag: 'Saison' },
              { src: 'https://images.unsplash.com/photo-1560717789-0ac7c58ac90a?q=80&w=300&auto=format&fit=crop', name: 'Tropical', tag: 'Best-seller' },
            ].map((item, i) => (
              <div
                key={i}
                className={`bg-card border border-border rounded-xl p-2.5 flex flex-col items-center gap-2 hover:shadow-md transition-shadow cursor-pointer ${i === 3 ? 'hidden md:flex' : ''}`}
              >
                <div className="w-full aspect-square rounded-lg overflow-hidden">
                  <img src={item.src} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="text-center w-full">
                  <p className="text-xs font-bold truncate">{item.name}</p>
                  <p className="text-[10px] font-medium" style={{ color: '#3F6D4E' }}>{item.tag}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ STATS BAR ━━━ */}
      <section className="border-y border-border/50 py-10 px-5 md:px-8" style={{ background: 'color-mix(in srgb, var(--muted) 30%, transparent)' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '30+', label: 'Fruits disponibles', icon: Leaf, color: '#3F6D4E' },
            { value: '2 min', label: 'Pour créer un jus', icon: Zap, color: '#E0982E' },
            { value: '100%', label: 'Naturel et frais', icon: ShieldCheck, color: '#F2694A' },
            { value: '500+', label: 'Recettes créées', icon: Users, color: '#AECBB2' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              <p className="text-2xl md:text-3xl font-extrabold">{stat.value}</p>
              <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ FEATURES ━━━ */}
      <section id="features" className="py-24 px-5 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: '#F2694A' }}>Fonctionnalités</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Deux façons de créer votre jus parfait
            </h2>
            <p className="text-muted-foreground text-lg">
              Vous êtes l'artisan ou vous confiez la recette à votre assistant nutritionniste. À vous de choisir.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Card 1 — User Compose */}
            <div className="rounded-[1.5rem] border border-border overflow-hidden bg-card group hover:shadow-lg transition-shadow">
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?q=80&w=800&auto=format&fit=crop"
                  alt="Composition manuelle de jus de fruits — FYS"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#E0982E20', color: '#E0982E' }}>
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">Composez vous-même</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Choisissez vos fruits préférés parmi notre sélection de saison. Ajoutez des compléments (gingembre, miel, citron…). NutriFYS valide automatiquement votre mélange et vous donne le score santé, les bénéfices et les précautions.
                </p>
                <Link to="/lab" className="inline-flex items-center gap-1.5 text-sm font-bold hover:gap-3 transition-all" style={{ color: '#E0982E' }}>
                  Essayer le FYS Lab <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 2 — NutriFYS Compose */}
            <div className="rounded-[1.5rem] border border-border overflow-hidden bg-card group hover:shadow-lg transition-shadow">
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1542125387-c71274d94f0a?q=80&w=800&auto=format&fit=crop"
                  alt="NutriFYS assistant nutritionniste — cocktail santé"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#3F6D4E20', color: '#3F6D4E' }}>
                  <Heart className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">Confiez-le à NutriFYS</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Décrivez simplement ce que vous ressentez : fatigue, problème de digestion, besoin d'énergie… Votre assistant nutritionniste compose instantanément un jus adapté à votre profil de santé, vos allergies et vos objectifs.
                </p>
                <Link to="/lab?tab=nutrifys" className="inline-flex items-center gap-1.5 text-sm font-bold hover:gap-3 transition-all" style={{ color: '#3F6D4E' }}>
                  Parler à NutriFYS <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ PRODUCT GALLERY ━━━ */}
      <section className="py-24 px-5 md:px-8 border-y border-border/50" style={{ background: 'color-mix(in srgb, var(--muted) 20%, transparent)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: '#3F6D4E' }}>Nos créations</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Des jus qui font du bien
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
              <div key={i} className="group relative rounded-2xl overflow-hidden aspect-[3/4] cursor-pointer">
                <img src={item.src} alt={item.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white font-bold text-sm md:text-base">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ HOW IT WORKS ━━━ */}
      <section id="how-it-works" className="py-24 px-5 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: '#E0982E' }}>Processus</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Simple comme bonjour
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {[
              {
                step: '01',
                title: 'Choisissez vos fruits',
                desc: 'Parcourez notre sélection de fruits de saison ou décrivez vos besoins à NutriFYS, votre assistant nutritionniste.',
                color: '#F2694A',
                img: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?q=80&w=500&auto=format&fit=crop',
              },
              {
                step: '02',
                title: 'Validation nutritionnelle',
                desc: 'Votre assistant nutritionniste analyse votre mélange : score santé, bénéfices ciblés, interactions et précautions personnalisées.',
                color: '#3F6D4E',
                img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=500&auto=format&fit=crop',
              },
              {
                step: '03',
                title: 'Dégustez',
                desc: 'Commandez votre cocktail et recevez-le frais, pressé avec amour par notre équipe à Yaoundé.',
                color: '#E0982E',
                img: 'https://images.unsplash.com/photo-1570696516188-ade861b84a49?q=80&w=500&auto=format&fit=crop',
              },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center space-y-5">
                <div className="w-full aspect-square rounded-[1.5rem] overflow-hidden shadow-md">
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-extrabold" style={{ color: item.color, fontFamily: 'var(--font-display)' }}>{item.step}</span>
                  <h3 className="text-lg font-bold">{item.title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ NUTRIFYS SECTION ━━━ */}
      <section id="nutrifys" className="py-24 px-5 md:px-8 border-y border-border/50" style={{ background: 'color-mix(in srgb, var(--primary) 4%, transparent)' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Visual */}
          <div className="order-2 lg:order-1">
            <img
              src="https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=800&auto=format&fit=crop"
              alt="NutriFYS — votre assistant nutritionniste personnel"
              className="w-full rounded-[2rem] shadow-xl"
            />
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{ background: '#F2694A20', color: '#F2694A' }}>
              <Sparkles className="w-3.5 h-3.5" />
              Assistant Nutritionniste
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Rencontrez <span style={{ color: '#3F6D4E' }}>NutriFYS</span>
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed">
              NutriFYS est votre assistant nutritionniste personnel. Dites-lui ce que vous ressentez, vos envies, vos contraintes. Il compose un cocktail adapté, valide chaque ingrédient, et vous fournit une fiche nutritionnelle complète.
            </p>

            <ul className="space-y-4">
              {[
                'Analyse en temps réel de votre mélange',
                'Prise en compte de vos allergies et conditions',
                'Score de santé et bénéfices ciblés',
                'Fiche nutritionnelle téléchargeable en PDF',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3F6D4E' }} />
                  <span className="text-foreground font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <Link
              to="/lab?tab=nutrifys"
              className="inline-flex h-12 px-6 items-center gap-2 rounded-full text-sm font-bold active:scale-95 transition-all"
              style={{ background: '#F2694A', color: '#fff' }}
            >
              Parler à NutriFYS
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━ CTA FINAL ━━━ */}
      <section className="py-24 px-5 md:px-8 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Prêt à créer <span style={{ color: '#F2694A' }}>votre premier jus</span> ?
          </h2>
          <p className="text-lg text-muted-foreground">
            Rejoignez la communauté FYS et découvrez une nouvelle façon de prendre soin de votre santé, un cocktail à la fois.
          </p>
          <Link
            to="/board"
            className="inline-flex h-14 px-10 items-center gap-3 rounded-full text-base font-bold active:scale-95 transition-all shadow-lg"
            style={{ background: '#3F6D4E', color: '#fff' }}
          >
            Commencer gratuitement
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer className="border-t border-border/50 py-12 px-5 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img src="/logos/fys_logo.png" alt="FYS Logo" className="h-8 w-auto" />
            <span className="text-lg font-bold">FYS</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/lab" className="hover:text-foreground transition-colors">FYS Lab</Link>
            <Link to="/board/catalogue" className="hover:text-foreground transition-colors">Catalogue</Link>
            <Link to="/board/profile" className="hover:text-foreground transition-colors">Mon Profil</Link>
          </div>
          <p className="text-sm text-muted-foreground text-center md:text-right">
            © {new Date().getFullYear()} FYS · Conçu au Cameroun
          </p>
        </div>
      </footer>
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
