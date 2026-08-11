import { useState, useEffect } from 'react';
import { PageComponent } from 'rasengan';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { Loader2, Save, Wine, Download } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { downloadSvgAsPng } from '@/lib/download';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { getPricingSettings, updatePricingSettings } from '@/services/settings';
import { BOTTLE_VOLUME_LABELS } from '@/entities';

const Pricing: PageComponent = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const { data: pricing, isLoading } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: getPricingSettings,
  });

  const [bottle500, setBottle500] = useState('');
  const [bottle1L, setBottle1L] = useState('');
  const [delivery, setDelivery] = useState('');
  const [promoFlyer, setPromoFlyer] = useState('');
  const [promoReorder, setPromoReorder] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!pricing) return;
    setBottle500(String(pricing.bottle500mlBase));
    setBottle1L(String(pricing.bottle1LBase));
    setDelivery(String(pricing.deliveryFee));
    setPromoFlyer(String(pricing.promoFlyerDiscount ?? 0));
    setPromoReorder(String(pricing.promoReorderDiscount ?? 0));
  }, [pricing]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updatePricingSettings({
        bottle500mlBase: Number(bottle500) || 0,
        bottle1LBase: Number(bottle1L) || 0,
        deliveryFee: Number(delivery) || 0,
        promoFlyerDiscount: Number(promoFlyer) || 0,
        promoReorderDiscount: Number(promoReorder) || 0,
      });
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BoardPageShell
      eyebrow={t('pricing.eyebrow')}
      titleBefore={t('pricing.titleBefore')}
      titleHighlight={t('pricing.title')}
      sectionBefore={t('pricing.sectionBefore')}
      sectionHighlight={t('pricing.sectionHighlight')}
      subtitle={t('pricing.pageSubtitle')}
      imageUrl="https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg?auto=compress&cs=tinysrgb&w=1200"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-16 bg-card rounded-[2rem] border border-border/40">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <form
          onSubmit={handleSave}
          className="bg-card rounded-[2rem] border border-border/40 shadow-sm p-6 md:p-8 space-y-8 max-w-2xl mx-auto w-full"
        >
          <div className="flex items-start gap-4 pb-6 border-b border-border/40">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Wine className="size-6 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-foreground">{t('pricing.containerTitle')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('pricing.containerDescription')}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="bottle-500" className="text-sm font-semibold">
                Contenant {BOTTLE_VOLUME_LABELS['500ml']}
              </Label>
              <div className="relative">
                <Input
                  id="bottle-500"
                  type="number"
                  min={0}
                  step={50}
                  value={bottle500}
                  onChange={(e) => setBottle500(e.target.value)}
                  className="h-11 rounded-xl pr-14"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  XAF
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{t('pricing.halfLiter')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bottle-1l" className="text-sm font-semibold">
                Contenant {BOTTLE_VOLUME_LABELS['1L']}
              </Label>
              <div className="relative">
                <Input
                  id="bottle-1l"
                  type="number"
                  min={0}
                  step={50}
                  value={bottle1L}
                  onChange={(e) => setBottle1L(e.target.value)}
                  className="h-11 rounded-xl pr-14"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  XAF
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{t('pricing.oneLiter')}</p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="delivery-fee" className="text-sm font-semibold">
              {t('pricing.deliveryFee')}
            </Label>
            <div className="relative max-w-xs">
              <Input
                id="delivery-fee"
                type="number"
                min={0}
                step={50}
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
                className="h-11 rounded-xl pr-14"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                XAF
              </span>
            </div>
          </div>

          <div className="flex items-start gap-4 pb-6 pt-6 border-b border-border/40">
            <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <span className="text-xl">🏷️</span>
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-lg text-foreground">Réductions QR Codes</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configurez les montants de réduction fixes offerts aux clients.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="promo-flyer" className="text-sm font-semibold">
                  QR Flyer (Acquisition)
                </Label>
                <div className="relative">
                  <Input
                    id="promo-flyer"
                    type="number"
                    min={0}
                    step={50}
                    value={promoFlyer}
                    onChange={(e) => setPromoFlyer(e.target.value)}
                    className="h-11 rounded-xl pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    XAF
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Montant déduit pour un nouveau scan</p>
              </div>

              {/* Générateur QR Flyer intégré */}
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 flex flex-col items-center justify-center gap-3 text-center mt-4">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  QR Code à Imprimer
                </p>
                <div className="bg-white p-2.5 rounded-xl shadow-sm border border-border/40 min-h-[160px] flex items-center justify-center">
                  {origin ? (
                    <QRCodeSVG
                      id="qr-flyer-svg"
                      value={`${origin}/lab?promo=FLYER`}
                      size={160}
                      level="M"
                      includeMargin={true}
                    />
                  ) : (
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full max-w-[150px] mt-2 gap-2 text-[12px] h-8"
                  type="button"
                  onClick={() => downloadSvgAsPng('qr-flyer-svg', 'qr-flyer-fys.png')}
                >
                  <Download className="size-3" /> PNG
                </Button>
                <p className="text-[10px] text-muted-foreground max-w-[150px] mt-1">
                  À envoyer à votre imprimeur.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo-reorder" className="text-sm font-semibold">
                QR Étiquette (Fidélité)
              </Label>
              <div className="relative">
                <Input
                  id="promo-reorder"
                  type="number"
                  min={0}
                  step={50}
                  value={promoReorder}
                  onChange={(e) => setPromoReorder(e.target.value)}
                  className="h-11 rounded-xl pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  XAF
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Montant déduit pour une re-commande</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" size="lg" className="rounded-full gap-2" disabled={saving}>
              {saving ? (
                <><Loader2 className="size-4 animate-spin" /> {t('pricing.saving')}</>
              ) : (
                <><Save className="size-4" /> {t('common.save')}</>
              )}
            </Button>
            {saved && (
              <span className="text-sm font-semibold text-primary">{t('pricing.updated')}</span>
            )}
          </div>
        </form>
      )}
    </BoardPageShell>
  );
};

Pricing.metadata = {
  title: i18n.t('pricing.pageTitle'),
  description: i18n.t('pricing.pageDescription'),
};

export default Pricing;
