const fs = require('fs');
const path = './src/app/_routes/index.page.tsx';

let content = fs.readFileSync(path, 'utf8');

// Find the catalogue section
const catStartString = "{/* ━━━ NOS CRÉATIONS / CATALOGUE ━━━ */}";
const catStartIdx = content.indexOf(catStartString);
if (catStartIdx === -1) {
  console.log("Catalogue section not found");
  process.exit(1);
}

// Find the end of catalogue section (the next section is How It Works)
const howItWorksStartString = "{/* ━━━ HOW IT WORKS ━━━ */}";
const howItWorksStartIdx = content.indexOf(howItWorksStartString);

const catalogueContent = content.substring(catStartIdx, howItWorksStartIdx);

// Find the end of How It works. It's right before `{/* ━━━ FEATURES ━━━ */}`
const featuresStartString = "{/* ━━━ FEATURES ━━━ */}";
const featuresStartIdx = content.indexOf(featuresStartString);

if (featuresStartIdx === -1) {
  console.log("Features section not found");
  process.exit(1);
}

// Re-arrange
content = content.replace(catalogueContent, "");
// we just removed catalogueContent. Now insert it right before featuresStartString
content = content.replace(featuresStartString, catalogueContent + "\n\n      " + featuresStartString);

fs.writeFileSync(path, content, 'utf8');
console.log("Success");
