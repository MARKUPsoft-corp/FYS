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

const STEP_PERCENTAGES: Record<SignatureStepId, number> = {
  elan: 6.8,
  heritage: 27.5,
  centre: 50.0,
  creation: 72.5,
  ancrage: 93.2,
};

export function FysSignatureSection() {
  const { t } = useTranslation();
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

  const currentMetaIndex = STEPS_META.findIndex((s) => s.id === activeStep);
  const currentStepMeta = STEPS_META[currentMetaIndex] || STEPS_META[2];
  const nextMetaIndex = (currentMetaIndex + 1) % STEPS_META.length;
  const nextStep = STEPS_META[nextMetaIndex];
  const ActiveIcon = currentStepMeta.icon;

  return (
    <section
      id="signature"
      className="py-16 md:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-background border-y border-border/50 scroll-mt-20"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Subtle Geometric Cameroonian Cultural Watermark (Background) ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] dark:opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%233F6D4E' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0L80 40L40 80zM40 18L18 40L40 62L62 40z'/%3E%3Cpath d='M40 30L30 40L40 50L50 40z'/%3E%3Ccircle cx='40' cy='40' r='3.5'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Ambient Radial Juice Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* ━━━ SECTION HEADER ━━━ */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-24 space-y-3 sm:space-y-4">
          <div className="inline-flex items-center justify-center gap-3">
            <span className="w-8 sm:w-12 h-px bg-primary/40" />
            <span className="text-primary text-xs sm:text-sm font-bold tracking-widest uppercase flex items-center gap-2">
              {/* Little diamond ornament from official poster */}
              <svg viewBox="0 0 20 20" className="size-3.5 text-[#E0982E] inline-block">
                <path d="M 10 2 L 18 10 L 10 18 L 2 10 Z M 10 6 L 6 10 L 10 14 L 14 10 Z" fill="currentColor" fillRule="evenodd" />
              </svg>
              {t('signature.badge', 'Identité & Terroir')}
              <svg viewBox="0 0 20 20" className="size-3.5 text-[#E0982E] inline-block">
                <path d="M 10 2 L 18 10 L 10 18 L 2 10 Z M 10 6 L 6 10 L 10 14 L 14 10 Z" fill="currentColor" fillRule="evenodd" />
              </svg>
            </span>
            <span className="w-8 sm:w-12 h-px bg-primary/40" />
          </div>

          <h2
            className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground uppercase"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('signature.title', 'LA SIGNATURE FYS')}
          </h2>

          <p className="text-base sm:text-xl md:text-2xl font-serif italic text-muted-foreground">
            {t('signature.subtitle', 'Un symbole. Une identité. Une appartenance.')}
          </p>
        </div>

        {/* ━━━ INTERACTIVE TOTEM EXPERIENCE (DESKTOP GRID) ━━━ */}
        <div className="hidden lg:grid grid-cols-12 gap-6 xl:gap-8 items-center min-h-[660px]">
          
          {/* LEFT COLUMN : Steps 01 (Élan), 03 (Soi au Centre), 05 (Ancrage) */}
          <div className="col-span-4 flex flex-col justify-between h-full py-2 space-y-6">
            {STEPS_META.filter((s) => s.side === 'left').map((step) => {
              const isSelected = activeStep === step.id;
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`group relative p-6 rounded-3xl cursor-pointer border transition-all duration-500 text-right ${
                    isSelected
                      ? 'bg-card shadow-xl border-primary/50 scale-[1.03] ring-1 ring-primary/20'
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

          {/* CENTER COLUMN : The FYS Vector Totem (Exact Sacred Geometry) */}
          <div className="col-span-4 flex flex-col items-center justify-center relative">
            <div className="relative w-[220px] h-[640px] flex items-center justify-center">
              <svg
                viewBox="0 0 200 660"
                className="w-full h-full drop-shadow-[0_12px_30px_rgba(31,58,40,0.15)] dark:drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)] transition-all duration-700"
              >
                {/* ── 01. L'ÉLAN (Top Segment: Pointed chevron tip ^ at top, flat bottom) ── */}
                <g
                  onClick={() => setActiveStep('elan')}
                  className="cursor-pointer group/elan"
                >
                  <path
                    d="M 92.5,18 L 100,10 L 107.5,18 L 107.5,90 L 92.5,90 Z"
                    className={`transition-all duration-500 ${
                      activeStep === 'elan'
                        ? 'fill-[#E0982E] filter drop-shadow-[0_0_14px_rgba(224,152,46,0.8)]'
                        : 'fill-[#1F3A28] dark:fill-[#AECBB2] hover:fill-[#E0982E]/80'
                    }`}
                  />
                  {/* Leader line to Step 01 (Left) */}
                  <line
                    x1="92"
                    y1="50"
                    x2="40"
                    y2="50"
                    strokeWidth="1.2"
                    className={`transition-all duration-500 ${
                      activeStep === 'elan' ? 'stroke-[#E0982E]' : 'stroke-border/50'
                    }`}
                  />
                  <circle
                    cx="40"
                    cy="50"
                    r="3.5"
                    className={`transition-all duration-500 ${
                      activeStep === 'elan' ? 'fill-[#E0982E] animate-ping' : 'fill-border/60'
                    }`}
                  />
                  <circle
                    cx="40"
                    cy="50"
                    r="3"
                    className={`transition-all duration-500 ${
                      activeStep === 'elan' ? 'fill-[#E0982E]' : 'fill-border/60'
                    }`}
                  />
                </g>

                {/* ── 02. L'HÉRITAGE (Top Nested Diamond: Outer Diamond Ring + Inner Solid Diamond) ── */}
                <g
                  onClick={() => setActiveStep('heritage')}
                  className="cursor-pointer group/heritage"
                >
                  {/* Outer Diamond Ring with diamond cutout */}
                  <path
                    d="M 100,104 L 150,184 L 100,264 L 50,184 Z M 100,130 L 67,184 L 100,238 L 133,184 Z"
                    fillRule="evenodd"
                    className={`transition-all duration-500 ${
                      activeStep === 'heritage'
                        ? 'fill-[#3F6D4E] filter drop-shadow-[0_0_16px_rgba(63,109,78,0.8)]'
                        : 'fill-[#1F3A28] dark:fill-[#AECBB2] hover:fill-[#3F6D4E]/80'
                    }`}
                  />
                  {/* Inner Solid Diamond */}
                  <path
                    d="M 100,158 L 114,184 L 100,210 L 86,184 Z"
                    className={`transition-all duration-500 ${
                      activeStep === 'heritage'
                        ? 'fill-[#E0982E] filter drop-shadow-[0_0_12px_rgba(224,152,46,0.85)]'
                        : 'fill-[#1F3A28] dark:fill-[#AECBB2] hover:fill-[#3F6D4E]/80'
                    }`}
                  />
                  {/* Leader line to Step 02 (Right) */}
                  <line
                    x1="150"
                    y1="184"
                    x2="178"
                    y2="184"
                    strokeWidth="1.2"
                    className={`transition-all duration-500 ${
                      activeStep === 'heritage' ? 'stroke-[#E0982E]' : 'stroke-border/50'
                    }`}
                  />
                  <circle
                    cx="178"
                    cy="184"
                    r="3.5"
                    className={`transition-all duration-500 ${
                      activeStep === 'heritage' ? 'fill-[#E0982E] animate-ping' : 'fill-border/60'
                    }`}
                  />
                  <circle
                    cx="178"
                    cy="184"
                    r="3"
                    className={`transition-all duration-500 ${
                      activeStep === 'heritage' ? 'fill-[#E0982E]' : 'fill-border/60'
                    }`}
                  />
                </g>

                {/* ── 03. SOI, AU CENTRE (Concentric Circle Ring + Inner Solid Center Dot) ── */}
                <g
                  onClick={() => setActiveStep('centre')}
                  className="cursor-pointer group/centre"
                >
                  {/* Outer Circle Ring */}
                  <circle
                    cx="100"
                    cy="330"
                    r="44.5"
                    fill="none"
                    strokeWidth="15"
                    className={`transition-all duration-500 ${
                      activeStep === 'centre'
                        ? 'stroke-[#E0982E] filter drop-shadow-[0_0_18px_rgba(224,152,46,0.8)]'
                        : 'stroke-[#1F3A28] dark:stroke-[#AECBB2] hover:stroke-[#E0982E]/80'
                    }`}
                  />
                  {/* Inner Solid Center Dot */}
                  <circle
                    cx="100"
                    cy="330"
                    r="17"
                    className={`transition-all duration-500 ${
                      activeStep === 'centre'
                        ? 'fill-[#E0982E] filter drop-shadow-[0_0_14px_rgba(224,152,46,0.9)]'
                        : 'fill-[#1F3A28] dark:fill-[#AECBB2]'
                    }`}
                  />
                  {/* Leader line to Step 03 (Left) */}
                  <line
                    x1="48"
                    y1="330"
                    x2="22"
                    y2="330"
                    strokeWidth="1.2"
                    className={`transition-all duration-500 ${
                      activeStep === 'centre' ? 'stroke-[#E0982E]' : 'stroke-border/50'
                    }`}
                  />
                  <circle
                    cx="22"
                    cy="330"
                    r="3.5"
                    className={`transition-all duration-500 ${
                      activeStep === 'centre' ? 'fill-[#E0982E] animate-ping' : 'fill-border/60'
                    }`}
                  />
                  <circle
                    cx="22"
                    cy="330"
                    r="3"
                    className={`transition-all duration-500 ${
                      activeStep === 'centre' ? 'fill-[#E0982E]' : 'fill-border/60'
                    }`}
                  />
                </g>

                {/* ── 04. LA CRÉATION (Bottom Nested Diamond: Outer Diamond Ring + Inner Solid Diamond) ── */}
                <g
                  onClick={() => setActiveStep('creation')}
                  className="cursor-pointer group/creation"
                >
                  {/* Outer Diamond Ring with diamond cutout */}
                  <path
                    d="M 100,396 L 150,476 L 100,556 L 50,476 Z M 100,422 L 67,476 L 100,530 L 133,476 Z"
                    fillRule="evenodd"
                    className={`transition-all duration-500 ${
                      activeStep === 'creation'
                        ? 'fill-[#3F6D4E] filter drop-shadow-[0_0_16px_rgba(63,109,78,0.8)]'
                        : 'fill-[#1F3A28] dark:fill-[#AECBB2] hover:fill-[#3F6D4E]/80'
                    }`}
                  />
                  {/* Inner Solid Diamond */}
                  <path
                    d="M 100,450 L 114,476 L 100,502 L 86,476 Z"
                    className={`transition-all duration-500 ${
                      activeStep === 'creation'
                        ? 'fill-[#E0982E] filter drop-shadow-[0_0_12px_rgba(224,152,46,0.85)]'
                        : 'fill-[#1F3A28] dark:fill-[#AECBB2] hover:fill-[#3F6D4E]/80'
                    }`}
                  />
                  {/* Leader line to Step 04 (Right) */}
                  <line
                    x1="150"
                    y1="476"
                    x2="178"
                    y2="476"
                    strokeWidth="1.2"
                    className={`transition-all duration-500 ${
                      activeStep === 'creation' ? 'stroke-[#E0982E]' : 'stroke-border/50'
                    }`}
                  />
                  <circle
                    cx="178"
                    cy="476"
                    r="3.5"
                    className={`transition-all duration-500 ${
                      activeStep === 'creation' ? 'fill-[#E0982E] animate-ping' : 'fill-border/60'
                    }`}
                  />
                  <circle
                    cx="178"
                    cy="476"
                    r="3"
                    className={`transition-all duration-500 ${
                      activeStep === 'creation' ? 'fill-[#E0982E]' : 'fill-border/60'
                    }`}
                  />
                </g>

                {/* ── 05. L'ANCRAGE (Bottom Segment: Flat top, pointed chevron tip v at bottom) ── */}
                <g
                  onClick={() => setActiveStep('ancrage')}
                  className="cursor-pointer group/ancrage"
                >
                  <path
                    d="M 92.5,570 L 107.5,570 L 107.5,642 L 100,650 L 92.5,642 Z"
                    className={`transition-all duration-500 ${
                      activeStep === 'ancrage'
                        ? 'fill-[#3F6D4E] filter drop-shadow-[0_0_14px_rgba(63,109,78,0.8)]'
                        : 'fill-[#1F3A28] dark:fill-[#AECBB2] hover:fill-[#3F6D4E]/80'
                    }`}
                  />
                  {/* Leader line to Step 05 (Left) */}
                  <line
                    x1="92"
                    y1="610"
                    x2="40"
                    y2="610"
                    strokeWidth="1.2"
                    className={`transition-all duration-500 ${
                      activeStep === 'ancrage' ? 'stroke-[#E0982E]' : 'stroke-border/50'
                    }`}
                  />
                  <circle
                    cx="40"
                    cy="610"
                    r="3.5"
                    className={`transition-all duration-500 ${
                      activeStep === 'ancrage' ? 'fill-[#E0982E] animate-ping' : 'fill-border/60'
                    }`}
                  />
                  <circle
                    cx="40"
                    cy="610"
                    r="3"
                    className={`transition-all duration-500 ${
                      activeStep === 'ancrage' ? 'fill-[#E0982E]' : 'fill-border/60'
                    }`}
                  />
                </g>
              </svg>
            </div>

            {/* Helper exploration badge */}
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
                      ? 'bg-card shadow-xl border-primary/50 scale-[1.03] ring-1 ring-primary/20'
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

        {/* ━━━ MOBILE & TABLET LAYOUT (TOTEM ON LEFT, DETAIL CARD ON RIGHT) ━━━ */}
        <div className="lg:hidden">
          <div className="flex items-stretch gap-3 sm:gap-4 relative">
            
            {/* ── LEFT COLUMN : Vertical Interactive Totem ── */}
            <div className="w-[108px] xs:w-[118px] sm:w-[130px] shrink-0 px-1.5 py-3 sm:px-2 sm:py-4 bg-card/80 backdrop-blur-md rounded-3xl border border-border/50 shadow-md flex flex-col relative">
              <div className="w-full h-full relative">
                <svg viewBox="38 6 124 648" className="w-full h-full">
                  {/* Central dashed line spanning full height */}
                  <line x1="100" y1="8" x2="100" y2="652" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-border/60" />

                  {/* 01 L'Élan */}
                  <g onClick={() => setActiveStep('elan')} className="cursor-pointer">
                    {/* Transparent touch target for easy finger tap */}
                    <rect x="35" y="6" width="130" height="92" fill="transparent" />
                    <path
                      d="M 92.5,18 L 100,10 L 107.5,18 L 107.5,90 L 92.5,90 Z"
                      className={`transition-all duration-300 ${
                        activeStep === 'elan'
                          ? 'fill-[#E0982E] filter drop-shadow-[0_0_12px_rgba(224,152,46,0.9)]'
                          : 'fill-[#1F3A28] dark:fill-[#AECBB2] opacity-60'
                      }`}
                    />
                    {/* Leader arrow connecting directly to the right border */}
                    {activeStep === 'elan' && (
                      <g className="transition-all duration-300">
                        <line x1="108" y1="50" x2="152" y2="50" stroke="#E0982E" strokeWidth="2" strokeDasharray="3 3" />
                        <polygon points="150,46 158,50 150,54" fill="#E0982E" />
                      </g>
                    )}
                    {/* Subtle pulsing indicator on the NEXT element to invite tap */}
                    {nextStep.id === 'elan' && (
                      <circle cx="100" cy="50" r="16" fill="none" stroke="#E0982E" strokeWidth="2.5" className="animate-ping opacity-60" />
                    )}
                  </g>

                  {/* 02 L'Héritage */}
                  <g onClick={() => setActiveStep('heritage')} className="cursor-pointer">
                    <rect x="35" y="100" width="130" height="170" fill="transparent" />
                    <path
                      d="M 100,104 L 150,184 L 100,264 L 50,184 Z M 100,130 L 67,184 L 100,238 L 133,184 Z"
                      fillRule="evenodd"
                      className={`transition-all duration-300 ${
                        activeStep === 'heritage'
                          ? 'fill-[#3F6D4E] filter drop-shadow-[0_0_14px_rgba(63,109,78,0.9)]'
                          : 'fill-[#1F3A28] dark:fill-[#AECBB2] opacity-60'
                      }`}
                    />
                    <path
                      d="M 100,158 L 114,184 L 100,210 L 86,184 Z"
                      className={`transition-all duration-300 ${
                        activeStep === 'heritage'
                          ? 'fill-[#E0982E] filter drop-shadow-[0_0_10px_rgba(224,152,46,0.9)]'
                          : 'fill-[#1F3A28] dark:fill-[#AECBB2] opacity-60'
                      }`}
                    />
                    {/* Leader arrow connecting directly to the right border */}
                    {activeStep === 'heritage' && (
                      <g className="transition-all duration-300">
                        <line x1="150" y1="184" x2="156" y2="184" stroke="#E0982E" strokeWidth="2" />
                        <polygon points="152,180 160,184 152,188" fill="#E0982E" />
                      </g>
                    )}
                    {nextStep.id === 'heritage' && (
                      <circle cx="100" cy="184" r="18" fill="none" stroke="#E0982E" strokeWidth="2.5" className="animate-ping opacity-60" />
                    )}
                  </g>

                  {/* 03 Soi, au centre */}
                  <g onClick={() => setActiveStep('centre')} className="cursor-pointer">
                    <rect x="35" y="275" width="130" height="110" fill="transparent" />
                    <circle
                      cx="100"
                      cy="330"
                      r="44.5"
                      fill="none"
                      strokeWidth="15"
                      className={`transition-all duration-300 ${
                        activeStep === 'centre'
                          ? 'stroke-[#E0982E] filter drop-shadow-[0_0_16px_rgba(224,152,46,0.9)]'
                          : 'stroke-[#1F3A28] dark:stroke-[#AECBB2] opacity-60'
                      }`}
                    />
                    <circle
                      cx="100"
                      cy="330"
                      r="17"
                      className={`transition-all duration-300 ${
                        activeStep === 'centre'
                          ? 'fill-[#E0982E] filter drop-shadow-[0_0_12px_rgba(224,152,46,0.9)]'
                          : 'fill-[#1F3A28] dark:fill-[#AECBB2] opacity-60'
                      }`}
                    />
                    {/* Leader arrow connecting directly to the right border */}
                    {activeStep === 'centre' && (
                      <g className="transition-all duration-300">
                        <line x1="148" y1="330" x2="156" y2="330" stroke="#E0982E" strokeWidth="2" />
                        <polygon points="152,326 160,330 152,334" fill="#E0982E" />
                      </g>
                    )}
                    {nextStep.id === 'centre' && (
                      <circle cx="100" cy="330" r="22" fill="none" stroke="#E0982E" strokeWidth="2.5" className="animate-ping opacity-60" />
                    )}
                  </g>

                  {/* 04 La Création */}
                  <g onClick={() => setActiveStep('creation')} className="cursor-pointer">
                    <rect x="35" y="390" width="130" height="170" fill="transparent" />
                    <path
                      d="M 100,396 L 150,476 L 100,556 L 50,476 Z M 100,422 L 67,476 L 100,530 L 133,476 Z"
                      fillRule="evenodd"
                      className={`transition-all duration-300 ${
                        activeStep === 'creation'
                          ? 'fill-[#3F6D4E] filter drop-shadow-[0_0_14px_rgba(63,109,78,0.9)]'
                          : 'fill-[#1F3A28] dark:fill-[#AECBB2] opacity-60'
                      }`}
                    />
                    <path
                      d="M 100,450 L 114,476 L 100,502 L 86,476 Z"
                      className={`transition-all duration-300 ${
                        activeStep === 'creation'
                          ? 'fill-[#E0982E] filter drop-shadow-[0_0_10px_rgba(224,152,46,0.9)]'
                          : 'fill-[#1F3A28] dark:fill-[#AECBB2] opacity-60'
                      }`}
                    />
                    {/* Leader arrow connecting directly to the right border */}
                    {activeStep === 'creation' && (
                      <g className="transition-all duration-300">
                        <line x1="150" y1="476" x2="156" y2="476" stroke="#E0982E" strokeWidth="2" />
                        <polygon points="152,472 160,476 152,480" fill="#E0982E" />
                      </g>
                    )}
                    {nextStep.id === 'creation' && (
                      <circle cx="100" cy="476" r="18" fill="none" stroke="#E0982E" strokeWidth="2.5" className="animate-ping opacity-60" />
                    )}
                  </g>

                  {/* 05 L'Ancrage */}
                  <g onClick={() => setActiveStep('ancrage')} className="cursor-pointer">
                    <rect x="35" y="565" width="130" height="85" fill="transparent" />
                    <path
                      d="M 92.5,570 L 107.5,570 L 107.5,642 L 100,650 L 92.5,642 Z"
                      className={`transition-all duration-300 ${
                        activeStep === 'ancrage'
                          ? 'fill-[#3F6D4E] filter drop-shadow-[0_0_12px_rgba(63,109,78,0.9)]'
                          : 'fill-[#1F3A28] dark:fill-[#AECBB2] opacity-60'
                      }`}
                    />
                    {/* Leader arrow connecting directly to the right border */}
                    {activeStep === 'ancrage' && (
                      <g className="transition-all duration-300">
                        <line x1="108" y1="610" x2="152" y2="610" stroke="#E0982E" strokeWidth="2" strokeDasharray="3 3" />
                        <polygon points="150,606 158,610 150,614" fill="#E0982E" />
                      </g>
                    )}
                    {nextStep.id === 'ancrage' && (
                      <circle cx="100" cy="610" r="16" fill="none" stroke="#E0982E" strokeWidth="2.5" className="animate-ping opacity-60" />
                    )}
                  </g>
                </svg>

                {/* ── Dynamic Glowing Pointer Arrow pointing from totem directly into card ── */}
                <div
                  className="absolute -right-3.5 sm:-right-4 transition-all duration-500 ease-out z-30 pointer-events-none"
                  style={{ top: `${STEP_PERCENTAGES[activeStep]}%`, transform: 'translateY(-50%)' }}
                >
                  <div className="relative flex items-center">
                    {/* Arrow tip pointing left AT the totem element */}
                    <div className="w-0 h-0 border-y-[4.5px] border-y-transparent border-r-[6px] border-r-[#E0982E] filter drop-shadow-[0_0_6px_rgba(224,152,46,0.9)]" />

                    {/* Glowing center indicator dot */}
                    <div className="relative flex items-center justify-center -mx-0.5">
                      <span className="animate-ping absolute inline-flex size-3.5 rounded-full bg-[#E0982E] opacity-75" />
                      <span className="relative inline-flex size-3.5 rounded-full bg-[#E0982E] border-2 border-background shadow-lg shadow-[#E0982E]/90" />
                    </div>

                    {/* Connecting line */}
                    <div className="w-2.5 sm:w-3 h-[2px] bg-gradient-to-r from-[#E0982E] to-primary" />

                    {/* Arrow tip pointing right INTO the active card */}
                    <div className="w-0 h-0 border-y-[4.5px] border-y-transparent border-l-[6px] border-l-primary filter drop-shadow-[0_0_6px_rgba(63,109,78,0.9)]" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN : Detailed active card taking full remaining width ── */}
            <div className="flex-1 min-w-0 flex flex-col justify-between p-4 sm:p-6 rounded-3xl bg-card border border-primary/30 shadow-xl relative overflow-hidden">
              {/* Background ambient accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

              {/* Top Header with Step Counter & Badge */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
                    {currentStepMeta.number} / 05
                  </span>
                  <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ActiveIcon className="size-4" />
                  </div>
                </div>

                <h3 className="font-display font-extrabold text-xl sm:text-2xl text-foreground leading-tight mb-1">
                  {t(`signature.steps.${activeStep}.title`)}
                </h3>

                <p className="text-xs font-bold text-[#E0982E] uppercase tracking-wider mb-3">
                  {t(`signature.steps.${activeStep}.subtitle`)}
                </p>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {t(`signature.steps.${activeStep}.desc`)}
                </p>
              </div>

              {/* Bottom Area : Next Step Button & Progress Tracker */}
              <div className="mt-5 pt-4 border-t border-border/50 space-y-3">
                {/* Next Element Button (with pulsing invitation indicator) */}
                <button
                  type="button"
                  onClick={() => setActiveStep(nextStep.id)}
                  className="w-full h-11 px-3.5 rounded-2xl bg-gradient-to-r from-primary/15 to-[#E0982E]/15 hover:from-primary/25 hover:to-[#E0982E]/25 border border-primary/30 text-foreground font-bold text-xs sm:text-sm flex items-center justify-between transition-all active:scale-95 group shadow-sm cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0 truncate">
                    <span className="relative flex size-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E0982E] opacity-75" />
                      <span className="relative inline-flex rounded-full size-2.5 bg-[#E0982E]" />
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase shrink-0">
                      {activeStep === 'ancrage' ? t('signature.restartPrompt', 'Revoir :') : t('signature.nextPrompt', 'Suivant :')}
                    </span>
                    <span className="truncate font-display font-bold text-foreground">
                      {nextStep.number} — {t(`signature.steps.${nextStep.id}.title`)}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-[#E0982E] group-hover:translate-x-1 transition-transform" />
                </button>

                {/* 5 tactile step dots to jump anywhere directly */}
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  {STEPS_META.map((step) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setActiveStep(step.id)}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        activeStep === step.id
                          ? 'w-7 bg-[#E0982E]'
                          : 'w-2 bg-border hover:bg-muted-foreground/40'
                      }`}
                      aria-label={`Étape ${step.number}`}
                    />
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ━━━ BOTTOM EMBLEM & LOGO INTEGRATION BANNER ━━━ */}
        <div className="mt-14 md:mt-24 p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-card/80 to-card border border-border/60 backdrop-blur-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
          <div className="flex items-center gap-5">
            <div className="size-18 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 p-2">
              {/* Standalone Totem mini icon matching the exact sacred geometry */}
              <svg viewBox="0 0 200 660" className="size-12 text-primary">
                <path d="M 92.5,18 L 100,10 L 107.5,18 L 107.5,90 L 92.5,90 Z" fill="currentColor" />
                <path d="M 100,104 L 150,184 L 100,264 L 50,184 Z M 100,130 L 67,184 L 100,238 L 133,184 Z" fillRule="evenodd" fill="currentColor" />
                <path d="M 100,158 L 114,184 L 100,210 L 86,184 Z" fill="currentColor" />
                <circle cx="100" cy="330" r="44.5" fill="none" stroke="currentColor" strokeWidth="15" />
                <circle cx="100" cy="330" r="17" fill="currentColor" />
                <path d="M 100,396 L 150,476 L 100,556 L 50,476 Z M 100,422 L 67,476 L 100,530 L 133,476 Z" fillRule="evenodd" fill="currentColor" />
                <path d="M 100,450 L 114,476 L 100,502 L 86,476 Z" fill="currentColor" />
                <path d="M 92.5,570 L 107.5,570 L 107.5,642 L 100,650 L 92.5,642 Z" fill="currentColor" />
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
