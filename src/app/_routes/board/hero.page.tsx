import { useEffect, useState } from 'react';
import { PageComponent } from 'rasengan';
import { Loader2, Plus, Save, Trash2, ImagePlus, GripVertical } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { getHeroSlides, updateHeroSlides } from '@/services/settings';
import { uploadHeroImage } from '@/services/storage';
import type { HeroSlide } from '@/entities';

function newSlide(order: number): HeroSlide {
  return {
    id: `slide-${Date.now()}-${order}`,
    imageUrl: 'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    breakoutImageUrl: '',
    label: 'Nouveau slide',
    title: 'Titre',
    highlight: 'accent',
    titleEnd: 'ici.',
    cta: 'Découvrir',
    ctaLink: '/lab',
    order,
  };
}

const HeroAdmin: PageComponent = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['hero-slides'],
    queryFn: getHeroSlides,
  });

  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setSlides(data.map((s) => ({ ...s })));
  }, [data]);

  function updateSlide(id: string, patch: Partial<HeroSlide>) {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeSlide(id: string) {
    setSlides((prev) => prev.filter((s) => s.id !== id));
  }

  function addSlide() {
    setSlides((prev) => [...prev, newSlide(prev.length)]);
  }

  async function handleImageUpload(slideId: string, file: File, field: 'imageUrl' | 'breakoutImageUrl') {
    setUploadingId(`${slideId}-${field}`);
    setError(null);
    try {
      const url = await uploadHeroImage(slideId, file);
      updateSlide(slideId, { [field]: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec upload');
    } finally {
      setUploadingId(null);
    }
  }

  async function handleSave() {
    if (slides.length === 0) {
      setError('Ajoutez au moins un slide.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateHeroSlides(slides);
      queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  return (
    <BoardPageShell
      eyebrow="Accueil client"
      titleBefore="Hero"
      titleHighlight="slides"
      sectionBefore="Images &"
      sectionHighlight="textes"
      subtitle="Modifiez les slides de la page d'accueil client. Balayage gauche/droite côté client."
      imageUrl="https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-refreshing-citrus-158053.jpeg?auto=compress&cs=tinysrgb&w=1200"
      actions={
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={addSlide}
            className="rounded-[2rem] h-14 font-bold gap-2 flex-1"
          >
            <Plus className="size-5" /> Ajouter un slide
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={saving || isLoading}
            onClick={handleSave}
            className="rounded-[2rem] h-14 bg-primary text-white font-bold gap-2 flex-1 shadow-[0_8px_30px_rgba(63,109,78,0.25)]"
          >
            {saving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
            {saved ? 'Enregistré ✓' : 'Enregistrer'}
          </Button>
        </div>
      }
    >
      {error && (
        <p className="text-sm font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-2xl px-4 py-3">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6 pb-8">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="bg-card rounded-[2rem] border border-border/40 shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/40 bg-muted/20">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GripVertical className="size-4" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">
                    Slide {index + 1}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive gap-1.5"
                  onClick={() => removeSlide(slide.id)}
                  disabled={slides.length <= 1}
                >
                  <Trash2 className="size-3.5" /> Supprimer
                </Button>
              </div>

              <div className="p-5 grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div
                    className="aspect-[16/10] rounded-2xl bg-cover bg-center border border-border/40"
                    style={{ backgroundImage: `url('${slide.imageUrl}')` }}
                  />
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Image principale
                  </Label>
                  <label className="flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-border/60 cursor-pointer hover:bg-muted/40 text-sm font-semibold">
                    {uploadingId === `${slide.id}-imageUrl` ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ImagePlus className="size-4" />
                    )}
                    Remplacer l&apos;image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageUpload(slide.id, f, 'imageUrl');
                        e.target.value = '';
                      }}
                    />
                  </label>

                  <div
                    className="aspect-[3/4] max-w-[140px] rounded-2xl bg-cover bg-center border border-border/40"
                    style={{
                      backgroundImage: slide.breakoutImageUrl
                        ? `url('${slide.breakoutImageUrl}')`
                        : undefined,
                      backgroundColor: 'hsl(var(--muted))',
                    }}
                  />
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Image breakout (optionnelle)
                  </Label>
                  <label className="flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-border/60 cursor-pointer hover:bg-muted/40 text-sm font-semibold">
                    {uploadingId === `${slide.id}-breakoutImageUrl` ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ImagePlus className="size-4" />
                    )}
                    Image secondaire
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageUpload(slide.id, f, 'breakoutImageUrl');
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  {(
                    [
                      ['label', 'Eyebrow'],
                      ['title', 'Titre (avant)'],
                      ['highlight', 'Mot mis en avant'],
                      ['titleEnd', 'Titre (après)'],
                      ['cta', 'Texte du bouton'],
                      ['ctaLink', 'Lien du bouton'],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        {label}
                      </Label>
                      <Input
                        value={slide[key]}
                        onChange={(e) => updateSlide(slide.id, { [key]: e.target.value })}
                        className="h-10 rounded-xl"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </BoardPageShell>
  );
};

HeroAdmin.metadata = {
  title: 'FYS — Hero slides',
  description: 'Gestion des slides de la page d\'accueil client.',
};

export default HeroAdmin;
