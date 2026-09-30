/**
 * IndexedDB and LocalStorage persistent store for Gefle Bells:
 * - User uploaded custom audio samples (IndexedDB blobs)
 * - Custom key bindings (localStorage)
 * - Audio & trainer preferences
 */

const DB_NAME = 'gefle_bells_store';
const DB_VERSION = 1;
const SAMPLES_STORE = 'bell_samples';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SAMPLES_STORE)) {
        db.createObjectStore(SAMPLES_STORE, { keyPath: 'bellId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredSample {
  bellId: string;
  fileName: string;
  blob: Blob;
  updatedAt: number;
}

export async function saveSampleToDb(bellId: string, fileName: string, blob: Blob): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAMPLES_STORE, 'readwrite');
    const store = tx.objectStore(SAMPLES_STORE);
    const item: StoredSample = {
      bellId,
      fileName,
      blob,
      updatedAt: Date.now(),
    };
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getSampleFromDb(bellId: string): Promise<StoredSample | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAMPLES_STORE, 'readonly');
    const store = tx.objectStore(SAMPLES_STORE);
    const req = store.get(bellId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSamplesFromDb(): Promise<StoredSample[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAMPLES_STORE, 'readonly');
    const store = tx.objectStore(SAMPLES_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSampleFromDb(bellId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAMPLES_STORE, 'readwrite');
    const store = tx.objectStore(SAMPLES_STORE);
    const req = store.delete(bellId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllSamplesFromDb(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAMPLES_STORE, 'readwrite');
    const store = tx.objectStore(SAMPLES_STORE);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// LocalStorage helpers for keybinds & preferences
const KEYBINDS_KEY = 'gefle_bells_custom_keybinds';
const SETTINGS_KEY = 'gefle_bells_audio_settings';

export function getCustomKeybinds(): Record<string, { code: string; label: string }> {
  try {
    const val = localStorage.getItem(KEYBINDS_KEY);
    return val ? JSON.parse(val) : {};
  } catch {
    return {};
  }
}

export function saveCustomKeybinds(binds: Record<string, { code: string; label: string }>): void {
  try {
    localStorage.setItem(KEYBINDS_KEY, JSON.stringify(binds));
  } catch (e) {
    console.error('Failed to save keybinds', e);
  }
}

export function getStoredSettings(): Partial<{ masterVolume: number; reverbAmount: number; decayMultiplier: number }> {
  try {
    const val = localStorage.getItem(SETTINGS_KEY);
    return val ? JSON.parse(val) : {};
  } catch {
    return {};
  }
}

export function saveStoredSettings(settings: object): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}
