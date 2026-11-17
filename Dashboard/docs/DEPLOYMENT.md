# Deployment and maintenance

## Build

The Dashboard is a static Vite site with no backend or runtime environment variables. From `Dashboard/`:

~~~powershell
npm ci
npm run quality:check
npm run e2e
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
~~~

Deploy the complete `dist/` directory. Preview serves the last build; rebuild after source edits. Do not open the output through `file://`.

## Vercel

`vercel.json` configures response headers. For a Vercel project rooted at this Dashboard, use these project settings:

| Setting | Value |
| --- | --- |
| Root directory | `Dashboard` |
| Framework | Vite |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node | 24.x |

Headers include a self-origin Content Security Policy, MIME sniffing protection, same-origin framing, strict referrer policy, and disabled camera/microphone/geolocation. Inline style attributes are allowed for chart and navigation rendering.

## Cache policy

The file defines browser revalidation for the root and index, one day for favicon, one year immutable for bundled assets, and one hour browser/one day CDN cache for map data. Content-hashed soil-layer and aggregate JSON files receive one year immutable caching.

Publish manifests and every referenced hashed asset together. Retain previous hash files while cached manifests may reference them. Other static hosts need equivalent policies. Vite preview applies general security headers but does not emulate Vercel path-specific cache rules.

## Troubleshooting and performance review

- If a deployed page is blank or assets return 404, verify the Vercel root/output settings, deploy the complete `dist/`, and inspect the browser console and Network panel for path/base and CSP errors.
- If an old map appears after deployment, verify the live manifest references uploaded hash files and that prior cached hash files remain available.
- Compare transfer size and request timing for representative routes and map layers. Confirm Land Use requests its manifest-selected raster and compact statistics, not the complete source overlay.
- Vite may warn when a minified JavaScript chunk exceeds its configured size threshold. Inspect the named chunk and its imports after relevant code changes; the warning itself is not a user performance measurement.
- Browser JSON cache capacity does not measure or bound decoded image, SVG, or GPU memory. Use device traces for memory and reload investigations; see [map-verification.md](map-verification.md).

## Maintenance

1. Inspect the working tree and preserve unrelated changes.
2. Read `AGENTS.md` and relevant architecture, data, and testing guides.
3. Make focused changes and add behavior tests.
4. Run `npm run quality:check` and `npm run e2e` as appropriate.
5. Generate data only when its source or transformation changed; review the outputs.
6. Review code, GIS metadata, manifests, licenses, tests, and docs together.
7. Report checks and unresolved failures accurately.

This project has no CI/CD workflow. Do not create one or modify `.github/`. Do not push, merge, or deploy as part of routine maintenance.

## Limits

- Edge viewport emulation is not physical mobile testing.
- JSON cache limits do not bound image/GPU memory.
- Land Use raster has less detail than a high-resolution vector drawing; plot statistics remain separate.
- Plot IDs depend on positional model-to-geometry alignment.
- Data stays static until generated assets are updated and deployed.
