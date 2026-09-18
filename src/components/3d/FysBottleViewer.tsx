import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Sparkles, RotateCw, Play, Pause, Eye, Droplets, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Flavors Palette ────────────────────────────────────────────────────────────

export interface JuiceFlavor {
  id: string;
  name: string;
  subtitle: string;
  colorHex: string;
  accentHex: string;
  fruits: string[];
}

export const JUICE_FLAVORS: JuiceFlavor[] = [
  {
    id: 'mango-passion',
    name: 'Mangue Passion Tropicale',
    subtitle: 'Riche en vitamine C & caroténoïdes',
    colorHex: '#E59B12',
    accentHex: '#FFA826',
    fruits: ['Mangue', 'Fruit de la passion', 'Ananas'],
  },
  {
    id: 'detox-green',
    name: 'Détox Pomme Épinard Menthe',
    subtitle: 'Purifiant, alcalinisant & chlorophylle',
    colorHex: '#3E8E41',
    accentHex: '#52B856',
    fruits: ['Pomme verte', 'Épinard', 'Concombre', 'Menthe'],
  },
  {
    id: 'ruby-hibiscus',
    name: 'Pastèque Hibiscus Foléré',
    subtitle: 'Hydratation profonde & antioxydants',
    colorHex: '#B71C3D',
    accentHex: '#D83A56',
    fruits: ['Pastèque', 'Fleurs d’hibiscus', 'Citron vert'],
  },
  {
    id: 'carrot-boost',
    name: 'Carotte Orange Curcuma',
    subtitle: 'Énergie vitale & éclat du teint',
    colorHex: '#E65100',
    accentHex: '#F57C00',
    fruits: ['Carotte bio', 'Orange pressée', 'Curcuma', 'Gingembre'],
  },
  {
    id: 'pineapple-ginger',
    name: 'Ananas Victoria Gingembre',
    subtitle: 'Digestion facile & tonus naturel',
    colorHex: '#F2BE1A',
    accentHex: '#FCD434',
    fruits: ['Ananas Victoria', 'Gingembre piquant', 'Pomme'],
  },
];

interface Props {
  className?: string;
  initialFlavorId?: string;
  showControls?: boolean;
}

export function FysBottleViewer({
  className = '',
  initialFlavorId = 'mango-passion',
  showControls = true,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedFlavor, setSelectedFlavor] = useState<JuiceFlavor>(
    JUICE_FLAVORS.find((f) => f.id === initialFlavorId) || JUICE_FLAVORS[0]
  );
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // References for Three.js objects
  const liquidMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const bottleGroupRef = useRef<THREE.Group | null>(null);
  const targetColorRef = useRef<THREE.Color>(new THREE.Color(selectedFlavor.colorHex));
  const currentColorRef = useRef<THREE.Color>(new THREE.Color(selectedFlavor.colorHex));

  // Change flavor with smooth color transition
  const handleSelectFlavor = (flavor: JuiceFlavor) => {
    setSelectedFlavor(flavor);
    targetColorRef.current = new THREE.Color(flavor.colorHex);
  };

  // Quick camera orientations
  const rotateToAngle = useCallback((targetAngle: number) => {
    if (!bottleGroupRef.current) return;
    setIsAutoRotating(false);
    bottleGroupRef.current.rotation.y = targetAngle;
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ── 1. Scene & Camera Setup ───────────────────────────────────────────────
    const scene = new THREE.Scene();

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 8.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // ── 2. Studio Lighting Setup ─────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    // Key front-top light (Warm studio light)
    const keyLight = new THREE.DirectionalLight(0xfff7ea, 2.2);
    keyLight.position.set(3, 5, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    // Rim back light (Highlights the glossy glass edges and bottle contour)
    const rimLight = new THREE.DirectionalLight(0xe8f0ff, 2.5);
    rimLight.position.set(-4, 4, -4);
    scene.add(rimLight);

    // Soft fill front-left light
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
    fillLight.position.set(-3, 1, 4);
    scene.add(fillLight);

    // Bottom soft reflector light
    const bottomLight = new THREE.DirectionalLight(0xffe8cc, 0.6);
    bottomLight.position.set(0, -3, 2);
    scene.add(bottomLight);

    // ── 3. High-Definition 360° Dynamic Canvas Label Texture ──────────────────
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 2048;
    labelCanvas.height = 1024;
    const ctx = labelCanvas.getContext('2d')!;

    // Background: natural off-white cream paper
    ctx.fillStyle = '#FBF8F2';
    ctx.fillRect(0, 0, 2048, 1024);

    // Subtle paper grain stripes
    ctx.fillStyle = 'rgba(230, 222, 208, 0.35)';
    for (let x = 0; x < 2048; x += 6) {
      ctx.fillRect(x, 0, 2, 1024);
    }

    // ── FRONT FACE (x: 0 to 1024) ──
    const drawFrontLabel = () => {
      ctx.save();

      // Curved Dark Green Outer Border Frame (matching Photo 1 & 3)
      ctx.strokeStyle = '#1D4E2E';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.roundRect(80, 50, 864, 924, [40, 40, 40, 40]);
      ctx.stroke();

      // Thin inner gold accent border
      ctx.strokeStyle = '#C9983E';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(96, 66, 832, 892, [30, 30, 30, 30]);
      ctx.stroke();

      // Top decorative arches
      ctx.strokeStyle = '#1D4E2E';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(512, 140, 280, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // Logo FYS Container & Splash
      ctx.save();
      // Orange juice splash behind the glass
      const splashGrad = ctx.createRadialGradient(512, 220, 20, 512, 220, 140);
      splashGrad.addColorStop(0, '#FFA834');
      splashGrad.addColorStop(0.7, '#F27A24');
      splashGrad.addColorStop(1, 'rgba(242, 122, 36, 0)');
      ctx.fillStyle = splashGrad;
      ctx.beginPath();
      ctx.arc(512, 220, 120, 0, Math.PI * 2);
      ctx.fill();

      // Letters 'F' and 'S' in bold dark green
      ctx.fillStyle = '#174726';
      ctx.font = '900 130px "Montserrat", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;

      // Draw F
      ctx.fillText('F', 400, 220);
      // Draw S
      ctx.fillText('S', 624, 220);

      // Draw Cocktail Glass 'Y' in center
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#E87A18';
      ctx.beginPath();
      // Bowl of the cocktail glass
      ctx.moveTo(480, 160);
      ctx.lineTo(544, 160);
      ctx.lineTo(512, 225);
      ctx.closePath();
      ctx.fill();
      // Glass outline
      ctx.strokeStyle = '#174726';
      ctx.lineWidth = 8;
      ctx.stroke();
      // Glass stem & base
      ctx.beginPath();
      ctx.moveTo(512, 225);
      ctx.lineTo(512, 265);
      ctx.moveTo(485, 265);
      ctx.lineTo(539, 265);
      ctx.stroke();
      // Straw poking out
      ctx.strokeStyle = '#298045';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(520, 175);
      ctx.lineTo(540, 120);
      ctx.lineTo(560, 115);
      ctx.stroke();
      ctx.restore();

      // Slogans under logo
      ctx.fillStyle = '#1D4E2E';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('— For YourSelf —', 512, 310);

      ctx.fillStyle = '#5A6E5F';
      ctx.font = 'italic 28px Georgia, serif';
      ctx.fillText('and made by yourself', 512, 350);

      // Tropical Fruits Composition (Drawn with rich vibrant tones matching Photo 1)
      ctx.save();
      const drawTropicalFruitBasket = () => {
        const cx = 512;
        const cy = 570;

        // Pineapple crown & body
        ctx.fillStyle = '#E29E10';
        ctx.beginPath();
        ctx.ellipse(cx + 90, cy - 20, 50, 75, Math.PI * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#B57800';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Watermelon slice
        ctx.fillStyle = '#DE2A48';
        ctx.beginPath();
        ctx.arc(cx + 10, cy + 30, 60, Math.PI * 0.9, Math.PI * 1.9);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1F6835';
        ctx.lineWidth = 10;
        ctx.stroke();

        // Papaya halved with seeds
        ctx.fillStyle = '#F57C00';
        ctx.beginPath();
        ctx.ellipse(cx - 75, cy + 10, 48, 70, -Math.PI * 0.15, 0, Math.PI * 2);
        ctx.fill();
        // Papaya cavity
        ctx.fillStyle = '#241B12';
        ctx.beginPath();
        ctx.ellipse(cx - 75, cy + 10, 18, 38, -Math.PI * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Mango cheeks
        ctx.fillStyle = '#FFA726';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 85, 60, 40, 0, 0, Math.PI * 2);
        ctx.fill();

        // Lime slice
        ctx.fillStyle = '#7CB342';
        ctx.beginPath();
        ctx.arc(cx + 95, cy + 80, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#33691E';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Passion fruit purple half
        ctx.fillStyle = '#4A154B';
        ctx.beginPath();
        ctx.arc(cx - 15, cy - 25, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFC107';
        ctx.beginPath();
        ctx.arc(cx - 15, cy - 25, 24, 0, Math.PI * 2);
        ctx.fill();

        // Green leaves around
        ctx.fillStyle = '#2E7D32';
        for (const [lx, ly, rot] of [
          [cx - 130, cy + 40, -0.6],
          [cx + 140, cy - 80, 0.4],
          [cx - 120, cy - 60, -0.3],
          [cx + 140, cy + 20, 0.5],
        ]) {
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(rot);
          ctx.beginPath();
          ctx.ellipse(0, 0, 30, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      };
      drawTropicalFruitBasket();
      ctx.restore();

      // Signature cursive : "La Nature, dans votre verre"
      ctx.fillStyle = '#1D4E2E';
      ctx.font = 'italic bold 38px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('La Nature, dans votre verre', 512, 760);

      // Pill badge: AGITEZ • DEGUSTEZ • PRENEZ SOIN DE VOUS
      ctx.fillStyle = '#174726';
      ctx.beginPath();
      ctx.roundRect(160, 805, 704, 52, 26);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('AGITEZ • DÉGUSTEZ • PRENEZ SOIN DE VOUS', 512, 837);

      // Volume badge
      ctx.fillStyle = '#174726';
      ctx.font = '900 36px "Montserrat", sans-serif';
      ctx.fillText('1L  •  100% FRAIS & NATUREL', 512, 905);

      ctx.restore();
    };

    // ── BACK FACE (x: 1024 to 2048) ──
    const drawBackLabel = () => {
      ctx.save();
      const ox = 1024; // Offset x

      // Outer frame
      ctx.strokeStyle = '#1D4E2E';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.roundRect(ox + 80, 50, 864, 924, [40, 40, 40, 40]);
      ctx.stroke();

      ctx.strokeStyle = '#C9983E';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(ox + 96, 66, 832, 892, [30, 30, 30, 30]);
      ctx.stroke();

      // Left Column: QR Code & Promotion block (matching Photo 4)
      const qrx = ox + 140;
      const qry = 130;
      const qrw = 350;
      const qrh = 400;

      // QR Frame box
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#1D4E2E';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(qrx, qry, qrw, qrh, 16);
      ctx.fill();
      ctx.stroke();

      // Header ribbon on QR box
      ctx.fillStyle = '#1D4E2E';
      ctx.beginPath();
      ctx.roundRect(qrx, qry, qrw, 50, [16, 16, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCANNEZ-MOI', qrx + qrw / 2, qry + 32);

      // QR Code Pattern Simulator (Clean authentic 2D matrix)
      ctx.fillStyle = '#174726';
      const qBlock = 12;
      const startX = qrx + 50;
      const startY = qry + 80;

      // QR Corner finder squares
      const drawFinder = (fx: number, fy: number) => {
        ctx.fillRect(fx, fy, qBlock * 7, qBlock * 7);
        ctx.clearRect(fx + qBlock, fy + qBlock, qBlock * 5, qBlock * 5);
        ctx.fillRect(fx + qBlock * 2, fy + qBlock * 2, qBlock * 3, qBlock * 3);
      };
      drawFinder(startX, startY);
      drawFinder(startX + 160, startY);
      drawFinder(startX, startY + 160);

      // Random data matrix dots
      for (let r = 0; r < 14; r++) {
        for (let c = 0; c < 14; c++) {
          if ((r < 5 && c < 5) || (r < 5 && c > 8) || (r > 8 && c < 5)) continue;
          if ((r * 7 + c * 13) % 3 === 0) {
            ctx.fillRect(startX + c * 17, startY + r * 17, 12, 12);
          }
        }
      }

      // QR promo text
      ctx.fillStyle = '#1D4E2E';
      ctx.font = 'bold 17px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Scannez pour accéder à l’analyse', qrx, qry + 435);
      ctx.fillText('nutritionnelle de votre boisson et', qrx, qry + 460);
      ctx.fillStyle = '#E65100';
      ctx.fillText('bénéficier de 6% de remise fidélité !', qrx, qry + 485);

      // Right Column: Recipe breakdown and NutriFYS Info
      const rx = ox + 530;
      ctx.fillStyle = '#1D4E2E';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('ÉTAPES DE PRÉPARATION', rx, 140);

      ctx.fillStyle = '#4B5563';
      ctx.font = '18px sans-serif';
      ctx.fillText('• Fruits frais locaux triés à la main', rx, 180);
      ctx.fillText('• Pressage à froid minute (Cold-Pressed)', rx, 215);
      ctx.fillText('• Sans aucun sucre ajouté', rx, 250);
      ctx.fillText('• Sans eau ni conservateurs artificiels', rx, 285);

      // Green Card: VOTRE JUS, VOTRE BIEN-ETRE
      ctx.fillStyle = 'rgba(29, 78, 46, 0.08)';
      ctx.strokeStyle = 'rgba(29, 78, 46, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(rx, 320, 390, 160, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1D4E2E';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('VOTRE JUS, VOTRE CHOIX,', rx + 20, 360);
      ctx.fillText('VOTRE BIEN-ÊTRE.', rx + 20, 390);

      ctx.fillStyle = '#5A6E5F';
      ctx.font = 'italic 17px Georgia, serif';
      ctx.fillText('Préparé avec amour par FYS Lab.', rx + 20, 430);

      // Conservation Instructions (Bottom Bar)
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#1D4E2E';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(ox + 140, 570, 780, 160, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1D4E2E';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('CONSIGNES DE CONSERVATION', ox + 170, 610);

      ctx.fillStyle = '#374151';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('❄️  À conserver impérativement au frais : entre 0°C et 4°C', ox + 170, 650);
      ctx.fillText('⏳  À consommer sous 48 Heures après ouverture', ox + 170, 685);

      // Footer: Socials & Service Client
      ctx.fillStyle = '#1D4E2E';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('Service Client Yaoundé : +237 691 00 00 00 / 673 00 00 00', ox + 170, 785);

      ctx.fillStyle = '#E65100';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('Suivez-nous : @fyscameroun sur TikTok & Instagram', ox + 170, 830);

      // NutriFYS Brand Seal
      ctx.fillStyle = '#1D4E2E';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('NutriFYS • Nutrition Intelligente', ox + 170, 890);

      ctx.restore();
    };

    drawFrontLabel();
    drawBackLabel();

    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    labelTexture.wrapS = THREE.RepeatWrapping;
    labelTexture.wrapT = THREE.ClampToEdgeWrapping;
    labelTexture.repeat.set(1, 1);
    labelTexture.colorSpace = THREE.SRGBColorSpace;
    labelTexture.generateMipmaps = true;

    // ── 4. Constructing Faithful Bottle Geometry ──────────────────────────────
    const bottleGroup = new THREE.Group();
    scene.add(bottleGroup);
    bottleGroupRef.current = bottleGroup;

    // ── A. Glass / PET Transparent Bottle Outer Mesh ──
    // Contour points for LatheGeometry matching Photo 1:
    // Flat base -> rounded corner -> vertical cylinder -> smooth conical shoulder -> collar -> neck -> thread
    const points: THREE.Vector2[] = [
      new THREE.Vector2(0, -2.2),
      new THREE.Vector2(0.9, -2.2), // bottom flat
      new THREE.Vector2(1.0, -2.1), // bottom rounded edge
      new THREE.Vector2(1.0, 1.0),  // straight body cylinder
      new THREE.Vector2(0.98, 1.2), // shoulder start
      new THREE.Vector2(0.85, 1.5), // shoulder curve
      new THREE.Vector2(0.68, 1.8), // shoulder steepening
      new THREE.Vector2(0.48, 2.05), // shoulder taper
      new THREE.Vector2(0.42, 2.15), // neck start
      new THREE.Vector2(0.46, 2.2),  // neck collar ring
      new THREE.Vector2(0.46, 2.25), // ring edge
      new THREE.Vector2(0.41, 2.3),  // neck cylinder
      new THREE.Vector2(0.41, 2.5),  // under cap
      new THREE.Vector2(0.36, 2.5),  // lip top inner
      new THREE.Vector2(0, 2.5),     // top center
    ];

    const glassGeometry = new THREE.LatheGeometry(points, 64);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.88, // Very clear PET plastic / glass
      opacity: 1.0,
      transparent: true,
      roughness: 0.05,
      metalness: 0.02,
      ior: 1.48, // Glass/PET index of refraction
      reflectivity: 0.7,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      attenuationDistance: 1.5,
      attenuationColor: new THREE.Color(0xfffdf7),
      side: THREE.DoubleSide,
    });
    const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
    glassMesh.castShadow = true;
    glassMesh.receiveShadow = true;
    bottleGroup.add(glassMesh);

    // ── B. Liquid Juice Mesh Inside Bottle ──
    // Filled to shoulder level (~ y: 1.7) as seen in Photo 1 & 2!
    const liquidPoints: THREE.Vector2[] = [
      new THREE.Vector2(0, -2.15),
      new THREE.Vector2(0.88, -2.15),
      new THREE.Vector2(0.96, -2.05),
      new THREE.Vector2(0.96, 1.0),
      new THREE.Vector2(0.94, 1.2),
      new THREE.Vector2(0.82, 1.5),
      new THREE.Vector2(0.72, 1.7), // Liquid fill top
      new THREE.Vector2(0, 1.7),     // Center of meniscus
    ];

    const liquidGeometry = new THREE.LatheGeometry(liquidPoints, 64);
    const liquidMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(selectedFlavor.colorHex),
      roughness: 0.28,
      metalness: 0.05,
      transparent: true,
      opacity: 0.94,
    });
    liquidMaterialRef.current = liquidMaterial;
    const liquidMesh = new THREE.Mesh(liquidGeometry, liquidMaterial);
    bottleGroup.add(liquidMesh);

    // Liquid Foam / Froth Meniscus Layer at Top (Photo 2 white natural foam)
    const foamGeometry = new THREE.RingGeometry(0.01, 0.71, 32);
    foamGeometry.rotateX(-Math.PI / 2);
    const foamMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff6dd,
      roughness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const foamMesh = new THREE.Mesh(foamGeometry, foamMaterial);
    foamMesh.position.y = 1.705;
    bottleGroup.add(foamMesh);

    // ── C. Cylindrical Label Wrapping (Photo 1 & 4) ──
    // Label wraps around the bottle body from y: -1.35 to 0.75 (height: 2.1)
    const labelHeight = 2.1;
    const labelRadius = 1.006; // Micro-offset above glass to prevent z-fighting
    const labelGeometry = new THREE.CylinderGeometry(
      labelRadius,
      labelRadius,
      labelHeight,
      64,
      1,
      true, // open ended
      -Math.PI / 2, // Rotate so front label faces camera initially
      Math.PI * 2
    );

    const labelMaterial = new THREE.MeshStandardMaterial({
      map: labelTexture,
      roughness: 0.45,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
    labelMesh.position.y = -0.3;
    bottleGroup.add(labelMesh);

    // ── D. Black Ribbed Screw Cap (Photo 1 & 2) ──
    const capGroup = new THREE.Group();
    capGroup.position.y = 2.65;

    // Main cap cylinder
    const capHeight = 0.42;
    const capRadius = 0.43;
    const capGeometry = new THREE.CylinderGeometry(capRadius, capRadius, capHeight, 48);
    const capMaterial = new THREE.MeshStandardMaterial({
      color: 0x181818, // Matte black
      roughness: 0.35,
      metalness: 0.15,
    });
    const capMesh = new THREE.Mesh(capGeometry, capMaterial);
    capMesh.castShadow = true;
    capGroup.add(capMesh);

    // Add vertical ribs/stripes to the cap (realistic grip ridges)
    const ribCount = 36;
    const ribGeo = new THREE.BoxGeometry(0.012, capHeight * 0.9, 0.018);
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x242424,
      roughness: 0.4,
    });
    for (let i = 0; i < ribCount; i++) {
      const angle = (i / ribCount) * Math.PI * 2;
      const rib = new THREE.Mesh(ribGeo, ribMat);
      rib.position.set(
        Math.cos(angle) * (capRadius + 0.005),
        0,
        Math.sin(angle) * (capRadius + 0.005)
      );
      rib.rotation.y = -angle;
      capGroup.add(rib);
    }

    // Cap top beveled rim
    const capTopRing = new THREE.TorusGeometry(capRadius - 0.04, 0.03, 16, 48);
    capTopRing.rotateX(Math.PI / 2);
    const capRimMesh = new THREE.Mesh(capTopRing, capMaterial);
    capRimMesh.position.y = capHeight / 2;
    capGroup.add(capRimMesh);

    bottleGroup.add(capGroup);

    // ── E. Soft Ground Shadow Plane ──
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext('2d')!;
    const sgrad = sctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    sgrad.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    sgrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.12)');
    sgrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = sgrad;
    sctx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(4.5, 4.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.25;
    scene.add(shadowPlane);

    // ── 5. Mouse & Touch Orbit Drag Interaction ──────────────────────────────
    let isDragging = false;
    let previousMouseX = 0;
    let previousMouseY = 0;
    let rotationVelocityX = 0;
    let rotationVelocityY = 0;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      setIsAutoRotating(false);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      previousMouseX = clientX;
      previousMouseY = clientY;
      rotationVelocityX = 0;
      rotationVelocityY = 0;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !bottleGroupRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - previousMouseX;
      const deltaY = clientY - previousMouseY;

      rotationVelocityX = deltaX * 0.008;
      rotationVelocityY = deltaY * 0.004;

      bottleGroupRef.current.rotation.y += rotationVelocityX;
      // Slight pitch tilt (limited so bottle doesn't flip)
      bottleGroupRef.current.rotation.x = Math.max(
        -0.25,
        Math.min(0.25, bottleGroupRef.current.rotation.x + rotationVelocityY)
      );

      previousMouseX = clientX;
      previousMouseY = clientY;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    domElement.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // ── 6. Resize Observer ───────────────────────────────────────────────────
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // ── 7. Animation Loop ────────────────────────────────────────────────────
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Smooth color transition for juice
      if (liquidMaterialRef.current) {
        currentColorRef.current.lerp(targetColorRef.current, 0.06);
        liquidMaterialRef.current.color.copy(currentColorRef.current);
      }

      // Auto-rotation when not dragging
      if (bottleGroupRef.current) {
        if (isAutoRotating && !isDragging) {
          bottleGroupRef.current.rotation.y += 0.008;
          // Return pitch to level zero
          bottleGroupRef.current.rotation.x = THREE.MathUtils.lerp(
            bottleGroupRef.current.rotation.x,
            0,
            0.05
          );
        } else if (!isDragging) {
          // Inertial damping
          bottleGroupRef.current.rotation.y += rotationVelocityX;
          rotationVelocityX *= 0.94;
          bottleGroupRef.current.rotation.x += rotationVelocityY;
          rotationVelocityY *= 0.94;
        }

        // Gentle floating respiration / oscillation
        bottleGroupRef.current.position.y = Math.sin(elapsedTime * 1.5) * 0.05;
      }

      renderer.render(scene, camera);
    };

    animate();

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);

      domElement.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);

      domElement.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);

      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
      renderer.dispose();
    };
  }, [isAutoRotating]);

  return (
    <div
      className={`relative flex flex-col items-center select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 3D Canvas Viewport */}
      <div
        ref={mountRef}
        className="w-full h-[420px] sm:h-[480px] lg:h-[540px] cursor-grab active:cursor-grabbing relative flex items-center justify-center touch-none"
        title="Faites glisser pour tourner la bouteille FYS à 360°"
      >
        {/* Floating 360° Hint Badge */}
        <div className="absolute top-3 sm:top-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-background/85 dark:bg-card/85 text-foreground backdrop-blur-md border border-border/80 shadow-md transition-all">
            <RotateCw className="size-3.5 text-primary animate-spin" style={{ animationDuration: '6s' }} />
            Tournez-moi à 360°
          </span>
        </div>

        {/* Ambient Radial Juice Glow */}
        <div
          className="absolute size-64 sm:size-80 rounded-full blur-3xl pointer-events-none opacity-25 transition-all duration-700 ease-out -z-10"
          style={{ backgroundColor: selectedFlavor.colorHex }}
        />
      </div>

      {/* Interactive Quick View Buttons */}
      <div className="flex items-center justify-center gap-2 mb-4 z-10">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => rotateToAngle(0)}
          className="text-xs font-bold h-8 px-3 rounded-xl border-border/80 bg-background/80 hover:bg-primary/10 hover:text-primary backdrop-blur-sm cursor-pointer"
        >
          Face avant (FYS)
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => rotateToAngle(Math.PI)}
          className="text-xs font-bold h-8 px-3 rounded-xl border-border/80 bg-background/80 hover:bg-primary/10 hover:text-primary backdrop-blur-sm cursor-pointer"
        >
          Face arrière (QR Code)
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setIsAutoRotating(!isAutoRotating)}
          className="text-xs font-bold h-8 px-2.5 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
          title={isAutoRotating ? 'Pause rotation' : 'Reprendre rotation'}
        >
          {isAutoRotating ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </Button>
      </div>

      {/* Flavor Switcher Chips (Dynamic Liquid Color) */}
      {showControls && (
        <div className="w-full max-w-md px-3 sm:px-0 space-y-2.5 z-10">
          <p className="text-[11px] font-bold text-center uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1.5">
            <Droplets className="size-3.5 text-primary" />
            Personnalisez la couleur du jus en direct :
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {JUICE_FLAVORS.map((flavor) => {
              const isSelected = flavor.id === selectedFlavor.id;
              return (
                <button
                  key={flavor.id}
                  type="button"
                  onClick={() => handleSelectFlavor(flavor)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-card text-foreground shadow-md ring-2 ring-primary/40 scale-105 border-primary/50'
                      : 'bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/60 hover:scale-102'
                  }`}
                >
                  <span
                    className="size-3.5 rounded-full border border-black/10 shrink-0 shadow-xs"
                    style={{ backgroundColor: flavor.colorHex }}
                  />
                  <span>{flavor.name.split(' ')[0]}</span>
                  {isSelected && <Check className="size-3 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-center text-muted-foreground italic">
            {selectedFlavor.name} · {selectedFlavor.subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
