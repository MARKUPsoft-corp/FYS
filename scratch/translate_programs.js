const fs = require('fs');

const run = () => {
  const filePath = '/home/markup/Documents/FYS Web/FYS/src/app/_routes/board/programs.page.tsx';
  let code = fs.readFileSync(filePath, 'utf8');

  // Replace GOAL_FILTERS labels
  code = code.replace(
    /{ key: 'all', labelKey: 'programs.goals.all', defaultLabel: 'Toutes les cures', icon: Sparkles }/g,
    "{ key: 'all', labelKey: 'programs.tabs.all', defaultLabel: 'Toutes les cures', icon: Sparkles }"
  );
  code = code.replace(
    /{ key: 'detox', labelKey: 'programs.goals.detox', defaultLabel: 'Détox', icon: Leaf }/g,
    "{ key: 'detox', labelKey: 'programs.tabs.detox', defaultLabel: 'Détox', icon: Leaf }"
  );
  code = code.replace(
    /{ key: 'immunity', labelKey: 'programs.goals.immunity', defaultLabel: 'Immunité', icon: Shield }/g,
    "{ key: 'immunity', labelKey: 'programs.tabs.immunity', defaultLabel: 'Immunité', icon: Shield }"
  );
  code = code.replace(
    /{ key: 'digestion', labelKey: 'programs.goals.digestion', defaultLabel: 'Digestion', icon: HeartPulse }/g,
    "{ key: 'digestion', labelKey: 'programs.tabs.digestion', defaultLabel: 'Digestion', icon: HeartPulse }"
  );

  // Use useTranslation in the components
  if (!code.includes('const { t } = useTranslation();')) {
    code = code.replace(
      'const ProgramsPage: PageComponent = () => {',
      "const ProgramsPage: PageComponent = () => {\n  const { t } = useTranslation();"
    );
  }
  
  if (!code.includes("import { useTranslation }")) {
      code = "import { useTranslation } from 'react-i18next';\n" + code;
  }
  
  // Replace direct strings
  code = code.replace(
    /text: \`Félicitations ! Vous suivez la cure "\$\{program.title\}". Démarrage \$\{\n          startingToday \? 'aujourd’hui' : 'demain matin'\n        \}.\`,/g,
    "text: t('programs.enrollment.success', { title: program.title, start: startingToday ? t('programs.enrollment.today') : t('programs.enrollment.tomorrow') }),"
  );
  
  code = code.replace(
    /text: "Impossible de s'inscrire au programme. Veuillez réessayer."/g,
    "text: t('programs.enrollment.error')"
  );

  // Write changes
  fs.writeFileSync(filePath, code);
  console.log("Programs page partially translated via script");
};

run();
