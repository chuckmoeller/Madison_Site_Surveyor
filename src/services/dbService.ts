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
    dbPromise = openDB(DB_NAME, 2, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        let store;
        if (oldVersion < 1) {
          store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        } else {
          store = transaction.objectStore(STORE_NAME);
        }

        // Optimization: Add index for 'status' to allow faster lookups
        if (!store.indexNames.contains('status')) {
          store.createIndex('status', 'status');
        }
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
  // Optimization: Use the 'status' index to fetch only pending records.
  // This reduces complexity from O(N) to O(M) where M is the number of pending items.
  return db.getAllFromIndex(STORE_NAME, 'status', 'pending');
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
