import { PageComponent, Link } from 'rasengan';

const RootIndex: PageComponent = () => {
  return (
    <main className="min-h-dvh bg-background flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="flex flex-col items-center gap-12 max-w-3xl w-full">
        {/* Orbital FYS Logo */}
        <style>{`
          @keyframes orbit {
            from { transform: rotate(0deg) translateX(44px) rotate(0deg); }
            to   { transform: rotate(360deg) translateX(44px) rotate(-360deg); }
          }
          .fys-orbit-dot {
            animation: orbit 2s linear infinite;
          }
          @keyframes fys-logo-pulse {
            0%, 100% { transform: scale(1); }
            50%       { transform: scale(1.04); }
          }
          .fys-logo-text { animation: fys-logo-pulse 2s ease-in-out infinite; }
        `}</style>
        <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
          {/* Glow halo */}
          <div className="absolute inset-0 bg-primary/15 blur-2xl rounded-full scale-125" />
          {/* FYS logo */}
          <div className="fys-logo-text relative z-10 flex items-center justify-center">
            <img src="/logos/fys_logo.png" alt="FYS Logo" className="w-24 h-auto object-contain" />
          </div>
        </div>

        {/* SEO Text Content */}
        <section className="text-center space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            FYS App : L'IA NutriFYS pour vos Cocktails Santé
          </h1>
          <div className="space-y-4 text-muted-foreground text-sm md:text-base leading-relaxed">
            <p>
              Bienvenue sur <strong>FYS (For Your Self)</strong>. Notre application vous permet de créer des <strong>fys jus</strong> et cocktails de fruits 100% naturels, entièrement personnalisés selon vos besoins de santé. Grâce à notre intelligence artificielle <strong>NutriFYS</strong>, chaque recette est validée médicalement et nutritionnellement.
            </p>
            <p>
              Welcome to <strong>FYS App</strong>. Create your custom healthy fruit juices and cocktails. Powered by <strong>NutriFYS AI</strong>, every recipe is personalized and validated for your specific health goals.
            </p>
          </div>
        </section>

        {/* Action Button */}
        <Link 
          to="/board" 
          className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-primary-foreground bg-primary rounded-full overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_hsl(var(--primary))]"
        >
          <span className="relative z-10">Entrer dans l'App / Enter App</span>
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
        </Link>
      </div>
    </main>
  );
};

RootIndex.path = '/';
RootIndex.metadata = {
  title: 'FYS App — Cocktails Santé Personnalisés par IA | Healthy Custom Juices by AI',
  description: "FYS App (NutriFYS) crée pour vous des cocktails de fruits sur mesure (fys jus), analysés et validés par l'intelligence artificielle en fonction de votre santé. Custom healthy fruit juices validated by AI.",
};

export default RootIndex;
