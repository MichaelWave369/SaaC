# The Magic SaaC

> **"A SaaC from the Hollers, for the Hollers."**
>
> **Software as a Contribution.** The more you put in the SaaC, the more everybody gets out.

Welcome to the Appalachian idea commons: an open-source, local-first place to keep ideas, notes, code snippets, project concepts and useful links inside pockets that can contain more pockets.

**The Magic SaaC is a working browser MVP, not yet a hosted multi-user network.** Content is stored on your device by default, never uploaded to this repo or a remote server by the app.

## What works today (v0.1)

- **Infinite-style nested pockets:** create folders within folders without an arbitrary app-level depth limit. Real storage remains finite.
- **Contributions:** five types (idea, knowledge, project, resource and snippet), with tags and descriptions.
- **Find the treasure:** search by title, body, summary or tag, and filter within any pocket subtree.
- **Nested Blob Gear v0:** contribution bodies are stored by their **SHA-256 content hash** in IndexedDB. Identical bodies share one content blob.
- **Surprise Me:** bring a random saved contribution back into view.
- **Portable SaaC:** export everything to a human-readable JSON file; import a saved vault with schema and hash verification. Import replaces the current local vault after confirmation.
- **No npm install to browse:** plain HTML/CSS/JavaScript and no runtime CDN dependencies.

## Run it

From a clone of this repository, serve the root folder with an HTTP server:

`~sh
python3 -m http.server 4173
`~

Open **http://localhost:4173** in a modern browser. On Windows you can use `python` or `py` with the same ` -m http.server 4173 ` arguments. Avoid opening the HTML directly with a `file://` URL because browser module/security restrictions may interfere.

To run the tests (Node.js 22+):

`~sh
npm test
`~

A static site host such as GitHub Pages can serve this app. To enable Pages after merging, set the repository's Pages publishing source to **Deploy from a branch → main → /(root)**. All asset paths are relative, so a project subdirectory works.

## How to use your SaaC

1. Select **Everything**, or open a nested pocket, then press **+** beside Your Pockets to create a child pocket.
2. Select any pocket and press **Toss something in the SaaC** to add a contribution.
3. Search and filter, or press **Surprise me** when you need a creative kick.
4. Regularly press **Export** to back up your vault. **Import** validates a JSON backup and **replaces** your existing browser vault after asking permission.

**Storage matters:** clearing site data, switching browser profiles or using private/incognito mode may erase access to your local vault. An export is your backup. This version does not sync devices, restore deleted browser databases or automatically publish contributions.

## Architecture and guardrails

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The storage schema is versioned. The browser enforces pocket parent references and prevents cyclic imports; imported content hashes are verified before the existing vault is touched.

We do **not** execute contributed code. Snippets are displayed as text. There are no external APIs, user accounts, autonomous AI execution or silent network uploads.

## What comes next

- **SaaC Commons protocol:** consent-driven sharing with independently hosted peers or GitHub contribution bundles.
- **PhiMemory9 adapter:** map pocket lineage and hash references into the memory-gear graph without replacing either project's native model.
- **Agent contribution proposals:** agents suggest additions through a review queue; humans choose what to publish or import.
- **Per-blob provenance and signatures:** authorship, revisions, licensing and attribution.
- **Search index, attachments, merge-aware imports and storage management** for larger collections.

Those are roadmap ideas, **not shipped capabilities**.

## Contributing

Bug reports, docs, tests and pull requests are welcome. Be kind, attribute others' work, and never include passwords, API keys or private personal information in public issues or contributions. Software in the commons should be available without extracting value from its users.

**People Above Profit. Prosperity Without Exploitation.**

MIT licensed. Copyright © 2026 Michael Hughes.
