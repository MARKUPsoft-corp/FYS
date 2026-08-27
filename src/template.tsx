import { type TemplateProps } from 'rasengan';

export default function Template({ Head, Body, Script }: TemplateProps) {
  return (
    <html lang="fr">
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover" />

        {/* ── Primary meta ── */}
        <title>FYS App — Cocktails santé par IA | Healthy custom juices by AI</title>
        <meta name="description" content="Découvrez FYS App (NutriFYS) : vos cocktails de fruits santé sur mesure validés par l'IA au Cameroun. Discover FYS App: your healthy custom fruit juices validated by AI." />
        <link rel="alternate" hrefLang="fr" href="https://fys-app.com/" />
        <link rel="alternate" hrefLang="en" href="https://fys-app.com/" />
        <link rel="alternate" hrefLang="x-default" href="https://fys-app.com/" />

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
        <link rel="icon" type="image/png" href="/logos/fys_favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logos/fys_favicon.png" />

        {/* ── Open Graph & SEO ── */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="FYS App — Cocktails santé par IA | Healthy custom juices by AI" />
        <meta property="og:description" content="FYS App (NutriFYS) : cocktails de fruits santé personnalisés par intelligence artificielle. Healthy custom fruit juices validated by AI in Cameroon." />
        <meta property="og:url" content="https://fys-app.com" />
        <meta property="og:image" content="https://fys-app.com/logos/fys_favicon.png" />
        <meta property="og:locale" content="fr_FR" />
        <meta name="keywords" content="fys app, nutrifys, fys jus, cocktails santé, fruits frais, IA nutrition, Yaoundé, Cameroun, bien-être, For Your Self" />
        
        {/* ── Twitter Cards ── */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FYS App — Cocktails santé par IA | Healthy custom juices by AI" />
        <meta name="twitter:description" content="Découvrez le FYS Lab : votre assistant nutritionnel NutriFYS valide et personnalise vos cocktails de fruits selon votre santé." />
        <meta name="twitter:image" content="https://fys-app.com/logos/fys_favicon.png" />

        {/* ── Structured Data (JSON-LD) for Sitelinks & SEO ── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "FYS",
                "alternateName": ["For Your Self", "NutriFYS"],
                "url": "https://fys-app.com",
                "logo": "https://fys-app.com/logos/fys_favicon.png",
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
              },
              {
                "@context": "https://schema.org",
                "@type": "ItemList",
                "itemListElement": [
                  {
                    "@type": "SiteNavigationElement",
                    "position": 1,
                    "name": "Le FYS Lab",
                    "description": "Créez votre cocktail sur mesure avec l'IA NutriFYS",
                    "url": "https://fys-app.com/lab"
                  },
                  {
                    "@type": "SiteNavigationElement",
                    "position": 2,
                    "name": "Notre Catalogue",
                    "description": "Découvrez nos cocktails signatures et jus naturels",
                    "url": "https://fys-app.com/board/catalogue"
                  },
                  {
                    "@type": "SiteNavigationElement",
                    "position": 3,
                    "name": "Espace Santé",
                    "description": "Suivez vos statistiques nutritionnelles",
                    "url": "https://fys-app.com/board/profile"
                  }
                ]
              },
              {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "FYS App",
                "operatingSystem": "Web, Android, iOS",
                "applicationCategory": "HealthApplication",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "XAF"
                }
              },
              {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                  {
                    "@type": "Question",
                    "name": "Qu'est-ce que FYS App ?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "FYS (For Your Self) est une application qui crée des jus et cocktails de fruits santé (fys jus) sur mesure, analysés par l'intelligence artificielle NutriFYS."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "What is NutriFYS?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "NutriFYS is the artificial intelligence behind FYS App that validates and customizes your healthy fruit juice recipes based on your dietary and health goals."
                    }
                  }
                ]
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
