/**
 * Script de test interactif pour les push notifications FCM
 * 
 * Usage: npx tsx scripts/test-push-notifications.ts
 */

import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log('\n🔔 Test Push Notifications FCM\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Demander l'URL de l'API
  const apiUrl = await prompt('1️⃣  URL de votre API Vercel (ex: https://votre-app.vercel.app): ');
  
  if (!apiUrl) {
    console.log('❌ URL requise');
    rl.close();
    return;
  }

  console.log('\n─────────────────────────────────────────────────────\n');

  // 2. Type de notification
  console.log('2️⃣  Type de notification:\n');
  console.log('   [1] Envoyer à tous les admins (par défaut)');
  console.log('   [2] Envoyer à un utilisateur spécifique\n');
  
  const type = await prompt('   Votre choix (1 ou 2): ');
  
  let targetUid: string | undefined;
  
  if (type === '2') {
    targetUid = await prompt('\n   UID de l\'utilisateur: ');
  }

  console.log('\n─────────────────────────────────────────────────────\n');

  // 3. Contenu de la notification
  const title = await prompt('3️⃣  Titre de la notification: ');
  const body = await prompt('4️⃣  Message: ');
  const url = await prompt('5️⃣  URL de destination (optionnel, ex: /board/orders): ');

  console.log('\n─────────────────────────────────────────────────────\n');

  // 4. Confirmation
  console.log('📋 Récapitulatif:\n');
  console.log(`   API      : ${apiUrl}/api/send-notification`);
  console.log(`   Cible    : ${targetUid ? `User ${targetUid}` : 'Tous les admins'}`);
  console.log(`   Titre    : ${title}`);
  console.log(`   Message  : ${body}`);
  console.log(`   URL      : ${url || '/'}\n`);

  const confirm = await prompt('Envoyer la notification ? (o/n): ');
  
  if (confirm.toLowerCase() !== 'o') {
    console.log('\n❌ Annulé');
    rl.close();
    return;
  }

  console.log('\n⏳ Envoi en cours...\n');

  // 5. Envoyer la notification
  try {
    const response = await fetch(`${apiUrl}/api/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        url: url || '/',
        ...(targetUid ? { targetUid } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Erreur HTTP ${response.status}:`);
      console.log(errorText);
      rl.close();
      return;
    }

    const result = await response.json();
    
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('✅ Notification envoyée avec succès!\n');
    console.log(`   📤 Envoyées : ${result.sent}`);
    console.log(`   ❌ Échecs   : ${result.failed || 0}\n`);
    
    if (result.sent === 0) {
      console.log('⚠️  Aucun token trouvé. Vérifiez que:');
      console.log('   - L\'utilisateur est connecté');
      console.log('   - Il a accepté les notifications');
      console.log('   - Un token existe dans Firestore (collection fcm_tokens)\n');
    }

    console.log('═══════════════════════════════════════════════════════\n');
  } catch (err) {
    console.log('❌ Erreur réseau:');
    console.log(err);
  }

  rl.close();
}

main().catch(console.error);