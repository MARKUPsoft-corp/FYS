import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowRight, ShieldCheck, Compass, Heart, Leaf } from 'lucide-react';

export type SignatureStepId = 'elan' | 'heritage' | 'centre' | 'creation' | 'ancrage';

interface StepMeta {
  id: SignatureStepId;
  index: number;
  number: string;
  side: 'left' | 'right';
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const STEPS_META: StepMeta[] = [
  { id: 'elan', index: 0, number: '01', side: 'left', icon: Compass, accentColor: '#E0982E' },
  { id: 'heritage', index: 1, number: '02', side: 'right', icon: ShieldCheck, accentColor: '#3F6D4E' },
  { id: 'centre', index: 2, number: '03', side: 'left', icon: Heart, accentColor: '#E0982E' },
  { id: 'creation', index: 3, number: '04', side: 'right', icon: Sparkles, accentColor: '#3F6D4E' },
  { id: 'ancrage', index: 4, number: '05', side: 'left', icon: Leaf, accentColor: '#3F6D4E' },
];

export function FysSignatureSection() {
  const { t, i18n } = useTranslation();
  const [activeStep, setActiveStep] = useState<SignatureStepId>('centre');
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayRef = useRef<number | null>(null);

  // Auto-play cycling when not hovered by the user
  useEffect(() => {
    if (isPaused) return;

    autoPlayRef.current = window.setInterval(() => {
      setActiveStep((prev) => {
        const currIdx = STEPS_META.findIndex((s) => s.id === prev);
        const nextIdx = (currIdx + 1) % STEPS_META.length;
        return STEPS_META[nextIdx].id;
      });
    }, 4500);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isPaused]);

  const activeIndex = STEPS_META.findIndex((s) => s.id === activeStep);

  return (
    <section
      id="signature"
      className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-background border-y border-border/50 scroll-mt-20"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Subtle Geometric Cameroonian Cultural Watermark (Background) ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] dark:opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%233F6D4E' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0L80 40L40 80zM40 18L18 40L40 62L62 40z'/%3E%3Ccircle cx='40' cy='40' r='5'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Ambient Radial Juice Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* ━━━ SECTION HEADER ━━━ */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24 space-y-4">
          <div className="inline-flex items-center justify-center gap-3">
            <span className="w-8 sm:w-12 h-px bg-primary/40" />
            <span className="text-primary text-xs sm:text-sm font-bold tracking-widest uppercase flex items-center gap-1.5">
              <span className="text-[#E0982E] text-base">◇</span>
              {t('signature.badge', 'Identité & Terroir')}
              <span className="text-[#E0982E] text-base">◇</span>
            </span>
            <span className="w-8 sm:w-12 h-px bg-primary/40" />
          </div>

          <h2
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground uppercase"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('signature.title', 'LA SIGNATURE FYS')}
          </h2>

          <p className="text-lg sm:text-xl md:text-2xl font-serif italic text-muted-foreground">
            {t('signature.subtitle', 'Un symbole. Une identité. Une appartenance.')}
          </p>
        </div>

        {/* ━━━ INTERACTIVE TOTEM EXPERIENCE (DESKTOP GRID) ━━━ */}
        <div className="hidden lg:grid grid-cols-12 gap-8 items-center min-h-[620px]">
          
          {/* LEFT COLUMN : Steps 01 (Élan), 03 (Soi au Centre), 05 (Ancrage) */}
          <div className="col-span-4 flex flex-col justify-between h-full py-4 space-y-8">
            {STEPS_META.filter((s) => s.side === 'left').map((step) => {
              const isSelected = activeStep === step.id;
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`group relative p-6 rounded-3xl cursor-pointer border transition-all duration-500 text-right ${
                    isSelected
                      ? 'bg-card shadow-xl border-primary/40 scale-[1.03] ring-1 ring-primary/20'
                      : 'bg-card/40 hover:bg-card border-border/40 hover:border-border/80 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-end gap-3 mb-2">
                    <span
                      className={`font-mono text-xs font-black px-2.5 py-0.5 rounded-full transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
                      }`}
                    >
                      {step.number}
                    </span>
                    <h3 className="font-display font-bold text-xl text-foreground">
                      {t(`signature.steps.${step.id}.title`)}
                    </h3>
                    <div
                      className={`size-8 rounded-xl flex items-center justify-center transition-all ${
                        isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                  </div>

                  <p className="text-xs font-bold text-[#E0982E] uppercase tracking-wider mb-2">
                    {t(`signature.steps.${step.id}.subtitle`)}
                  </p>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`signature.steps.${step.id}.desc`)}
                  </p>

                  {/* Active pointer line directed towards center totem */}
                  {isSelected && (
                    <div className="absolute top-1/2 -right-3 -translate-y-1/2 size-3 rounded-full bg-[#E0982E] border-2 border-background shadow-md animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>

          {/* CENTER COLUMN : The FYS Vector Totem */}
          <div className="col-span-4 flex flex-col items-center justify-center relative">
            <div className="relative w-[220px] h-[580px] flex items-center justify-center">
              <svg
                viewBox="0 0 200 600"
                className="w-full h-full drop-shadow-[0_10px_25px_rgba(31,58,40,0.12)] dark:drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)] transition-all duration-700"
              >
                {/* Vertical Central Baseline Guideline */}
                <line
                  x1="100"
                  y1="10"
                  x2="100"
                  y2="590"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  className="text-border/60"
                />

                {/* ── 01. L'ÉLAN (Top Capsule) ── */}
                <g
                  onClick={() => setActiveStep('elan')}
                  className="cursor-pointer group/elan"
                >
                  <rect
                    x="94"
                    y="25"
                    width="12"
                    height="65"
                    rx="6"
                    className={`transition-all duration-500 ${
                      activeStep === 'elan'
                        ? 'fill-[#E0982E] filter drop-shadow-[0_0_12px_rgba(224,152,46,0.6)]'
                        : 'fill-[#1F3A28] dark:fill-[#AECBB2] hover:fill-[#E0982E]/80'
                    }`}
                  />
                  {/* Indicator Line to Step 01 */}
                  {activeStep === 'elan' && (
                    <circle cx="100" cy="57" r="4" fill="#E0982E" className="animate-ping" />
                  )}
                </g>

                {/* ── 02. L'HÉRITAGE (Top Double Diamond) ── */}
                <g
                  onClick={() => setActiveStep('heritage')}
                  className="cursor-pointer group/heritage"
                >
                  <path
                    d="M 100 115 L 148 175 L 100 235 L 52 175 Z M 100 138 L 74 175 L 100 212 L 126 175 Z"
                    fillRule="evenodd"
                    className={`transition-all duration-500 ${
                      activeStep === 'heritage'
                        ? 'fill-[#3F6D4E] filter drop-shadow-[0_0_14px_rgba(63,109,78,0.7)]'
                        : 'fill-[#1F3A28] dark:fill-[#AECBB2] hover:fill-[#3F6D4E]/80'
                    }`}
                  />
                  {activeStep === 'heritage' && (
                    <circle cx="148" cy="175" r="4" fill="#E0982E" className="animate-ping" />
                  )}
                </g>

                {/* ── 03. SOI, AU CENTRE (Concentric Circle + Center Dot) ── */}
                <g
                  onClick={() => setActiveStep('centre')}
                  className="cursor-pointer group/centre"
                >
                  {/* Outer Ring */}
                  <circle
                    cx="100"
                    cy="300"
                    r="38"
                    fill="none"
                    strokeWidth="11"
                    className={`transition-all duration-500 ${
                      activeStep === 'centre'
                        ? 'stroke-[#E0982E] filter drop-shadow-[0_0_15px_rgba(224,152,46,0.7)]'
                        : 'stroke-[#1F3A28] dark:stroke-[#AECBB2] hover:stroke-[#E0982E]/80'
                    }`}
                  />
                  {/* Inner Dot */}
                  <circle
                    cx="100"
                    cy="300"
                    r="15"
                    className={`transition-all duration-500 ${
                      activeStep === 'centre'
                        ? 'fill-[#E0982E] filter drop-shadow-[0_0_12px_rgba(224,152,46,0.8)]'
                        : 'fill-[#1F3A28] dark:fill-[#AECBB2]'
                    }`}
                  />
                  {activeStep === 'centre' && (
                    <circle cx="62" cy="300" r="4" fill="#E0982E" className="animate-ping" />
                  )}
                </g>

                {/* ── 04. LA CRÉATION (Bottom Double Diamond) ── */}
                <g
                  onClick={() => setActiveStep('creation')}
                  className="cursor-pointer group/creation"
                >
                  <path
                    d="M 100 365 L 148 425 L 100 485 L 52 425 Z M 100 388 L 74 425 L 100 462 L 126 425 Z"
                    fillRule="evenodd"
                    className={`transition-all duration-500 ${
                      activeStep === 'creation'
                        ? 'fill-[#3F6D4E] filter drop-shadow-[0_0_14px_rgba(63,109,78,0.7)]'
                        : 'fill-[#1F3A28] dark:fill-[#AECBB2] hover:fill-[#3F6D4E]/80'
                    }`}
                  />
                  {activeStep === 'creation' && (
                    <circle cx="148" cy="425" r="4" fill="#E0982E" className="animate-ping" />
                  )}
                </g>

                {/* ── 05. L'ANCRAGE (Bottom Capsule) ── */}
                <g
                  onClick={() => setActiveStep('ancrage')}
                  className="cursor-pointer group/ancrage"
                >
                  <rect
                    x="94"
                    y="510"
                    width="12"
                    height="65"
                    rx="6"
                    className={`transition-all duration-500 ${
                      activeStep === 'ancrage'
                        ? 'fill-[#3F6D4E] filter drop-shadow-[0_0_12px_rgba(63,109,78,0.7)]'
                        : 'fill-[#1F3A28] dark:fill-[#AECBB2] hover:fill-[#3F6D4E]/80'
                    }`}
                  />
                  {activeStep === 'ancrage' && (
                    <circle cx="100" cy="542" r="4" fill="#E0982E" className="animate-ping" />
                  )}
                </g>
              </svg>
            </div>

            {/* Quick helper badge */}
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-2">
              {t('signature.clickPrompt', 'Cliquez sur un symbole pour explorer')}
            </p>
          </div>

          {/* RIGHT COLUMN : Steps 02 (Héritage), 04 (Création) */}
          <div className="col-span-4 flex flex-col justify-around h-full py-12 space-y-8">
            {STEPS_META.filter((s) => s.side === 'right').map((step) => {
              const isSelected = activeStep === step.id;
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`group relative p-6 rounded-3xl cursor-pointer border transition-all duration-500 text-left ${
                    isSelected
                      ? 'bg-card shadow-xl border-primary/40 scale-[1.03] ring-1 ring-primary/20'
                      : 'bg-card/40 hover:bg-card border-border/40 hover:border-border/80 opacity-75 hover:opacity-100'
                  }`}
                >
                  {/* Active pointer line directed towards center totem */}
                  {isSelected && (
                    <div className="absolute top-1/2 -left-3 -translate-y-1/2 size-3 rounded-full bg-[#E0982E] border-2 border-background shadow-md animate-pulse" />
                  )}

                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`size-8 rounded-xl flex items-center justify-center transition-all ${
                        isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <h3 className="font-display font-bold text-xl text-foreground">
                      {t(`signature.steps.${step.id}.title`)}
                    </h3>
                    <span
                      className={`font-mono text-xs font-black px-2.5 py-0.5 rounded-full transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
                      }`}
                    >
                      {step.number}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                    {t(`signature.steps.${step.id}.subtitle`)}
                  </p>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`signature.steps.${step.id}.desc`)}
                  </p>
                </div>
              );
            })}
          </div>

        </div>

        {/* ━━━ MOBILE & TABLET LAYOUT (VERTICAL TIMELINE) ━━━ */}
        <div className="lg:hidden flex flex-col items-center space-y-6">
          {/* Miniature Totem Header */}
          <div className="w-[140px] h-[360px] p-2 bg-card/60 backdrop-blur-md rounded-3xl border border-border/50 shadow-md">
            <svg viewBox="0 0 200 600" className="w-full h-full">
              <line x1="100" y1="10" x2="100" y2="590" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-border/60" />
              <rect
                x="94"
                y="25"
                width="12"
                height="65"
                rx="6"
                onClick={() => setActiveStep('elan')}
                className={`cursor-pointer transition-all ${activeStep === 'elan' ? 'fill-[#E0982E]' : 'fill-[#1F3A28] dark:fill-[#AECBB2]'}`}
              />
              <path
                d="M 100 115 L 148 175 L 100 235 L 52 175 Z M 100 138 L 74 175 L 100 212 L 126 175 Z"
                fillRule="evenodd"
                onClick={() => setActiveStep('heritage')}
                className={`cursor-pointer transition-all ${activeStep === 'heritage' ? 'fill-[#3F6D4E]' : 'fill-[#1F3A28] dark:fill-[#AECBB2]'}`}
              />
              <circle
                cx="100"
                cy="300"
                r="38"
                fill="none"
                strokeWidth="11"
                onClick={() => setActiveStep('centre')}
                className={`cursor-pointer transition-all ${activeStep === 'centre' ? 'stroke-[#E0982E]' : 'stroke-[#1F3A28] dark:stroke-[#AECBB2]'}`}
              />
              <circle
                cx="100"
                cy="300"
                r="15"
                onClick={() => setActiveStep('centre')}
                className={`cursor-pointer transition-all ${activeStep === 'centre' ? 'fill-[#E0982E]' : 'fill-[#1F3A28] dark:fill-[#AECBB2]'}`}
              />
              <path
                d="M 100 365 L 148 425 L 100 485 L 52 425 Z M 100 388 L 74 425 L 100 462 L 126 425 Z"
                fillRule="evenodd"
                onClick={() => setActiveStep('creation')}
                className={`cursor-pointer transition-all ${activeStep === 'creation' ? 'fill-[#3F6D4E]' : 'fill-[#1F3A28] dark:fill-[#AECBB2]'}`}
              />
              <rect
                x="94"
                y="510"
                width="12"
                height="65"
                rx="6"
                onClick={() => setActiveStep('ancrage')}
                className={`cursor-pointer transition-all ${activeStep === 'ancrage' ? 'fill-[#3F6D4E]' : 'fill-[#1F3A28] dark:fill-[#AECBB2]'}`}
              />
            </svg>
          </div>

          {/* Cards List */}
          <div className="w-full space-y-3">
            {STEPS_META.map((step) => {
              const isSelected = activeStep === step.id;
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-card border-primary shadow-lg ring-1 ring-primary/20'
                      : 'bg-card/50 border-border/40 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {step.number}
                      </span>
                      <h3 className="font-display font-bold text-lg text-foreground">
                        {t(`signature.steps.${step.id}.title`)}
                      </h3>
                    </div>
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-bold text-[#E0982E] uppercase mb-1">
                    {t(`signature.steps.${step.id}.subtitle`)}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t(`signature.steps.${step.id}.desc`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ━━━ BOTTOM EMBLEM & LOGO INTEGRATION BANNER ━━━ */}
        <div className="mt-16 md:mt-24 p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-card/80 to-card border border-border/60 backdrop-blur-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
          <div className="flex items-center gap-5">
            <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              {/* Standalone Totem mini icon */}
              <svg viewBox="0 0 100 200" className="size-10 text-primary">
                <rect x="47" y="10" width="6" height="25" rx="3" fill="currentColor" />
                <path d="M 50 45 L 70 70 L 50 95 L 30 70 Z M 50 55 L 40 70 L 50 85 L 60 70 Z" fillRule="evenodd" fill="currentColor" />
                <circle cx="50" cy="115" r="16" fill="none" stroke="currentColor" strokeWidth="5" />
                <circle cx="50" cy="115" r="6" fill="currentColor" />
                <path d="M 50 135 L 70 160 L 50 185 L 30 160 Z M 50 145 L 40 160 L 50 175 L 60 160 Z" fillRule="evenodd" fill="currentColor" />
                <rect x="47" y="190" width="6" height="25" rx="3" fill="currentColor" />
              </svg>
            </div>
            <div>
              <p className="font-display font-bold text-lg text-foreground">
                {t('signature.tagline', 'De nos racines à votre quotidien.')}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t('signature.integratedInLogo', 'Ce symbole sacré est gravé dans la lettre F de notre logo officiel.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <a
              href="#about"
              className="h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md"
            >
              {t('signature.cta', 'Découvrir nos fondateurs')}
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}
