import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'rasengan';
import { Beaker, ChevronRight, Leaf, Package, ShieldCheck, Clock, CheckCircle2, ChefHat, Droplets, XCircle, Sparkles, ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useState, useEffect } from 'react';

import { getFruits } from '@/services/fruit';
import { useQuery } from '@tanstack/react-query';
import { isUsableFruit, OrderStatus, type Fruit } from '@/entities';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore, isProfileComplete } from '@/stores/profile';
import { useUserOrders } from '@/hooks/useOrders';
import { CocktailBanner } from '@/components/features/cocktail/CocktailBanner';
type Props = Record<string, never>;

const STATUS_CONFIG: Record<OrderStatus, { label: string; icon: any; bg: string; text: string; border: string; dot: string; }> = {
  [OrderStatus.PENDING]: { label: 'En attente', icon: Clock, bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-700', dot: 'bg-amber-500' },
  [OrderStatus.CONFIRMED]: { label: 'Confirmée', icon: CheckCircle2, bg: 'bg-sky-50 dark:bg-sky-950/30', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-700', dot: 'bg-sky-500' },
  [OrderStatus.PREPARING]: { label: 'En préparation', icon: ChefHat, bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-700', dot: 'bg-violet-500' },
  [OrderStatus.READY]: { label: 'Prête', icon: Package, bg: 'bg-primary/8 dark:bg-primary/15', text: 'text-primary', border: 'border-primary/30', dot: 'bg-primary' },
  [OrderStatus.DELIVERED]: { label: 'Livrée', icon: CheckCircle2, bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-700', dot: 'bg-emerald-500' },
  [OrderStatus.CANCELLED]: { label: 'Annulée', icon: XCircle, bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border/60', dot: 'bg-muted-foreground/40' },
};

export function CustomerHome(_props: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { profile, fetch: fetchProfile, loading: profileLoading } = useProfileStore();
  const { orders, isLoading: ordersLoading } = useUserOrders(user?.uid);
  
  // Computations for real stats
  const uniqueCocktailsCreated = new Set(orders.map(o => o.cocktailId)).size;
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.status)).length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  
  const [selectedFruit, setSelectedFruit] = useState<Fruit | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');

  const handleAiSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiPrompt.trim()) return;
    navigate(`/lab?tab=nutrifys&prompt=${encodeURIComponent(aiPrompt)}`);
  };

  const { data: storeFruits = [] } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
  });

  useEffect(() => {
    if (user?.uid) fetchProfile(user.uid);
  }, [user?.uid, fetchProfile]);

  const firstName = user?.name ? user.name.split(' ')[0] : 'Client';
  const profileComplete = isProfileComplete(profile);
  
  // Get recent 4 orders
  const recentOrders = orders.slice(0, 4);

  const completionSections = [
    { label: 'Conditions', done: profile?.healthConditions && profile.healthConditions.length > 0 },
    { label: 'Allergies', done: profile?.allergies && profile.allergies.length > 0 },
    { label: 'Objectifs', done: profile?.goals && profile.goals.length > 0 },
  ];
  const completionCount = completionSections.filter((s) => s.done).length;
  const completionPct = Math.round((completionCount / completionSections.length) * 100);

  return (
    <div className="min-h-dvh bg-background pb-4 overflow-x-clip">
      <div className="px-3 md:px-6 py-6 md:py-8 max-w-7xl mx-auto space-y-10">

        {/* 1. HEADER PERSONNALISÉ (LAUNCHPAD IA) */}
        <div className="bg-card rounded-[2.5rem] p-7 md:p-12 border border-border/40 shadow-sm relative overflow-hidden flex flex-col items-center justify-center text-center">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent opacity-50 pointer-events-none" />
          
          {/* Subtle Background Image */}
          <div 
            className="absolute right-0 top-0 w-2/3 md:w-1/2 h-full bg-cover bg-center pointer-events-none opacity-15 dark:opacity-[0.08] transition-opacity mix-blend-multiply dark:mix-blend-screen"
            style={{ 
              backgroundImage: "url('https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=800&auto=format&fit=crop')",
              WebkitMaskImage: 'linear-gradient(to right, transparent, black)',
              maskImage: 'linear-gradient(to right, transparent, black)' 
            }} 
          />
          
          <div className="relative z-10 w-full max-w-2xl space-y-6">
            <div className="flex items-center justify-center gap-2 mb-2">
               <span className="text-xl">👋</span> 
               <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Bonjour, {firstName}</span>
            </div>
            
            {profileLoading ? (
              <div className="flex flex-col items-center justify-center space-y-6 py-6 w-full animate-pulse">
                <div className="h-10 w-3/4 bg-muted/60 rounded-xl"></div>
                <div className="h-12 w-full bg-muted/60 rounded-full"></div>
              </div>
            ) : profileComplete ? (
              <>
                <h1 className="text-4xl md:text-5xl font-extrabold font-display tracking-tight text-foreground leading-[1.1]">
                  Quelle est votre envie du jour ?
                </h1>
                
                <form onSubmit={handleAiSubmit} className="relative mt-8 w-full group">
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-center bg-background rounded-full border border-border/80 shadow-sm p-1.5 pl-4 sm:pl-6 hover:border-primary/50 focus-within:border-primary/50 focus-within:shadow-md transition-all">
                    <input 
                      type="text" 
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Ex: J'ai besoin d'énergie pour le sport..."
                      className="flex-1 min-w-0 bg-transparent border-none outline-none text-foreground text-sm md:text-base placeholder:text-muted-foreground/60 mr-2"
                    />
                    <Button 
                      type="submit"
                      disabled={!aiPrompt.trim()}
                      className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 sm:h-12 px-4 sm:px-6 gap-1.5 sm:gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      <Sparkles className="size-4" />
                      <span className="text-xs sm:text-sm">Demander</span>
                    </Button>
                  </div>
                </form>
                
                {profile?.goals && profile.goals.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1 mr-1">
                      <ShieldCheck className="size-3 opacity-70" /> Vos objectifs
                    </span>
                    {profile.goals.slice(0, 3).map((goal, idx) => (
                      <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold text-foreground/80 border border-border/60 bg-muted/20">
                        {goal}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <h1 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight text-foreground leading-[1.1]">
                  Personnalisons votre expérience
                </h1>
                <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto">
                  Pour que NutriFYS puisse créer des recettes parfaitement adaptées à votre corps, parlez-nous de vous.
                </p>
                
                <div className="max-w-md mx-auto mt-6 bg-background rounded-2xl border border-border/50 p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Profil santé</span>
                    <span className="text-xs font-bold text-amber-500">{completionPct}% complété</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${completionPct}%` }} />
                  </div>
                  <Link to="/board/profile" className="block w-full pt-2">
                    <Button className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold h-11 gap-2 shadow-md transition-all">
                      <ShieldCheck className="size-4" />
                      Compléter mon profil
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 2. STATISTIQUES (SECTION DÉDIÉE ET LUDIQUE) */}
        <div className="space-y-8 pt-6">
          <div className="flex items-center justify-center px-2 mb-6">
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display tracking-tight text-center">
              <span className="text-foreground">Votre</span> <span className="text-primary">Parcours</span>
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Stat 1: Commandes */}
            <div 
              onClick={() => setOrdersExpanded(!ordersExpanded)}
              className="bg-primary/5 border border-primary/20 rounded-[2rem] p-6 flex flex-col justify-center hover:bg-primary/10 transition-all duration-300 cursor-pointer shadow-sm group"
            >
              <div className="flex items-center justify-between w-full">
                <div>
                  <p className="text-5xl md:text-6xl font-black font-display text-primary tracking-tighter leading-none">{orders.length || 0}</p>
                  <p className="text-sm font-bold text-foreground mt-3 leading-tight flex items-center gap-1 group-hover:text-primary transition-colors">
                    Commandes
                    <ChevronDown className={`size-4 transition-transform duration-300 ${ordersExpanded ? 'rotate-180 text-primary' : 'text-muted-foreground'}`} />
                  </p>
                  <span className="text-muted-foreground font-medium text-xs">livrées avec soin</span>
                </div>
                <div className={`size-16 md:size-20 rounded-[1.5rem] bg-primary/15 flex items-center justify-center shadow-inner transition-transform duration-500 ${ordersExpanded ? 'rotate-12 scale-110' : 'rotate-3 group-hover:rotate-12'}`}>
                  <Package className="size-8 md:size-10 text-primary" />
                </div>
              </div>
              
              {/* Expandable Breakdown */}
              <div className={`grid transition-all duration-500 ease-in-out ${ordersExpanded ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                <div className="overflow-hidden flex flex-col gap-2.5">
                  <div className="flex items-center justify-between bg-background/50 rounded-xl p-2.5 px-4 border border-border/50">
                    <span className="text-xs font-bold flex items-center gap-2"><Clock className="size-3.5 text-amber-500"/> En attente</span>
                    <span className="text-sm font-bold text-foreground">{pendingCount}</span>
                  </div>
                  <div className="flex items-center justify-between bg-background/50 rounded-xl p-2.5 px-4 border border-border/50">
                    <span className="text-xs font-bold flex items-center gap-2"><ChefHat className="size-3.5 text-primary"/> En préparation</span>
                    <span className="text-sm font-bold text-foreground">{preparingCount}</span>
                  </div>
                  <div className="flex items-center justify-between bg-background/50 rounded-xl p-2.5 px-4 border border-border/50">
                    <span className="text-xs font-bold flex items-center gap-2"><CheckCircle2 className="size-3.5 text-emerald-500"/> Livrées</span>
                    <span className="text-sm font-bold text-foreground">{deliveredCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stat 2: Recettes */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-[2rem] p-6 flex items-center justify-between hover:scale-105 hover:bg-amber-500/10 transition-all duration-300 cursor-default shadow-sm">
              <div>
                <p className="text-5xl md:text-6xl font-black font-display text-amber-500 tracking-tighter leading-none">{uniqueCocktailsCreated}</p>
                <p className="text-sm font-bold text-foreground mt-3 leading-tight">Créations <br/> <span className="text-muted-foreground font-medium text-xs">uniques imaginées</span></p>
              </div>
              <div className="size-16 md:size-20 rounded-[1.5rem] bg-amber-500/15 flex items-center justify-center shadow-inner -rotate-3 hover:-rotate-12 transition-transform duration-300">
                <Beaker className="size-8 md:size-10 text-amber-500" />
              </div>
            </div>

            {/* Stat 3: IA */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-6 flex items-center justify-between hover:scale-105 hover:bg-emerald-500/10 transition-all duration-300 cursor-default shadow-sm">
              <div>
                <p className="text-5xl md:text-6xl font-black font-display text-emerald-500 tracking-tighter leading-none">34</p>
                <p className="text-sm font-bold text-foreground mt-3 leading-tight">Échanges <br/> <span className="text-muted-foreground font-medium text-xs">avec NutriFYS</span></p>
              </div>
              <div className="size-16 md:size-20 rounded-[1.5rem] bg-emerald-500/15 flex items-center justify-center shadow-inner rotate-6 hover:rotate-12 transition-transform duration-300">
                <Sparkles className="size-8 md:size-10 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>

        {/* 3. ACTIONS RAPIDES */}
        <div className="space-y-8 pt-8">
          <div className="flex items-center justify-center px-2 mb-6">
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display tracking-tight text-center">
              <span className="text-foreground">Accès</span> <span className="text-primary">Rapide</span>
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Composer Manuel */}
            <Link to="/lab" className="group relative bg-card p-6 sm:p-7 rounded-[2rem] border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 overflow-hidden flex flex-col h-full cursor-pointer">
              <div className="absolute -right-8 -top-8 text-primary/[0.03] dark:text-primary/10 group-hover:text-primary/[0.07] dark:group-hover:text-primary/20 transition-colors duration-500 -rotate-12 group-hover:rotate-0 pointer-events-none">
                <Beaker size={140} strokeWidth={1} />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 shadow-sm border border-primary/20">
                  <Beaker className="size-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Composer manuellement</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">Sélectionnez vos fruits et créez votre propre recette de jus de façon manuelle.</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-primary uppercase tracking-widest group-hover:underline">Démarrer</span>
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground text-primary transition-colors">
                    <ArrowRight className="size-4" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Card 2: Assistant IA */}
            <Link to="/lab?tab=nutrifys" className="group relative bg-card p-6 sm:p-7 rounded-[2rem] border border-border/50 shadow-sm hover:shadow-xl hover:border-amber-500/40 transition-all duration-300 overflow-hidden flex flex-col h-full cursor-pointer">
              <div className="absolute -right-8 -top-8 text-amber-500/[0.03] dark:text-amber-500/10 group-hover:text-amber-500/[0.07] dark:group-hover:text-amber-500/20 transition-colors duration-500 -rotate-12 group-hover:rotate-0 pointer-events-none">
                <Sparkles size={140} strokeWidth={1} />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="size-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 shadow-sm border border-amber-500/20">
                  <Sparkles className="size-7 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Assistant NutriFYS</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">L'IA s'occupe de composer la recette parfaite selon vos objectifs santé.</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-amber-500 uppercase tracking-widest group-hover:underline">Discuter</span>
                  <div className="size-8 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white text-amber-500 transition-colors">
                    <ArrowRight className="size-4" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Card 3: Catalogue */}
            <Link to="/board/catalogue" className="group relative bg-card p-6 sm:p-7 rounded-[2rem] border border-border/50 shadow-sm hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300 overflow-hidden flex flex-col h-full cursor-pointer">
              <div className="absolute -right-8 -top-8 text-emerald-500/[0.03] dark:text-emerald-500/10 group-hover:text-emerald-500/[0.07] dark:group-hover:text-emerald-500/20 transition-colors duration-500 -rotate-12 group-hover:rotate-0 pointer-events-none">
                <Leaf size={140} strokeWidth={1} />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="size-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 shadow-sm border border-emerald-500/20">
                  <Leaf className="size-7 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Catalogue FYS</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">Découvrez nos recettes signatures validées par des nutritionnistes.</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-emerald-500 uppercase tracking-widest group-hover:underline">Explorer</span>
                  <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white text-emerald-500 transition-colors">
                    <ArrowRight className="size-4" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* 4. COMMANDES RÉCENTES */}
        <div className="space-y-8 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-center relative px-2 mb-6">
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display tracking-tight text-center">
              <span className="text-foreground">Commandes</span> <span className="text-primary">récentes</span>
            </h3>
            {recentOrders.length > 0 && (
              <Link to="/board/orders" className="sm:absolute sm:right-2 mt-2 sm:mt-0 text-xs font-bold text-primary hover:underline uppercase tracking-wider">
                Historique
              </Link>
            )}
          </div>
          
          {ordersLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
               <div className="h-28 bg-card rounded-[1.5rem] border border-border/40 animate-pulse" />
               <div className="h-28 bg-card rounded-[1.5rem] border border-border/40 animate-pulse" />
            </div>
          ) : recentOrders.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {recentOrders.map(order => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG[OrderStatus.PENDING];
                  const Icon = cfg.icon;
                  const orderDate = order.createdAt ? new Date(order.createdAt.toMillis()).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                  
                  const orderFruits = order.ingredientImageSnapshots?.length 
                    ? order.ingredientImageSnapshots.map(url => ({ imageUrl: url }))
                    : order.cocktailImageSnapshot 
                      ? [{ imageUrl: order.cocktailImageSnapshot }] 
                      : [];
                  
                  return (
                    <Link to={`/board/orders?order=${order.id}`} key={order.id} className="group bg-card/60 backdrop-blur-md border border-border/50 p-3 sm:p-4 rounded-[1.5rem] sm:rounded-[2rem] flex items-stretch gap-4 sm:gap-5 hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 transition-all duration-300 cursor-pointer overflow-hidden relative">
                      
                      {/* Image Gauche (Composition) */}
                      <div className="w-28 sm:w-36 shrink-0 rounded-[1rem] sm:rounded-[1.5rem] overflow-hidden relative shadow-inner border border-primary/10 flex items-center justify-center">
                        {orderFruits.length > 0 ? (
                          <div className="w-full h-full group-hover:scale-105 transition-transform duration-700">
                             <CocktailBanner
                               fruits={orderFruits}
                               showText={false}
                               className="w-full h-full"
                             />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center text-primary/30">
                             <Droplets className="size-10" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-300 pointer-events-none" />
                      </div>
                      
                      {/* Contenu Droite */}
                      <div className="flex-1 flex flex-col justify-between py-1 min-w-0 z-10">
                        <div>
                          <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 truncate flex items-center gap-1.5">
                            <Clock className="size-3" /> {orderDate}
                          </p>
                          <h4 className="font-extrabold font-display text-base sm:text-lg md:text-xl text-foreground tracking-tight truncate leading-tight mb-3">
                            {order.cocktailNameSnapshot}
                          </h4>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-muted-foreground">
                            <span>{order.orderLines?.length ? `${order.orderLines.reduce((acc, l) => acc + l.quantity, 0)} bouteilles` : `${order.quantity} bouteilles`}</span>
                            <span className="font-bold font-display text-foreground text-sm sm:text-base">
                              {order.totalPrice.toLocaleString()} XAF
                            </span>
                          </div>
                          
                          <div className="flex items-end justify-between">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm`}>
                              <Icon className="size-3.5" />
                              {cfg.label}
                            </span>
                            <span className="flex items-center justify-center rounded-full bg-primary/10 text-primary px-3 sm:px-4 py-1.5 text-xs font-bold transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                              Afficher
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border/60 rounded-[2rem] p-10 text-center flex flex-col items-center justify-center">
                <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Package className="size-8 text-muted-foreground/60" />
                </div>
                <p className="text-base font-bold text-foreground">Aucune commande récente</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">Vous n'avez pas encore commandé de cocktail. Rendez-vous dans le Lab pour créer votre première recette !</p>
                <Link to="/lab">
                  <Button variant="outline" className="mt-6 rounded-full font-bold h-10 px-6 gap-2">
                    <Beaker className="size-4" /> Composer maintenant
                  </Button>
                </Link>
            </div>
          )}
        </div>

        {/* 5. BASE DE CONNAISSANCES (Ingrédients) */}
        <div className="space-y-8 pt-12 mt-12 border-t border-border/40">
          <div className="px-2 mb-8 text-center">
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display tracking-tight">
              <span className="text-foreground">Encyclopédie</span> <span className="text-primary">des fruits</span>
            </h3>
            <p className="text-base sm:text-lg text-muted-foreground mt-4 max-w-lg mx-auto">Cliquez sur un ingrédient pour découvrir ses vertus nutritionnelles et ses interactions.</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 pb-8">
            {storeFruits.map((fruit) => {
              const unavailable = !isUsableFruit(fruit);
              return (
                <div
                  key={fruit.id}
                  onClick={() => setSelectedFruit(fruit)}
                  className="relative bg-card w-full p-3 rounded-[1.5rem] border border-border/40 shadow-sm transition-all group flex flex-col items-center cursor-pointer hover:shadow-lg hover:-translate-y-1"
                >
                  {unavailable && (
                    <span className="absolute top-2 right-2 z-10 text-[9px] font-bold uppercase tracking-widest bg-background/80 backdrop-blur-md text-muted-foreground px-1.5 py-0.5 rounded-full border border-border">
                      Épuisé
                    </span>
                  )}
                  <div
                    className="w-full aspect-square rounded-[1rem] shadow-inner mb-3 bg-cover bg-center transition-transform group-hover:scale-105 bg-muted"
                    style={{ backgroundImage: fruit.imageUrl ? `url('${fruit.imageUrl}')` : 'none' }}
                  />
                  <h5 className="font-bold text-xs text-foreground text-center line-clamp-1 w-full px-1">{fruit.name}</h5>
                  <p className="text-[10px] text-muted-foreground text-center line-clamp-1 w-full mt-0.5 px-1">{fruit.benefits?.[0] || '100% Naturel'}</p>

                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={unavailable}
                    className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 bg-black/5 dark:bg-white/5 rounded-[1.5rem] transition-opacity"
                  >
                    <span className="sr-only">Voir détails</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Fruit Details Bottom Sheet / Drawer */}
      <Drawer open={!!selectedFruit} onOpenChange={(open) => !open && setSelectedFruit(null)}>
        <DrawerContent className="max-w-md mx-auto bg-background/80 backdrop-blur-[48px] saturate-[180%] border border-border/40 shadow-2xl">
          {selectedFruit && (
            <div className="overflow-y-auto max-h-[85vh] scrollbar-hide">
              {/* Image + Name row */}
              <div className="flex gap-5 pt-8 px-6 pb-4">
                <div
                  className="size-36 sm:size-44 shrink-0 rounded-2xl shadow-lg bg-cover bg-center bg-muted border border-border/40"
                  style={{ backgroundImage: selectedFruit.imageUrl ? `url('${selectedFruit.imageUrl}')` : 'none' }}
                />
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">
                    {selectedFruit.cocktailRole || 'BASE'}
                  </span>
                  <h2 className="font-display font-bold text-2xl text-foreground leading-tight">
                    {selectedFruit.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">
                    {selectedFruit.nutrients?.macros?.calories_kcal || 50} kcal / 100g
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 space-y-5">
                {selectedFruit.healthProfile?.benefitBadges && selectedFruit.healthProfile.benefitBadges.length > 0 && (
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-secondary" />
                      {t('nutrition.targetedBenefits')}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFruit.healthProfile.benefitBadges.map((b, i) => (
                        <span key={i} className="text-[11px] bg-secondary/10 text-secondary font-bold px-2.5 py-1 rounded-lg border border-secondary/20">
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nutrition quick stats */}
                {selectedFruit.nutrients && (
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-primary" />
                      {t('nutrition.profileLabel')}
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedFruit.nutrients.macros && (
                        <>
                          {selectedFruit.nutrients.macros.protein_g && (
                            <div className="bg-muted/30 rounded-xl p-2.5 text-center border border-border/50">
                              <p className="text-sm font-bold text-foreground">{selectedFruit.nutrients.macros.protein_g}g</p>
                              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Prots</p>
                            </div>
                          )}
                          {selectedFruit.nutrients.macros.carbs_g && (
                            <div className="bg-muted/30 rounded-xl p-2.5 text-center border border-border/50">
                              <p className="text-sm font-bold text-foreground">{selectedFruit.nutrients.macros.carbs_g}g</p>
                              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Gluc</p>
                            </div>
                          )}
                          {selectedFruit.nutrients.macros.fat_g && (
                            <div className="bg-muted/30 rounded-xl p-2.5 text-center border border-border/50">
                              <p className="text-sm font-bold text-foreground">{selectedFruit.nutrients.macros.fat_g}g</p>
                              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Lip</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedFruit.healthProfile?.nutritionistNote && (
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      Conseil du Nutritionniste
                    </h4>
                    <p className="text-sm font-medium leading-relaxed bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 text-foreground">
                      {selectedFruit.healthProfile.nutritionistNote}
                    </p>
                  </div>
                )}
                
                {selectedFruit.warnings && selectedFruit.warnings.length > 0 && (
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-destructive" />
                      Précautions
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFruit.warnings.map((w, i) => (
                        <span key={i} className="text-[11px] bg-destructive/10 text-destructive font-semibold px-2.5 py-1 rounded-lg border border-destructive/20">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
