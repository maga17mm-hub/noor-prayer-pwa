# Third-party materials

The application source is MIT licensed. This does not relicense the Quran text, translations, fonts, photographs or third-party packages.

## Quran text

Arabic edition: `quran-uthmani`, downloaded from Al Quran Cloud, 2026-10-17. Original text from Tanzil: https://tanzil.net. The complete dataset is included unchanged in `public/data/arabic.json` (only the API envelope was removed and JSON whitespace compacted). 114 surahs, 6236 ayahs. Display removes the repeated basmalah prefix from the first ayah of surahs other than 1 and 9 because the basmalah is separately rendered; the stored original text is unchanged.

Tanzil Quran Text, Copyright © 2007–2026 Tanzil Project. Distributed under the Creative Commons Attribution 3.0 terms and Tanzil's requirement for verbatim Quran text: https://tanzil.net/docs/text_license. Permission is granted to copy and distribute verbatim copies; changing the Quran text is not allowed. Attribution and the Tanzil link must remain.

Russian meaning translation: Elmir Kuliev, edition `ru.kuliev`, via https://alquran.cloud/api. Copyright and attribution remain with the translator and source. The source-code MIT license does not apply to this translation.

## Mushaf pages

Batoul Apps Quran SVG, Copyright (c) 2020 Batoul Apps, MIT. Full license: `public/mushaf/LICENSE.txt`. Original SVG page layouts: https://github.com/batoulapps/quran-svg. Only external blank margins of the first two bundled pages have been trimmed through their root viewBox.

## Font

Amiri Quran, SIL Open Font License 1.1. Source: https://github.com/aliftype/amiri. License and copyright are bundled in `public/fonts/OFL.txt`.

## Liquid Glass study

Reference: iyinchao/liquid-glass-studio, MIT. Its license is included in `licenses/liquid-glass-studio.txt`. The original WebGL2 MultiPassRenderer and optical GLSL source files are vendored without changes in lib/liquid-glass-studio. UPSTREAM.json records their SHA256 hashes. The integration supplies a texture of the real DOM backing and the reference's default optical uniforms. It expands GLSL includes and masks output alpha outside the glass silhouette; optical shader equations are retained. Geometry is sized to the application's control bounds. html2canvas (MIT) produces the backing texture. The simple CSS fallback is used only when WebGL2/EXT_color_buffer_float is unavailable or transparency is explicitly reduced.

## Other

Adhan JS (Batoul Apps), web-push (web-push-libs), Lucide icons, React, Vinext, Vite and the other dependencies retain the licenses included in their packages. The vendored Sites Vite plugin license remains in `build/sites-vite-plugin.LICENSE`.

Hero image source: https://images.unsplash.com/photo-1519817650390-64a93db51149, under the Unsplash license, https://unsplash.com/license. No endorsement by Apple, Refero or data providers is implied.
