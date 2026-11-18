# KasuhaNET repository structure proposal

This document describes the current repository layout and a cautious target organization. The first-pass cleanup has already been merged into the production source branch `main`.

## Current deployment constraints

- Cloudflare Pages publishes this repository as a static site.
- Existing public URLs depend on root-level HTML files and the current `MS/`, `guides/` and `MS/panduan/` paths.
- Existing HTML, CSS, JavaScript, image, sitemap, robots, payment and Cloudflare Function paths are production dependencies until every reference has been checked.
- Route-bearing HTML files must stay at their current paths unless permanent redirects and SEO updates are prepared and tested.
- Payment handlers under `functions/api/` must not be moved or edited during general file organization.

## Current high-level structure

```text
/
├── index.html                  # English homepage; public URL
├── MS/                         # Malay public routes; keep URLs
│   ├── index.html
│   └── panduan/
├── guides/                     # English public routes; keep URLs
├── css/                        # shared stylesheets
├── js/                         # shared browser-side JavaScript
├── functions/api/              # Cloudflare Pages Functions
├── php/                        # remaining legacy files, pending review
├── img/                        # shared image assets
├── template-text/              # reusable page/template fragments
├── docs/                       # repository and maintenance documentation
├── ads.txt                     # canonical root AdSense record
├── robots.txt
└── sitemap.xml
```

## Safe future organization

1. Inventory every file and classify it as a public route, shared asset, Cloudflare function, legacy/server file or documentation.
2. Search HTML, CSS, JavaScript, templates, metadata, sitemap, manifest and configuration before moving any asset.
3. Move only small groups of confirmed internal-only assets. Update all references in the same commit.
4. Keep public route paths stable. If a route must move, add and test a permanent redirect before removing the old route.
5. Preserve the root-level public assets whose URLs are already in use.
6. Test EN/MS navigation, styles, images, JavaScript, guides, checkout/payment endpoints, support form, sitemap, robots and ads.txt on a Cloudflare Pages preview.
7. Merge only after preview checks pass.

## Current first-pass findings

- Public route paths have not been reorganized.
- Existing folders for `MS/`, `guides/`, `css/`, `js/`, `img/`, `functions/`, `php/` and `template-text/` are retained.
- Root `ads.txt` is the canonical record. The malformed uppercase root `Ads.txt` was removed. Nested `img/ads.txt` and `php/Ads.txt` remain pending URL-use verification.
- Legacy or unusual files are retained unless there is clear evidence they are unused and no public URL or external consumer depends on them.
