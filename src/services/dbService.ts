import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'MadisonSurveyorDB';
const STORE_NAME = 'surveys';

export interface SurveyRecord {
  id: string;
  type: 'ISC' | 'EFS' | 'GENERAL';
  data: any;
  images: string[];
  notes?: string;
  boardId: string;
  status: 'pending' | 'synced';
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase>;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
};

export const saveSurvey = async (record: SurveyRecord) => {
  const db = await getDB();
  await db.put(STORE_NAME, record);
};

export const getPendingSurveys = async (): Promise<SurveyRecord[]> => {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  return all.filter(s => s.status === 'pending');
};

export const getAllSurveys = async (): Promise<SurveyRecord[]> => {
  const db = await getDB();
  return db.getAll(STORE_NAME);
};

export const markAsSynced = async (id: string) => {
  const db = await getDB();
  const record = await db.get(STORE_NAME, id);
  if (record) {
    record.status = 'synced';
    await db.put(STORE_NAME, record);
  }
};
