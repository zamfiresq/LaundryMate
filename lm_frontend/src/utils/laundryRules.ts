export function normalizeSymbol(symbol: string): string {
  return symbol.toLowerCase().replace(/[_ ]/g, '').trim();
}

export function getTemperatureCategory(symbols: string[]): string {
  const norm = symbols.map(normalizeSymbol);
  if (norm.includes('30c') || norm.includes('handwash')) return '30C';
  if (norm.includes('40c') || norm.includes('donotdryclean')) return '40C';
  if (norm.includes('50c')) return '50C';
  if (norm.includes('60c')) return '60C';
  if (norm.includes('90c')) return '90C';
  return 'Unknown';
}

export function getMaterialCategory(material: string): string {
  material = material.toLowerCase().trim();
  if (['delicat', 'matase', 'cașmir'].includes(material)) return 'delicate';
  if (['sintetic', 'poliester', 'vâscoză'].includes(material)) return 'synthetic';
  if (['bumbac', 'in', 'bumbac organic'].includes(material)) return 'cotton';
  if (['lână'].includes(material)) return 'wool';
  return 'other';
}

export function getColorGroup(color: string): string {
  color = color.toLowerCase().trim();
  if (color === 'alb') return 'white';
  if (['negru', 'colorat', 'multicolor'].includes(color)) return 'dark';
  if (color === 'pastel') return 'pastel';
  return 'unknown';
}

export function areCompatible(item1: any, item2: any): boolean {
  const tempOrder = ['30C', '40C', '50C', '60C', '90C'];
  const t1 = item1.temperatura || 'Unknown';
  const t2 = item2.temperatura || 'Unknown';
  if (tempOrder.includes(t1) && tempOrder.includes(t2)) {
    if (Math.abs(tempOrder.indexOf(t1) - tempOrder.indexOf(t2)) > 1) return false;
  }
  const m1 = getMaterialCategory(item1.materialManual || item1.material || '');
  const m2 = getMaterialCategory(item2.materialManual || item2.material || '');
  if (['delicate'].includes(m1) && m1 !== m2) return false;
  if (m1 === 'wool' && m2 !== 'wool') return false;
  const c1 = getColorGroup(item1.culoareManual || item1.culoare || '');
  const c2 = getColorGroup(item2.culoareManual || item2.culoare || '');
  if (['white'].includes(c1) && c1 !== c2) return false;
  if (c1 === 'pastel' && c2 !== 'pastel') return false;
  return true;
}

export function groupCompatibleItems(items: any[]): any[][] {
  const groups: any[][] = [];
  for (const item of items) {
    let placed = false;
    for (const group of groups) {
      if (group.every(other => areCompatible(item, other))) {
        group.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([item]);
  }
  return groups;
} 