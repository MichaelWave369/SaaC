# Nested Blob Gear v0: architecture

The Magic SaaC starts as a local-first browser application. The storage model deliberately separates **where an idea lives** from **the bytes that make up the idea**.

## Data model

`~text
pockets: { id, parentId, name, description?, createdAt }
entries: { id, pocketId, title, summary, kind, tags[], blobHash, createdAt }
blobs:   { hash, content }
`~

Every vault has a root pocket with the fixed ID `root` and a `schemaVersion` of `1`. A pocket has exactly one parent. A nested tree can be extended indefinitely in principle, bounded by browser storage, runtime and data size in practice. Cycles and missing parents are invalid.

Entries live in one pocket and point to a blob by SHA-256 of UTF-8 text. If two entries contain the same body text, they point at the same hash and share a stored blob. This is **content-addressing and deduplication**, not compression, encryption, distributed storage or unlimited capacity.

Browser persistence is IndexedDB in three object stores; entries and blobs are written together in one atomic transaction. The frontend currently reads the complete vault to search it, so very large archives will eventually require a dedicated index.

## Import and export

Export creates a JSON document containing the complete vault. Import:

1. Limits file size to 5 MiB.
2. Parses the JSON and requires supported schema v1.
3. Checks object references, unique identifiers, supported contribution types, pocket ancestry and absence of cycles.
4. Recomputes SHA-256 for every blob to detect corruption.
5. Shows a destructive **replace all local data** confirmation.
6. Clears and rewrites the three IndexedDB stores in one transaction.

The import check detects tampering and accidental corruption, but **does not authenticate who authored a file**. Signing and provenance will come later. Exported files may contain private data and should be shared with care.

## Trust boundaries

All user-supplied text is escaped when interpolated into HTML or inserted with `textContent`. Contributions are not run as scripts. No content is sent to an AI or remote server. Site assets can be hosted on any static server; hosted static assets are distinct from stored user content.

The GitHub repository is the public source code. The browser vault is **not** a public GitHub repository or multi-user commons yet.

## Future integration contracts (not implemented)

- `PocketAdapter`: map parent/child pockets to external graphs while preserving local IDs.
- `ContributionEnvelope`: portable versioned signed metadata, content license and provenance.
- `ReviewQueue`: accept proposed additions or changes with explicit human approval.
- `PhiMemory9Bridge`: attach blob hashes and pocket references to memory gears without coupling storage.
- `FederationSync`: exchange changes across consenting peers, with conflicts and revocation handled explicitly.

The architecture should make community contribution possible without making participation, central hosting or paid subscriptions mandatory.
