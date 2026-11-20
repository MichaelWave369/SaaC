export const ROOT = "root";
export const KINDS = ["idea", "note", "project", "link", "snippet"];
export const SCHEMA_VERSION = 1;

export function newVault() {
  return {
    schemaVersion: SCHEMA_VERSION,
    pockets: [{ id: ROOT, parentId: null, name: "The SaaC", description: "The holler that holds all the other hollers.", createdAt: new Date().toISOString() }],
    entries: [],
    blobs: []
  };
}

export function normalizeTags(value) {
  const source = Array.isArray(value) ? value.join(",") : String(value ?? "");
  return [...new Set(source.split(",").map(tag => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
}

export async function hashText(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function descendants(vault, parentId) {
  const children = new Map();
  for (const pocket of vault.pockets) {
    const arr = children.get(pocket.parentId) ?? [];
    arr.push(pocket.id);
    children.set(pocket.parentId, arr);
  }
  const found = new Set();
  const pending = [parentId];
  while (pending.length) {
    const id = pending.pop();
    if (found.has(id)) continue;
    found.add(id);
    pending.push(...(children.get(id) ?? []));
  }
  return found;
}

export function trail(vault, pocketId) {
  const byId = new Map(vault.pockets.map(p => [p.id, p]));
  const seen = new Set();
  const result = [];
  let id = pocketId;
  while (id != null && !seen.has(id) && byId.has(id)) {
    seen.add(id);
    const pocket = byId.get(id);
    result.unshift(pocket);
    id = pocket.parentId;
  }
  return result;
}

export function searchEntries(vault, { pocketId = ROOT, query = "", kind = "all" } = {}) {
  const included = descendants(vault, pocketId);
  const bodyByHash = new Map(vault.blobs.map(blob => [blob.hash, blob.content]));
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return vault.entries.filter(entry => {
    if (!included.has(entry.pocketId) || (kind !== "all" && entry.kind !== kind)) return false;
    const haystack = [entry.title, entry.summary, entry.tags.join(" "), bodyByHash.get(entry.blobHash) ?? ""].join(" ").toLowerCase();
    return tokens.every(token => haystack.includes(token));
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}

export function validateVault(vault) {
  if (!vault || vault.schemaVersion !== SCHEMA_VERSION || !["pockets", "entries", "blobs"].every(k => Array.isArray(vault[k]))) {
    throw new Error("Not a compatible SaaC v1 export.");
  }
  if (vault.pockets.length > 10000 || vault.entries.length > 100000 || vault.blobs.length > 100000) {
    throw new Error("Export exceeds current safety limits.");
  }
  const ids = new Set();
  const byId = new Map();
  for (const p of vault.pockets) {
    if (!p || typeof p.id !== "string" || !p.id || p.id.length > 120 || typeof p.name !== "string" || !p.name.trim() || p.name.length > 120 || (p.parentId !== null && typeof p.parentId !== "string") || ids.has(p.id)) {
      throw new Error("Invalid or duplicate pocket.");
    }
    ids.add(p.id);
    byId.set(p.id, p);
  }
  if (!byId.has(ROOT) || byId.get(ROOT).parentId !== null) throw new Error("The root SaaC pocket is missing.");
  for (const p of vault.pockets) {
    const visited = new Set();
    let at = p;
    while (at.parentId !== null) {
      if (visited.has(at.id) || !byId.has(at.parentId)) throw new Error("Pocket cycle or missing parent.");
      visited.add(at.id);
      at = byId.get(at.parentId);
    }
    if (at.id !== ROOT) throw new Error("Pocket is not rooted in the SaaC.");
  }
  const hashes = new Set();
  for (const blob of vault.blobs) {
    if (!blob || typeof blob.hash !== "string" || !/^[a-f0-9]{64}$/.test(blob.hash) || typeof blob.content !== "string" || hashes.has(blob.hash)) {
      throw new Error("Invalid or duplicate content blob.");
    }
    hashes.add(blob.hash);
  }
  const entryIds = new Set();
  for (const entry of vault.entries) {
    if (!entry || typeof entry.id !== "string" || !entry.id || entry.id.length > 120 ||
      entryIds.has(entry.id) || !ids.has(entry.pocketId) ||
      typeof entry.title !== "string" || !entry.title.trim() || entry.title.length > 180 ||
      typeof entry.summary !== "string" || entry.summary.length > 2000 ||
      !KINDS.includes(entry.kind) || !hashes.has(entry.blobHash) ||
      !Array.isArray(entry.tags) || entry.tags.length > 20 ||
      entry.tags.some(t => typeof t !== "string" || t.length > 60) ||
      typeof entry.createdAt !== "string" || Number.isNaN(Date.parse(entry.createdAt))) {
      throw new Error("Invalid or duplicate contribution.");
    }
    entryIds.add(entry.id);
  }
  return true;
}
