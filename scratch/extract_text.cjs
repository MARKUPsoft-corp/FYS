const fs = require('fs');
const filePath = process.argv[2];

const extractText = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  // simple regex for text between > and <
  const regex = />([^<{}]+)</g;
  let match;
  const texts = new Set();
  
  while ((match = regex.exec(content)) !== null) {
    const text = match[1].trim();
    if (text.length > 2 && /[a-zA-ZÀ-ÿ]/.test(text)) {
      texts.add(text);
    }
  }
  
  console.log(Array.from(texts).join('\n'));
};

extractText(filePath);
