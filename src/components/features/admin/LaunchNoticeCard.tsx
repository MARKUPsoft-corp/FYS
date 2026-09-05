import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock, ToggleLeft, ToggleRight, Edit3, CheckCircle2,
  XCircle, Save, RotateCcw, Loader2, Sparkles, MapPin,
  ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getPricingSettings, toggleLaunchNotice, updateLaunchNotice } from '@/services/settings';
import { DEFAULT_PRICING } from '@/entities/settings';

export function LaunchNoticeCard() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const { data: pricing, isLoading } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: getPricingSettings,
  });

  const [isActive, setIsActive] = useState(true);
  const [textFr, setTextFr] = useState('');
  const [textEn, setTextEn] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state with fetched settings
  useEffect(() => {
    if (pricing) {
      setIsActive(pricing.launchNoticeActive !== false);
      setTextFr(pricing.launchNoticeText || DEFAULT_PRICING.launchNoticeText || '');
      setTextEn(pricing.launchNoticeTextEn || DEFAULT_PRICING.launchNoticeTextEn || '');
    }
  }, [pricing]);

  // Handle Quick Toggle (One-click ON/OFF)
  async function handleToggle() {
    const nextState = !isActive;
    setIsToggling(true);
    setIsActive(nextState);
    try {
      await toggleLaunchNotice(nextState);
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Erreur lors du basculement du message:', err);
      setIsActive(!nextState);
    } finally {
      setIsToggling(false);
    }
  }

  // Handle Save text changes
  async function handleSaveText(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateLaunchNotice(
        isActive,
        textFr.trim() || DEFAULT_PRICING.launchNoticeText || '',
        textEn.trim() || DEFAULT_PRICING.launchNoticeTextEn || ''
      );
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Erreur lors de la mise à jour du texte:', err);
    } finally {
      setIsSaving(false);
    }
  }

  // Reset to default texts
  function handleResetDefault() {
    setTextFr(DEFAULT_PRICING.launchNoticeText || '');
    setTextEn(DEFAULT_PRICING.launchNoticeTextEn || '');
  }

  const currentPreviewText = (i18n.language.startsWith('en') ? textEn : textFr) || textFr || DEFAULT_PRICING.launchNoticeText || '';

  return (
    <div className={`bg-card rounded-[2rem] border transition-all duration-300 shadow-sm overflow-hidden ${
      isActive ? 'border-amber-500/40 bg-gradient-to-br from-card via-amber-500/[0.02] to-card' : 'border-border/60'
    }`}>
      {/* ── Card Header ── */}
      <div className="p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`size-12 rounded-[1.2rem] flex items-center justify-center shrink-0 transition-colors ${
              isActive
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                : 'bg-muted text-muted-foreground border border-border/40'
            }`}>
              <Clock className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-lg text-foreground leading-snug">
                  {t('launchNotice.cardTitle')}
                </h3>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-muted/80 text-muted-foreground border-border/60'
                }`}>
                  <span className={`size-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                  {isActive ? t('launchNotice.activeStatus') : t('launchNotice.inactiveStatus')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('launchNotice.cardSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* ── Description ── */}
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {t('launchNotice.description')}
        </p>

        {/* ── Primary Action Controls ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          {/* Main Toggle Button */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={isLoading || isToggling}
            className={`flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl border font-bold text-sm transition-all duration-200 shadow-2xs active:scale-[0.98] ${
              isActive
                ? 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-200'
                : 'bg-muted/50 hover:bg-muted border-border/60 text-muted-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isToggling ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : isActive ? (
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="size-4 text-muted-foreground" />
              )}
              <span>{isActive ? t('launchNotice.toggleInactive') : t('launchNotice.toggleActive')}</span>
            </div>

            {isActive ? (
              <ToggleRight className="size-6 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <ToggleLeft className="size-6 text-muted-foreground shrink-0" />
            )}
          </button>

          {/* Edit Message Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing((v) => !v)}
            className="h-10 rounded-xl gap-2 font-bold px-4 border-border/80 hover:bg-muted/50 text-foreground shrink-0"
          >
            <Edit3 className="size-3.5 text-primary" />
            <span>{isEditing ? t('launchNotice.hideEditor') : t('launchNotice.editMessage')}</span>
            {isEditing ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>
        </div>

        {/* Save success toast banner */}
        {saveSuccess && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-pop-in-cute">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{t('launchNotice.savedSuccess')}</span>
          </div>
        )}

        {/* ── Active message text badge preview ── */}
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3 flex items-start gap-2.5 text-xs text-foreground/80">
          <Sparkles className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1 min-w-0">
            <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground block">
              Texte actuel :
            </span>
            <p className="italic text-foreground font-medium break-words">
              &laquo; {textFr || DEFAULT_PRICING.launchNoticeText} &raquo;
            </p>
          </div>
        </div>
      </div>

      {/* ── Expandable Editor Section ── */}
      {isEditing && (
        <form onSubmit={handleSaveText} className="border-t border-border/40 bg-muted/10 p-5 md:p-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-4">
            {/* French Text input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="launch-notice-fr" className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {t('launchNotice.frenchTextLabel')} 🇨🇲 / 🇫🇷
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono">{textFr.length} car.</span>
              </div>
              <textarea
                id="launch-notice-fr"
                rows={2}
                value={textFr}
                onChange={(e) => setTextFr(e.target.value)}
                placeholder={t('launchNotice.frenchTextPlaceholder')}
                className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all resize-none font-medium"
                required
              />
            </div>

            {/* English Text input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="launch-notice-en" className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {t('launchNotice.englishTextLabel')} 🇬🇧
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono">{textEn.length} car.</span>
              </div>
              <textarea
                id="launch-notice-en"
                rows={2}
                value={textEn}
                onChange={(e) => setTextEn(e.target.value)}
                placeholder={t('launchNotice.englishTextPlaceholder')}
                className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all resize-none font-medium"
              />
            </div>
          </div>

          {/* ── Live Preview Box ── */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              <Eye className="size-3.5 text-primary" />
              <span>{t('launchNotice.previewTitle')}</span>
            </div>

            <div className="space-y-2 p-3.5 rounded-2xl bg-background border border-border/60 shadow-2xs">
              {/* Preview 1: Banner as seen above Cameroon Map */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5 text-amber-950 dark:text-amber-100 text-xs">
                <div className="size-6 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5 text-amber-700 dark:text-amber-400">
                  <Clock className="size-3.5" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    {t('orders.launchDeliveryNoticeTitle')}
                  </p>
                  <p className="text-xs font-semibold leading-snug break-words">
                    {currentPreviewText}
                  </p>
                </div>
              </div>

              {/* Preview 2: Pill badge as seen on Landing Hero */}
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs font-semibold">
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                  <Clock className="size-3 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate max-w-xs">{currentPreviewText}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                size="sm"
                className="rounded-full gap-1.5 font-bold shadow-sm"
                disabled={isSaving}
              >
                {isSaving ? (
                  <><Loader2 className="size-3.5 animate-spin" /> Enregistrement…</>
                ) : (
                  <><Save className="size-3.5" /> {t('launchNotice.saveChanges')}</>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="rounded-full text-xs text-muted-foreground hover:text-foreground"
              >
                {t('common.cancel')}
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetDefault}
              className="rounded-full gap-1.5 text-xs text-muted-foreground hover:text-foreground border-dashed border-border/80"
              title={t('launchNotice.resetDefault')}
            >
              <RotateCcw className="size-3" />
              <span>{t('launchNotice.resetDefault')}</span>
            </Button>
          </div>
        </form>
      )}

      {/* ── Information Footer ── */}
      <div className="px-5 py-3 bg-muted/30 border-t border-border/40 text-[11px] text-muted-foreground flex items-center gap-2">
        <MapPin className="size-3.5 text-primary shrink-0" />
        <span className="truncate">{t('launchNotice.locationsList')}</span>
      </div>
    </div>
  );
}
