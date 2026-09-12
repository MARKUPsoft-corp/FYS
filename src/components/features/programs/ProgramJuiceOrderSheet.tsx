import { useState, useEffect } from 'react';
import { useNavigate } from 'rasengan';
import {
  ShoppingBag,
  Sparkles,
  Calendar,
  Clock,
  Truck,
  Phone,
  MapPin,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Leaf,
  Layers,
  ArrowRight,
  Droplets,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { YaoundeDistrictPicker } from '@/components/features/orders/YaoundeDistrictPicker';
import { orderProgramJuice, getActiveProgramOrder } from '@/services/order';
import { getPricingSettings } from '@/services/settings';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore } from '@/stores/profile';
import { useQuery } from '@tanstack/react-query';
import type { UserProgram, ProgramDayItem, Order } from '@/entities';
import { PROGRAM_TIMING_LABELS } from '@/entities';

interface Props {
  userProgram: UserProgram;
  dayItem: ProgramDayItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (orderId: string, isNewOrder: boolean, updatedCount: number) => void;
}

export function ProgramJuiceOrderSheet({
  userProgram,
  dayItem,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();

  const [existingOrder, setExistingOrder] = useState<Order | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // Delivery details for new order
  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState('');
  const [instructions, setInstructions] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    orderId: string;
    isNewOrder: boolean;
    updatedCount: number;
    juiceName: string;
  } | null>(null);

  const { data: pricing } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: getPricingSettings,
  });

  const deliveryFee = pricing?.deliveryFee ?? 1000;

  // Pre-fill user profile info
  useEffect(() => {
    if (user?.phone && !phone) {
      setPhone(user.phone);
    }
  }, [user?.phone, phone]);

  // Check if an open program order exists for this program
  useEffect(() => {
    let isMounted = true;
    if (open && user?.uid && userProgram.programId) {
      setCheckingExisting(true);
      setSuccessInfo(null);
      setError(null);
      getActiveProgramOrder(user.uid, userProgram.programId, userProgram.id)
        .then((ord) => {
          if (isMounted) {
            setExistingOrder(ord);
            if (ord?.deliveryDetails?.district) {
              setDistrict(ord.deliveryDetails.district);
            }
            if (ord?.deliveryDetails?.phone) {
              setPhone(ord.deliveryDetails.phone);
            }
            if (ord?.deliveryDetails?.instructions) {
              setInstructions(ord.deliveryDetails.instructions);
            }
          }
        })
        .catch((err) => {
          console.error('[ProgramJuiceOrderSheet] Error checking existing order:', err);
        })
        .finally(() => {
          if (isMounted) setCheckingExisting(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [open, user?.uid, userProgram.programId, userProgram.id]);

  if (!dayItem) return null;

  const dayNumber = dayItem.dayNumber || dayItem.day;
  const juiceName = dayItem.cocktailName || dayItem.juiceName || `Jus Jour ${dayNumber}`;
  const timingLabel = dayItem.timingLabel || PROGRAM_TIMING_LABELS[dayItem.timing] || 'Au réveil';
  const fruitNames = dayItem.fruitNames || dayItem.fruits || [];

  // Price computation
  const duration = userProgram.durationDays || userProgram.programSnapshot?.durationDays || 3;
  const bottlesTotal = userProgram.programSnapshot?.bottlesTotal || duration;
  const programPrice = userProgram.programSnapshot?.price || 0;
  const pricePerBottle = programPrice > 0 ? Math.round(programPrice / bottlesTotal) : 2500;

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate(`/auth/login?redirect=${encodeURIComponent('/board/programs')}`);
      return;
    }

    if (!existingOrder && !district.trim()) {
      setError('Veuillez indiquer votre quartier de livraison à Yaoundé.');
      return;
    }

    if (!existingOrder && (!phone.trim() || phone.replace(/\D/g, '').length < 8)) {
      setError('Veuillez renseigner un numéro de téléphone valide.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await orderProgramJuice(
        {
          uid: user.uid,
          name: user.name || 'Client',
          email: user.email || '',
          phone: phone || user.phone || undefined,
        },
        userProgram,
        dayItem,
        existingOrder ? undefined : { district: district.trim(), phone: phone.trim(), instructions: instructions.trim() },
        deliveryFee
      );

      setSuccessInfo(res);
      onSuccess?.(res.orderId, res.isNewOrder, res.updatedJuiceCount);
    } catch (err: any) {
      console.error('[ProgramJuiceOrderSheet] Order error:', err);
      setError(err?.message || 'Une erreur est survenue lors de la commande.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[500px] p-0 flex flex-col bg-background">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
          <SheetTitle className="font-display text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="size-5 text-primary" />
            Commander ce jus de cure
          </SheetTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cure « {userProgram.programTitle} »
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Success State */}
          {successInfo ? (
            <div className="p-6 rounded-3xl bg-primary/10 border border-primary/30 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="size-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="size-7" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold font-display text-lg text-foreground">
                  {successInfo.isNewOrder
                    ? 'Commande initiée avec succès !'
                    : 'Jus ajouté à votre commande !'}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {successInfo.isNewOrder
                    ? `Votre commande pour la cure "${userProgram.programTitle}" a bien été créée avec le jus "${successInfo.juiceName}". Vos prochaines commandes de jus s'y ajouteront automatiquement.`
                    : `Le jus "${successInfo.juiceName}" a été regroupé dans votre commande globale (${successInfo.updatedCount} flacons au total).`}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/board/orders?tab=programs&order=${successInfo.orderId}`);
                  }}
                  className="w-full sm:w-auto text-xs font-bold h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
                >
                  Voir ma commande
                  <ArrowRight className="size-3.5 ml-1.5" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="w-full sm:w-auto text-xs font-bold h-10 px-5 rounded-xl border-border/80 cursor-pointer"
                >
                  Fermer
                </Button>
              </div>
            </div>
          ) : (
            <form id="order-program-juice-form" onSubmit={handleOrder} className="space-y-5">
              {error && (
                <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Juice Card */}
              <div className="p-4 rounded-2xl border border-primary/25 bg-primary/5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                        Jour {dayNumber}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                        <Clock className="size-3" />
                        {timingLabel}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary">
                        500ml Frais
                      </span>
                    </div>
                    <h4 className="font-display font-bold text-base text-foreground">
                      {juiceName}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-bold font-display text-primary block">
                      {pricePerBottle.toLocaleString()} XAF
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                      1 flacon
                    </span>
                  </div>
                </div>

                {fruitNames.length > 0 && (
                  <div className="pt-2 border-t border-border/50 flex flex-wrap gap-1.5">
                    {fruitNames.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-background border border-border/60 text-foreground/90"
                      >
                        <Leaf className="size-3 text-primary" />
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Existing Program Order Regrouping Notice */}
              {checkingExisting ? (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span>Vérification de vos commandes de cure en cours...</span>
                </div>
              ) : existingOrder ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2.5 text-xs text-foreground">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                    <Layers className="size-4" />
                    <span>Regroupement automatique dans votre commande en cours</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Une commande ouverte existe déjà pour la cure « {userProgram.programTitle} » (Réf : #{existingOrder.id.slice(0, 8)}).
                    Ce jus s'ajoutera automatiquement à la suite des jus déjà commandés.
                  </p>

                  {/* List of previously ordered juices in this program order */}
                  {existingOrder.programJuiceItems && existingOrder.programJuiceItems.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-background/80 border border-border/50 space-y-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Jus déjà inclus ({existingOrder.programJuiceItems.length}) :
                      </span>
                      {existingOrder.programJuiceItems.map((item, idx) => (
                        <div key={item.id || idx} className="flex items-center justify-between text-[11px] text-foreground/90">
                          <span className="truncate">Jour {item.dayNumber} · {item.juiceName}</span>
                          <span className="font-semibold text-muted-foreground ml-2 shrink-0">
                            {item.quantity} × {item.pricePerBottle.toLocaleString()} XAF
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                    <MapPin className="size-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      Livraison prévue à : <strong className="text-foreground">{existingOrder.deliveryDetails?.district || 'Quartier enregistré'}</strong> ({existingOrder.deliveryDetails?.phone || ''})
                    </span>
                  </div>
                </div>
              ) : (
                /* First Order - Prompt for delivery details */
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-4">
                  <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                    <Truck className="size-4 text-primary" />
                    <span>Détails de livraison pour cette cure</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ce premier jus lance la commande de votre programme. Les prochains jus commandés pour cette cure seront automatiquement regroupés à cette même adresse.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-foreground mb-1 block">
                        Quartier de livraison à Yaoundé *
                      </label>
                      <YaoundeDistrictPicker
                        value={district}
                        onChange={setDistrict}
                        placeholder="Sélectionnez votre quartier..."
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-foreground mb-1 block">
                        Numéro de téléphone pour la livraison *
                      </label>
                      <div className="relative">
                        <Phone className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="6xx xxx xxx"
                          className="pl-9 h-11 text-xs rounded-xl"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-foreground mb-1 block">
                        Instructions de livraison (repère, étage...)
                      </label>
                      <div className="relative">
                        <MessageSquare className="size-4 text-muted-foreground absolute left-3 top-3" />
                        <textarea
                          value={instructions}
                          onChange={(e) => setInstructions(e.target.value)}
                          placeholder="Ex: Face boulangerie, portail noir..."
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-input bg-transparent resize-none h-16 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Breakdown */}
              <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Jus Jour {dayNumber} ({juiceName})</span>
                  <span className="font-semibold text-foreground">{pricePerBottle.toLocaleString()} XAF</span>
                </div>

                {!existingOrder && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Truck className="size-3 text-primary" />
                      Frais de livraison
                    </span>
                    <span className="font-semibold text-foreground">{deliveryFee.toLocaleString()} XAF</span>
                  </div>
                )}

                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-sm font-bold text-foreground">
                  <span>
                    {existingOrder ? 'Montant ajouté' : 'Total à régler'}
                  </span>
                  <span className="text-base font-display text-primary">
                    {(existingOrder ? pricePerBottle : pricePerBottle + deliveryFee).toLocaleString()} XAF
                  </span>
                </div>

                {existingOrder && (
                  <p className="text-[11px] text-muted-foreground italic text-right">
                    Nouveau total commande : {(existingOrder.totalPrice + pricePerBottle).toLocaleString()} XAF
                  </p>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer actions */}
        {!successInfo && (
          <div className="p-4 sm:p-5 bg-card border-t border-border/60 flex items-center justify-between gap-3 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs cursor-pointer"
            >
              Annuler
            </Button>

            <Button
              type="submit"
              form="order-program-juice-form"
              disabled={loading || checkingExisting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-11 px-6 rounded-xl shadow-md transition-all active:scale-98 cursor-pointer flex-1 sm:flex-initial"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  <span>Enregistrement...</span>
                </>
              ) : existingOrder ? (
                <>
                  <Layers className="size-4 mr-2" />
                  <span>Ajouter à la commande ({pricePerBottle.toLocaleString()} XAF)</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="size-4 mr-2" />
                  <span>Confirmer la commande ({(pricePerBottle + deliveryFee).toLocaleString()} XAF)</span>
                </>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
