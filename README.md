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
| `php/` | Legacy PHP files retained for reference/compatibility checks |
| `template-text/` | Reusable page, footer and partner-credit templates |
| `docs/` | Repository and migration documentation |

## Deployment safety

- Treat `main` as the production source branch.
- Do repository cleanup and migration work on a separate branch first.
- Preserve existing public page paths unless a redirect and SEO update are prepared.
- Do not move or rename assets until all HTML, CSS, JavaScript, metadata, sitemap and template references have been checked.
- Do not change payment functions, secrets, D1 bindings, support endpoints or Cloudflare settings as part of a file-organization task.

## Migration notes

See [Repository structure proposal](docs/REPOSITORY-STRUCTURE.md) and [Migration audit](docs/REPOSITORY-MIGRATION-AUDIT.md) for the current safe-migration scope and findings.
