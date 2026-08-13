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

        {/* ── Open Graph & SEO ── */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="FYS — For Your Self" />
        <meta property="og:description" content="Cocktails de fruits santé personnalisés par l'IA NutriFYS à Yaoundé, Cameroun." />
        <meta property="og:url" content="https://fys-app.com" />
        <meta property="og:image" content="https://fys-app.com/icons/icon-512.png" />
        <meta property="og:locale" content="fr_FR" />
        <meta name="keywords" content="cocktails santé, fruits frais, IA nutrition, NutriFYS, Yaoundé, Cameroun, bien-être, For Your Self" />
        
        {/* ── Twitter Cards ── */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FYS — For Your Self" />
        <meta name="twitter:description" content="Découvrez le FYS Lab : votre assistant nutritionnel NutriFYS valide et personnalise vos cocktails de fruits selon votre santé." />
        <meta name="twitter:image" content="https://fys-app.com/icons/icon-512.png" />

        {/* ── Structured Data (JSON-LD) for Sitelinks & SEO ── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "FYS",
                "alternateName": "For Your Self",
                "url": "https://fys-app.com",
                "logo": "https://fys-app.com/icons/icon-512.png",
                "description": "Startup FoodTech camerounaise spécialisée dans les cocktails de fruits santé personnalisés par intelligence artificielle (NutriFYS)."
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "FYS — For Your Self",
                "url": "https://fys-app.com",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": "https://fys-app.com/board?q={search_term_string}"
                  },
                  "query-input": "required name=search_term_string"
                }
              }
            ])
          }}
        />
      </Head>

      <Body>
        <Script />
      </Body>
    </html>
  );
}
