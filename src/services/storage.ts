const CLOUD_NAME = import.meta.env.RASENGAN_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.RASENGAN_CLOUDINARY_UPLOAD_PRESET as string | undefined;
const ROOT_FOLDER = (import.meta.env.RASENGAN_CLOUDINARY_FOLDER as string | undefined) || 'fys';

const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo

export function isManagedImageUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.includes('res.cloudinary.com') || url.includes('firebasestorage');
}

function assertCloudinaryConfigured() {
  if (!CLOUD_NAME?.trim() || !UPLOAD_PRESET?.trim()) {
    throw new Error(
      'Cloudinary n’est pas configuré. Ajoute RASENGAN_CLOUDINARY_CLOUD_NAME et RASENGAN_CLOUDINARY_UPLOAD_PRESET dans .env.local, puis redémarre le serveur.',
    );
  }
}

/**
 * Upload non signé vers Cloudinary.
 * Le preset unsigned doit autoriser folder + public_id + overwrite
 * (Settings → Upload → Upload presets → Unsigned).
 */
async function uploadImage(
  file: File,
  category: 'fruits' | 'cocktails',
  entityId: string,
): Promise<string> {
  assertCloudinaryConfigured();

  if (!file.type.startsWith('image/')) {
    throw new Error('Le fichier doit être une image (PNG, JPG, WebP…).');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image trop lourde (max 5 Mo).');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET!);
  form.append('folder', `${ROOT_FOLDER}/${category}`);
  // public_id stable — autorisé en unsigned (pas overwrite/invalidate)
  form.append('public_id', entityId);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form },
  );

  const payload = await res.json().catch(() => ({} as Record<string, unknown>));

  if (!res.ok) {
    const message =
      (payload as { error?: { message?: string } })?.error?.message ??
      `Échec upload Cloudinary (${res.status})`;
    throw new Error(message);
  }

  const secureUrl = (payload as { secure_url?: string }).secure_url;
  if (!secureUrl) {
    throw new Error('Cloudinary n’a pas renvoyé d’URL d’image.');
  }

  return secureUrl;
}

export async function uploadFruitImage(fruitId: string, file: File): Promise<string> {
  return uploadImage(file, 'fruits', fruitId);
}

export async function uploadCocktailImage(cocktailId: string, file: File): Promise<string> {
  return uploadImage(file, 'cocktails', cocktailId);
}

/**
 * La suppression côté client sans API secret n’est pas possible de façon sûre.
 * Les images sont écrasées via le même public_id à chaque re-upload.
 * Nettoyage manuel éventuel dans la Media Library Cloudinary.
 */
export async function deleteFruitImage(_url: string): Promise<void> {
  // no-op — voir commentaire ci-dessus
}

export async function deleteCocktailImage(_url: string): Promise<void> {
  // no-op
}
