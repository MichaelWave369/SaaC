import { newVault, validateVault, hashText } from "./model.mjs";

const DB_NAME = "magic-saac-v1";
const STORE_NAMES = ["pockets", "entries", "blobs"];

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function waitForTransaction(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Storage transaction failed."));
    tx.onabort = () => reject(tx.error || new Error("Storage transaction aborted."));
  });
}

export async function openVault() {
  if (!("indexedDB" in globalThis)) throw new Error("This browser does not support IndexedDB.");
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    for (const store of STORE_NAMES) db.createObjectStore(store, { keyPath: store === "blobs" ? "hash" : "id" });
  };
  const db = await requestResult(request);
  const vault = await readVault(db);
  if (!vault.pockets.length) {
    const initial = newVault();
    await replaceVault(db, initial);
  } else {
    validateVault(vault);
  }
  return db;
}

export async function readVault(db) {
  const tx = db.transaction(STORE_NAMES, "readonly");
  const done = waitForTransaction(tx);
  const results = await Promise.all(STORE_NAMES.map(name => requestResult(tx.objectStore(name).getAll())));
  await done;
  return { schemaVersion: 1, pockets: results[0], entries: results[1], blobs: results[2] };
}

export async function savePocket(db, pocket) {
  const tx = db.transaction("pockets", "readwrite");
  const done = waitForTransaction(tx);
  tx.objectStore("pockets").add(pocket);
  await done;
}

export async function saveEntry(db, entry, blob) {
  const tx = db.transaction(["entries", "blobs"], "readwrite");
  const done = waitForTransaction(tx);
  tx.objectStore("blobs").put(blob);
  tx.objectStore("entries").add(entry);
  await done;
}

export async function replaceVault(db, vault) {
  validateVault(vault);
  const tx = db.transaction(STORE_NAMES, "readwrite");
  const done = waitForTransaction(tx);
  for (const name of STORE_NAMES) {
    const store = tx.objectStore(name);
    store.clear();
    for (const record of vault[name]) store.put(record);
  }
  await done;
}

export async function verifyBlobHashes(vault) {
  for (const blob of vault.blobs) {
    if ((await hashText(blob.content)) !== blob.hash) throw new Error("The import contains a corrupted content blob.");
  }
}
