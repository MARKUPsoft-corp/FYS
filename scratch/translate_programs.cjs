const fs = require('fs');

const run = () => {
  const filePath = '/home/markup/Documents/FYS Web/FYS/src/app/_routes/board/programs.page.tsx';
  let code = fs.readFileSync(filePath, 'utf8');

  // Replace GOAL_FILTERS labels (I noticed they already have a labelKey from my first check, wait)
  // Let's use t() on defaultLabel where it is rendered. I will look for how it's rendered first.
  
  if (!code.includes('const { t } = useTranslation();')) {
    code = code.replace(
      'const ProgramsPage: PageComponent = () => {',
      "const ProgramsPage: PageComponent = () => {\n  const { t } = useTranslation();"
    );
  }
  
  if (!code.includes("import { useTranslation }")) {
      code = "import { useTranslation } from 'react-i18next';\n" + code;
  }
  
  code = code.replace(
    /text: \`Félicitations ! Vous suivez la cure "\$\{program.title\}". Démarrage \$\{\n          startingToday \? 'aujourd’hui' : 'demain matin'\n        \}.\`,/g,
    "text: t('programs.enrollment.success', { title: program.title, start: startingToday ? t('programs.enrollment.today') : t('programs.enrollment.tomorrow') }),"
  );
  
  code = code.replace(
    /text: "Impossible de s'inscrire au programme. Veuillez réessayer."/g,
    "text: t('programs.enrollment.error')"
  );

  fs.writeFileSync(filePath, code);
  console.log("Programs page partially translated via script");
};

run();
