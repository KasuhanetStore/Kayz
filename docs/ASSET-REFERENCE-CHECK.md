# Asset reference check

Branch: `chore/reorganize-repository-preview`

This is a first-pass reference audit of the main English and Malay entry points, workshop, affiliate, support, sale, privacy and guide pages. It is not a proof that every asset in the repository has no other consumer.

## Confirmed root-level assets still in use

| Asset path | Known consumers / evidence | Decision |
|---|---|---|
| `/broadcast.png` | English homepage, Cash Out EN/MS and Terminal Options MS | Keep at root |
| `/BannerWebSite.png` | English and Malay homepage | Keep at root |
| `/BannerADS-VPSmyr-EN.png` | English homepage | Keep at root |
| `/BannerADS-VPSmyr-MS.png` | Malay homepage | Keep at root |
| `/Banner-RytSignUp-MS.png` | Malay homepage | Keep at root |
| `/LogoHLBrefer.png` | English and Malay homepage | Keep at root |
| `/KasuhaKZintroEN.png` | About Us EN | Keep at root |
| `/KasuhaKZintro.png` | About Us MS | Keep at root |
| `/Lcd11.png`, `/KeelatSale.png`, `/RaspberryPi5Case.png`, `/OledDisplay2.png` | Affiliate pages EN/MS | Keep at root |
| `/img/RaspberryPI58gb1.png`, `/img/ArduinoUNOR3.png`, `/img/MetatronikWire1.png`, `/img/MetatronikWire2.png` | Affiliate pages EN/MS | Keep under `img/`; page references now match actual asset paths |
| `/favicon.png`, `/favicon-16x16.png`, `/favicon-32x32.png`, `/favicon.ico` | Multiple pages and manifest | Keep existing paths; no `favicon-512x512.png` file exists |

## Existing shared directories

- `css/` and `js/` are already used by pages at root and inside `MS/`.
- `img/` contains shared logos and images used by multiple routes.
- `guides/` and `MS/panduan/` are public URL directories. Do not rename.
- `functions/api/` contains payment handlers. Do not move or rename.
- `template-text/` contains reusable template fragments. Preserve its current paths until references are fully mapped.

## Migration decision

No image or script was moved in this pass. Several root-level image URLs are confirmed live dependencies, and pages use a mixture of root-relative and relative paths. Moving them now would create unnecessary breakage risk.

Next safe candidates require a complete repository-wide reference scan, including CSS `url()`, JavaScript strings, templates, metadata, sitemap, manifest and less frequently visited pages. Keep original public URLs intact until that scan and preview verification are complete.

## Follow-up reference fixes

- Corrected the English and Malay affiliate product image references to the actual `img/` locations for Raspberry Pi, Arduino UNO and jumper-wire images. The visual assets were not moved.
- Confirmed the affiliate MS `GET WEBSITE!` link points to `/MS/Banner-WebSale-MS.html`.
- Updated active-page favicon references that declared a nonexistent `favicon-512x512.png` file to use the existing `/favicon.png` asset. The declared `sizes` value is metadata only; a correctly sized 512px asset is not present, so a dedicated 512px icon should only be added if the owner supplies or approves one.
- Fixed the two self-navigation links in `privacy-policy-EN.html` to use its canonical `.html` route.
- This remains a source-level check. Runtime HTTP responses and external analytics/backlinks have not been verified.
