import { useState } from 'react';
import { PageComponent } from 'rasengan';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ButtonTheme } from '@/components/common/atoms/ButtonTheme';
import {
  ShoppingCart,
  Apple,
  Cherry,
  Citrus,
  Grape,
  Leaf,
  Search,
  Settings,
  User,
  LogOut,
  Heart,
  Star,
  Info,
  Plus,
  Minus,
  Check,
  AlertCircle,
} from 'lucide-react';

const fruits = [
  { name: 'Fraise', color: '#E8543C', icon: Apple },
  { name: 'Mangue', color: '#F2A93B', icon: Citrus },
  { name: 'Kiwi', color: '#7BA35A', icon: Leaf },
  { name: 'Betterave', color: '#C24D6B', icon: Cherry },
  { name: 'Orange', color: '#F5842E', icon: Citrus },
  { name: 'Myrtille', color: '#4B5480', icon: Grape },
];

const nutritionBadges = [
  { label: 'Équilibré pour ton profil', variant: 'success' as const },
  { label: 'Sucre élevé — à surveiller', variant: 'warning' as const },
  { label: 'Déconseillé (grossesse)', variant: 'destructive' as const },
];

const Home: PageComponent = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fruit, setFruit] = useState('');

  return (
    <section className="w-full min-h-screen bg-background pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ───── Hero ───── */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary flex items-center justify-center">
              <Leaf className="size-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-xl text-foreground">FYS</span>
          </div>
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Rechercher">
                  <Search className="size-4" />
                </Button>
              </TooltipTrigger>
                <TooltipContent>Rechercher un fruit</TooltipContent>
              </Tooltip>
              <ButtonTheme />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="size-8">
                      <AvatarImage src="" alt="User" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="size-4" />
                    Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Heart className="size-4" />
                    Favoris
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="size-4" />
                    Paramètres
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <LogOut className="size-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
        </header>

        {/* ───── Hero section ───── */}
        <section className="py-12 sm:py-16 text-center">
          <Badge variant="success" className="mb-4">
            <Check className="size-3" />
            Nouveaux jus disponibles
          </Badge>
          <h1 className="font-display font-semibold text-4xl sm:text-5xl lg:text-6xl text-foreground leading-tight">
            Tes jus, <span className="text-primary">ta santé</span>
          </h1>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-base sm:text-lg">
            Composes tes mélanges de fruits frais, laisse NutriFYS analyser leur compatibilité avec ton profil.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Button size="lg">
              <ShoppingCart className="size-4" />
              Commander mon jus
            </Button>
            <Button variant="secondary" size="lg">
              Voir le détail NutriFYS
            </Button>
          </div>
        </section>

        <Separator className="my-4" />

        {/* ───── Buttons showcase ───── */}
        <section className="py-10">
          <h2 className="font-display font-semibold text-2xl text-foreground mb-6">Boutons</h2>
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Icon button">
                <Plus className="size-4" />
              </Button>
              <Button size="icon" aria-label="Icon button">
                <Heart className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled>Disabled</Button>
              <Button variant="secondary" disabled>
                <ShoppingCart className="size-4" />
                Ajouter au panier
              </Button>
              <Button variant="outline" asChild>
                <a href="/catalogue">Lien en outline</a>
              </Button>
            </div>
          </div>
        </section>

        <Separator className="my-4" />

        {/* ───── Badges showcase ───── */}
        <section className="py-10">
          <h2 className="font-display font-semibold text-2xl text-foreground mb-6">Badges</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="default">Par défaut</Badge>
            <Badge variant="secondary">Secondaire</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="success">Succès</Badge>
            <Badge variant="warning">Attention</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="ghost">Ghost</Badge>
            <Badge variant="link">Link</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Badge variant="success" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-current" />
              Équilibré
            </Badge>
            <Badge variant="warning" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-current" />
              À surveiller
            </Badge>
            <Badge variant="destructive" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-current" />
              Déconseillé
            </Badge>
            <Badge variant="default">
              <Star className="size-3" />
              Nouveau
            </Badge>
            <Badge variant="secondary">
              <Leaf className="size-3" />
              Bio
            </Badge>
            <Badge variant="outline">
              <AlertCircle className="size-3" />
              92/100
            </Badge>
          </div>
          <div className="flex flex-col items-start gap-2 mt-4">
            {nutritionBadges.map((b) => (
              <Badge key={b.label} variant={b.variant} className="gap-1.5 px-3 py-1.5">
                <span className="size-1.5 rounded-full bg-current" />
                {b.label}
              </Badge>
            ))}
          </div>
        </section>

        <Separator className="my-4" />

        {/* ───── Form elements ───── */}
        <section className="py-10">
          <h2 className="font-display font-semibold text-2xl text-foreground mb-6">Formulaire</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Identifiants</CardTitle>
                <CardDescription>Connecte-toi pour commander.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemple@fys.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input id="password" type="password" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="disabled">Désactivé</Label>
                  <Input id="disabled" disabled placeholder="Champ inactif" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="with-icon">Avec icône</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input id="with-icon" className="pl-9" placeholder="Rechercher un fruit…" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="ghost">Annuler</Button>
                <Button>Se connecter</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Composition du jus</CardTitle>
                <CardDescription>Choisis tes fruits et la quantité.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fruit">Fruit principal</Label>
                  <Select value={fruit} onValueChange={setFruit}>
                    <SelectTrigger id="fruit" className="w-full">
                      <SelectValue placeholder="Sélectionne un fruit" />
                    </SelectTrigger>
                    <SelectContent>
                      {fruits.map((f) => (
                        <SelectItem key={f.name} value={f.name.toLowerCase()}>
                          <div className="flex items-center gap-2">
                            <span
                              className="size-3 rounded-full"
                              style={{ background: f.color }}
                            />
                            {f.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantité (ml)</Label>
                  <Select>
                    <SelectTrigger id="quantity" className="w-full">
                      <SelectValue placeholder="Volume" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="250">250 ml</SelectItem>
                      <SelectItem value="330">330 ml</SelectItem>
                      <SelectItem value="500">500 ml</SelectItem>
                      <SelectItem value="750">750 ml</SelectItem>
                      <SelectItem value="1000">1 L</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" aria-label="Retirer">
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">2</span>
                  <Button variant="outline" size="icon" aria-label="Ajouter">
                    <Plus className="size-4" />
                  </Button>
                  <span className="ml-auto text-sm text-muted-foreground">Soit 24,80 €</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">
                  <ShoppingCart className="size-4" />
                  Ajouter au panier
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        <Separator className="my-4" />

        {/* ───── Cards ───── */}
        <section className="py-10">
          <h2 className="font-display font-semibold text-2xl text-foreground mb-6">Cartes produit</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {fruits.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.name} className="group">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div
                        className="size-10 rounded-full flex items-center justify-center"
                        style={{ background: `${f.color}20` }}
                      >
                        <Icon className="size-5" style={{ color: f.color }} />
                      </div>
                      <div>
                        <CardTitle className="font-display">{f.name}</CardTitle>
                        <CardDescription>Jus frais pressé</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Jus 100% pur fruit, sans sucre ajouté. Riche en vitamines.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="success" className="text-[10px] px-2 py-0.5">
                        Compatible
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                        <Star className="size-2.5" />
                        4.8
                      </Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <span className="font-display font-semibold text-lg text-foreground">6,90 €</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm">Ajouter</Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Ajouter {f.name} au panier
                      </TooltipContent>
                    </Tooltip>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </section>

        <Separator className="my-4" />

        {/* ───── Tabs + ScrollArea ───── */}
        <section className="py-10">
          <h2 className="font-display font-semibold text-2xl text-foreground mb-6">Détails nutritionnels</h2>
          <Tabs defaultValue="nutriscore" className="w-full">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="nutriscore">NutriScore</TabsTrigger>
              <TabsTrigger value="composition">Composition</TabsTrigger>
              <TabsTrigger value="allergenes">Allergènes</TabsTrigger>
            </TabsList>
            <TabsContent value="nutriscore" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <ScrollArea className="h-40">
                    <div className="space-y-3 pr-4">
                      {[
                        { label: 'Calories', value: '45 kcal', score: 'A' },
                        { label: 'Sucres', value: '9.2 g', score: 'B' },
                        { label: 'Fibres', value: '1.8 g', score: 'A' },
                        { label: 'Protéines', value: '0.7 g', score: 'A' },
                        { label: 'Vitamine C', value: '42 mg', score: 'A' },
                        { label: 'Potassium', value: '180 mg', score: 'B' },
                      ].map((n) => (
                        <div
                          key={n.label}
                          className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0"
                        >
                          <span className="text-sm text-muted-foreground">{n.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-foreground">{n.value}</span>
                            <Badge
                              variant={n.score === 'A' ? 'success' : 'warning'}
                              className="text-[10px] px-1.5 py-0 min-w-6 text-center"
                            >
                              {n.score}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="composition" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Fraise (35%), Mangue (25%), Kiwi (20%), Jus de pomme (15%), Gingembre (5%).
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="allergenes" className="mt-4">
              <Card>
                <CardContent className="pt-6 space-y-2">
                  <Badge variant="success" className="gap-1.5">
                    <Check className="size-3" />
                    Sans gluten
                  </Badge>
                  <Badge variant="success" className="gap-1.5">
                    <Check className="size-3" />
                    Sans lactose
                  </Badge>
                  <Badge variant="warning" className="gap-1.5">
                    <AlertCircle className="size-3" />
                    Traces de fruits à coque
                  </Badge>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        <Separator className="my-4" />

        {/* ───── Overlays: Dialog, Sheet, Drawer ───── */}
        <section className="py-10">
          <h2 className="font-display font-semibold text-2xl text-foreground mb-6">Fenêtres & panneaux</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default">
                  <Info className="size-4" />
                  Ouvrir une modale
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Confirmer la commande</DialogTitle>
                  <DialogDescription>
                    Fraise · Mangue · Kiwi · Betterave — 500 ml — 6,90 €
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span className="font-medium">6,90 €</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">NutriFYS</span>
                    <Badge variant="success" className="text-[10px]">
                      <Check className="size-2.5" />
                      Compatible
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Total</span>
                    <span className="font-display text-lg">6,90 €</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={() => setDialogOpen(false)}>
                    <Check className="size-4" />
                    Confirmer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="secondary">
                  <ShoppingCart className="size-4" />
                  Panier latéral
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle className="font-display">Ton panier</SheetTitle>
                  <SheetDescription>3 articles — 19,70 €</SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1 -mx-4 px-4">
                  <div className="space-y-4 py-4">
                    {[
                      { name: 'Fraise · Mangue · Kiwi', price: '6,90 €' },
                      { name: 'Orange · Carotte · Gingembre', price: '6,50 €' },
                      { name: 'Betterave · Pomme · Citron', price: '6,30 €' },
                    ].map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between border-b border-border pb-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">500 ml</p>
                        </div>
                        <span className="font-display text-sm font-semibold">{item.price}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="border-t border-border pt-4 mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-display font-semibold text-lg">19,70 €</span>
                  </div>
                  <Button className="w-full" onClick={() => setSheetOpen(false)}>
                    Commander
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline">
                  <Leaf className="size-4" />
                  Détails NutriFYS
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="mx-auto w-full max-w-md">
                  <DrawerHeader>
                    <DrawerTitle className="font-display">Analyse NutriFYS</DrawerTitle>
                    <DrawerDescription>
                      Compatibilité de ton mélange avec ton profil
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4 space-y-4">
                    {nutritionBadges.map((b) => (
                      <div key={b.label} className="flex items-start gap-3">
                        <Badge
                          variant={b.variant as 'success' | 'warning' | 'destructive'}
                          className="mt-0.5 shrink-0"
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                        </Badge>
                        <div>
                          <p className="text-sm font-medium text-foreground">{b.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {b.variant === 'success'
                              ? 'Ce mélange correspond à tes objectifs nutritionnels.'
                              : b.variant === 'warning'
                                ? 'La teneur en sucre est élevée pour ta consommation quotidienne.'
                                : 'Certains ingrédients sont déconseillés dans ton état.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <DrawerFooter>
                    <Button onClick={() => setDrawerOpen(false)}>Fermer</Button>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </section>

        <Separator className="my-4" />

        {/* ───── Command palette ───── */}
        <section className="py-10">
          <h2 className="font-display font-semibold text-2xl text-foreground mb-6">Recherche rapide</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Appuie sur <kbd className="font-mono text-xs bg-muted border border-border rounded-md px-1.5 py-0.5">⌘K</kbd> pour ouvrir la palette de commandes.
          </p>
          <Button variant="outline" className="w-full sm:w-72 justify-between text-muted-foreground" onClick={() => setCommandOpen(true)}>
            <div className="flex items-center gap-2">
              <Search className="size-4" />
              <span>Rechercher un fruit…</span>
            </div>
            <kbd className="font-mono text-[10px] bg-muted border border-border rounded px-1 py-0.5">⌘K</kbd>
          </Button>
          <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
            <CommandInput placeholder="Tape le nom d'un fruit…" />
            <CommandList>
              <CommandEmpty>Aucun fruit trouvé.</CommandEmpty>
              <CommandGroup heading="Fruits">
                {fruits.map((f) => {
                  const Icon = f.icon;
                  return (
                    <CommandItem
                      key={f.name}
                      onSelect={() => {
                        setFruit(f.name.toLowerCase());
                        setCommandOpen(false);
                      }}
                    >
                      <Icon className="size-4" style={{ color: f.color }} />
                      <span>{f.name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandGroup heading="Actions">
                <CommandItem onSelect={() => setCommandOpen(false)}>
                  <ShoppingCart className="size-4" />
                  Voir le panier
                </CommandItem>
                <CommandItem onSelect={() => setCommandOpen(false)}>
                  <Heart className="size-4" />
                  Mes favoris
                </CommandItem>
                <CommandItem onSelect={() => setCommandOpen(false)}>
                  <Settings className="size-4" />
                  Paramètres
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandDialog>
        </section>
      </div>
    </section>
  );
};

Home.metadata = {
  title: 'FYS — Jus personnalisés',
  description: 'Compose tes jus de fruits frais avec NutriFYS.',
};

export default Home;
