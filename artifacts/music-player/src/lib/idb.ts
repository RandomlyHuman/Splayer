import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface StoredTrack {
  id: string;
  fileBlob?: Blob;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  addedAt?: number;
  metaTitle?: string;
  metaArtist?: string;
  metaAlbum?: string;
  metaYear?: string;
  metaGenre?: string;
  metaDuration?: number;
  embeddedCover?: Blob;
  customCover?: Blob;
  customTitle?: string;
  customArtist?: string;
  customAlbum?: string;
  customYear?: string;
  customGenre?: string;
  playCount?: number;
  lastPlayedAt?: number;
  liked?: boolean;
  fetchedCover?: Blob;
  filePath?: string;
  hasVideo?: boolean;
  videoPath?: string;
}

interface StoredPlaylist {
  id: string;
  name: string;
  trackIds: string[];
  customCover?: Blob;
  createdAt: number;
  updatedAt: number;
}

interface StoredSetting {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

interface StoredPodcast {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  feedUrl: string;
  addedAt: number;
}

interface StoredEpisode {
  id: string;
  podcastId: string;
  title: string;
  description?: string;
  pubDate?: number;
  duration?: number;
  audioUrl: string;
  guid: string;
  played: boolean;
  progress: number;
  thumbnail?: string;
}

interface StoredBook {
  id: string;
  title: string;
  author: string;
  narrator?: string;
  description?: string;
  coverBlob?: Blob;
  source: "local" | "youtube";
  feedUrl?: string;
  addedAt: number;
  duration?: number;
  progress?: number;
  audioBlob?: Blob;
  audioType?: string;
}

interface StoredBookChapter {
  id: string;
  bookId: string;
  title: string;
  index: number;
  startTime?: number;
  endTime?: number;
  duration?: number;
  audioUrl?: string;
  progress: number;
  played: boolean;
}

interface StoredBookBookmark {
  id: string;
  bookId: string;
  time: number;
  note: string;
  createdAt: number;
}

interface MusicPlayerDB extends DBSchema {
  tracks: {
    key: string;
    value: StoredTrack;
  };
  playlists: {
    key: string;
    value: StoredPlaylist;
  };
  settings: {
    key: string;
    value: StoredSetting;
  };
  podcasts: {
    key: string;
    value: StoredPodcast;
  };
  episodes: {
    key: string;
    value: StoredEpisode;
    indexes: { 'by-podcast': string };
  };
  books: {
    key: string;
    value: StoredBook;
  };
  book_chapters: {
    key: string;
    value: StoredBookChapter;
    indexes: { 'by-book': string };
  };
  book_bookmarks: {
    key: string;
    value: StoredBookBookmark;
    indexes: { 'by-book': string };
  };
}

let dbPromise: Promise<IDBPDatabase<MusicPlayerDB>> | null = null;

async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MusicPlayerDB>('music-player-db', 7, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('tracks', { keyPath: 'id' });
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('playlists')) {
            db.createObjectStore('playlists', { keyPath: 'id' });
          }
        }
        // v4: added liked field — no schema change needed, just bumped version
        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'id' });
          }
        }
        // v6-v7: almacenes de podcasts y audiolibros (funciones eliminadas; se
        // conservan los almacenes para no romper bases de datos existentes)
        if (oldVersion < 6) {
          if (!db.objectStoreNames.contains('podcasts')) {
            db.createObjectStore('podcasts', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('episodes')) {
            const epStore = db.createObjectStore('episodes', { keyPath: 'id' });
            epStore.createIndex('by-podcast', 'podcastId');
          }
        }
        if (oldVersion < 7) {
          if (!db.objectStoreNames.contains('books')) {
            db.createObjectStore('books', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('book_chapters')) {
            const chapStore = db.createObjectStore('book_chapters', { keyPath: 'id' });
            chapStore.createIndex('by-book', 'bookId');
          }
          if (!db.objectStoreNames.contains('book_bookmarks')) {
            const bmkStore = db.createObjectStore('book_bookmarks', { keyPath: 'id' });
            bmkStore.createIndex('by-book', 'bookId');
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function getTrackMetadata(id: string) {
  const db = await getDB();
  return db.get('tracks', id);
}

export async function getAllStoredTracks(): Promise<StoredTrack[]> {
  const db = await getDB();
  return db.getAll('tracks');
}

export async function saveStoredTrack(
  id: string,
  data: Partial<StoredTrack>,
) {
  const db = await getDB();
  const existing = await db.get('tracks', id);
  await db.put('tracks', {
    ...(existing ?? { id }),
    ...data,
    id,
  });
}

export async function deleteStoredTrack(id: string) {
  const db = await getDB();
  await db.delete('tracks', id);
}

export async function saveTrackMetadata(
  id: string,
  data: {
    customCover?: Blob;
    customTitle?: string;
    customArtist?: string;
    customAlbum?: string;
    customYear?: string;
    customGenre?: string;
  },
) {
  await saveStoredTrack(id, data);
}

// ----- playlists -----

export async function getAllStoredPlaylists(): Promise<StoredPlaylist[]> {
  const db = await getDB();
  return db.getAll('playlists');
}

export async function saveStoredPlaylist(p: StoredPlaylist) {
  const db = await getDB();
  await db.put('playlists', p);
}

export async function deleteStoredPlaylist(id: string) {
  const db = await getDB();
  await db.delete('playlists', id);
}

// ----- watched folders (which folders to scan for music) -----

export async function getWatchedFolders(): Promise<string[]> {
  const db = await getDB();
  const entry = await db.get('settings', 'watched-folders');
  return Array.isArray(entry?.value) ? (entry.value as string[]) : [];
}

export async function saveWatchedFolders(folders: string[]): Promise<void> {
  const db = await getDB();
  await db.put('settings', { id: 'watched-folders', value: folders });
}

export type { StoredTrack, StoredPlaylist };
