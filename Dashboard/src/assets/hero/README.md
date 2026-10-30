# Responsive home illustration

These WebP files are generated from `../mekong-landscape.jpg` by `npm run images:optimize`. Commit regenerated files after changing the source JPEG. Normal builds use committed variants without re-encoding images.

Desktop variants retain the full illustration. Mobile variants use a centered square: the existing mobile hero is taller than it is wide, so CSS `object-fit: cover` retains the centered composition while avoiding delivery of invisible left and right edges. The `<picture>` element chooses the mobile source at widths up to 600 px; `srcSet` selects a resolution.
