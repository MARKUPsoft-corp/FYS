import { PageComponent, Link, useNavigate } from 'rasengan';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth';

// ── Keyframes + scroll reveal (injected once into <head>) ────────
const LP_STYLES = `
  @keyframes lp-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.42;transform:scale(.78)}}
  @keyframes lp-ring{from{box-shadow:0 0 0 3px rgba(212,137,10,.22)}to{box-shadow:0 0 0 8px rgba(212,137,10,.06)}}
  @keyframes lp-bar{from{width:0}to{width:85%}}
  .lp-rv{opacity:0;transform:translateY(22px);transition:opacity .62s ease,transform .62s ease}
  .lp-rv.lp-vis{opacity:1;transform:translateY(0)}
  .lp-rv[data-delay="1"]{transition-delay:.12s}
  .lp-rv[data-delay="2"]{transition-delay:.22s}
  .lp-rv[data-delay="3"]{transition-delay:.32s}
  .lp-pulse-dot{animation:lp-pulse 2.2s ease-in-out infinite}
  .lp-ring{animation:lp-ring .9s ease-in-out infinite alternate}
  .lp-bar{animation:lp-bar 1.4s ease-out .5s both}
  @media(prefers-reduced-motion:reduce){.lp-rv{opacity:1;transform:none;transition:none}.lp-pulse-dot,.lp-ring{animation:none}.lp-bar{animation:none;width:85%}}
`;

// ── Shared tiny helpers ──────────────────────────────────────────
function FChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-semibold bg-primary/10 border border-primary/20 text-primary">
      {children}
    </span>
  );
}

// ── NAV ─────────────────────────────────────────────────────────
function LPNav({ scrolled }: { scrolled: boolean }) {
  return (
    <nav
      className={`sticky top-0 z-50 border-b border-border/70 transition-shadow duration-200 ${scrolled ? 'shadow-md shadow-black/5 dark:shadow-black/20' : ''}`}
      style={{ background: 'color-mix(in srgb, var(--background) 92%, transparent)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10 flex items-center justify-between h-16 gap-6">
        <a href="#" className="flex items-center gap-2 shrink-0">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-[17px] select-none" aria-hidden="true">🌿</div>
          <span className="font-display font-bold text-xl tracking-tight text-foreground">FYS</span>
        </a>

        <div className="hidden md:flex items-center gap-7">
          {[['#comment', 'Comment ça marche'], ['#features', 'Fonctionnalités'], ['#app', 'Application'], ['#avis', 'Avis']].map(([href, label]) => (
            <a key={href} href={href} className="text-[14px] text-muted-foreground hover:text-foreground transition-colors">
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/auth/login"
            className="hidden sm:inline-flex items-center px-4 py-2 rounded-full text-[14px] font-semibold text-muted-foreground border border-border hover:text-foreground hover:bg-muted/60 transition-all"
          >
            Se connecter
          </Link>
          <Link
            to="/board"
            className="inline-flex items-center px-4 py-2 rounded-full text-[14px] font-semibold bg-primary text-primary-foreground hover:opacity-90 hover:-translate-y-px transition-all shadow-[0_4px_16px_rgba(63,109,78,0.30)]"
          >
            Commander
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── HERO ────────────────────────────────────────────────────────
function PhoneMockup() {
  return (
    <div style={{ width: 260, background: '#0F1C15', borderRadius: 44, padding: 13, boxShadow: '0 40px 80px rgba(0,0,0,.2), 0 0 0 1px rgba(255,255,255,.05)', position: 'relative', zIndex: 1 }}>
      <div style={{ background: 'var(--background)', borderRadius: 32, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px 8px', fontSize: 11, fontWeight: 700, color: 'var(--foreground)' }}>
          <span>9:41</span>
          <span style={{ letterSpacing: 2, fontSize: 9 }}>● ● ●</span>
        </div>
        <div style={{ padding: '0 13px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 800, color: 'var(--primary)' }}>Bonjour, Aïcha 👋</div>

          {/* Cocktail card */}
          <div style={{ background: 'var(--card)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,.08)' }}>
            <div style={{ height: 90, background: 'linear-gradient(135deg,#4A9E6A 0%,#2D6B48 60%,#3F8A5C 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, position: 'relative' }}>
              🥭
              <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,.96)', borderRadius: 100, padding: '3px 9px', fontSize: 9.5, fontWeight: 800, color: '#2D7A46' }}>
                ✨ Bénéfique
              </div>
            </div>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--foreground)', marginBottom: 2 }}>Énergie Tropicale</div>
              <div style={{ fontSize: 10, color: 'var(--muted-foreground)', marginBottom: 6 }}>Mangue · Ananas · Citron · Gingembre</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--primary)' }}>3 500 XAF</span>
                <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 100, padding: '4px 10px', fontSize: 9.5, fontWeight: 700 }}>Commander</span>
              </div>
            </div>
          </div>

          {/* AI card */}
          <div style={{ background: 'linear-gradient(135deg,#3F6D4E,#2A4A35)', borderRadius: 14, padding: 11 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', marginBottom: 5 }}>NutriFYS · Analyse IA</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 8 }}>✨ Bénéfique · 85 / 100</div>
            <div style={{ height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 2, overflow: 'hidden' }}>
              <div className="lp-bar" style={{ height: '100%', background: 'linear-gradient(to right,#7edd9a,#4ade80)', borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,.65)', marginTop: 7, lineHeight: 1.5 }}>
              Excellente source de vitamine C. Aucun allergène détecté.
            </div>
          </div>

          {/* Fruit chips */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {['🍊 Orange', '🥝 Kiwi', '🍓 Fraise'].map((f) => (
              <span key={f} style={{ background: 'var(--accent)', color: 'var(--accent-foreground)', borderRadius: 100, padding: '3.5px 9px', fontSize: 9.5, fontWeight: 600 }}>{f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LPHero() {
  return (
    <section className="relative overflow-hidden" style={{ padding: 'clamp(56px,7vw,100px) 0' }}>
      {/* Ambient blob */}
      <div
        className="absolute -top-48 -right-40 w-[660px] h-[660px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 13%, transparent) 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center" style={{ gap: 'clamp(32px,5vw,80px)' }}>

          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[12px] font-semibold tracking-wide uppercase text-primary mb-6">
              <span className="lp-pulse-dot size-[7px] rounded-full bg-[#D4890A]" aria-hidden="true" />
              Analyse IA · 100 % Naturel · Livraison
            </div>

            <h1
              className="font-display font-medium text-foreground leading-[1.06] tracking-tight mb-5 text-wrap-balance"
              style={{ fontSize: 'clamp(44px,6vw,82px)' }}
            >
              Des jus taillés<br />pour <em className="not-italic text-primary">votre santé</em>.
            </h1>

            <p className="text-muted-foreground leading-relaxed mb-8 max-w-[460px]" style={{ fontSize: 'clamp(15px,1.5vw,17px)' }}>
              FYS analyse votre profil de santé — allergies, conditions médicales, objectifs — et compose des cocktails de fruits parfaitement adaptés à votre corps. Frais, naturels, livrés.
            </p>

            <div className="flex items-center gap-3.5 flex-wrap mb-9">
              <Link
                to="/board"
                className="inline-flex items-center gap-2 rounded-full text-[16px] font-semibold bg-primary text-primary-foreground hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-[0_4px_24px_rgba(63,109,78,0.35)]"
                style={{ padding: '16px 36px' }}
              >
                Commander un cocktail
              </Link>
              <a
                href="#comment"
                className="inline-flex items-center gap-2 rounded-full text-[16px] font-semibold text-muted-foreground border border-border hover:text-foreground hover:bg-muted/50 transition-all"
                style={{ padding: '16px 36px' }}
              >
                Comment ça marche
              </a>
            </div>

            <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
              <span className="text-[#D4890A] tracking-wider text-[14px]">★★★★★</span>
              <span>Rejoignez nos clients qui boivent mieux</span>
            </div>
          </div>

          <div className="hidden md:flex justify-center">
            <div className="relative">
              <div
                className="absolute inset-[-40px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--primary) 16%, transparent) 0%, transparent 70%)' }}
                aria-hidden="true"
              />
              <PhoneMockup />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── VALUE PROPS ──────────────────────────────────────────────────
const VALUES = [
  { icon: '🌿', title: '100 % Naturel', desc: "Fruits frais, sans additifs ni conservateurs. Chaque cocktail est composé d'ingrédients sélectionnés pour leur qualité nutritionnelle." },
  { icon: '🤖', title: 'IA Personnalisée', desc: "Notre moteur analyse votre profil — conditions, allergies, objectifs — et évalue chaque mélange avant que vous ne commandiez." },
  { icon: '🚀', title: 'Livraison rapide', desc: "De la composition à votre porte, en toute simplicité. Suivez votre commande en temps réel depuis l'application." },
];

function LPValues() {
  return (
    <section className="bg-card" style={{ padding: 'clamp(64px,8vw,110px) 0' }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10">
        <div className="lp-rv mb-12">
          <p className="text-[11px] font-bold tracking-[.12em] uppercase text-primary mb-2.5">Pourquoi FYS ?</p>
          <h2 className="font-display font-medium text-foreground tracking-tight leading-tight text-wrap-balance" style={{ fontSize: 'clamp(26px,3.5vw,44px)' }}>
            Une approche différente<br />de la nutrition par les fruits.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[clamp(24px,4vw,56px)]">
          {VALUES.map((v, i) => (
            <div key={v.title} className="lp-rv flex flex-col gap-3.5" data-delay={String(i + 1)}>
              <div className="size-[50px] rounded-[13px] bg-accent/40 flex items-center justify-center text-[22px]" aria-hidden="true">{v.icon}</div>
              <h3 className="font-display font-medium text-[19px] text-foreground">{v.title}</h3>
              <p className="text-[15px] text-muted-foreground leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── HOW IT WORKS ────────────────────────────────────────────────
const STEPS = [
  { icon: '👤', title: 'Profil santé', desc: "Renseignez vos conditions, allergies et objectifs. Cela permet à l'IA de personnaliser chaque analyse." },
  { icon: '🍊', title: 'Choisissez vos fruits', desc: 'Parcourez notre catalogue et composez votre mélange idéal, fruit par fruit.' },
  { icon: '✨', title: 'Analyse NutriFYS', desc: "L'IA évalue votre mélange et vous donne un verdict clair : bénéfique, neutre, ou à éviter." },
  { icon: '📦', title: 'Commandez', desc: 'Validez et suivez la progression de votre commande jusqu\'à la livraison.' },
];

function LPSteps() {
  return (
    <section id="comment" className="bg-muted" style={{ padding: 'clamp(64px,8vw,110px) 0' }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10">
        <div className="lp-rv text-center mb-14" style={{ maxWidth: 560, margin: '0 auto clamp(40px,5vw,60px)' }}>
          <p className="text-[11px] font-bold tracking-[.12em] uppercase text-primary mb-2.5">Le parcours</p>
          <h2 className="font-display font-medium text-foreground tracking-tight leading-tight" style={{ fontSize: 'clamp(26px,3.5vw,44px)' }}>
            De votre santé à votre verre,<br /><em className="not-italic text-primary">en quatre étapes</em>.
          </h2>
        </div>

        {/* Desktop: horizontal with dotted connector */}
        <div className="lp-rv hidden md:block relative">
          <div
            className="absolute top-[22px] pointer-events-none"
            style={{
              left: 'calc(12.5% + 26px)', right: 'calc(12.5% + 26px)', height: '1.5px',
              background: 'repeating-linear-gradient(to right, var(--accent) 0, var(--accent) 8px, transparent 8px, transparent 18px)',
            }}
            aria-hidden="true"
          />
          <div className="grid grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.title} className="flex flex-col items-center text-center gap-4 px-3">
                <div
                  className="size-[46px] rounded-full bg-primary flex items-center justify-center text-[19px] relative z-10 shrink-0"
                  style={{ boxShadow: '0 0 0 7px color-mix(in srgb,var(--primary) 12%,transparent)' }}
                  aria-hidden="true"
                >
                  {s.icon}
                </div>
                <div>
                  <p className="font-display font-semibold text-[15.5px] text-foreground mb-1.5">{s.title}</p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical list */}
        <div className="lp-rv flex flex-col gap-6 md:hidden">
          {STEPS.map((s) => (
            <div key={s.title} className="flex items-start gap-4">
              <div
                className="size-10 rounded-full bg-primary flex items-center justify-center text-[17px] shrink-0 mt-0.5"
                style={{ boxShadow: '0 0 0 6px color-mix(in srgb,var(--primary) 12%,transparent)' }}
                aria-hidden="true"
              >
                {s.icon}
              </div>
              <div>
                <p className="font-display font-semibold text-[15px] text-foreground mb-1">{s.title}</p>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FEATURE VISUALS ──────────────────────────────────────────────
function FV1() {
  return (
    <div className="rounded-[20px] p-5 flex flex-col gap-3" style={{ background: 'linear-gradient(145deg,#2A4A35,#1C3328)', minHeight: 240 }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)' }}>NutriFYS · Analyse</p>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,.15)', border: '1px solid rgba(74,222,128,.4)', color: '#4ade80', borderRadius: 100, padding: '4px 12px', fontSize: 13, fontWeight: 700, width: 'fit-content' }}>
        ✨ Bénéfique
      </span>
      <p style={{ fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
        85 <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.45)' }}>/ 100</span>
      </p>
      <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: 100, height: 8, overflow: 'hidden' }}>
        <div className="lp-bar" style={{ height: '100%', borderRadius: 100, background: 'linear-gradient(to right,#4ade80,#22c55e)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {[
          "Excellente source de vitamine C pour votre immunité",
          "Ces fruits s'associent bien et se renforcent mutuellement",
          "Aucun allergène détecté dans votre profil",
        ].map((note) => (
          <div key={note} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11.5, color: 'rgba(255,255,255,.65)', lineHeight: 1.45 }}>
            <span style={{ width: 5, height: 5, background: '#4ade80', borderRadius: '50%', flexShrink: 0, marginTop: 4 }} />
            <span>{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CATALOGUE_ITEMS = [
  { emoji: '🍊', name: 'Vitamine C+', price: '2 800 XAF', bg: 'linear-gradient(135deg,#F97316,#EA580C)' },
  { emoji: '🥝', name: 'Détox Verte', price: '3 200 XAF', bg: 'linear-gradient(135deg,#84CC16,#4D7C0F)' },
  { emoji: '🍓', name: 'Antioxydant', price: '3 000 XAF', bg: 'linear-gradient(135deg,#EC4899,#BE185D)' },
  { emoji: '🥭', name: 'Énergie Tropicale', price: '3 500 XAF', bg: 'linear-gradient(135deg,#EAB308,#A16207)' },
];

function FV2() {
  return (
    <div className="grid grid-cols-2 gap-2.5 p-4 rounded-[20px] bg-muted" style={{ minHeight: 240 }}>
      {CATALOGUE_ITEMS.map((item) => (
        <div key={item.name} className="bg-card rounded-xl overflow-hidden shadow-sm">
          <div style={{ height: 68, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{item.emoji}</div>
          <div style={{ padding: '8px 10px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground)', marginBottom: 2 }}>{item.name}</div>
            <div style={{ fontSize: 10.5, color: 'var(--primary)', fontWeight: 600 }}>{item.price}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const TIMELINE = [
  { label: 'Commande reçue', sub: '10 juil. · 14:32', state: 'done' as const },
  { label: 'Confirmée', sub: '10 juil. · 14:45', state: 'done' as const },
  { label: 'En préparation…', sub: 'En cours', state: 'active' as const },
  { label: 'Prête', sub: '', state: 'pending' as const },
  { label: 'Livrée', sub: '', state: 'pending' as const },
];

function FV3() {
  return (
    <div className="bg-card rounded-[20px] p-5" style={{ minHeight: 240 }}>
      <p className="font-display font-semibold text-foreground text-[12px] mb-4">Ma commande · Énergie Tropicale</p>
      <div className="flex flex-col">
        {TIMELINE.map((step, i) => (
          <div key={step.label} className="flex items-start gap-3">
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`size-6 rounded-full flex items-center justify-center text-[11px] font-bold z-10 ${step.state === 'done' ? 'bg-primary text-white' : step.state === 'pending' ? 'border border-dashed border-border text-muted-foreground' : 'text-white'}`}
                style={step.state === 'active' ? { background: '#D4890A' } : {}}
              >
                {step.state === 'done' ? '✓' : step.state === 'active' ? '⏳' : '○'}
              </div>
              {i < TIMELINE.length - 1 && (
                <div className={`w-0.5 min-h-[10px] my-0.5 flex-1 ${step.state === 'done' ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
            <div className="pb-3 pt-0.5">
              <p className={`text-[12px] font-bold ${step.state === 'pending' ? 'text-muted-foreground' : step.state === 'active' ? 'text-[#D4890A]' : 'text-foreground'}`}>
                {step.label}
              </p>
              {step.sub && <p className="text-[10.5px] text-muted-foreground">{step.sub}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FEATURES ────────────────────────────────────────────────────
function LPFeatures() {
  return (
    <section id="features" className="bg-card" style={{ padding: 'clamp(64px,8vw,110px) 0' }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10">
        <div className="lp-rv" style={{ marginBottom: 0 }}>
          <p className="text-[11px] font-bold tracking-[.12em] uppercase text-primary mb-2.5">Ce que vous obtenez</p>
          <h2 className="font-display font-medium text-foreground tracking-tight leading-tight" style={{ fontSize: 'clamp(26px,3.5vw,44px)' }}>
            Tout ce dont vous avez besoin<br />pour boire <em className="not-italic text-primary">mieux</em>.
          </h2>
        </div>

        {/* Feature 1 */}
        <div className="lp-rv grid grid-cols-1 md:grid-cols-2 items-center border-t border-border mt-12" style={{ gap: 'clamp(32px,5vw,80px)', padding: 'clamp(40px,5vw,64px) 0' }}>
          <div>
            <p className="text-[10.5px] font-bold tracking-[.12em] uppercase text-[#D4890A] mb-2.5">Analyse intelligente</p>
            <h3 className="font-display font-medium text-foreground tracking-tight leading-tight mb-3 text-wrap-balance" style={{ fontSize: 'clamp(21px,2.4vw,28px)' }}>
              Une IA qui lit votre mélange avant vous.
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4" style={{ fontSize: 15.5 }}>
              Avant chaque commande, NutriFYS évalue votre cocktail sur la base de votre profil de santé. Verdict, score sur 100, bénéfices détaillés — en langage simple, sans jargon médical.
            </p>
            <div className="flex flex-wrap gap-2">
              {['✨ Verdict personnalisé', '📊 Score nutritionnel', '⚠️ Alertes allergènes', '💡 Conseils adaptés'].map((c) => <FChip key={c}>{c}</FChip>)}
            </div>
          </div>
          <FV1 />
        </div>

        {/* Feature 2 */}
        <div className="lp-rv grid grid-cols-1 md:grid-cols-2 items-center border-t border-border" style={{ gap: 'clamp(32px,5vw,80px)', padding: 'clamp(40px,5vw,64px) 0' }}>
          <FV2 />
          <div>
            <p className="text-[10.5px] font-bold tracking-[.12em] uppercase text-[#D4890A] mb-2.5">Catalogue & personnalisation</p>
            <h3 className="font-display font-medium text-foreground tracking-tight leading-tight mb-3 text-wrap-balance" style={{ fontSize: 'clamp(21px,2.4vw,28px)' }}>
              Des recettes prêtes à l'emploi — ou créées par vous.
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4" style={{ fontSize: 15.5 }}>
              Choisissez parmi nos recettes sélectionnées par des experts, ou composez votre propre mélange. Le prix se calcule automatiquement selon les quantités choisies.
            </p>
            <div className="flex flex-wrap gap-2">
              {['🎨 Recettes catalogue', '🧪 Cocktails maison', '💰 Prix en temps réel'].map((c) => <FChip key={c}>{c}</FChip>)}
            </div>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="lp-rv grid grid-cols-1 md:grid-cols-2 items-center border-t border-border" style={{ gap: 'clamp(32px,5vw,80px)', padding: 'clamp(40px,5vw,64px) 0' }}>
          <div>
            <p className="text-[10.5px] font-bold tracking-[.12em] uppercase text-[#D4890A] mb-2.5">Suivi de commande</p>
            <h3 className="font-display font-medium text-foreground tracking-tight leading-tight mb-3 text-wrap-balance" style={{ fontSize: 'clamp(21px,2.4vw,28px)' }}>
              De la validation à la livraison, vous savez tout.
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4" style={{ fontSize: 15.5 }}>
              Cinq statuts clairs vous tiennent informé à chaque étape — de la réception à la livraison. Annulation possible avant la préparation.
            </p>
            <div className="flex flex-wrap gap-2">
              {['🔔 Statuts en temps réel', '❌ Annulation flexible', '📞 Contact admin direct'].map((c) => <FChip key={c}>{c}</FChip>)}
            </div>
          </div>
          <FV3 />
        </div>
      </div>
    </section>
  );
}

// ── PWA ─────────────────────────────────────────────────────────
function PWAMiniPhone({ cocktail, tilt, translateY, showOrder, showAnalysis }: {
  cocktail: { emoji: string; name: string; price: string };
  tilt: number; translateY: number;
  showOrder?: boolean; showAnalysis?: boolean;
}) {
  return (
    <div style={{ background: '#0F1C15', borderRadius: 32, padding: 9, boxShadow: '0 24px 48px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.05)', transform: `rotate(${tilt}deg) translateY(${translateY}px)` }}>
      <div style={{ background: 'var(--background)', borderRadius: 24, padding: 10, width: 110, minHeight: 180, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 800, color: 'var(--primary)' }}>FYS</span>
          <span style={{ fontSize: 9, color: 'rgba(63,109,78,.5)' }}>🌿</span>
        </div>
        {showAnalysis && (
          <div style={{ background: 'linear-gradient(135deg,#3F6D4E,#2A4A35)', borderRadius: 10, padding: 8 }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', marginBottom: 4 }}>Analyse IA</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>✨ Bénéfique</div>
            <div style={{ height: 3, background: 'rgba(255,255,255,.2)', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
              <div style={{ width: '85%', height: '100%', background: '#4ade80', borderRadius: 2 }} />
            </div>
          </div>
        )}
        <div style={{ background: 'var(--card)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ height: 44, background: 'linear-gradient(135deg,#4A9E6A,#2A4A35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{cocktail.emoji}</div>
          <div style={{ padding: '5px 7px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--foreground)' }}>{cocktail.name}</div>
            <div style={{ fontSize: 8.5, color: 'var(--primary)', fontWeight: 600 }}>{cocktail.price}</div>
          </div>
        </div>
        {showOrder && (
          <div style={{ background: 'var(--card)', borderRadius: 10, padding: '6px 8px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--foreground)', marginBottom: 5 }}>Ma commande</div>
            {[['var(--primary)', 'Confirmée'], ['#D4890A', 'En préparation'], ['var(--border)', 'Livrée']].map(([col, lbl]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8, color: 'var(--muted-foreground)', marginBottom: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0 }} />
                {lbl}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LPPWA() {
  return (
    <section id="app" className="dark:bg-[#0F1A12]" style={{ background: '#1E3828', padding: 'clamp(64px,8vw,110px) 0' }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center" style={{ gap: 'clamp(40px,6vw,80px)' }}>
          <div className="lp-rv">
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginBottom: 11 }}>
              Application mobile
            </p>
            <h2 className="font-display font-medium leading-tight tracking-tight text-white text-wrap-balance mb-3" style={{ fontSize: 'clamp(24px,3vw,38px)' }}>
              Emportez FYS partout avec vous.
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,.68)', lineHeight: 1.72, marginBottom: 26 }}>
              Installez FYS directement sur votre téléphone — sans passer par l'App Store ni Google Play. Disponible sur iOS et Android en quelques secondes.
            </p>
            <div className="flex flex-col gap-2.5 mb-6">
              {[
                { icon: '📱', text: "iOS · Safari → Partager → Ajouter à l'écran d'accueil" },
                { icon: '🤖', text: "Android · Chrome → ⋮ → Ajouter à l'écran d'accueil" },
              ].map((b) => (
                <div key={b.icon} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 11, fontSize: 13, fontWeight: 600, color: '#fff' }}>
                  <span style={{ fontSize: 17 }}>{b.icon}</span>{b.text}
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.13)', borderRadius: 11, padding: '13px 15px', fontSize: 13, color: 'rgba(255,255,255,.72)', display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.55 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
              <span>Une fois installée, FYS fonctionne même avec une connexion intermittente. Vos cocktails et votre profil restent disponibles hors ligne.</span>
            </div>
          </div>

          <div className="lp-rv hidden md:flex justify-center items-end gap-4" data-delay="1">
            <PWAMiniPhone cocktail={{ emoji: '🍊', name: 'Vitamine C+', price: '2 800 XAF' }} tilt={-5} translateY={10} showOrder />
            <PWAMiniPhone cocktail={{ emoji: '🥭', name: 'Énergie Tropicale', price: '3 500 XAF' }} tilt={5} translateY={14} showAnalysis />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── TESTIMONIALS ────────────────────────────────────────────────
const TESTIMONIALS = [
  { quote: "J'ai découvert que l'association mangue-gingembre me convient parfaitement selon mon profil. Je commande chaque semaine ! L'analyse IA m'a vraiment ouvert les yeux.", name: 'Aïcha M.', loc: 'Douala', init: 'A', color: 'var(--primary)' },
  { quote: "L'analyse m'a aidé à éviter certains fruits à cause de mon hypertension. Le verdict était clair, sans termes compliqués. Je me sens vraiment pris en charge.", name: 'Jean-Pierre K.', loc: 'Yaoundé', init: 'J', color: '#1E5A8A' },
  { quote: "Mon cocktail anti-fatigue est devenu mon rituel du matin. L'app est tellement simple — j'ai créé mon profil en deux minutes et commandé dans la foulée.", name: 'Marie-Claire O.', loc: 'Bafoussam', init: 'M', color: '#7C3AED' },
];

function LPTestimonials() {
  return (
    <section id="avis" style={{ padding: 'clamp(64px,8vw,110px) 0' }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10">
        <div className="lp-rv text-center mb-12" style={{ maxWidth: 520, margin: '0 auto clamp(36px,5vw,56px)' }}>
          <p className="text-[11px] font-bold tracking-[.12em] uppercase text-primary mb-2.5">Avis clients</p>
          <h2 className="font-display font-medium text-foreground tracking-tight leading-tight" style={{ fontSize: 'clamp(26px,3.5vw,44px)' }}>
            Ils boivent mieux,<br />ils en parlent.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              className="lp-rv bg-card border border-border rounded-[var(--radius)] p-6 flex flex-col gap-3.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              data-delay={String(i + 1)}
            >
              <div className="text-[#D4890A] tracking-widest text-[14.5px]" aria-label="5 étoiles">★★★★★</div>
              <p className="text-[14.5px] text-foreground leading-relaxed flex-1">{`« ${t.quote} »`}</p>
              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <div className="size-9 rounded-full flex items-center justify-center font-bold text-[14px] text-white shrink-0" style={{ background: t.color }} aria-hidden="true">
                  {t.init}
                </div>
                <div>
                  <p className="font-bold text-[13.5px] text-foreground">{t.name}</p>
                  <p className="text-[11.5px] text-muted-foreground">{t.loc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── BOTTOM CTA ──────────────────────────────────────────────────
function LPBottomCTA() {
  return (
    <section className="bg-primary relative overflow-hidden" style={{ padding: 'clamp(64px,8vw,110px) 0' }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 25% 50%,rgba(255,255,255,.07) 0%,transparent 55%), radial-gradient(ellipse at 75% 50%,rgba(0,0,0,.12) 0%,transparent 55%)' }}
        aria-hidden="true"
      />
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10 text-center relative z-10">
        <div className="lp-rv max-w-[580px] mx-auto">
          <h2 className="font-display font-medium text-white tracking-tight leading-tight text-wrap-balance mb-3" style={{ fontSize: 'clamp(28px,4vw,46px)' }}>
            Prêt à boire ce qui vous fait vraiment du bien ?
          </h2>
          <p className="mb-8" style={{ fontSize: 16, color: 'rgba(255,255,255,.72)' }}>
            Créez votre profil en deux minutes. Votre premier cocktail vous attend.
          </p>
          <div className="flex justify-center gap-3 flex-wrap mb-6">
            <Link
              to="/board"
              className="inline-flex items-center rounded-full font-semibold bg-white text-[#2A4A35] hover:-translate-y-0.5 transition-all shadow-[0_4px_20px_rgba(0,0,0,.18)] hover:shadow-[0_7px_28px_rgba(0,0,0,.22)]"
              style={{ fontSize: 16, padding: '16px 36px' }}
            >
              Commander mon premier cocktail
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex items-center rounded-full font-semibold text-white border border-white/40 hover:bg-white/10 hover:border-white/75 transition-all"
              style={{ fontSize: 16, padding: '16px 36px' }}
            >
              Créer mon compte
            </Link>
          </div>
          <div className="flex justify-center gap-6 flex-wrap">
            {['🌿 Ingrédients naturels', '✨ Analyse IA gratuite', '🚀 Livraison rapide'].map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'rgba(255,255,255,.58)' }}>{item}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── FOOTER ──────────────────────────────────────────────────────
function LPFooter() {
  return (
    <footer
      className="flex items-center justify-between gap-5 flex-wrap px-5 sm:px-10 py-7"
      style={{ background: 'var(--foreground)' }}
    >
      <span className="font-display font-bold text-[20px]" style={{ color: 'color-mix(in srgb, var(--background) 80%, transparent)' }}>FYS</span>
      <nav className="flex gap-6" aria-label="Liens footer">
        {['Contact', 'Confidentialité', "Conditions d'utilisation"].map((l) => (
          <a key={l} href="#" className="text-[12.5px] transition-colors" style={{ color: 'color-mix(in srgb, var(--background) 40%, transparent)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'color-mix(in srgb, var(--background) 80%, transparent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'color-mix(in srgb, var(--background) 40%, transparent)')}
          >
            {l}
          </a>
        ))}
      </nav>
      <span className="text-[11.5px]" style={{ color: 'color-mix(in srgb, var(--background) 28%, transparent)' }}>
        © 2025 FYS — For Your Self
      </span>
    </footer>
  );
}

// ── PAGE ────────────────────────────────────────────────────────
const RootIndex: PageComponent = () => {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();
  const [navScrolled, setNavScrolled] = useState(false);

  // Redirect authenticated users to the dashboard
  useEffect(() => {
    if (!loading && user) navigate('/board');
  }, [user, loading, navigate]);

  // Nav shadow + scroll reveal setup
  useEffect(() => {
    // Inject animation keyframes
    if (!document.getElementById('lp-styles')) {
      const el = document.createElement('style');
      el.id = 'lp-styles';
      el.textContent = LP_STYLES;
      document.head.appendChild(el);
    }

    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });

    // Scroll reveal via IntersectionObserver — defer one tick for DOM readiness
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('lp-vis'); observer.unobserve(e.target); } }),
      { threshold: 0.1 },
    );
    const timer = setTimeout(() => {
      document.querySelectorAll('.lp-rv').forEach((el) => observer.observe(el));
    }, 0);

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="bg-background text-foreground overflow-x-hidden min-h-screen">
      <LPNav scrolled={navScrolled} />
      <LPHero />
      <LPValues />
      <LPSteps />
      <LPFeatures />
      <LPPWA />
      <LPTestimonials />
      <LPBottomCTA />
      <LPFooter />
    </div>
  );
};

RootIndex.path = '/';
RootIndex.metadata = {
  title: 'FYS — Des jus conçus pour votre santé',
  description: "FYS analyse votre profil de santé et compose des cocktails de fruits parfaitement adaptés à votre corps.",
};

export default RootIndex;
