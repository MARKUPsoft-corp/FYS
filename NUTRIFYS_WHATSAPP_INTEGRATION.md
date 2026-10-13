# Guide Complet : Intégration de NutriFYS avec WhatsApp Cloud API

Ce document consigne **exclusivement** les configurations, architectures et manipulations réelles qui ont fonctionné et permis de déployer avec succès l'assistant nutritionnel **NutriFYS** sur WhatsApp.

---

## 1. Identifiants & Configuration Actuelle

Ces informations correspondent à la configuration opérationnelle en production :

| Paramètre | Valeur | Rôle |
|---|---|---|
| **Numéro WhatsApp Business** | `+237 650 437 427` | Numéro réel camerounais enregistré sur WhatsApp |
| **Phone Number ID (Meta)** | `1420693941130535` | Identifiant Meta du numéro pour l'envoi de messages |
| **WhatsApp Business Account ID (WABA)** | `1470269892828772` | Compte professionnel Meta rattaché à FYS |
| **URL du Webhook (Vercel)** | `https://fys-web.vercel.app/api/whatsapp` | Endpoint serverless recevant les événements |
| **Verify Token (Secret)** | `fys_secret_verify_token_2026` | Jeton secret de handshake pour valider le webhook |
| **Version Graph API Meta** | `v22.0` | Version officielle utilisée pour les requêtes |
| **Expiration du Jeton Actuel** | **10 décembre 2026** | Date limite de validité du jeton Meta temporaire |

---

## 2. Architecture & Fonctionnalités Réalisées

Le webhook central est codé dans le fichier [`api/whatsapp.ts`](file:///home/markup/Documents/FYS%20Web/FYS/api/whatsapp.ts). Il tourne sous forme de fonction serverless sur **Vercel** et s'interface avec **Google Gemini** et **Firebase Admin Firestore**.

### Ce qui est en production et fonctionne :

1. **Rétroaction Visuelle Instantanée (Double Coche Bleue & Indicateur d'écriture)** :
   - Dès la réception d'un message, l'API Meta est appelée avec `status: 'read'` (marque le message comme lu avec la double coche bleue) et `typing_indicator: { type: 'text' }` (*en train d'écrire...*).
   - Le client sait immédiatement que son message est pris en charge.

2. **Multimodalité Complète avec Gemini (`gemini-2.0-flash` / repli `gemini-1.5-flash`)** :
   - **Texte** : Compréhension du langage naturel, des demandes nutritionnelles et de l'argot camerounais (*« Tu es dos »*, *« Je veux un cocktail sans sucre »*).
   - **Notes Vocales (Audio)** : Téléchargement automatique du fichier binaire audio OGG depuis les serveurs Meta via `downloadWhatsAppMedia`, transmission directe du buffer audio à Gemini, écoute et réponse récapitulative textuelle instantanée.
   - **Photos (Vision)** : Prise en charge des ordonnances médicales, fruits du marché ou captures de transaction Mobile Money/Orange Money. Gemini analyse l'image et adapte la composition.

3. **Mémoire Conversationnelle Multi-Tours** :
   - Sauvegarde et chargement des 10 derniers échanges dans Firestore sous `whatsapp_conversations/{phone}/messages`.
   - L'utilisateur peut discuter de façon fluide sur plusieurs messages sans perdre le fil.

4. **Dédoublonnage Strict des Événements Meta** :
   - Meta rejoue automatiquement les requêtes HTTP si le webhook met plus de 3 secondes à répondre.
   - Un document d'unicité est créé immédiatement dans `processed_whatsapp_messages/{messageId}`. Tout retry ultérieur de Meta est ignoré sans dupliquer de message ni de commande.

5. **Prise de Commande & Fiches Nutritionnelles Automatiques** :
   - Lorsque le client confirme sa volonté de commander, NutriFYS émet le bloc structuré `---COMMANDE_FYS---`.
   - La commande est enregistrée dans Firestore `orders` avec l'attribut `source: 'whatsapp'`, calcul dynamique du prix selon les tarifs en vigueur (`bottle500mlBase`, `bottle1LBase`, suppléments), et notification en direct sur le tableau de bord administrateur FYS.

---

## 3. Configuration Côté Meta (developers.facebook.com)

Voici les étapes exactes qui ont été faites dans la console Meta for Developers :

1. **Création de l'application Meta** :
   - Type d'application : **Autre** -> **Entreprise (Business)**.
   - Ajout du produit : **WhatsApp** -> **Configuration de l'API**.
2. **Configuration du Numéro** :
   - Ajout du numéro camerounais `+237 650 437 427` avec vérification par code SMS.
   - Récupération du **Phone Number ID** (`1420693941130535`).
3. **Configuration du Webhook** :
   - Dans le menu de gauche : **WhatsApp** -> **Configuration**.
   - Dans la section **Webhook** :
     - **URL de rappel (Callback URL)** : `https://fys-web.vercel.app/api/whatsapp`
     - **Jeton de vérification (Verify Token)** : `fys_secret_verify_token_2026`
     - Clic sur **Vérifier et enregistrer**.
   - Dans **Champs du Webhook (Webhook fields)** :
     - S'abonner obligatoirement au champ **`messages`** (cliquer sur *Gérer* puis *S'abonner* en face de `messages`).

---

## 4. Variables d'Environnement

Ces variables doivent impérativement être configurées sur **Vercel** (dans *Project Settings* -> *Environment Variables*) ainsi que dans `.env.local` pour le développement local :

```env
# Meta WhatsApp Cloud API
WHATSAPP_API_TOKEN=EAAt5jvmbxgABS... (Jeton généré sur Meta)
WHATSAPP_VERIFY_TOKEN=fys_secret_verify_token_2026
WHATSAPP_PHONE_NUMBER_ID=1420693941130535

# Intelligence Artificielle Google Gemini
GEMINI_API_KEY=AIzaSy...

# Firebase Admin SDK (Pour l'accès serveur à Firestore)
FIREBASE_PROJECT_ID=fys-cocktails-cameroun
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@fys-cocktails-cameroun.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 5. Comment Renouveler le Jeton Meta Avant le 10 Décembre

Le jeton actuel expirera le **10 décembre 2026**. Pour éviter toute interruption de service, suivez l'une des deux méthodes ci-dessous. **La méthode 1 (Utilisateur Système) est fortement recommandée car le jeton n'expirera JAMAIS.**

---

### Méthode 1 : Jeton Permanent sans Expiration (Recommandé)

Cette méthode génère un jeton lié à un utilisateur système qui **n'expire jamais**.

1. Connectez-vous à [Meta Business Suite / Paramètres d'entreprise](https://business.facebook.com/settings).
2. Dans le menu de gauche, rendez-vous dans **Utilisateurs** -> **Utilisateurs système** (System Users).
3. Si aucun utilisateur système n'existe, cliquez sur **Ajouter** :
   - Nom d'utilisateur système : `nutrifys-service`
   - Rôle : **Employé** ou **Admin**.
4. Attribuez les ressources nécessaires à cet utilisateur :
   - Cliquez sur **Attribuer des ressources** (Assign Assets).
   - Sous **Applications** : Sélectionnez votre application FYS et cochez **Contrôle total (Gérer l'application)**.
   - Sous **Comptes WhatsApp** : Sélectionnez votre compte WhatsApp Business FYS et cochez **Contrôle total (Gérer le compte WhatsApp Business)**.
   - Enregistrez les modifications.
5. Cliquez sur le bouton **Générer un nouveau jeton** (Generate New Token) :
   - **Application** : Sélectionnez votre application FYS.
   - **Expiration du jeton** : Sélectionnez **Jamais (Never)**.
   - **Autorisations disponibles** : Cochez obligatoirement ces deux cases :
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
6. Cliquez sur **Générer le jeton**.
7. **Copiez immédiatement le jeton** (il commence généralement par `EAA...`). *Attention : Meta ne l'affiche qu'une seule fois.*
8. Mettez à jour le jeton sur **Vercel** et en local (voir section 5.3 ci-dessous).

---

### Méthode 2 : Renouvellement d'un Jeton 60 Jours (Graph API Explorer)

Si vous n'avez pas accès aux utilisateurs système de votre Business Manager, vous pouvez regénérer un jeton 60 jours :

1. Rendez-vous sur le [Meta Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. Dans le volet de droite :
   - **Application Meta** : Sélectionnez votre application FYS.
   - **Utilisateur ou page** : Sélectionnez *Jeton d'accès utilisateur*.
   - **Autorisations** : Cliquez sur *Ajouter une autorisation* et ajoutez :
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
3. Cliquez sur **Generate Access Token** et validez la boîte de dialogue Facebook.
4. Pour convertir ce jeton temporaire (24h) en jeton 60 jours :
   - Rendez-vous sur l'[Outil Débogueur de jeton d'accès Meta](https://developers.facebook.com/tools/debug/accesstoken/).
   - Collez le jeton temporaire et cliquez sur **Déboguer**.
   - En bas, cliquez sur **Prolonger le jeton d'accès** (Extend Access Token).
   - Copiez le nouveau jeton long terme généré (valide 60 jours).

---

### 5.3 Déploiement du Nouveau Jeton

Dès que vous avez le nouveau jeton :

1. **Sur Vercel** :
   - Allez sur votre tableau de bord [Vercel](https://vercel.com/) -> Projet **FYS**.
   - Onglet **Settings** -> **Environment Variables**.
   - Trouvez la variable `WHATSAPP_API_TOKEN`.
   - Cliquez sur les trois petits points `...` -> **Edit**.
   - Remplacez l'ancienne valeur par le nouveau jeton.
   - Cliquez sur **Save**.
   - Allez dans l'onglet **Deployments**, cliquez sur le dernier déploiement -> `...` -> **Redeploy** pour que la nouvelle variable prenne effet immédiatement.
2. **Dans le projet local** :
   - Ouvrez le fichier `.env.local`.
   - Mettez à jour la ligne :
     ```env
     WHATSAPP_API_TOKEN=VOTRE_NOUVEAU_JETON_ICI
     ```

---

## 6. Vérification du Bon Fonctionnement

Pour tester que le jeton et le webhook fonctionnent :

1. Envoyez un message texte simple depuis un téléphone vers le **+237 650 437 427** (ex: *« Bonjour NutriFYS »*).
2. Vérifiez :
   - La réception de la double coche bleue instantanée.
   - La réponse personnalisée de NutriFYS dans les 2 à 4 secondes.
3. Envoyez une note vocale : NutriFYS doit vous répondre en comprenant votre voix.
4. Consultez les logs en direct si besoin sur [Vercel Functions Logs](https://vercel.com/) en filtrant sur `/api/whatsapp`.
