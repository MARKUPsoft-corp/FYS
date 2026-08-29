import { useEffect, useState } from 'react';
import { PageComponent } from 'rasengan';
import { Loader2, Save, ImagePlus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { BoardPageShell } from '@/components/layout/BoardPageShell';
import { getLandingImagesSettings, updateLandingImagesSettings } from '@/services/settings';
import { uploadLandingImage } from '@/services/storage';
import { LandingImagesSettings } from '@/entities';

const IMAGE_FIELDS = [
  { key: 'hero', label: 'Section Héro', description: 'Image principale tout en haut' },
  { key: 'featureNutrify', label: 'Fonctionnalité NutriFYS', description: 'Création avec le nutritionniste' },
  { key: 'featureCatalog', label: 'Fonctionnalité Catalogue', description: 'Nos créations signatures' },
  { key: 'nutrifysAssistant', label: 'NutriFYS Assistant', description: 'Image de la section Rencontrez NutriFYS' },
  { key: 'gallery1', label: 'Galerie Produit (1/3)', description: 'Jus Vert' },
  { key: 'gallery2', label: 'Galerie Produit (2/3)', description: 'Jus Orange' },
  { key: 'gallery3', label: 'Galerie Produit (3/3)', description: 'Jus Rose/Rouge' },
  { key: 'step1', label: 'Processus 01', description: 'Choisissez vos fruits' },
  { key: 'step2', label: 'Processus 02', description: 'Validation nutritionnelle' },
  { key: 'step3', label: 'Processus 03', description: 'Dégustez' },
] as const;

const LandingAdmin: PageComponent = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['landing-images'],
    queryFn: getLandingImagesSettings,
  });

  const [images, setImages] = useState<Partial<LandingImagesSettings>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setImages({ ...data });
  }, [data]);

  function updateImage(key: keyof LandingImagesSettings, url: string) {
    setImages((prev) => ({ ...prev, [key]: url }));
  }

  async function handleImageUpload(key: keyof LandingImagesSettings, file: File) {
    setUploadingKey(key);
    setError(null);
    try {
      const url = await uploadLandingImage(key, file);
      updateImage(key, url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec du téléversement.');
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateLandingImagesSettings(images);
      queryClient.invalidateQueries({ queryKey: ['landing-images'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <BoardPageShell
      eyebrow="Landing Page"
      titleBefore="Images du"
      titleHighlight="Site Public"
      sectionBefore="Gérez le"
      sectionHighlight="visuel"
      subtitle="Modifiez les images affichées sur la vitrine publique pour adapter le site aux saisons."
      imageUrl="https://images.unsplash.com/photo-1546173159-315724a31696?q=80&w=1200&auto=format&fit=crop"
      actions={
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            size="lg"
            disabled={saving || isLoading}
            onClick={handleSave}
            className="rounded-[2rem] h-14 bg-primary text-white font-bold gap-2 w-full sm:w-auto px-8 shadow-[0_8px_30px_rgba(63,109,78,0.25)]"
          >
            {saving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
            {saved ? 'Enregistré' : 'Sauvegarder'}
          </Button>
        </div>
      }
    >
      {error && (
        <p className="text-sm font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-2xl px-4 py-3 mb-6">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
          {IMAGE_FIELDS.map(({ key, label, description }) => (
            <div
              key={key}
              className="bg-card rounded-[2rem] border border-border/40 shadow-sm overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-border/40 bg-muted/20">
                <h3 className="text-sm font-extrabold">{label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>

              <div className="p-4 flex-1 flex flex-col gap-4">
                <div
                  className="w-full aspect-[16/10] rounded-2xl bg-cover bg-center border border-border/40 bg-muted/30"
                  style={{ backgroundImage: images[key as keyof LandingImagesSettings] ? `url('${images[key as keyof LandingImagesSettings]}')` : 'none' }}
                />
                <label className="flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-border/60 cursor-pointer hover:bg-muted/40 text-sm font-semibold mt-auto">
                  {uploadingKey === key ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                  Remplacer l'image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImageUpload(key, f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </BoardPageShell>
  );
};

LandingAdmin.metadata = {
  title: 'FYS — Images Landing',
  description: 'Gestion des images de la vitrine publique.',
};

export default LandingAdmin;
