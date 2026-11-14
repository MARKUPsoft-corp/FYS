import { useState, useEffect } from 'react';
import { PageComponent } from 'rasengan';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { Loader2, Save, Wine, Download, ToggleLeft, ToggleRight, CalendarClock, Tag, CheckCircle2, XCircle, Beaker, Clock, Copy, Check, Share2, ExternalLink, Sparkles, Globe, Truck, MapPin, Plus, Trash2, RotateCcw, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { downloadSvgAsPng } from '@/lib/download';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { getPricingSettings, updatePricingSettings } from '@/services/settings';
import { BOTTLE_VOLUME_LABELS, DEFAULT_PRICING, DeliveryZone, DEFAULT_DELIVERY_ZONES } from '@/entities';
import { generatePublicPromoUrl } from '@/utils/promo';

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
  const [bottleCost500, setBottleCost500] = useState('250');
  const [bottleCost1L, setBottleCost1L] = useState('450');
  const [delivery, setDelivery] = useState('');
  const [promoFlyer, setPromoFlyer] = useState('');
  const [promoFlyerActive, setPromoFlyerActive] = useState(false);
  const [promoFlyerExpires, setPromoFlyerExpires] = useState(''); // ISO date string YYYY-MM-DD
  const [promoPublicCode, setPromoPublicCode] = useState('FLYER');
  const [promoPublicTarget, setPromoPublicTarget] = useState('/lab');
  const [copiedLink, setCopiedLink] = useState(false);
  const [promoReorder, setPromoReorder] = useState('');
  const [promoReorderActive, setPromoReorderActive] = useState(false);
  const [promoReorderExpires, setPromoReorderExpires] = useState('');
  const [maxMainFruits, setMaxMainFruits] = useState('5');
  const [maxSupplements, setMaxSupplements] = useState('3');
  const [launchNoticeActive, setLaunchNoticeActive] = useState(true);
  const [launchNoticeText, setLaunchNoticeText] = useState('');
  const [launchNoticeTextEn, setLaunchNoticeTextEn] = useState('');
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(DEFAULT_DELIVERY_ZONES);
  const [newDistrictInputs, setNewDistrictInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!pricing) return;
    setBottle500(String(pricing.bottle500mlBase));
    setBottle1L(String(pricing.bottle1LBase));
    setBottleCost500(String(pricing.defaultBottleCost500ml ?? DEFAULT_PRICING.defaultBottleCost500ml ?? 250));
    setBottleCost1L(String(pricing.defaultBottleCost1L ?? DEFAULT_PRICING.defaultBottleCost1L ?? 450));
    setDelivery(String(pricing.deliveryFee));
    setDeliveryZones(pricing.deliveryZones && pricing.deliveryZones.length > 0 ? pricing.deliveryZones : DEFAULT_DELIVERY_ZONES);
    setPromoFlyer(String(pricing.promoFlyerDiscount ?? 0));
    setPromoFlyerActive(pricing.promoFlyerActive ?? false);
    setPromoFlyerExpires(
      pricing.promoFlyerExpiresAt
        ? pricing.promoFlyerExpiresAt.toDate().toISOString().split('T')[0]
        : ''
    );
    setPromoPublicCode(pricing.promoPublicCode || 'FLYER');
    setPromoPublicTarget(pricing.promoPublicTarget || '/lab');
    setPromoReorder(String(pricing.promoReorderDiscount ?? 0));
    setPromoReorderActive(pricing.promoReorderActive ?? false);
    setPromoReorderExpires(
      pricing.promoReorderExpiresAt
        ? pricing.promoReorderExpiresAt.toDate().toISOString().split('T')[0]
        : ''
    );
    setMaxMainFruits(String(pricing.maxMainFruits ?? 5));
    setMaxSupplements(String(pricing.maxSupplements ?? 3));
    const is24h = pricing.delivery24hActive !== undefined ? pricing.delivery24hActive : (pricing.launchNoticeActive !== false);
    setLaunchNoticeActive(is24h);
    setTextOrDefault(pricing.launchNoticeText, DEFAULT_PRICING.launchNoticeText || '', setLaunchNoticeText);
    setTextOrDefault(pricing.launchNoticeTextEn, DEFAULT_PRICING.launchNoticeTextEn || '', setLaunchNoticeTextEn);
  }, [pricing]);

  function setTextOrDefault(val: string | undefined, defaultVal: string, setter: (v: string) => void) {
    setter(val !== undefined ? val : defaultVal);
  }

  function handleZoneFeeChange(zoneId: string, feeStr: string) {
    const fee = Number(feeStr) || 0;
    setDeliveryZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, fee } : z))
    );
  }

  function handleAddDistrict(zoneId: string) {
    const name = (newDistrictInputs[zoneId] || '').trim();
    if (!name) return;
    setDeliveryZones((prev) =>
      prev.map((z) => {
        if (z.id !== zoneId) return z;
        if (z.districts.some((d) => d.toLowerCase() === name.toLowerCase())) return z;
        return { ...z, districts: [...z.districts, name] };
      })
    );
    setNewDistrictInputs((prev) => ({ ...prev, [zoneId]: '' }));
  }

  function handleRemoveDistrict(zoneId: string, districtName: string) {
    setDeliveryZones((prev) =>
      prev.map((z) => {
        if (z.id !== zoneId) return z;
        return { ...z, districts: z.districts.filter((d) => d !== districtName) };
      })
    );
  }

  function handleResetDefaultZones() {
    if (window.confirm("Rétablir les zones et tarifs de livraison par défaut (Nsimeyong, Bastos, Odza...) ?")) {
      setDeliveryZones(DEFAULT_DELIVERY_ZONES);
    }
  }

  const cleanPromoCode = (promoPublicCode || 'FLYER').trim().toUpperCase();
  const generatedPublicUrl = origin ? generatePublicPromoUrl(origin, promoPublicTarget, cleanPromoCode) : '';
  const isFlyerExpired = promoFlyerExpires ? new Date(promoFlyerExpires + 'T23:59:59').getTime() < Date.now() : false;

  const handleCopyLink = () => {
    if (!generatedPublicUrl) return;
    navigator.clipboard.writeText(generatedPublicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!generatedPublicUrl) return;
    const discountText = promoFlyer ? `${Number(promoFlyer).toLocaleString()} XAF` : t('pricing.promo.someDiscount');
    const message = t('pricing.promo.whatsappMessage', { discountText, url: generatedPublicUrl });
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      // Convertir les dates en Timestamp Firestore
      const { Timestamp } = await import('firebase/firestore');
      const flyerExpAt = promoFlyerExpires
        ? Timestamp.fromDate(new Date(promoFlyerExpires + 'T23:59:59'))
        : null;
      const reorderExpAt = promoReorderExpires
        ? Timestamp.fromDate(new Date(promoReorderExpires + 'T23:59:59'))
        : null;

      await updatePricingSettings({
        bottle500mlBase: Number(bottle500) || 0,
        bottle1LBase: Number(bottle1L) || 0,
        defaultBottleCost500ml: Number(bottleCost500) || 0,
        defaultBottleCost1L: Number(bottleCost1L) || 0,
        deliveryFee: Number(delivery) || 0,
        deliveryZones,
        promoFlyerDiscount: Number(promoFlyer) || 0,
        promoFlyerActive,
        promoFlyerExpiresAt: flyerExpAt,
        promoPublicCode: cleanPromoCode,
        promoPublicTarget,
        promoReorderDiscount: Number(promoReorder) || 0,
        promoReorderActive,
        promoReorderExpiresAt: reorderExpAt,
        maxMainFruits: Number(maxMainFruits) || 5,
        maxSupplements: Number(maxSupplements) || 3,
        launchNoticeActive,
        delivery24hActive: launchNoticeActive,
        launchNoticeText: launchNoticeText.trim(),
        launchNoticeTextEn: launchNoticeTextEn.trim(),
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
                {t('pricing.bottle500Label', { volume: BOTTLE_VOLUME_LABELS['500ml'] })}
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
                {t('pricing.bottle1LLabel', { volume: BOTTLE_VOLUME_LABELS['1L'] })}
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

          {/* ── Frais de Livraison Dynamiques par Zone (Nsimeyong) ── */}
          <div className="pt-6 pb-4 border-t border-border/40 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Truck className="size-5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-base text-foreground">
                    Frais de Livraison Dynamiques par Zone (Atelier : Nsimeyong)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tarifs appliqués automatiquement sur le Web et WhatsApp selon l'éloignement du quartier par rapport à Nsimeyong.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetDefaultZones}
                className="shrink-0 h-9 rounded-xl text-xs gap-1.5 self-start sm:self-auto border-border/60 hover:bg-muted/60"
              >
                <RotateCcw className="size-3.5 text-muted-foreground" />
                Rétablir les zones par défaut
              </Button>
            </div>

            {/* Grille des 3 Zones */}
            <div className="grid lg:grid-cols-3 gap-4">
              {deliveryZones.map((zone, idx) => {
                const zoneColors = [
                  { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
                  { border: 'border-amber-500/30', bg: 'bg-amber-500/5', badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
                  { border: 'border-blue-500/30', bg: 'bg-blue-500/5', badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
                ][idx % 3];

                return (
                  <div
                    key={zone.id}
                    className={`rounded-2xl border ${zoneColors.border} ${zoneColors.bg} p-4 flex flex-col justify-between space-y-3.5 shadow-sm`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${zoneColors.badge}`}>
                          {zone.name.split(':')[0] || `Zone ${idx + 1}`}
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {zone.districts.length} quartier{zone.districts.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div>
                        <h5 className="font-semibold text-sm text-foreground">{zone.name}</h5>
                        {zone.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {zone.description}
                          </p>
                        )}
                      </div>

                      {/* Tarif de la zone */}
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-foreground">
                          Frais de livraison pour cette zone :
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            step={50}
                            value={zone.fee}
                            onChange={(e) => handleZoneFeeChange(zone.id, e.target.value)}
                            className="h-10 rounded-xl pr-14 bg-background font-bold text-sm"
                            required
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                            XAF
                          </span>
                        </div>
                      </div>

                      {/* Liste des quartiers (badges scrollables) */}
                      <div className="space-y-1.5 pt-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">
                          Quartiers rattachés :
                        </Label>
                        <div className="max-h-36 overflow-y-auto p-2 bg-background/80 rounded-xl border border-border/40 flex flex-wrap gap-1.5">
                          {zone.districts.map((d) => (
                            <span
                              key={d}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-muted text-foreground border border-border/40 group hover:border-red-300 transition-colors"
                            >
                              <span className="truncate max-w-[130px]">{d}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveDistrict(zone.id, d)}
                                className="text-muted-foreground/60 hover:text-red-500 rounded-sm p-0.5 transition-colors"
                                title={`Retirer ${d}`}
                              >
                                <X className="size-3" />
                              </button>
                            </span>
                          ))}
                          {zone.districts.length === 0 && (
                            <span className="text-xs text-muted-foreground italic p-1">
                              Aucun quartier rattaché
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ajouter un quartier dans la zone */}
                    <div className="pt-2 border-t border-border/30">
                      <div className="flex gap-1.5">
                        <Input
                          placeholder="Ajouter quartier..."
                          value={newDistrictInputs[zone.id] || ''}
                          onChange={(e) =>
                            setNewDistrictInputs((prev) => ({ ...prev, [zone.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddDistrict(zone.id);
                            }
                          }}
                          className="h-8 text-xs rounded-xl bg-background"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAddDistrict(zone.id)}
                          className="h-8 px-2.5 rounded-xl text-xs shrink-0"
                          title="Ajouter"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tarif de secours pour quartier non répertorié */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground">
                  Tarif de livraison par défaut / quartier non répertorié :
                </span>
                <p className="text-muted-foreground text-[11px]">
                  Utilisé si le client saisit manuellement un quartier ou repère personnalisé absent des 3 zones ci-dessus.
                </p>
              </div>
              <div className="relative w-36 shrink-0">
                <Input
                  id="delivery-fee"
                  type="number"
                  min={0}
                  step={50}
                  value={delivery}
                  onChange={(e) => setDelivery(e.target.value)}
                  className="h-9 rounded-xl pr-12 font-bold text-xs bg-background"
                  required
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground">
                  XAF
                </span>
              </div>
            </div>
          </div>

          {/* ── Coûts de Revient Bouteilles (FYS Management) ── */}
          <div className="pt-4 pb-2 border-t border-border/30 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-foreground">
                {t('pricing.bottleCostTitle')}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('pricing.bottleCostDesc')}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bottle-cost-500" className="text-sm font-semibold">
                  {t('pricing.bottleCost500Label')}
                </Label>
                <div className="relative">
                  <Input
                    id="bottle-cost-500"
                    type="number"
                    min={0}
                    step={25}
                    value={bottleCost500}
                    onChange={(e) => setBottleCost500(e.target.value)}
                    className="h-11 rounded-xl pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    XAF
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{t('pricing.bottleCost500Hint')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bottle-cost-1l" className="text-sm font-semibold">
                  {t('pricing.bottleCost1LLabel')}
                </Label>
                <div className="relative">
                  <Input
                    id="bottle-cost-1l"
                    type="number"
                    min={0}
                    step={25}
                    value={bottleCost1L}
                    onChange={(e) => setBottleCost1L(e.target.value)}
                    className="h-11 rounded-xl pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    XAF
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{t('pricing.bottleCost1LHint')}</p>
              </div>
            </div>
          </div>

          {/* ── Limites FYS Lab ── */}
          <div className="flex items-start gap-4 pb-6 pt-6 border-b border-border/40">
            <div className="size-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
              <Beaker className="size-5 text-indigo-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-lg text-foreground">{t('pricing.labLimitsTitle')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('pricing.labLimitsDesc')}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="max-main-fruits" className="text-sm font-semibold">
                {t('pricing.maxMainFruitsLabel')}
              </Label>
              <Input
                id="max-main-fruits"
                type="number"
                min={1}
                max={10}
                value={maxMainFruits}
                onChange={(e) => setMaxMainFruits(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
              <p className="text-[11px] text-muted-foreground">{t('pricing.maxMainFruitsHint')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-supplements" className="text-sm font-semibold">
                {t('pricing.maxSupplementsLabel')}
              </Label>
              <Input
                id="max-supplements"
                type="number"
                min={0}
                max={5}
                value={maxSupplements}
                onChange={(e) => setMaxSupplements(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
              <p className="text-[11px] text-muted-foreground">{t('pricing.maxSupplementsHint')}</p>
            </div>
          </div>

          {/* ── Section Promotions & Liens Publics ── */}
          <div className="flex items-start gap-4 pb-6 pt-6 border-b border-border/40">
            <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Sparkles className="size-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-display font-bold text-lg text-foreground">{t('pricing.promo.sectionTitle')}</h3>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                  promoFlyerActive && !isFlyerExpired
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : isFlyerExpired
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-muted/60 border-border/40 text-muted-foreground'
                }`}>
                  {promoFlyerActive && !isFlyerExpired ? t('pricing.promo.statusActive') : isFlyerExpired ? t('pricing.promo.statusExpired') : t('pricing.promo.statusInactive')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t('pricing.promo.sectionDesc')}
              </p>
            </div>
          </div>

          {/* ── Carte 1 : Lien Public de Réduction & Flyer d'Acquisition ── */}
          <div className="rounded-2xl border border-border/60 bg-muted/10 p-5 md:p-6 space-y-6">
            {/* Entête de carte avec Toggle d'activation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
              <div>
                <h4 className="font-display font-bold text-base text-foreground flex items-center gap-2">
                  <Share2 className="size-4 text-primary" />
                  Lien Public de Réduction & Flyer d'Acquisition
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Les utilisateurs arrivant sur le site via ce lien ou ce QR code reçoivent automatiquement la réduction.
                </p>
              </div>

              {/* Bouton Toggle Actif/Inactif */}
              <button
                type="button"
                onClick={() => setPromoFlyerActive((v) => !v)}
                className={`flex items-center justify-between sm:justify-center gap-3 px-4 py-2.5 rounded-xl transition-all border shrink-0 ${
                  promoFlyerActive
                    ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                    : 'bg-muted/60 border-border/40 text-muted-foreground font-medium'
                }`}
              >
                <span className="text-xs flex items-center gap-1.5">
                  {promoFlyerActive ? (
                    <><CheckCircle2 className="size-4 text-primary" /> Lien Activé</>
                  ) : (
                    <><XCircle className="size-4" /> Lien Désactivé</>
                  )}
                </span>
                {promoFlyerActive ? (
                  <ToggleRight className="size-5 text-primary" />
                ) : (
                  <ToggleLeft className="size-5 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Formulaire des paramètres du lien */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="promo-flyer" className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Montant de la réduction
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
                    placeholder="Ex: 500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    XAF
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Déduit automatiquement du total de la commande.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo-flyer-expires" className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="size-3.5 text-amber-500" />
                    Date d'expiration (optionnel)
                  </span>
                  {promoFlyerExpires && (
                    <button
                      type="button"
                      onClick={() => setPromoFlyerExpires('')}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline normal-case"
                    >
                      Retirer
                    </button>
                  )}
                </Label>
                <Input
                  id="promo-flyer-expires"
                  type="date"
                  value={promoFlyerExpires}
                  onChange={(e) => setPromoFlyerExpires(e.target.value)}
                  className="h-11 rounded-xl text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  {promoFlyerExpires
                    ? (isFlyerExpired ? '⚠️ Cette date est dépassée : le lien est expiré.' : 'Valide jusqu\'à 23h59 à cette date.')
                    : 'Sans date d\'expiration : actif indéfiniment tant que le toggle est activé.'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo-public-code" className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Code Promo dans le lien (Slug)
                </Label>
                <div className="relative">
                  <Input
                    id="promo-public-code"
                    type="text"
                    value={promoPublicCode}
                    onChange={(e) => setPromoPublicCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    className="h-11 rounded-xl uppercase font-mono"
                    placeholder="FLYER"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Ex: FLYER, PROMO, BIENVENUE, ETE2026</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo-public-target" className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Page de destination du lien
                </Label>
                <select
                  id="promo-public-target"
                  value={promoPublicTarget}
                  onChange={(e) => setPromoPublicTarget(e.target.value)}
                  className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                >
                  <option value="/lab">FYS Lab (/lab) — Composer directement un jus</option>
                  <option value="/">Accueil (/) — Découvrir la marque & navigation</option>
                  <option value="/board/catalogue">Catalogue (/board/catalogue) — Recettes signatures</option>
                </select>
                <p className="text-[11px] text-muted-foreground">Où le visiteur atterrit en cliquant sur le lien.</p>
              </div>
            </div>

            {/* ── Box Lien Partageable & Actions ── */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="size-3.5 text-primary" />
                  Lien public prêt à partager
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Partageable sur WhatsApp, Instagram, SMS, etc.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background border border-border/80 rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground truncate select-all">
                  {generatedPublicUrl || 'Génération de l\'URL…'}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopyLink}
                  variant={copiedLink ? "default" : "outline"}
                  className="h-10 px-3.5 rounded-xl gap-1.5 text-xs shrink-0 transition-all font-semibold"
                >
                  {copiedLink ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                  {copiedLink ? 'Copié !' : 'Copier le lien'}
                </Button>
              </div>

              {/* Boutons d'actions rapides */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleShareWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 text-xs h-9 px-3.5 shadow-xs font-semibold"
                >
                  <Share2 className="size-3.5" /> Partager sur WhatsApp
                </Button>
                <a
                  href={generatedPublicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground px-3.5 py-2 rounded-xl border border-border/80 hover:bg-background/80 transition-colors h-9"
                >
                  <ExternalLink className="size-3.5 text-muted-foreground" /> Tester le lien
                </a>
              </div>
            </div>

            {/* ── QR Code Physique Correspondant ── */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <div className="bg-white p-2.5 rounded-xl shadow-xs border border-border/40 shrink-0">
                {origin ? (
                  <QRCodeSVG
                    id="qr-flyer-svg"
                    value={generatedPublicUrl || `${origin}/lab?promo=FLYER`}
                    size={120}
                    level="M"
                    includeMargin={true}
                  />
                ) : (
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="space-y-2 flex-1">
                <div>
                  <h5 className="text-sm font-bold text-foreground">QR Code Flyer Synchronisé</h5>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Ce QR code encode exactement le même lien public. Vos clients bénéficient de la même réduction, qu'ils scannent ce QR code sur un flyer papier ou cliquent sur le lien WhatsApp !
                  </p>
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs h-8 rounded-xl font-semibold"
                    type="button"
                    onClick={() => downloadSvgAsPng('qr-flyer-svg', `qr-${cleanPromoCode.toLowerCase()}-fys.png`)}
                  >
                    <Download className="size-3.5" /> Télécharger PNG (pour flyer / affiche)
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Carte 2 : QR Étiquette (Fidélité / Re-commande) ── */}
          <div className="rounded-2xl border border-border/60 bg-muted/10 p-5 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/40">
              <div>
                <h4 className="font-display font-bold text-base text-foreground flex items-center gap-2">
                  <Tag className="size-4 text-amber-500" />
                  QR Étiquette de Bouteille (Fidélité & Re-commande)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Code automatiquement imprimé sur chaque étiquette de bouteille pour inciter les clients à recommander leur mix préféré.
                </p>
              </div>

              {/* Bouton Toggle Reorder */}
              <button
                type="button"
                onClick={() => setPromoReorderActive((v) => !v)}
                className={`flex items-center justify-between sm:justify-center gap-3 px-4 py-2.5 rounded-xl transition-all border shrink-0 ${
                  promoReorderActive
                    ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                    : 'bg-muted/60 border-border/40 text-muted-foreground font-medium'
                }`}
              >
                <span className="text-xs flex items-center gap-1.5">
                  {promoReorderActive ? (
                    <><CheckCircle2 className="size-4 text-primary" /> Promo Fidélité Activée</>
                  ) : (
                    <><XCircle className="size-4" /> Promo Fidélité Désactivée</>
                  )}
                </span>
                {promoReorderActive ? (
                  <ToggleRight className="size-5 text-primary" />
                ) : (
                  <ToggleLeft className="size-5 text-muted-foreground" />
                )}
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="promo-reorder" className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Montant de la réduction fidélité
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
                <p className="text-[11px] text-muted-foreground">Montant déduit lors d'un scan du QR de la bouteille ({origin}/lab?load=...&promo=REORDER).</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo-reorder-expires" className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="size-3.5 text-amber-500" />
                    Date d'expiration (optionnel)
                  </span>
                  {promoReorderExpires && (
                    <button
                      type="button"
                      onClick={() => setPromoReorderExpires('')}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline normal-case"
                    >
                      Retirer
                    </button>
                  )}
                </Label>
                <Input
                  id="promo-reorder-expires"
                  type="date"
                  value={promoReorderExpires}
                  onChange={(e) => setPromoReorderExpires(e.target.value)}
                  className="h-11 rounded-xl text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  {promoReorderExpires
                    ? 'Valide jusqu\'à cette date.'
                    : 'Sans date d\'expiration : toujours actif pour les clients fidèles.'}
                </p>
              </div>
            </div>
          </div>

          {/* ── Annonce de lancement & Délai de livraison ── */}
          <div className="flex items-start gap-4 pb-6 pt-6 border-b border-border/40">
            <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-lg text-foreground">
                {t('launchNotice.cardTitle')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('launchNotice.description')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Toggle switch */}
            <button
              type="button"
              onClick={() => setLaunchNoticeActive((v) => !v)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all border ${
                launchNoticeActive
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-muted/60 border-border/40'
              }`}
            >
              <span className={`text-sm font-semibold flex items-center gap-2 ${
                launchNoticeActive ? 'text-amber-900 dark:text-amber-200' : 'text-muted-foreground'
              }`}>
                {launchNoticeActive ? (
                  <><CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" /> {t('launchNotice.activeStatus')}</>
                ) : (
                  <><XCircle className="size-4" /> {t('launchNotice.inactiveStatus')}</>
                )}
              </span>
              {launchNoticeActive ? (
                <ToggleRight className="size-6 text-amber-600 dark:text-amber-400" />
              ) : (
                <ToggleLeft className="size-6 text-muted-foreground" />
              )}
            </button>

            {/* Inputs */}
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="pricing-launch-notice-fr" className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {t('launchNotice.frenchTextLabel')} 🇨🇲 / 🇫🇷
                </Label>
                <textarea
                  id="pricing-launch-notice-fr"
                  rows={2}
                  value={launchNoticeText}
                  onChange={(e) => setLaunchNoticeText(e.target.value)}
                  placeholder="Ex: Pour le mois de démarrage, les livraisons se feront après 24h."
                  className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pricing-launch-notice-en" className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {t('launchNotice.englishTextLabel')} 🇬🇧
                </Label>
                <textarea
                  id="pricing-launch-notice-en"
                  rows={2}
                  value={launchNoticeTextEn}
                  onChange={(e) => setLaunchNoticeTextEn(e.target.value)}
                  placeholder="Ex: For the launch month, deliveries will be made after 24h."
                  className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                />
              </div>
            </div>

            {/* Live Preview */}
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-100">
              <Clock className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 min-w-0 flex-1">
                <span className="font-bold text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                  Aperçu :
                </span>
                <p className="font-semibold leading-snug">
                  {launchNoticeText || DEFAULT_PRICING.launchNoticeText}
                </p>
              </div>
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
  metaTags: [{ name: 'robots', content: 'noindex, nofollow' }],
};

export default Pricing;
