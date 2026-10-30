# Build and deployment

[Back to README](../README.md)

## 1. Prerequisites

Install Node.js 24 and npm. From the repository root, enter `Dashboard` and install dependencies from the lockfile:

```powershell
cd Dashboard
node --version
npm ci
```

Dashboard does not need an `.env` file, API key, model cache, or Python backend. Those requirements belong to the separate application under `Web App`.

## 2. Local development

```powershell
npm run dev
```

This command runs both data aggregation steps before starting Vite. Open the URL shown in the terminal. Vite normally uses port 5173 and may select another port if it is occupied.

To use a fixed address accessible only on the local machine:

```powershell
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

You do not need to start the Web App backend to view Dashboard. The Web App at `127.0.0.1:5174` is a different application.

## 3. Checks before release

```powershell
npm test -- --run
npm run lint
npm run build
```

`npm run build` performs these steps:

1. Generate `future-series.json` from the source CSVs.
2. Generate scenario and topic JSON files.
3. Check TypeScript using `tsc -b`.
4. Package the static application into `dist/` using Vite.

Do not bypass aggregation errors just to produce a visual build. They often indicate mismatched sources or an invalid data schema.

## 4. Preview the build

```powershell
npm run preview -- --host 127.0.0.1 --port 5173 --strictPort
```

Stop the server occupying that port or choose another port. Preview serves only `dist/`; subsequent source edits do not appear until you rebuild. Do not open `dist/index.html` through `file://` as a substitute for the preview server.

If you run `npm run preview` without specifying a port, use the URL printed in the terminal, typically on port 4173.

Reload after a new build. If content remains outdated, try a cache-bypassing reload and verify the current URL and port before changing data.

## 5. Static deployment

### Vercel

Configure the project to build the Dashboard directory:

| Setting | Value |
| --- | --- |
| Root Directory | `Dashboard` when connecting from the repository root |
| Framework | Vite |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js | 24.x |

Do not use the build command or proxy configuration from `Web App/frontend`. Dashboard does not require a backend API key.

URLs use `#...`, so the server receives the same HTML path regardless of the page hash. No separate rewrite is required for each hash, such as `#economics-overview`. Deploy and verify the Dashboard project without overwriting the Web App service configuration.

`Dashboard/vercel.json` defines a self-origin Content Security Policy, MIME-sniffing protection, same-origin framing, an explicit referrer policy, and restrictions on unused camera/microphone/location features. Inline script execution is blocked; inline style attributes remain allowed for chart rendering and dynamic navigation styles. `npm run preview` applies the same security headers so the policy can be checked locally. The development server retains its normal HMR behavior.

The configuration also gives fingerprinted `/assets/` files a one-year immutable browser cache. HTML keeps the platform's revalidation behavior so new deployments can point to new asset hashes. These Vercel hosting changes take effect only after deployment; local preview does not change production settings. If adding external scripts, fonts, APIs, or partner iframe embedding, update the policy for the specific required origins and test before release.

### Other static hosts

Serve all contents of `dist/`, including `index.html`, the favicon, and the assets directory. The `base: './'` setting in `vite.config.ts` generates relative asset paths and supports hosting under a subdirectory when its base URL is configured correctly.

Do not upload only `index.html`. JavaScript and CSS filenames contain hashes that change between builds, so update the complete asset set together. HTML should be revalidated regularly; assets with content-hashed filenames can be cached longer.

## 6. Checks after deployment

Open the home page, then check at least:

- The glossary, language switching, and a search term containing Vietnamese accents.
- An overview page, an exploration branch, and a comparison page for each topic.
- Direct hash access, page reload, Back/Forward navigation, and breadcrumbs.
- Year selection on comparison charts and the associated values/units.
- The mobile menu, footer, logos, and back-to-top behavior.
- Updated CSV content in both Vietnamese and English.

Release only after the preview displays the intended data and layout. These instructions describe deployment; editing the documentation does not trigger a production deployment.

## 7. Troubleshooting

| Symptom | Checks and resolution |
| --- | --- |
| Node cannot import `.ts` files in scripts | Use Node.js 24 and rerun `npm ci` |
| Missing CSV column error | Compare headers with the aggregator; check quoting and column counts |
| The two data sources do not match | Align scenarios, conditions, and years; do not patch generated JSON to conceal the mismatch |
| Definition changes do not appear on the website | Check `src/data/indicators.csv`, rebuild, and deploy the new `dist/` |
| A menu item or link opens 404 | Check the hash and page registration using the maintenance guide |
| JavaScript/CSS fails to load or deployment shows a blank page | Check uploaded assets, directory paths, Console/Network errors, and the base setting |
| Preview does not reflect source changes | Run `npm run build` first; check the port and browser cache |
| Exchange rates do not update daily | This is current behavior; Dashboard uses separate currency sources |
| A simulation/API data-loading message appears | Check whether you opened Web App on another port instead of Dashboard |
| The font differs from the design | Check that bundled WOFF2 assets are deployed and served correctly; Georgia/serif remains the fallback |
| The local port is occupied | Choose another port or stop the specific process you started |

### Vitest EPERM errors in the Windows temporary directory

If Vitest cannot write or rename a cache file in TEMP, you can use a workspace temporary directory **for that terminal session only**:

```powershell
$dashboardTestTemp = Join-Path (Get-Location) 'node_modules\.cache\vitest-temp'
New-Item -ItemType Directory -Path $dashboardTestTemp -Force | Out-Null
$env:TEMP = $dashboardTestTemp
$env:TMP = $dashboardTestTemp
npm test -- --run --maxWorkers=2
```

Run this from `Dashboard`. Do not change system-wide TEMP/TMP variables. Use this workaround for temporary-directory permission failures, not to ignore data or interface test failures.
