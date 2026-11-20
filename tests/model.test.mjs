import test from "node:test";
import assert from "node:assert/strict";
import { ROOT, newVault, normalizeTags, hashText, descendants, trail, searchEntries, validateVault } from "../src/model.mjs";
import { verifyBlobHashes } from "../src/storage.mjs";

const seed = async () => {
  const v = newVault();
  v.pockets.push(
    { id: "music", parentId: ROOT, name: "Music", createdAt: new Date().toISOString() },
    { id: "loops", parentId: "music", name: "Loops", createdAt: new Date().toISOString() },
    { id: "code", parentId: ROOT, name: "Code", createdAt: new Date().toISOString() }
  );
  const content = "A bassline from the Appalachian holler";
  const hash = await hashText(content);
  v.blobs.push({ hash, content });
  v.entries.push({
    id: "item-1", pocketId: "loops", title: "Washboard Bass",
    summary: "A funky music idea", kind: "idea", tags: ["music", "funk"],
    blobHash: hash, createdAt: "2026-11-20T17:00:00.000Z"
  });
  return v;
};

test("fresh SaaC contains one root pocket", () => {
  const v = newVault();
  assert.equal(v.pockets.length, 1);
  assert.equal(v.entries.length, 0);
  assert.equal(validateVault(v), true);
});

test("pockets nest and trails walk to the root", async () => {
  const v = await seed();
  assert.deepEqual([...descendants(v, "music")].sort(), ["loops", "music"]);
  assert.deepEqual(trail(v, "loops").map(x => x.id), ["root", "music", "loops"]);
  assert.equal(searchEntries(v, { pocketId: "music" }).length, 1);
  assert.equal(searchEntries(v, { pocketId: "code" }).length, 0);
});

test("search matches title, tags and original blob text", async () => {
  const v = await seed();
  for (const q of ["washboard", "funk", "bassline", "music idea"]) {
    assert.equal(searchEntries(v, { query: q }).length, 1, q);
  }
  assert.equal(searchEntries(v, { query: "banjo" }).length, 0);
  assert.equal(searchEntries(v, { kind: "snippet" }).length, 0);
});

test("tags normalize, trim and deduplicate", () => {
  assert.deepEqual(normalizeTags(" Funk, music ,funk,  DIY "), ["funk", "music", "diy"]);
});

test("identical content yields the same SHA-256 blob ID", async () => {
  assert.equal(await hashText("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  const v = await seed();
  assert.equal(await verifyBlobHashes(v), undefined);
});

test("corrupt blob content is refused by integrity verification", async () => {
  const v = await seed();
  v.blobs[0].content += "!";
  await assert.rejects(verifyBlobHashes(v), /corrupted/);
});

test("import validates references and prevents duplicate IDs", async () => {
  const v = await seed();
  assert.equal(validateVault(v), true);
  v.entries[0].blobHash = "0".repeat(64);
  assert.throws(() => validateVault(v), /Invalid or duplicate contribution/);
  v.entries[0].blobHash = v.blobs[0].hash;
  v.pockets.push({ ...v.pockets[1] });
  assert.throws(() => validateVault(v), /Invalid or duplicate pocket/);
});

test("import detects cycles and orphan pockets", async () => {
  const v = await seed();
  v.pockets.find(p => p.id === "music").parentId = "loops";
  assert.throws(() => validateVault(v), /cycle/);
  v.pockets.find(p => p.id === "music").parentId = "missing";
  assert.throws(() => validateVault(v), /missing parent/);
});

test("invalid schemas are refused", () => {
  const v = newVault();
  v.schemaVersion = 9;
  assert.throws(() => validateVault(v), /compatible/);
});
