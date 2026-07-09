# FYS — For Your Self
## Rapport de synthèse projet (à destination de Claude Code)

> Ce document résume le contexte produit, technique et métier de FYS pour permettre à un agent de développement de comprendre rapidement le projet avant d'intervenir sur le code.

---

## 1. Qu'est-ce que FYS

FYS (*For Your Self*) est une startup FoodTech basée à Yaoundé, Cameroun. Le produit central est une marque de **cocktails de fruits personnalisés**, dont la composition est validée en temps réel par un moteur IA nutritionnel appelé **NutriFYS**.

FYS ne se positionne pas comme un simple producteur de jus, mais comme un **assistant nutritionnel personnel en bouteille** : le client compose lui-même son cocktail dans une interface dédiée (le **FYS Lab**), et NutriFYS génère une fiche nutritionnelle complète avant d'**activer ou de bloquer** la commande selon le profil de santé déclaré par le client.

**Fondateurs :**
- Emmanuel YAKAM TCHAMEGNI — co-fondateur, porteur technique
- Claudia NGASSA TAPAH — co-fondatrice, opérations

**Marché initial :** Yaoundé → expansion envisagée vers Douala puis la zone CEMAC.

---

## 2. Le facteur différenciant

Trois éléments combinés, dont FYS affirme (avec prudence méthodologique — veille concurrentielle continue) qu'aucun acteur camerounais, africain ou mondial ne les réunit :

1. **Une marque de jus grand public** (pas un outil B2B ou clinique)
2. **Personnalisation par IA** au point de commande
3. **Mécanisme actif de blocage de commande** si le cocktail présente un risque pour le profil de santé du client

Le bouton de commande n'est pas toujours actif : c'est la preuve de confiance mise en avant dans tout le discours produit/investisseurs.

---

## 3. Architecture technique

Trois surfaces applicatives partageant un même backend Firestore :

| Surface | Rôle | Stack |
|---|---|---|
| **FYS Lab (PWA)** | Interface client : sélection des fruits, chat NutriFYS, fiche nutritionnelle, commande | PWA |
| **Admin FYS** | Dashboard interne (Emmanuel, Claudia, secrétariat) : commandes, stock, impression étiquettes | React / Vite |
| **Firebase Cloud Functions** | Logique métier centralisée : moteur NutriFYS, génération d'étiquettes | Node.js v2, `onCall` |

**Backend :** Firebase / Firestore (données temps réel, file de commandes).

**LLM :** Anthropic API (Claude), appelé depuis les Cloud Functions.

### 3.1 Pipeline NutriFYS (RAG + system prompt — PAS de fine-tuning)

Point de vigilance important : une ancienne version des documents (pitch, dossier concours) mentionnait à tort un "fine-tuning supervisé". **Ce n'est pas l'architecture réelle.** L'API publique Anthropic ne propose pas de fine-tuning. L'architecture correcte est :

```
Firestore (base de connaissances fruits, 18 fiches, 3 couches par fruit)
        ↓
Règles générales nutritionniste (regles_generales_nutrifys.json)
        ↓
Retrieval (RAG) — sélection des données pertinentes pour la requête
        ↓
Injection dans le system prompt de l'appel Claude
        ↓
Appel Anthropic API (Claude)
        ↓
Verdict JSON structuré (module partagé verdictCocktail.js)
        ↓
Validation humaine par un nutritionniste (avant mise en prod des règles)
```

L'identité "NutriFYS" (nom de l'assistant, jamais "Claude") est imposée **entièrement via le system prompt**, avec un filtre optionnel post-réponse pour intercepter toute fuite du nom du modèle sous-jacent — particulièrement important sur l'endpoint conversationnel.

### 3.2 Module `verdictCocktail.js`

Point d'architecture clé : le configurateur direct (`analyserCocktail`) et l'endpoint conversationnel (`chatNutriFYS`) **utilisent le même module** `verdictCocktail.js`. Un seul aller-retour API produit le JSON de verdict complet dans les deux cas, ce qui :
- évite les appels API redondants,
- permet à l'UI de rendre immédiatement la carte de profil nutritionnel + bouton de commande, que l'utilisateur soit passé par le configurateur ou par le chat.

### 3.3 Sortie attendue du moteur

Le verdict structuré inclut a minima :
- `score` (note globale)
- `badges` (bénéfices ciblés)
- `benefices`
- `precautions`
- `alerte_medicale` (booléen / message)
- `commande_autorisee` (booléen — c'est ce champ qui active/bloque le bouton de commande côté PWA)

---

## 4. Base de connaissances nutritionnelle

### 4.1 Structure des données

- **18 fruits** au catalogue, chacun structuré en **3 couches de données** :
  1. `donnees_scientifiques` — macronutriments, vitamines (%VNR), minéraux, polyphénols/composés bioactifs
  2. `allegations` — formulations nutritionnelles rigoureuses, avec `niveau_preuve` explicite (référence réglementaire UE à titre méthodologique, preclinique, étude limitée, hypothèse à valider…)
  3. `terrain_nutrifys` — couche métier : badges bénéfices, règles OK, précautions, contre-indications, note verbatim du nutritionniste terrain
  
  Chaque fiche contient aussi une `fiche_conversationnelle` compacte (rôle dans le cocktail : acide / sucré / mineral / antioxydant / base, bénéfices clés, `a_eviter_si`, timing) optimisée pour l'injection dans le chat.

- Fichiers sources : fiches JSON individuelles par fruit, issues du split d'un `fruits_nutrifys.json` maître, + `regles_generales_nutrifys.json` (règles transversales : timing, équilibre cocktail, interactions médicaments-aliments, profils à risque).
- Seeding vers Firestore via `scripts/seedFruits.js`.

### 4.2 Sources documentaires

- Ciqual 2020 (ANSES), Aprifel, USDA FoodData Central — fruits couverts par les bases françaises/US
- CIRAD / revue *Fruits*, FAO/INFOODS Afrique — pour les 4 fruits absents de Ciqual/Aprifel : **corossol, baobab, foléré/bissap, cassimango**
- Entretiens avec 3 à 5 nutritionnistes partenaires basés à Yaoundé (données terrain, verbatims)

### 4.3 Règles métier structurantes (extraits, à respecter dans toute logique métier)

- **Pamplemousse : exclusion totale et permanente du catalogue** (inhibition CYP3A4/CYP1A2 pendant 3 jours → risque de surdosage médicamenteux). Ne jamais l'ajouter, même sur demande utilisateur.
- **Tout profil sous médication** → message systématique "consultez votre médecin", commande non bloquée mais avertissement non ignorable affiché.
- **Timing** : fruits riches en vitamine A déconseillés après 20h (insomnie potentielle) ; diabétiques → fruits sucrés le matin, prudence le soir.
- **Insuffisance rénale** → attention au phosphore (banane trop mûre, peau de carotte, betterave, baobab/potassium).
- Règle absolue : NutriFYS **ne formule jamais de recommandation autonome sur une interaction médicament-fruit** — toujours renvoyer vers un professionnel de santé.

---

## 5. Système de badges labels (opérationnel, hors app)

- **Étiquette fixe de marque** : impression offset/flexographie en gros volume (logo, mentions légales).
- **Sticker variable par commande** : imprimé à la demande par le secrétariat via la boîte de dialogue d'impression du navigateur (pas d'imprimante thermique dédiée à ce stade), généré côté Cloud Functions (`genererEtiquettes`, Puppeteer).
- Livrables graphiste attendus : label principal en vectoriel avec zone blanche réservée + 18 icônes de fruits en SVG individuels.

---

## 6. Identité visuelle (charte graphique)

- **Palette** :
  - Crème `#FAF3E8` / crème foncé `#F0E4CC` — fonds
  - Vert nature `#3F6D4E` — couleur de marque, NutriFYS, navigation
  - Vert profond `#28422F` — titres
  - Orange corail `#F2694A` — CTA, prix, actions
  - Vert tendre `#AECBB2` — badges "sain"
  - **Ambre `#E0982E` et rouge `#C9463C` sont réservés exclusivement à la signalétique santé NutriFYS** — jamais utilisés en marketing/décoratif
- **Typographie** : Fraunces (display), Manrope (corps de texte), IBM Plex Mono (données/scores)
- **Élément signature** : l'**anneau de compatibilité** — dégradé conique vert → ambre → rouge représentant le score de compatibilité santé du cocktail. Seul endroit de l'UI où les trois couleurs fonctionnelles coexistent intentionnellement.

---

## 7. Contexte concours (échéance proche)

FYS candidate au **Concours National du Meilleur Projet TIC 2026** (Semaine de l'Innovation Numérique, Ministère des Postes et Télécommunications du Cameroun). Thème 2026 : *"Protéger le cyberespace des dérives de l'IA et promouvoir le patriotisme numérique"* — tension stratégique assumée pour un projet FoodTech, adressée explicitement dans le dossier.

**Calendrier :**
- MVP opérationnel avant la suite
- Dossier de candidature : ~22 juillet 2026
- Pitch final : ~30 juillet 2026

**Fonctionnalités MVP à démontrer impérativement pour le pitch :**
1. Mécanisme de blocage de commande par l'IA
2. Recommandations explicables (pas de boîte noire)
3. Indicateur visible de protection des données

**Section en attente :** Section 10 du dossier (règles de sécurité Firestore / protection des données) — en attente des éléments de Claudia.

**Argument "patriotisme numérique" du dossier :** usage de **Rasengan.js**, framework JS créé par un développeur camerounais, mis en avant comme choix technologique assumé (pas seulement circonstanciel).

---

## 8. Modèle économique (pour contexte, pas prioritaire pour le dev)

5 flux de revenus : ventes à l'unité, abonnements hebdo/mensuels, programmes santé (cures 3–21 jours), FYS Pro (B2B), partenariats santé (commissions professionnels).

---

## 9. Conventions de travail à respecter

- **Aucune mention de fine-tuning** dans le code, les commentaires ou la documentation générée — c'est une architecture RAG + system prompt.
- Le nom affiché à l'utilisateur est **toujours "NutriFYS"**, jamais "Claude" ni le nom du modèle sous-jacent.
- Toute contrainte de sécurité liée aux données de santé (profil utilisateur, historique de consommation) doit suivre un principe de *privacy by design* — traitement Firestore avec règles de sécurité strictes (cf. section 10 du dossier concours, à finaliser).
- Le champ `commande_autorisee` du verdict NutriFYS est la source de vérité unique pour activer/désactiver le bouton de commande côté PWA — ne pas dupliquer cette logique côté client.
- Le pamplemousse ne doit jamais apparaître dans aucune liste de fruits, seed, ou suggestion générée.
- Environnement de développement : Node.js v2 pour les Cloud Functions (`onCall`), React/Vite pour l'admin (Flutter a été explicitement écarté pour le dashboard admin).

---

## 10. État d'avancement (juillet 2026)

- MVP en développement actif
- Dossier de candidature TIC 2026 réécrit intégralement en LaTeX (12 sections), erreur de fine-tuning corrigée
- Base de connaissances des 18 fruits structurée en JSON, prête pour seeding Firestore
- Charte graphique finalisée (HTML de référence disponible)
- En attente : règles de sécurité Firestore (Claudia), validation nutritionniste finale des données