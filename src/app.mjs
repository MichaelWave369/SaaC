import { ROOT, KINDS, normalizeTags, hashText, descendants, trail, searchEntries } from "./model.mjs";
import { openVault, readVault, savePocket, saveEntry, replaceVault, verifyBlobHashes } from "./storage.mjs";

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
const labels = { idea: "Idea", note: "Knowledge", project: "Project", link: "Resource", snippet: "Snippet" };

let db;
let vault;
let activePocket = ROOT;
let query = "";
let kind = "all";
let selectedId = null;

function notify(message, isError = false) {
  $("status").textContent = message;
  $("status").dataset.error = String(isError);
}

function pocketName(id) {
  return vault.pockets.find(p => p.id === id)?.name ?? "Unknown pocket";
}

function pocketTree(parentId = ROOT, depth = 0) {
  return vault.pockets.filter(p => p.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name))
    .map(p => {
      const count = vault.entries.filter(e => descendants(vault, p.id).has(e.pocketId)).length;
      return '<button class="pocket-button ' + (activePocket === p.id ? "active" : "") + '" style="--depth:' + Math.min(depth + 1, 10) +
        '" data-pocket="' + escapeHtml(p.id) + '"><span class="pocket-symbol" aria-hidden="true">▧</span><span>' +
        escapeHtml(p.name) + '</span><small>' + count + '</small></button>' + pocketTree(p.id, depth + 1);
    }).join("");
}

function renderNavigation() {
  const count = vault.entries.length;
  $("pockets").innerHTML = '<button class="pocket-button ' + (activePocket === ROOT ? "active" : "") +
    '" data-pocket="root"><span class="pocket-symbol" aria-hidden="true">◈</span><span>Everything</span><small>' +
    count + '</small></button>' + pocketTree();
  $("currentPocket").textContent = pocketName(activePocket);
  $("breadcrumbs").innerHTML = trail(vault, activePocket).map((p, index) =>
    (index ? '<span class="crumb-separator" aria-hidden="true">/</span>' : "") +
    '<button data-pocket="' + escapeHtml(p.id) + '">' + escapeHtml(p.name) + '</button>').join("");
}

function renderStats() {
  $("entryCount").textContent = vault.entries.length;
  $("pocketCount").textContent = vault.pockets.length - 1;
  $("blobCount").textContent = vault.blobs.length;
}

function renderEntries() {
  const entries = searchEntries(vault, { pocketId: activePocket, query, kind });
  $("resultCount").textContent = entries.length + (entries.length === 1 ? " contribution" : " contributions");
  $("entries").innerHTML = entries.length ? entries.map(entry => {
    const date = new Date(entry.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    const tags = entry.tags.map(tag => '<span class="tag">#' + escapeHtml(tag) + '</span>').join("");
    return '<article class="entry-card"><div class="card-meta"><span class="kind">' + labels[entry.kind] +
      '</span><time datetime="' + escapeHtml(entry.createdAt) + '">' + escapeHtml(date) + '</time></div>' +
      '<h3>' + escapeHtml(entry.title) + '</h3><p>' + escapeHtml(entry.summary || "Something good is brewing in this pocket.") +
      '</p><div class="tags">' + tags + '</div><div class="card-bottom"><span>' + escapeHtml(pocketName(entry.pocketId)) +
      '</span><button class="link-button" data-view="' + escapeHtml(entry.id) + '">Open contribution →</button></div></article>';
  }).join("") : '<div class="empty-state"><div class="empty-icon" aria-hidden="true">◇</div><h3>Not a thing in this pocket. Yet.</h3>' +
    '<p>Ideas are welcome here, from a half-baked thought to a fully baked contraption.</p>' +
    '<button class="primary" id="emptyAdd">Toss something in</button></div>';
}

function renderDetail() {
  const entry = vault.entries.find(item => item.id === selectedId);
  const el = $("detail");
  if (!entry) { el.hidden = true; return; }
  const blob = vault.blobs.find(b => b.hash === entry.blobHash);
  el.hidden = false;
  $("detailType").textContent = labels[entry.kind];
  $("detailTitle").textContent = entry.title;
  $("detailSummary").textContent = entry.summary;
  $("detailPocket").textContent = pocketName(entry.pocketId);
  $("detailHash").textContent = entry.blobHash;
  $("detailTags").textContent = entry.tags.map(tag => "#" + tag).join("  ");
  $("detailBody").textContent = blob?.content ?? "[Missing content]";
}

function render() {
  renderNavigation();
  renderStats();
  renderEntries();
  renderDetail();
}

function openEntryForm() {
  $("entryForm").reset();
  $("entryPocket").textContent = pocketName(activePocket);
  $("entryDialog").showModal();
  $("entryTitle").focus();
}

function openPocketForm() {
  $("pocketForm").reset();
  $("pocketParent").textContent = pocketName(activePocket);
  $("pocketDialog").showModal();
  $("pocketName").focus();
}

function showEntry(id) {
  selectedId = id;
  renderDetail();
  $("detail").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function refresh() {
  vault = await readVault(db);
  render();
}

function downloadVault() {
  const serialized = JSON.stringify(vault, null, 2);
  const blob = new Blob([serialized], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "magic-saac-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  notify("Your SaaC has been packed into a portable JSON export.");
}

document.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.pocket) {
    activePocket = button.dataset.pocket;
    selectedId = null;
    render();
    return;
  }
  if (button.dataset.view) { showEntry(button.dataset.view); return; }
  if (button.id === "emptyAdd") openEntryForm();
});

$("newEntry").addEventListener("click", openEntryForm);
$("newPocket").addEventListener("click", openPocketForm);
$("exportVault").addEventListener("click", downloadVault);
$("closeDetail").addEventListener("click", () => { selectedId = null; renderDetail(); });
$("surprise").addEventListener("click", () => {
  if (!vault.entries.length) { notify("Give the SaaC its first contribution, then try the magic.", true); return; }
  const picked = vault.entries[Math.floor(Math.random() * vault.entries.length)];
  activePocket = ROOT;
  render();
  showEntry(picked.id);
});
$("search").addEventListener("input", event => {
  query = event.target.value;
  renderEntries();
});
$("kindFilter").addEventListener("change", event => {
  kind = event.target.value;
  renderEntries();
});

$("entryForm").addEventListener("submit", async event => {
  event.preventDefault();
  const submit = $("saveEntry");
  submit.disabled = true;
  try {
    const data = new FormData(event.currentTarget);
    const body = String(data.get("body") ?? "");
    const title = String(data.get("title") ?? "").trim();
    if (!title || !body.trim()) throw new Error("A title and some content are required.");
    const blobHash = await hashText(body);
    const entry = {
      id: crypto.randomUUID(),
      pocketId: activePocket,
      title,
      summary: String(data.get("summary") ?? "").trim(),
      kind: String(data.get("kind")),
      tags: normalizeTags(data.get("tags")),
      blobHash,
      createdAt: new Date().toISOString()
    };
    if (!KINDS.includes(entry.kind)) throw new Error("Unknown contribution type.");
    await saveEntry(db, entry, { hash: blobHash, content: body });
    await refresh();
    $("entryDialog").close();
    notify("Contribution tucked safely into the SaaC.");
  } catch (error) { notify(error.message, true); }
  finally { submit.disabled = false; }
});

$("pocketForm").addEventListener("submit", async event => {
  event.preventDefault();
  const submit = $("savePocket");
  submit.disabled = true;
  try {
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) throw new Error("Give your pocket a name.");
    const pocket = { id: crypto.randomUUID(), parentId: activePocket, name, description: String(data.get("description") ?? "").trim(), createdAt: new Date().toISOString() };
    await savePocket(db, pocket);
    activePocket = pocket.id;
    selectedId = null;
    await refresh();
    $("pocketDialog").close();
    notify("New pocket sewn into the SaaC.");
  } catch (error) { notify(error.message, true); }
  finally { submit.disabled = false; }
});

$("importVault").addEventListener("change", async event => {
  const input = event.currentTarget;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("Imports are limited to 5 MB in this version.");
    const incoming = JSON.parse(await file.text());
    // Structural validation and cryptographic content-integrity verification precede any write.
    const { validateVault } = await import("./model.mjs");
    validateVault(incoming);
    await verifyBlobHashes(incoming);
    if (!confirm("Replace this device's entire SaaC with the imported vault? Export a backup first. This cannot be undone.")) return;
    await replaceVault(db, incoming);
    activePocket = ROOT;
    selectedId = null;
    query = "";
    $("search").value = "";
    kind = "all";
    $("kindFilter").value = "all";
    await refresh();
    notify("Imported your SaaC. Every pocket made it home.");
  } catch (error) { notify("Import failed: " + error.message, true); }
  finally { input.value = ""; }
});

try {
  db = await openVault();
  await refresh();
  notify("Stored on this device. Open access, no account required.");
} catch (error) {
  notify("Could not open local storage: " + error.message, true);
  for (const id of ["newEntry", "newPocket", "exportVault", "surprise"]) $(id).disabled = true;
}
