/**
 * 动作示范图存储。
 * 用 IndexedDB 而不是 localStorage —— 一张 gif 动辄几 MB，
 * localStorage 只有 5MB 配额，几张就爆了。
 */
const DB_NAME = 'workout-media'
const STORE = 'gifs'
const VERSION = 1

export interface GifRecord {
  id: string
  exerciseId: string
  dataUrl: string
  name: string
  createdAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' })
        os.createIndex('exerciseId', 'exerciseId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = run(t.objectStore(STORE))
        t.oncomplete = () => resolve(req.result as T)
        t.onerror = () => reject(t.error)
      }),
  )
}

export async function addGif(exerciseId: string, dataUrl: string, name: string): Promise<GifRecord> {
  const rec: GifRecord = {
    id: `${exerciseId}__${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    exerciseId,
    dataUrl,
    name,
    createdAt: Date.now(),
  }
  await tx('readwrite', (s) => s.add(rec))
  return rec
}

export async function listGifs(exerciseId: string): Promise<GifRecord[]> {
  const db = await open()
  return new Promise<GifRecord[]>((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly')
    const req = t.objectStore(STORE).index('exerciseId').getAll(exerciseId)
    req.onsuccess = () => resolve((req.result as GifRecord[]).sort((a, b) => a.createdAt - b.createdAt))
    req.onerror = () => reject(req.error)
  })
}

/** 一次取出全部图片，用于列表页批量取缩略图 */
export async function listAllGifs(): Promise<GifRecord[]> {
  const db = await open()
  return new Promise<GifRecord[]>((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly')
    const req = t.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as GifRecord[])
    req.onerror = () => reject(req.error)
  })
}

export async function removeGif(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id))
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}
