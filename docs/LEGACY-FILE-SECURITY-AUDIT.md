# Legacy file and security audit

Branch: `chore/reorganize-repository-preview`

This is a review of selected legacy, duplicate and unusual files. It is not a full runtime or deployment audit. Nothing in this report authorizes deleting files from production.

## Security finding requiring owner action

- `php/send.php` contains a hard-coded Telegram bot credential. Treat it as compromised because it has been committed to a repository that may be publicly readable.
- Revoke the exposed token in BotFather and issue a replacement. Do not reuse the exposed token.
- The unused legacy files `php/send.php` and `php/reply.php` have been deleted from this preview branch after the owner confirmed the old Telegram RSA integration is no longer used.
- No page reference to these scripts was found in the selected-page checks or repository code search. This is not proof that no external client or bookmark calls them.
- Deleting the files from the latest branch does not erase their contents or the exposed credential from earlier Git commits. Revoke the old token in BotFather if it was ever valid; history cleanup or secret revocation is still required.

## Duplicate and conflicting files

| Files | Finding | Safe decision |
|---|---|---|
| `footer.js`, `img/footer.js` | Same Git blob SHA; exact duplicate content | Do not delete until all references are checked |
| `header.js`, `img/header.js` | Different implementations; root version contains older route names, image version contains a separate older header | Keep both until page-by-page script loading is mapped |
| `OculusLogo.png`, `img/OculusLogo.png` | Duplicate basename; root asset is used in absolute metadata URLs | Keep root URL stable |
| `Ads.txt`, `ads.txt`, `img/ads.txt`, `php/Ads.txt` | Similar but not identical AdSense records; root `Ads.txt` contains a malformed publisher identifier with a duplicated `pub-` prefix, while lowercase root `ads.txt` has the normal `pub-` format | Do not delete or rename until the live `/ads.txt` response and AdSense account publisher ID are confirmed |
| `index.php` | Minimal PHP placeholder, while site is deployed on Cloudflare Pages | Retain until deployment and access logs confirm it is unused |
| `index.ts` | Generic KV example using placeholder values; no direct HTML reference found in sampled pages | Retain until Cloudflare build/runtime configuration is checked |
| `composer.lock` | Empty file | No action until PHP dependency/runtime usage is established |

## Older or test-looking pages

Files such as `PageTest.html`, `TemaBaru.html`, `BuatWebSendiri.html`, `AffliateShopSupport.html`, `KasuhaNET-index-refreshed.html`, `article.html`, and `artikel.html` have older or inconsistent route references. Some may still be directly accessible or linked externally. Keep them until inbound links, sitemap status, analytics and owner intent are checked.

## Migration decision

- Do not remove duplicate-looking files solely because their names match.
- Do not rename the AdSense file variants until the live URL is checked.
- Do not move or activate legacy PHP endpoints as part of repository cleanup.
- Prioritize credential rotation and safe retirement of the unused PHP scripts, separately from cosmetic file organization.
- No production code or asset was changed by this audit.
