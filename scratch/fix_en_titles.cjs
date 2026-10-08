const fs = require('fs');
const path = './src/i18n/locales/en.ts';

let content = fs.readFileSync(path, 'utf8');

content = content.replace('"title": "How It Works"', '"title": "How <span class=\\"text-[#E0982E]\\">It Works</span>"');
content = content.replace('"title": "A New Way to Care for Your Body"', '"title": "A New Way to <span class=\\"text-[#3F6D4E]\\">Care for Your Body</span>"');
content = content.replace('"title": "Elevate your events with FYS Event"', '"title": "Elevate your events with <span class=\\"text-[#F2694A]\\">FYS Event</span>"');
content = content.replace('"title": "Meet NutriFYS"', '"title": "Meet <span class=\\"text-primary\\">NutriFYS</span>"');
content = content.replace('"title": "The passion for healthy, local fruit"', '"title": "The passion for <span class=\\"text-[#E0982E]\\">healthy, local fruit</span>"');

fs.writeFileSync(path, content, 'utf8');
console.log("Success");
