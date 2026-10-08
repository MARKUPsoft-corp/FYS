const fs = require('fs');
const path = './src/i18n/locales/fr.ts';

let content = fs.readFileSync(path, 'utf8');

content = content.replace('"title": "Comment ça marche ?"', '"title": "Comment <span class=\\"text-[#E0982E]\\">ça marche ?</span>"');
content = content.replace('"title": "Une nouvelle façon de prendre soin de soi"', '"title": "Une nouvelle façon de <span class=\\"text-[#3F6D4E]\\">prendre soin de soi</span>"');
content = content.replace('"title": "Sublimez vos événements avec FYS Event"', '"title": "Sublimez vos événements avec <span class=\\"text-[#F2694A]\\">FYS Event</span>"');
content = content.replace('"title": "Rencontrez NutriFYS"', '"title": "Rencontrez <span class=\\"text-primary\\">NutriFYS</span>"');
content = content.replace('"title": "La passion du fruit sain et local"', '"title": "La passion du fruit <span class=\\"text-[#E0982E]\\">sain et local</span>"');

fs.writeFileSync(path, content, 'utf8');
console.log("Success");
