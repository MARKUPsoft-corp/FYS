import { type TemplateProps } from 'rasengan';

export default function Template({ Head, Body, Script }: TemplateProps) {
  return (
    <html lang="fr">
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover" />

        {/* ── Primary meta ── */}
        <title>FYS — For Your Self</title>
        <meta name="description" content="Cocktails de fruits santé personnalisés par l'IA NutriFYS" />

        {/* ── PWA manifest & theme ── */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#3F6D4E" />
        <meta name="color-scheme" content="light dark" />

        {/* ── PWA standalone (iOS) ── */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FYS" />

        {/* ── Icons ── */}
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />

        {/* ── Open Graph ── */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="FYS — For Your Self" />
        <meta property="og:description" content="Cocktails de fruits santé personnalisés par l'IA NutriFYS" />
        <meta property="og:image" content="/icons/icon-512.png" />
        <meta property="og:locale" content="fr_FR" />
      </Head>

      <Body>
        <Script />
      </Body>
    </html>
  );
}
