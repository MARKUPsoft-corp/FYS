import { PageComponent } from 'rasengan';
import { ShoppingBag, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import { UserRole } from '@/entities';

const MOCK_ORDERS = [
  { id: '#FYS-001', status: 'Livré', date: '08 Juil. 2025', items: 'Glow Up × 2, Detox Green × 1', total: '4 500 FCFA', statusColor: 'bg-primary/10 text-primary' },
  { id: '#FYS-002', status: 'En cours', date: '07 Juil. 2025', items: 'Tropical Bliss × 1', total: '1 800 FCFA', statusColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  { id: '#FYS-003', status: 'En attente', date: '06 Juil. 2025', items: 'Power Shot × 3', total: '5 400 FCFA', statusColor: 'bg-secondary/10 text-secondary' },
];

const Orders: PageComponent = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen bg-background pb-20">

      {/* Hero Banner */}
      <div
        className="relative w-full h-[220px] flex items-end px-6 pb-8 mb-12 overflow-hidden"
        style={{ backgroundImage: "url('https://images.pexels.com/photos/4553031/pexels-photo-4553031.jpeg?auto=compress&cs=tinysrgb&w=1200')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative z-10">
          <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-1">Suivi</p>
          <h1 className="font-display font-extrabold text-4xl text-white">
            {isAdmin ? 'Les ' : 'Mes '}
            <span className="text-secondary italic">Commandes</span>
          </h1>
        </div>
      </div>

      <div className="px-4 space-y-6">

        {/* Header */}
        <div className="text-center">
          <h3 className="font-display font-bold text-3xl">
            <span className="text-foreground">{isAdmin ? 'Toutes les ' : 'Mes '}</span>
            <span className="text-primary">Commandes</span>
          </h3>
          <p className="text-muted-foreground mt-2 font-medium">
            {isAdmin ? 'Toutes les commandes passées sur la plateforme.' : "L'historique de vos commandes."}
          </p>
        </div>

        {/* Order list */}
        <div className="space-y-4">
          {MOCK_ORDERS.map((order) => (
            <div key={order.id} className="bg-card rounded-[2rem] border border-border/50 p-5 shadow-sm flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-foreground font-display">{order.id}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Clock className="size-3" /> {order.date}
                  </p>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${order.statusColor}`}>
                  {order.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">{order.items}</p>
              <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <p className="font-bold text-foreground">{order.total}</p>
                <Button variant="ghost" size="sm" className="text-primary font-bold h-8 rounded-full hover:bg-primary/10">Détails</Button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="rounded-[2.5rem] border-2 border-dashed border-border/40 flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="size-16 rounded-full bg-secondary/5 flex items-center justify-center">
            <Package className="size-7 text-secondary/50" />
          </div>
          <p className="text-sm font-semibold text-foreground">Pas encore de commande récente</p>
          <p className="text-xs text-muted-foreground max-w-[200px]">Explorez le catalogue et passez votre première commande.</p>
          <Button className="rounded-full bg-secondary text-white font-bold hover:bg-secondary/90 px-8 mt-2" size="sm">
            <ShoppingBag className="size-4 mr-2" /> Explorer le catalogue
          </Button>
        </div>

      </div>
    </div>
  );
};

Orders.metadata = {
  title: 'FYS — Commandes',
  description: 'Gestion des commandes FYS.',
};

export default Orders;
