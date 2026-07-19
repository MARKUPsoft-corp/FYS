function triggerDownload(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function waitForImages(node: HTMLElement): Promise<void> {
  const imgs = node.querySelectorAll('img');
  await Promise.all(
    Array.from(imgs).map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
    ),
  );
}

export function sanitizeLabelFilename(name: string): string {
  return (
    name
      .replace(/[^\w\s-àâäéèêëïîôùûüç]/gi, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 48) || 'cocktail'
  );
}

export async function downloadCocktailLabelPng(
  node: HTMLElement,
  filename: string,
): Promise<void> {
  const { toPng } = await import('html-to-image');
  await waitForImages(node);
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
  });
  triggerDownload(dataUrl, filename.endsWith('.png') ? filename : `${filename}.png`);
}
