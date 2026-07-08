import { Link } from 'rasengan';
import { GlassWater, Apple, ShoppingBag, Users, Tag, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Props = { name: string };

const statCards = [
  { label: 'Fruits',       value: '0', icon: Apple,     path: '/fruits',    color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  { label: 'Cocktails',    value: '0', icon: GlassWater, path: '/cocktails', color: 'text-primary',    bg: 'bg-primary/5' },
  { label: 'Commandes',    value: '0', icon: ShoppingBag,path: '/orders',    color: 'text-secondary',  bg: 'bg-secondary/10' },
  { label: 'Utilisateurs', value: '0', icon: Users,      path: '/users',     color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30' },
];

const quickActions = [
  {
    label: 'Fruits',
    description: 'Gérez votre catalogue de fruits et leurs nutriments.',
    icon: Apple,
    iconBg: 'bg-orange-50 dark:bg-orange-950/30',
    iconColor: 'text-orange-500',
    path: '/fruits',
    cta: 'Gérer les fruits',
  },
  {
    label: 'Catégories',
    description: 'Organisez vos fruits par catégories (citrus, tropical…).',
    icon: Tag,
    iconBg: 'bg-primary/5',
    iconColor: 'text-primary',
    path: '/categories',
    cta: 'Gérer les catégories',
  },
];

export function AdminHome({ name }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Bonjour,</p>
        <h2 className="font-display font-semibold text-3xl text-foreground mt-0.5">{name} 👋</h2>
        <p className="text-muted-foreground mt-1 text-sm">Voici un aperçu de votre application.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} to={s.path} className="block group">
              <Card className="transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                <CardContent className="pt-5 pb-4">
                  <div className={`size-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                    <Icon className={`size-5 ${s.color}`} />
                  </div>
                  <p className="font-display font-bold text-3xl text-foreground">{s.value}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {quickActions.map((a) => {
          const Icon = a.icon;
          return (
            <Card key={a.label}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className={`size-8 rounded-lg ${a.iconBg} flex items-center justify-center`}>
                    <Icon className={`size-4 ${a.iconColor}`} />
                  </div>
                  <CardTitle className="text-base font-display">{a.label}</CardTitle>
                </div>
                <CardDescription>{a.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to={a.path}>
                    {a.cta}
                    <ArrowRight className="size-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">Activité récente</CardTitle>
          <CardDescription>Les dernières commandes passées sur la plateforme.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center">
              <ShoppingBag className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Aucune commande pour le moment.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
