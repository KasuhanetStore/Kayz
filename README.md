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
| `docs/` | Repository documentation, audits and the [WPOS master plan](docs/KASUHANET-WPOS-MASTER-PLAN.md) |

## Development governance

- GitHub Copilot must follow [repository instructions](.github/copilot-instructions.md).
- The [Development Department Charter](docs/DEVELOPMENT-DEPARTMENT-CHARTER.md) defines authorised scope, protected systems, review gates and deployment restrictions.
- Existing production systems are protected by default. A task-specific owner approval is required before changing any restricted system.

## Deployment safety

- Treat `main` as the production source branch.
- Do repository cleanup and migration work on a separate branch first.
- Preserve existing public page paths unless a redirect and SEO update are prepared.
- Do not move or rename assets until all HTML, CSS, JavaScript, metadata, sitemap and template references have been checked.
- Do not change payment functions, secrets, D1 bindings, support endpoints or Cloudflare settings as part of a file-organization task.

## Migration notes

See [Repository structure proposal](docs/REPOSITORY-STRUCTURE.md), [Migration audit](docs/REPOSITORY-MIGRATION-AUDIT.md), [Asset reference check](docs/ASSET-REFERENCE-CHECK.md), and [Legacy file and security audit](docs/LEGACY-FILE-SECURITY-AUDIT.md) for the current safe-migration scope and findings.

For website protection, maintenance priorities, module status and the ongoing implementation roadmap, use the [KasuhaNET WPOS Master Plan](docs/KASUHANET-WPOS-MASTER-PLAN.md).
