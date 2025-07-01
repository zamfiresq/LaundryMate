// interfata pt obiectele din baza de date
export interface GarmentItem {
  id: string;
  material: string;
  culoare: string;
  temperatura: number;
  simboluri: string[];
  image: string;
  scanDate: {
    seconds: number;
    nanoseconds: number;
  };
  materialManual: string;
  culoareManual: string;
  userId: string;
}

export interface WashingProfile {
  program: string;
  temperature: number | string;
  spinSpeed: number | string;
  washTime: string;
  detergentType: string;
  restrictions?: string[];
}

export interface WashGroup {
  id: string;
  groupIndex: number;
  totalGroups: number;
  garmentIds: string[];
  washingProfile: WashingProfile;
  recommendation?: string;
  created_at: {
    seconds: number;
    nanoseconds: number;
  };
  efficiency?: number;
  sessionId: string;
}

export interface HistorySession {
  id: string;
  washGroup: WashGroup;
  garments: GarmentItem[];
  created_at: Date;
}