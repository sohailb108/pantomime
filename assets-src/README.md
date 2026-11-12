`icon.svg` is the source of the app icons in `public/icons/` and `public/favicon.ico`. Re-export with Inkscape (`inkscape icon.svg -w 512 -h 512 -o icon-512x512.png`) and ImageMagick for the smaller sizes.

`icon-transparent.svg` has no background square and is the source of the regular `icon-*.png` and `favicon-*` files. `icon.svg` (opaque) is still the source of the maskable and Apple icons, since Android and iOS fill transparent areas themselves.
