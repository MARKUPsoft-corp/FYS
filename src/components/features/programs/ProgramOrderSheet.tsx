import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'rasengan';
import {
  Sparkles,
  Calendar,
  Clock,
  Truck,
  Phone,
  MapPin,
  MessageSquare,
  Banknote,
  Smartphone,
  CheckCircle2,
  Loader2,
  Leaf,
  Package,
  AlertCircle,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { YaoundeDistrictPicker } from '@/components/features/orders/YaoundeDistrictPicker';
import { GeolocationButton } from '@/components/features/orders/GeolocationButton';
import { createProgramOrder } from '@/services/order';
import { enrollUserInProgram } from '@/services/program';
import { getPricingSettings } from '@/services/settings';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore } from '@/stores/profile';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { Program } from '@/entities';

function detectOperator(phone: string): 'MTN' | 'ORANGE' | null {
  const num = phone.replace(/[^0-9]/g, '').replace(/^(237|00237)/, '');
  if (num.length !== 9) return null;
  if (/^6(7|80|81|82|83|50|51|52|53|54)/.test(num)) return 'MTN';
  if (/^6(9|55|56|57|58|59)/.test(num)) return 'ORANGE';
  return null;
}

interface Props {
  program: Program | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (orderId: string) => void;
}

export function ProgramOrderSheet({
  program,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();

  const [startDateChoice, setStartDateChoice] = useState<'today' | 'tomorrow' | 'custom'>('tomorrow');
  const [customDate, setCustomDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });

  // Delivery details
  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState('');
  const [instructions, setInstructions] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>();
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'momo'>('cod');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: pricing } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: getPricingSettings,
  });

  const deliveryFee = pricing?.deliveryFee ?? 1000;

  useEffect(() => {
    if (user?.phone && !phone) {
      setPhone(user.phone);
    }
  }, [user?.phone]);

  if (!program) return null;

  const packPrice = program.price || 0;
  const totalPrice = packPrice + deliveryFee;

  const computedStartDate =
    startDateChoice === 'today'
      ? new Date().toISOString()
      : startDateChoice === 'tomorrow'
      ? new Date(Date.now() + 86400000).toISOString()
      : new Date(customDate).toISOString();

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate(`/auth/login?redirect=${encodeURIComponent('/board/programs')}`);
      return;
    }

    if (!district.trim()) {
      setError('Veuillez indiquer votre quartier de livraison à Yaoundé.');
      return;
    }

    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) {
      setError('Veuillez renseigner un numéro de téléphone valide pour le livreur.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 1. Enroll user in the program
      const startingToday = startDateChoice === 'today';
      await enrollUserInProgram(
        user.uid,
        {
          name: user.name || 'Client FYS',
          email: user.email || '',
          phone: phone.trim() || undefined,
        },
        program,
        startingToday
      );

      // 2. Create the real in-app order
      const orderId = await createProgramOrder(
        {
          uid: user.uid,
          name: user.name || 'Client FYS',
          email: user.email || '',
          phone: phone.trim(),
        },
        program,
        deliveryFee,
        computedStartDate,
        {
          district: district.trim(),
          phone: phone.trim(),
          instructions: instructions.trim(),
          coordinates,
        }
      );

      onOpenChange(false);
      if (onSuccess) {
        onSuccess(orderId);
      } else {
        navigate(`/board/orders?tab=programs&order=${orderId}`);
      }
    } catch (err: any) {
      console.error('Error creating program order:', err);
      setError(err?.message || 'Une erreur est survenue lors de la validation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col bg-background text-foreground z-50 border-l border-border/60"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="size-3" />
              Commande FYS Programme
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">
              Livraison programmée à Yaoundé
            </span>
          </div>
          <SheetTitle className="text-xl sm:text-2xl font-bold font-display text-foreground leading-tight">
            Commander votre pack : {program.title}
          </SheetTitle>
        </SheetHeader>

        {/* Form content */}
        <form onSubmit={handleOrder} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Program summary card */}
          <div className="rounded-3xl border border-primary/30 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="size-20 sm:size-24 rounded-2xl overflow-hidden shrink-0 shadow-md border border-primary/20 bg-muted">
              <img
                src={program.imageUrl || 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=600'}
                alt={program.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 space-y-1.5 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-[11px] font-bold bg-background px-2.5 py-0.5 rounded-md text-foreground border border-border">
                  {program.durationDays} jours · {program.bottlesTotal} flacons
                </span>
                <span className="text-[11px] font-bold text-primary">
                  {program.goalLabel}
                </span>
              </div>
              <h4 className="font-bold text-base text-foreground truncate">
                {program.subtitle || program.title}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {program.description}
              </p>
            </div>
          </div>

          {/* Start date selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="size-3.5 text-primary" />
              Date de démarrage de la cure
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setStartDateChoice('tomorrow')}
                className={cn(
                  'p-3 rounded-2xl border-2 text-left transition-all',
                  startDateChoice === 'tomorrow'
                    ? 'border-primary bg-primary/10 shadow-xs'
                    : 'border-border/60 bg-card hover:border-border'
                )}
              >
                <span className="block text-xs font-bold text-foreground">Demain matin</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">
                  Idéal à jeun
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStartDateChoice('today')}
                className={cn(
                  'p-3 rounded-2xl border-2 text-left transition-all',
                  startDateChoice === 'today'
                    ? 'border-primary bg-primary/10 shadow-xs'
                    : 'border-border/60 bg-card hover:border-border'
                )}
              >
                <span className="block text-xs font-bold text-foreground">Aujourd'hui</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">
                  Dès réception
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStartDateChoice('custom')}
                className={cn(
                  'p-3 rounded-2xl border-2 text-left transition-all',
                  startDateChoice === 'custom'
                    ? 'border-primary bg-primary/10 shadow-xs'
                    : 'border-border/60 bg-card hover:border-border'
                )}
              >
                <span className="block text-xs font-bold text-foreground">Autre date</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">
                  Choisir le jour
                </span>
              </button>
            </div>

            {startDateChoice === 'custom' && (
              <div className="pt-2 animate-in fade-in">
                <input
                  type="date"
                  value={customDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full h-11 px-3 bg-muted/60 border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                />
              </div>
            )}
          </div>

          {/* Delivery section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" />
                Adresse de livraison à Yaoundé
              </label>
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                <Clock className="size-3" />
                Livré frais chaque matin
              </span>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 uppercase">
                  Quartier exact *
                </label>
                <YaoundeDistrictPicker
                  value={district}
                  onChange={setDistrict}
                />
                <GeolocationButton
                  onLocation={({ address, ...coords }) => {
                    setCoordinates(coords);
                    if (address) setDistrict(address);
                  }}
                  className="mt-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 uppercase">
                  <Phone className="size-3.5 text-primary" /> Numéro de téléphone pour le livreur *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    className="w-full h-10 px-3 bg-muted/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors pr-24"
                    placeholder="Ex: 699 00 00 00"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  {phone.length >= 8 && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      {detectOperator(phone) === 'MTN' && (
                        <span className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-[10px] font-bold text-yellow-800 dark:text-yellow-400 px-2 py-0.5 rounded">
                          MTN
                        </span>
                      )}
                      {detectOperator(phone) === 'ORANGE' && (
                        <span className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 text-[10px] font-bold text-orange-800 dark:text-orange-400 px-2 py-0.5 rounded">
                          Orange
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 uppercase">
                  <MessageSquare className="size-3.5 text-primary" /> Instructions de livraison (optionnel)
                </label>
                <textarea
                  className="w-full h-18 p-3 bg-muted/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
                  placeholder="Ex: Portail noir, sonner ou appeler en arrivant..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Mode de règlement
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all h-[90px] cursor-pointer',
                  paymentMethod === 'cod'
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border/60 bg-card hover:border-border'
                )}
              >
                <Banknote className={cn('size-6', paymentMethod === 'cod' ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-xs font-bold', paymentMethod === 'cod' ? 'text-primary' : 'text-muted-foreground')}>
                  À la livraison
                </span>
              </button>

              <button
                type="button"
                disabled
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 border-border/50 bg-card opacity-50 cursor-not-allowed h-[90px]"
              >
                <Smartphone className="size-6 text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground">
                  Mobile Money (Bientôt)
                </span>
              </button>
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Price breakdown */}
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 text-xs sm:text-sm">
              <span className="text-muted-foreground">
                Pack {program.durationDays} jours ({program.bottlesTotal} flacons de {program.bottleSize})
              </span>
              <span className="font-bold text-foreground tabular-nums">
                {packPrice.toLocaleString()} XAF
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-xs sm:text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Truck className="size-3.5" /> Frais de livraison Yaoundé
              </span>
              <span className="font-bold text-foreground tabular-nums">
                {deliveryFee.toLocaleString()} XAF
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 bg-primary/5">
              <span className="text-sm font-bold text-foreground">Total à régler</span>
              <span className="text-lg font-bold text-primary tabular-nums">
                {totalPrice.toLocaleString()} XAF
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Confirmation de votre commande...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Confirmer et commander ma cure ({totalPrice.toLocaleString()} XAF)
                </>
              )}
            </Button>
            <p className="text-[11px] text-center text-muted-foreground mt-2">
              Paiement à la livraison après inspection de vos flacons frais.
            </p>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
