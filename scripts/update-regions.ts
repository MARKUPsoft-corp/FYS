import { config } from 'dotenv';
config({ path: '.env.local' });

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { CAMEROON_REGIONS } from '../src/entities/fruit';
import type { Fruit } from '../src/entities/fruit';

// ── Firebase init ─────────────────────────────────────────────────────────
const app = initializeApp({
  apiKey:            process.env.RASENGAN_FIREBASE_API_KEY,
  authDomain:        process.env.RASENGAN_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.RASENGAN_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.RASENGAN_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.RASENGAN_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.RASENGAN_FIREBASE_APP_ID,
});
const db = getFirestore(app);

// ── Gemini init ───────────────────────────────────────────────────────────
const genai = new GoogleGenerativeAI(process.env.RASENGAN_GEMINI_API_KEY as string);
const model = genai.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

// ── Main Script ───────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 Fetching fruits from Firebase...');
  const snap = await getDocs(collection(db, 'fruits'));
  const fruits = snap.docs.map(d => ({ id: d.id, ...d.data() } as Fruit));

  console.log(`📦 Found ${fruits.length} fruits in database.`);

  const regionsListStr = CAMEROON_REGIONS.join(', ');

  for (const fruit of fruits) {
    if (fruit.region && CAMEROON_REGIONS.includes(fruit.region as any)) {
      console.log(`✅ Fruit ${fruit.name} already has a valid region: ${fruit.region}`);
      continue;
    }

    console.log(`🔍 Determining region for: ${fruit.name} (origin: ${fruit.origin || 'unknown'})...`);
    const prompt = `
Tu es un expert agricole spécialiste du Cameroun. 
Le fruit suivant est cultivé au Cameroun : "${fruit.name}".
Si c'est un fruit importé ou peu cultivé, choisis la région la plus propice ou "Centre" par défaut.
Réponds UNIQUEMENT par le nom exact de l'une des 10 régions du Cameroun parmi cette liste, sans aucune ponctuation ni commentaire :
${regionsListStr}
`;

    try {
      const result = await model.generateContent(prompt);
      const rawText = result.response.text().trim();
      
      const matchedRegion = CAMEROON_REGIONS.find(r => rawText.toLowerCase().includes(r.toLowerCase()));

      if (matchedRegion) {
        console.log(`🌟 Region found for ${fruit.name}: ${matchedRegion}`);
        await updateDoc(doc(db, 'fruits', fruit.id), {
          region: matchedRegion
        });
        console.log(`💾 Saved ${fruit.name} -> ${matchedRegion}`);
      } else {
        console.log(`⚠️ Unrecognized region for ${fruit.name}: "${rawText}"`);
      }
    } catch (e) {
      console.error(`❌ Error querying Gemini for ${fruit.name}:`, e);
    }
  }

  console.log('🎉 Done updating fruits!');
  process.exit(0);
}

main().catch(console.error);
