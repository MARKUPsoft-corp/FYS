const fs = require('fs');

const extractText = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const regex = />([^<{}]+)</g;
  let match;
  const texts = new Set();
  
  while ((match = regex.exec(content)) !== null) {
    const text = match[1].trim();
    if (text.length > 2 && /[a-zA-ZÀ-ÿ]/.test(text)) {
      texts.add(text);
    }
  }
  
  console.log(Array.from(texts));
};

extractText('src/app/_routes/board/programs.page.tsx');
