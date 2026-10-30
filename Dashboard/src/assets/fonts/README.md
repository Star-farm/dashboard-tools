# Bundled Lora font

Lora is distributed under the [SIL Open Font License](OFL.txt). The unmodified Latin, Latin Extended, and Vietnamese WOFF2 subsets are downloaded from the official Google Fonts stylesheet for the normal-style variable weight range 400–700.

Run `npm run fonts:sync` from `Dashboard` to refresh the files and license. The command uses the Google Fonts API and the [official font repository](https://github.com/google/fonts/tree/main/ofl/lora). Normal development, builds, and visitors do not contact Google Fonts.

Commit `lora.css`, all three WOFF2 files, `OFL.txt`, and the public license copy at `public/licenses/lora-OFL.txt` together. Vite includes the public copy in the deployed site. The application preloads Latin and Vietnamese; CSS unicode ranges select remaining characters as needed.
