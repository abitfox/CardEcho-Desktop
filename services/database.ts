
import { User, Deck } from '../types';

const DB_NAME = 'CardEchoDB';
const DB_VERSION = 2; // Increment version for schema change
const STORES = {
  USERS: 'users',
  DECKS: 'decks', // User's library (created or subscribed)
  MARKETPLACE: 'marketplace', // Store content
};

class DatabaseService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORES.USERS)) {
          db.createObjectStore(STORES.USERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.DECKS)) {
          db.createObjectStore(STORES.DECKS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.MARKETPLACE)) {
          db.createObjectStore(STORES.MARKETPLACE, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        console.error('Database error:', (event.target as IDBOpenDBRequest).error);
        reject('Failed to initialize database');
      };
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // User Operations
  async saveUser(user: User): Promise<void> {
    const store = await this.getStore(STORES.USERS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(user);
      request.onsuccess = () => resolve();
      request.onerror = () => reject('Failed to save user');
    });
  }

  async getUser(id: string): Promise<User | null> {
    const store = await this.getStore(STORES.USERS);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject('Failed to fetch user');
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const store = await this.getStore(STORES.USERS);
    return new Promise((resolve) => {
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          if (cursor.value.email === email) {
            resolve(cursor.value);
            return;
          }
          cursor.continue();
        } else {
          resolve(null);
        }
      };
    });
  }

  // Library Deck Operations
  async saveDeck(deck: Deck): Promise<void> {
    const store = await this.getStore(STORES.DECKS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(deck);
      request.onsuccess = () => resolve();
      request.onerror = () => reject('Failed to save deck');
    });
  }

  async getDecks(userId: string): Promise<Deck[]> {
    const store = await this.getStore(STORES.DECKS);
    return new Promise((resolve, reject) => {
      const decks: Deck[] = [];
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          decks.push(cursor.value);
          cursor.continue();
        } else {
          resolve(decks.sort((a, b) => b.createdAt - a.createdAt));
        }
      };
      request.onerror = () => reject('Failed to get decks');
    });
  }

  async deleteDeck(id: string): Promise<void> {
    const store = await this.getStore(STORES.DECKS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject('Failed to delete deck');
    });
  }

  // Marketplace Operations
  async saveStoreDeck(deck: Deck): Promise<void> {
    const store = await this.getStore(STORES.MARKETPLACE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(deck);
      request.onsuccess = () => resolve();
      request.onerror = () => reject('Failed to save store deck');
    });
  }

  async getStoreDecks(): Promise<Deck[]> {
    const store = await this.getStore(STORES.MARKETPLACE);
    return new Promise((resolve, reject) => {
      const decks: Deck[] = [];
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          decks.push(cursor.value);
          cursor.continue();
        } else {
          resolve(decks);
        }
      };
      request.onerror = () => reject('Failed to get store decks');
    });
  }
}

export const db = new DatabaseService();
