import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  doc, 
  getDoc,
  deleteDoc,
  where,
  setDoc
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { GarmentItem, WashGroup, HistorySession } from './types';

export class HistoryService {
   // obtin toate grupurile de spalare pt un utilizator
  static async getWashGroups(userId: string): Promise<WashGroup[]> {
    try {
      const washGroupsRef = collection(db, 'users', userId, 'washGroups');
      const q = query(washGroupsRef, orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WashGroup[];
    } catch (error) {
      console.error('Eroare la obținerea grupurilor:', error);
      throw error;
    }
  }

  
   // obtin toate hainele pt un utilizator
  static async getGarments(userId: string, garmentIds?: string[]): Promise<GarmentItem[]> {
    try {
      const garmentsRef = collection(db, 'users', userId, 'garments');
      let q;
      
      if (garmentIds && garmentIds.length > 0) {
        // filtrare haine
        q = query(garmentsRef, where('__name__', 'in', garmentIds));
      } else {
        q = query(garmentsRef, orderBy('scanDate', 'desc'));
      }
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GarmentItem[];
    } catch (error) {
      console.error('Eroare la obținerea hainelor:', error);
      throw error;
    }
  }

   // haina specifica   
  static async getGarment(userId: string, garmentId: string): Promise<GarmentItem | null> {
    try {
      const garmentRef = doc(db, 'users', userId, 'garments', garmentId);
      const docSnap = await getDoc(garmentRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as GarmentItem;
      }
      
      return null;
    } catch (error) {
      console.error('Eroare la obținerea hainei:', error);
      throw error;
    }
  }

   // sesiunile complete de istoric (grupuri + hainele aferente)
  static async getHistorySessions(userId: string): Promise<HistorySession[]> {
    try {
      // 1. Obține toate grupurile de spălare
      const washGroups = await this.getWashGroups(userId);
      
      // 2. Pentru fiecare grup, obține hainele aferente
      const sessions: HistorySession[] = [];
      
      for (const washGroup of washGroups) {
        const garments = await this.getGarments(userId, washGroup.garmentIds);
        
        sessions.push({
          id: washGroup.id,
          washGroup,
          garments,
          created_at: new Date(washGroup.created_at.seconds * 1000)
        });
      }
      
      // 3. Sortează după dată (cele mai noi primul)
      sessions.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      
      return sessions;
    } catch (error) {
      console.error('Eroare la obținerea sesiunilor:', error);
      throw error;
    }
  }

  /**
   * Șterge un grup de spălare și hainele aferente
   */
  static async deleteWashGroup(userId: string, washGroupId: string): Promise<void> {
    try {
      // 1. Obține grupul pentru a vedea care haine să șteargă
      const washGroupRef = doc(db, 'users', userId, 'washGroups', washGroupId);
      const washGroupSnap = await getDoc(washGroupRef);
      
      if (!washGroupSnap.exists()) {
        throw new Error('Grupul nu există');
      }
      
      const washGroup = washGroupSnap.data() as WashGroup;
      
      // 2. Șterge hainele aferente (opțional - depinde de logica ta)
      // Comentat pentru că poate vrei să păstrezi hainele pentru alte grupuri
      /*
      for (const garmentId of washGroup.garmentIds) {
        const garmentRef = doc(db, 'users', userId, 'garments', garmentId);
        await deleteDoc(garmentRef);
      }
      */
      
      // 3. Șterge grupul
      await deleteDoc(washGroupRef);
    } catch (error) {
      console.error('Eroare la ștergerea grupului:', error);
      throw error;
    }
  }

  /**
   * Găsește grupuri similare pentru reutilizare
   */
  static async findSimilarGroups(
    userId: string, 
    currentGarments: GarmentItem[]
  ): Promise<HistorySession[]> {
    try {
      const sessions = await this.getHistorySessions(userId);
      
      // Logică simplă de similitudine
      const currentMaterials = currentGarments.map(g => g.material);
      const avgTemp = currentGarments.reduce((sum, g) => sum + g.temperatura, 0) / currentGarments.length;
      
      const similarSessions = sessions.filter(session => {
        const sessionMaterials = session.garments.map(g => g.material);
        const sessionAvgTemp = session.garments.reduce((sum, g) => sum + g.temperatura, 0) / session.garments.length;
        
        const hasCommonMaterials = currentMaterials.some(m => sessionMaterials.includes(m));
        const similarTemp = Math.abs(avgTemp - sessionAvgTemp) <= 10;
        
        return hasCommonMaterials && similarTemp;
      });
      
      return similarSessions.slice(0, 5); // Top 5 cele mai similare
    } catch (error) {
      console.error('Eroare la găsirea grupurilor similare:', error);
      throw error;
    }
  }

  /**
   * Șterge toate grupurile de spălare pentru un utilizator
   */
  static async deleteAllWashGroups(userId: string): Promise<void> {
    try {
      const washGroupsRef = collection(db, 'users', userId, 'washGroups');
      const q = query(washGroupsRef);
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(docSnap => {
        const washGroupRef = doc(db, 'users', userId, 'washGroups', docSnap.id);
        return deleteDoc(washGroupRef);
      });
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Eroare la ștergerea tuturor grupurilor:', error);
      throw error;
    }
  }

  /**
   * Returnează statistici: număr sesiuni și număr haine scanate (distincte)
   */
  static async getStats(userId: string): Promise<{ sessions: number; clothes: number }> {
    try {
      const washGroups = await this.getWashGroups(userId);
      const allGarmentIds = washGroups.flatMap(g => g.garmentIds);
      // elimină duplicatele
      const uniqueGarmentIds = Array.from(new Set(allGarmentIds));
      return {
        sessions: washGroups.length,
        clothes: uniqueGarmentIds.length
      };
    } catch (error) {
      console.error('Eroare la calcularea statisticilor:', error);
      throw error;
    }
  }

  /**
   * Pin-uiește o sesiune în pinnedRecommendations
   */
  static async pinSession(userId: string, sessionId: string): Promise<void> {
    const pinRef = doc(db, 'users', userId, 'pinnedRecommendations', sessionId);
    await setDoc(pinRef, { pinnedAt: new Date() });
  }

  /**
   * Unpin-uiește o sesiune din pinnedRecommendations
   */
  static async unpinSession(userId: string, sessionId: string): Promise<void> {
    const pinRef = doc(db, 'users', userId, 'pinnedRecommendations', sessionId);
    await deleteDoc(pinRef);
  }

  /**
   * Returnează lista de sesiuni pin-uite (id-uri)
   */
  static async getPinnedSessionIds(userId: string): Promise<string[]> {
    const pinsRef = collection(db, 'users', userId, 'pinnedRecommendations');
    const q = query(pinsRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.id);
  }
}