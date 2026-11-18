# KasuhaNET repository structure proposal

This branch is a SAFE PREVIEW. It does not move or rename production files and does not change the live site.

## Current deployment constraints

- Cloudflare Pages publishes this repository as a static site.
- Existing public URLs depend on root-level HTML files and the current `MS/`, `guides/`, and `MS/panduan/` paths.
- Existing HTML, CSS, JavaScript, image, sitemap, robots, payment, and Cloudflare Function paths are treated as production dependencies until every reference has been checked.
- Therefore, route-bearing HTML files stay at their current paths in the first cleanup pass. Moving them into a `pages/` folder would change public URLs and could break navigation, SEO, payment flows, or indexed links.

## Target organization

```text
/
├── index.html                  # English homepage; keep public URL
├── index.php                   # legacy file; audit before changing
├── MS/                         # Malay public routes; keep URLs
│   ├── index.html
│   └── panduan/
├── guides/                     # English public routes; keep URLs
├── css/                        # existing stylesheets; preserve paths initially
├── js/                          # existing JavaScript; preserve paths initially
├── functions/                  # Cloudflare Pages Functions; preserve paths
├── php/                        # legacy PHP files; audit hosting/runtime use
├── img/                         # existing image assets
├── assets/                     # destination for assets after references are migrated
│   ├── images/
│   ├── banners/
│   └── logos/
├── template-text/              # reusable page/template fragments
├── docs/                       # repository and maintenance documentation
├── sitemap.xml
├── robots.txt
├── ads.txt / Ads.txt           # verify canonical filename and references first
└── _redirects                  # only if a future route migration needs redirects
```

## Safe migration sequence

1. Inventory every file and classify it as a public route, shared asset, Cloudflare function, legacy/server file, or documentation.
2. Search all HTML, CSS, JS, sitemap, manifest, and configuration files for references to each asset before moving it.
3. Move shared assets in small batches and update every reference in the same commit.
4. Keep public route paths stable. If a route must move, add and test a permanent redirect before removing the old route.
5. Check EN/MS navigation, images, CSS, JavaScript, guides, checkout/payment endpoints, support form, sitemap, robots, and ads.txt.
6. Run a Cloudflare Pages preview and verify key pages before merging anything into `main`.

## First-pass findings

- The repository currently contains root-level page files alongside images and other assets.
- There are already useful folders for `MS/`, `guides/`, `css/`, `js/`, `img/`, `functions/`, `php/`, and `template-text/`.
- Both `Ads.txt` and `ads.txt` exist at the root. Do not delete either until case-sensitivity and Google AdSense access are verified.
- Files with unusual names or legacy extensions need usage checks before removal.
- No production file has been renamed, moved, or deleted in this preview branch.
