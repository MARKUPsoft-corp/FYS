import { useState, useEffect } from 'react';
import { PageComponent } from 'rasengan';
import { Loader2, Save, Wine } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getPricingSettings, updatePricingSettings } from '@/services/settings';
import { BOTTLE_VOLUME_LABELS } from '@/entities';

const Pricing: PageComponent = () => {
  const queryClient = useQueryClient();
  const { data: pricing, isLoading } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: getPricingSettings,
  });

  const [bottle500, setBottle500] = useState('');
  const [bottle1L, setBottle1L] = useState('');
  const [delivery, setDelivery] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!pricing) return;
    setBottle500(String(pricing.bottle500mlBase));
    setBottle1L(String(pricing.bottle1LBase));
    setDelivery(String(pricing.deliveryFee));
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
      });
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto px-3 md:px-4 lg:px-6 pt-6 lg:pt-10 pb-20">
      <div>
        <p className="text-sm text-muted-foreground font-semibold uppercase tracking-widest pl-1 mb-2">
          Tarification
        </p>
        <h2 className="font-display font-bold text-4xl text-foreground leading-[1.1]">
          Contenants & livraison
        </h2>
        <p className="text-muted-foreground text-lg font-medium mt-3">
          Définissez le prix de base des bouteilles. Le client ne voit que le prix final par contenant
          (base + mix), jamais le détail par fruit.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 bg-card rounded-[2rem] border border-border/40">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <form
          onSubmit={handleSave}
          className="bg-card rounded-[2rem] border border-border/40 shadow-sm p-6 md:p-8 space-y-8"
        >
          <div className="flex items-start gap-4 pb-6 border-b border-border/40">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Wine className="size-6 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-foreground">Prix des contenants</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ces montants s&apos;ajoutent au mix fruits (calculé en interne) pour afficher le prix / bouteille au client.
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
              <p className="text-[11px] text-muted-foreground">Demi-litre — affiché dans le Lab & commande</p>
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
              <p className="text-[11px] text-muted-foreground">Un litre — option premium</p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="delivery-fee" className="text-sm font-semibold">
              Frais de livraison
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

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" size="lg" className="rounded-full gap-2" disabled={saving}>
              {saving ? (
                <><Loader2 className="size-4 animate-spin" /> Enregistrement…</>
              ) : (
                <><Save className="size-4" /> Enregistrer</>
              )}
            </Button>
            {saved && (
              <span className="text-sm font-semibold text-primary">Tarifs mis à jour ✓</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

Pricing.metadata = {
  title: 'FYS — Tarification',
  description: 'Prix des contenants et livraison.',
};

export default Pricing;
