# KasuhaNET Store (Kayz)

Repository source for the KasuhaNET website deployed through Cloudflare Pages.

## Project map

| Path | Purpose |
|---|---|
| `index.html`, root-level `*.html` | English pages and existing public routes |
| `MS/` | Malay pages and their existing public routes |
| `guides/`, `MS/panduan/` | English and Malay technical guides |
| `css/` | Shared stylesheets |
| `js/` | Shared browser-side JavaScript |
| `img/` | Shared image assets |
| `functions/api/` | Cloudflare Pages Functions, including checkout and payment callbacks |
| `php/` | Remaining legacy files, pending review |
| `template-text/` | Reusable page, footer and partner-credit templates |
| `docs/` | Repository, governance and maintenance documentation |

## Governance and change safety

Read [KasuhaNET Core Governance and Operating Charter](docs/KASUHANET-CORE-GOVERNANCE.md) before making material changes. It defines protected project elements, configurable behaviour, approval boundaries, the required change workflow, API contracts, and backup/recovery expectations.

## Deployment safety

- Treat `main` as the production source branch.
- Do repository cleanup and migration work on a separate branch first.
- Preserve existing public page paths unless a redirect and SEO update are prepared.
- Do not move or rename assets until all HTML, CSS, JavaScript, metadata, sitemap and template references have been checked.
- Do not change payment functions, secrets, D1 bindings, support endpoints or Cloudflare settings as part of a file-organization task.

## Migration notes

See [Repository structure proposal](docs/REPOSITORY-STRUCTURE.md), [Migration audit](docs/REPOSITORY-MIGRATION-AUDIT.md), [Asset reference check](docs/ASSET-REFERENCE-CHECK.md), and [Legacy file and security audit](docs/LEGACY-FILE-SECURITY-AUDIT.md) for the current safe-migration scope and findings.
