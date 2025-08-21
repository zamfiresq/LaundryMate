// logica determinista de grupare a hainelor pentru spalare

export interface ClothingItem {
  id: string;
  image: string;
  material: string;
  culoare: string;
  temperatura: string;
  simboluri: string[];
  materialManual?: string;
  culoareManual?: string;
  nume?: string;
}

export interface WashingProfile {
  temperature: string;
  spinSpeed: number;
  washTime: number;
  detergentType: string;
  program: string;
  priority: number;
  specialTips?: string[];
}

export interface GroupingResult {
  groups: ClothingItem[][];
  recommendations: WashingProfile[];
  conflicts: string[];
  efficiency: number;
}

// constante pentru ierarhizarea parametrilor
const PARAMETER_PRIORITY = {
  MATERIAL: 10,
  COLOR: 8,
  TEMPERATURE: 6,
  SYMBOLS: 4
};

const TEMPERATURE_HIERARCHY = ['30°C', '40°C', '50°C', '60°C', '90°C'];

// profiluri pt fiecare material
const MATERIAL_PROFILES: Record<string, WashingProfile> = {
  'delicat': {
    temperature: '30°C',
    spinSpeed: 600,
    washTime: 45,
    detergentType: 'delicat',
    program: 'Delicate',
    priority: 1,
    specialTips: ['Folosește plasă de protecție', 'Evită supraîncărcarea mașinii', 'Nu folosi înălbitor']
  },
  'lana': {
    temperature: '30°C',
    spinSpeed: 400,
    washTime: 30,
    detergentType: 'lână',
    program: 'Lână',
    priority: 2,
    specialTips: ['Uscare la umbră', 'Nu stoarceți']
  },
  'sintetic': {
    temperature: '40°C',
    spinSpeed: 800,
    washTime: 60,
    detergentType: 'universal',
    program: 'Sintetice',
    priority: 3,
    specialTips: ['Se poate usca la mașină la temperatură medie']
  },
  'bumbac': {
    temperature: '60°C',
    spinSpeed: 1000,
    washTime: 90,
    detergentType: 'universal',
    program: 'Bumbac',
    priority: 4,
    specialTips: ['Poate rezista la temperaturi mari', 'Se poate călca la fier fierbinte']
  },
  'in': {
    temperature: '40°C',
    spinSpeed: 800,
    washTime: 70,
    detergentType: 'universal',
    program: 'In/Materiale naturale',
    priority: 5,
    specialTips: ['Se șifonează ușor, călcați umed', 'Se poate contracta la prima spălare']
  }
};


// profiluri de culoare + sfaturi speciale
const COLOR_PROFILES: Record<string, Partial<WashingProfile>> = {
  'alb': {
    detergentType: 'alb',
    program: 'Alb',
    specialTips: ['Spală separat hainele albe pentru a evita îngălbenirea acestora']
  },
  'negru': {
    detergentType: 'colorat',
    program: 'Culori închise',
    specialTips: ['Spală cu apă rece pentru a păstra culoarea', 'Evită expunerea la soare pentru a preveni decolorarea']
  },
  'culori-deschise': {
    detergentType: 'colorat delicat',
    program: 'Culori deschise',
    specialTips: ['Verifică dacă se decolorează înainte de spălare', 'Evită amestecul cu culori puternice']
  },
  'culori-inchise': {
    detergentType: 'colorat',
    program: 'Culori închise',
    specialTips: ['Folosește șervețele captatoare de culoare', 'Evită spălarea cu albul pentru a preveni transferul de culoare']
  },
  'multicolor': {
    detergentType: 'colorat delicat',
    program: 'Mixt colorat',
    specialTips: ['Testează decolorarea pe o zonă ascunsă', 'Spală la temperatură scăzută']
  }
};

// functii de normalizare a simbolurilor si determinare a temperaturii
export function normalizeSymbol(symbol: string): string {
  return symbol.toLowerCase().replace(/[_ ]/g, '').trim();
}

export function getTemperatureCategory(symbols: string[]): string {
  if (!symbols || symbols.length === 0) return '30°C'; // default pentru cazuri fara simboluri
  
  const norm = symbols.map(normalizeSymbol); 
  



  // prioritate pentru simbolurile specifice de temperatura
  if (norm.includes('90c')) return '90°C';
  if (norm.includes('60c')) return '60°C';
  if (norm.includes('50c')) return '50°C';
  if (norm.includes('40c')) return '40°C';
  if (norm.includes('30c')) return '30°C';
  
  // verificare pentru simboluri de spalare manuala
  if (norm.includes('handwash')) return '30°C';
  if (norm.includes('donotdryclean')) return '40°C';
  if (norm.includes('dryclean')) return '60°C';
  
  return '30°C'; // default pentru cazuri necunoscute 
}

export function getMaterialCategory(material: string): string {
  const mat = material.toLowerCase().trim();
  
  // materiale delicate - cea mai mare prioritate
  if (['delicat', 'mătase', 'cașmir', 'matase', 'casmir', 'visco', 'modal'].includes(mat)) {
    return 'delicat';
  }
  
  // lana - tratament special
  if (['lână', 'lana', 'wool', 'alpaca', 'mohair'].includes(mat)) {
    return 'lana';
  }
  
  // sintetice 
  if (['sintetic', 'poliester', 'vâscoză', 'viscoză', 'nylon', 'acrilic', 'elastan', 'spandex', 'lycra'].includes(mat)) {
    return 'sintetic';
  }
  
  // in si materiale naturale
  if (['in', 'linen', 'cânepa', 'canepa', 'ramie'].includes(mat)) {
    return 'in';
  }
  
  // bumbac si variantele sale + denim
  if (['bumbac', 'bumbac organic', 'bumbac bio', 'denim', 'cotton'].includes(mat)) {
    return 'bumbac';
  }
  
  return 'Bumbac'; // default pentru materiale necunoscute
}

export function getColorGroup(color: string): string {
  const col = color.toLowerCase().trim();
  
  if (['alb', 'white', 'ivory', 'crem', 'ecru'].includes(col)) return 'alb';
  if (['negru', 'black'].includes(col)) return 'negru';
  if (['multicolor', 'multi', 'imprimeu', 'model', 'dungi', 'pătat'].includes(col)) return 'multicolor';
  
  // culori deschise
  if (['pastel', 'deschis', 'light', 'bej', 'roz deschis', 'albastru deschis', 'galben', 'portocaliu deschis'].includes(col)) {
    return 'culori-deschise';
  }
  
  // culori inchise (default pentru culori puternice)
  return 'culori-inchise';
}

// functie pentru verificarea compatibilitatii 
export function areCompatible(item1: ClothingItem, item2: ClothingItem): boolean {
  // 1. verificare compatibilitate material (prioritate maxima)
  const mat1 = getMaterialCategory(item1.materialManual || item1.material || '');
  const mat2 = getMaterialCategory(item2.materialManual || item2.material || '');
  
  // materialele delicate si lana nu se amesteca cu altele
  if ((mat1 === 'delicat' && mat2 !== 'delicat') || 
      (mat2 === 'delicat' && mat1 !== 'delicat')) {
    return false;
  }
  
  if ((mat1 === 'lana' && mat2 !== 'lana') || 
      (mat2 === 'lana' && mat1 !== 'lana')) {
    return false;
  }
  

  // 2. verificare compatibilitate culoare
  const col1 = getColorGroup(item1.culoareManual || item1.culoare || '');
  const col2 = getColorGroup(item2.culoareManual || item2.culoare || '');
  
// albul nu se amesteca cu alte culori 
  if ((col1 === 'alb' && col2 !== 'alb') || 
      (col2 === 'alb' && col1 !== 'alb')) {
    return false;
  }
  
  // negrul nu se amesteca cu alte culori 
  if ((col1 === 'negru' && col2 !== 'negru') || 
      (col2 === 'negru' && col1 !== 'negru')) {
    return false;
  }
  
  // culorile inchise nu se amesteca cu culori deschise 
  if ((col1 === 'culori-inchise' && col2 === 'culori-deschise') || 
      (col2 === 'culori-inchise' && col1 === 'culori-deschise')) {
    return false;
  }
  
  // multicolor poate fi problematic cu culori deschise 
  if ((col1 === 'multicolor' && col2 === 'culori-deschise') || 
      (col2 === 'multicolor' && col1 === 'culori-deschise')) {
    return false;
  }


  
  // 3. verificare compatibilitate temperatura
  const temp1 = item1.temperatura === 'N/A' ? '30°C' : item1.temperatura;
  const temp2 = item2.temperatura === 'N/A' ? '30°C' : item2.temperatura;
  
  const tempIndex1 = TEMPERATURE_HIERARCHY.indexOf(temp1);
  const tempIndex2 = TEMPERATURE_HIERARCHY.indexOf(temp2);
  
  // diferenta de temperatura nu trebuie sa depaseasca un nivel (10C)
  if (tempIndex1 !== -1 && tempIndex2 !== -1) {
    if (Math.abs(tempIndex1 - tempIndex2) > 1) {
      return false;
    }
  }
  
  return true;
}

// algoritm de grupare 
export function groupCompatibleItems(items: ClothingItem[]): GroupingResult {
  if (!items || items.length === 0) {
    return {
      groups: [],
      recommendations: [],
      conflicts: [],
      efficiency: 0
    };
  }
  
  const groups: ClothingItem[][] = [];
  const conflicts: string[] = [];
  
  // sortare articole pe baza materialului - prioritate 
  const sortedItems = [...items].sort((a, b) => {
    const matA = getMaterialCategory(a.materialManual || a.material || '');
    const matB = getMaterialCategory(b.materialManual || b.material || '');
    const priorityA = MATERIAL_PROFILES[matA]?.priority || 999;
    const priorityB = MATERIAL_PROFILES[matB]?.priority || 999;
    return priorityA - priorityB;
  });
  
  //  parcurgem fiecare articol pt a fi plasat in cel mai potrivit grup
  for (const item of sortedItems) {
    let placed = false;
    let bestGroupIndex = -1;
    let maxCompatibility = 0;
    
    // gaseste cel mai bun grup pentru articolul curent
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      let compatibility = 0;
      let isCompatible = true;
      
      for (const otherItem of group) {
        if (!areCompatible(item, otherItem)) {
          isCompatible = false;
          break;
        }
        compatibility += calculateCompatibilityScore(item, otherItem);
      }
      
      if (isCompatible && compatibility > maxCompatibility) {
        maxCompatibility = compatibility;
        bestGroupIndex = i;
      }
    }
    
    if (bestGroupIndex !== -1) {
      groups[bestGroupIndex].push(item);
      placed = true;
    }
    
    // daca nu a fost plasat, se creeaza un nou grup
    if (!placed) {
      groups.push([item]);
    }
  }
  
  // recomandari pt fiecare grup
  const recommendations = groups.map(group => generateGroupRecommendation(group));
  
  // calcularea eficientei de grupare
  const efficiency = calculateGroupingEfficiency(groups, items.length);
  
  return {
    groups,
    recommendations,
    conflicts,
    efficiency
  };
}


// scor de compatibilitate intre doua articole
function calculateCompatibilityScore(item1: ClothingItem, item2: ClothingItem): number {
  let score = 0;
  
  const mat1 = getMaterialCategory(item1.materialManual || item1.material || '');
  const mat2 = getMaterialCategory(item2.materialManual || item2.material || '');
  if (mat1 === mat2) score += PARAMETER_PRIORITY.MATERIAL;
  
  const col1 = getColorGroup(item1.culoareManual || item1.culoare || '');
  const col2 = getColorGroup(item2.culoareManual || item2.culoare || '');
  if (col1 === col2) score += PARAMETER_PRIORITY.COLOR;
  
  const temp1 = item1.temperatura === 'N/A' ? '30°C' : item1.temperatura;
  const temp2 = item2.temperatura === 'N/A' ? '30°C' : item2.temperatura;
  if (temp1 === temp2) score += PARAMETER_PRIORITY.TEMPERATURE;
  
  return score;
}

// generare profil de spalare
export function generateGroupRecommendation(group: ClothingItem[]): WashingProfile {
  if (group.length === 0) {
    return MATERIAL_PROFILES['bumbac'];
  }
  
  // determinarea profilului de spalare pe baza articolelor din grup
  const materials = group.map(item => 
    getMaterialCategory(item.materialManual || item.material || '')
  );
  
  const colors = group.map(item => 
    getColorGroup(item.culoareManual || item.culoare || '')
  );
  
  const temperatures = group.map(item => 
    item.temperatura === 'N/A' ? '30°C' : item.temperatura
  );
  
  // selectare material cu prioritatea cea mai mica (cel mai restrictiv)
  const dominantMaterial = materials.reduce((prev, curr) => {
    const prevPriority = MATERIAL_PROFILES[prev]?.priority || 999;
    const currPriority = MATERIAL_PROFILES[curr]?.priority || 999;
    return prevPriority < currPriority ? prev : curr;
  });
  
  // selectare culoare dominanta
  const dominantColor = colors.reduce((prev, curr) => {
    if (prev === 'alb' || curr === 'alb') return 'alb';
    if (prev === 'negru' || curr === 'negru') return 'negru';
    if (prev === 'culori-deschise' || curr === 'culori-deschise') return 'culori-deschise';
    if (prev === 'multicolor' || curr === 'multicolor') return 'multicolor';
    return 'culori-inchise';
  });
  
  // selectare temperatura cea mai mica (cea mai sigura)
  const dominantTemp = temperatures.reduce((prev, curr) => {
    const prevIndex = TEMPERATURE_HIERARCHY.indexOf(prev);
    const currIndex = TEMPERATURE_HIERARCHY.indexOf(curr);
    if (prevIndex === -1) return curr;
    if (currIndex === -1) return prev;
    return prevIndex < currIndex ? prev : curr;
  });
  
  // combinarea profilurilor de material si culoare
  const baseProfile = { ...MATERIAL_PROFILES[dominantMaterial] };
  const colorProfile = COLOR_PROFILES[dominantColor] || {};
  
  // ajustarea profilului de spalare
  baseProfile.temperature = dominantTemp;
  
  // adaugarea sfaturilor speciale
  const combinedTips = [
    ...(baseProfile.specialTips || []),
    ...(colorProfile.specialTips || [])
  ];
  
  return {
    ...baseProfile,
    ...colorProfile,
    specialTips: Array.from(new Set(combinedTips)),
    program: determineProgram(dominantMaterial, dominantColor)
  };
}



// functie pentru determinarea programului de spalare optim
function determineProgram(material: string, color: string): string {
  const baseMaterial = MATERIAL_PROFILES[material]?.program || 'Universal';
  
  switch (color) {
    case 'alb':
      return material === 'bumbac' ? 'Bumbac Alb Intensiv' : `${baseMaterial} Alb`;
    case 'negru':
      return `${baseMaterial} Negru`;
    case 'culori-deschise':
      return `${baseMaterial} Culori Delicate`;
    case 'culori-inchise':
      return `${baseMaterial} Colorat`;
    case 'multicolor':
      return `${baseMaterial} Mixt`;
    default:
      return baseMaterial;
  }
}

// eficienta gruparii articolelor
function calculateGroupingEfficiency(groups: ClothingItem[][], totalItems: number): number {
  if (totalItems === 0) return 0;
  
  const idealGroups = Math.ceil(totalItems / 5); // am presupus ca un grup ideal are 5 articole
  const actualGroups = groups.length;
  
  // penalizare pentru grupuri prea mici
  let penalty = 0;
  groups.forEach(group => {
    if (group.length === 1) penalty += 0.15; // penalizare pentru articole singulare
    if (group.length > 7) penalty += 0.1 * (group.length - 7); // penalizare pentru grupuri prea mari
  });
  
  const efficiency = Math.max(0, (1 - (actualGroups - idealGroups) / totalItems - penalty) * 100);
  return Math.round(efficiency);
}

// functie pt obtinerea unei recomandari textuale 
export function getTextualRecommendation(groups: ClothingItem[][]): string {
  if (groups.length === 0) {
    return 'Nu există haine scanate pentru grupare.';
  }

  let recommendation = '';

  groups.forEach((group, index) => {
    const profile = generateGroupRecommendation(group);
    recommendation += `Grupul ${index + 1} (${group.length} articole):\n`;

    group.forEach((item) => {
      const nume = item.nume || `Haina ${item.id || '?'}`;
      const material = item.materialManual || item.material || 'N/A';
      const color = item.culoareManual || item.culoare || 'N/A';
      const temp = item.temperatura === 'N/A' ? '30°C' : item.temperatura;
      recommendation += `  • ${nume}: ${material}, ${color}, ${temp}\n`;
    });

    recommendation += `Recomandare spălare:\n`;
    recommendation += `  • Program: ${profile.program}\n`;
    recommendation += `  • Temperatură: ${profile.temperature}\n`;
    recommendation += `  • Viteză centrifugare: ${profile.spinSpeed} rpm\n`;
    recommendation += `  • Timp spălare: ${profile.washTime} minute\n`;
    recommendation += `  • Detergent: ${profile.detergentType}\n`;

    // sfaturi speciale
    if (profile.specialTips && profile.specialTips.length > 0) {
      recommendation += `  • Sfaturi speciale:\n`;
      profile.specialTips.forEach(tip => {
        recommendation += `    - ${tip}\n`;
      });
    }

    recommendation += '\n';
  });

  return recommendation.trim();
}