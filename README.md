# band. OS

The work of band., a studio in Cairo: every project, sorted by category.

**Live:** https://band-agents.github.io/band-os/

- **Overview.** What band. does, the numbers, the eight categories, selected work, results and clients.
- **Categories.** Stores & websites, Apps, Software, Brands, Social, Media and Lab. On a computer they run down the side of one window; on a phone they're chips across the top.
- **Projects.** One page each: the headline, a hero, key numbers, the story next to the facts, then numbered features with real screens. Desktop screens sit in a browser frame and phone screens in a phone; full pages scroll inside them. Related work, then Previous / Next within the category.
- **Social.** Eight Instagram feeds shown as a real profile: avatar, highlights, then the grid. Carousels flip slide by slide.
- **Viewer.** Any screen, slide or post opens full screen, with arrows (← →), a filmstrip, and swipe on phones.
- **Studio.** Services (with the work behind each), Results (real figures, drawn to scale), Clients and Contact (a short brief that opens your email app, a DM to @band.cairo, and the studio on the map).
- **The desk.** A real Mac desktop on computers: category folders on the right (one click opens the window on that folder, zooming out of the icon), a Dock (band., Search, Services, Results, Clients, Contact) that magnifies under the pointer, and a window with working traffic lights (close, minimise to the Dock, zoom), drag by the toolbar, resize from the corner, double-click to zoom. Behind it plays *Signal Garden*, a 16-second seamless Remotion loop: a moonlit meadow with topographic hills, data running along the contour lines, fireflies that link up like a network, and the logo's eleven bars standing in the grass as reeds. Source: `band-os-motion/` next to this repo (`npm run render` writes `img/bg/garden*`). Reduced motion and data saver get a still.
- **Search and bqnd.** `⌘K` / `Ctrl+K`, `/`, or the Search button: jump to any project or category, or ask bqnd, which answers from band.'s real work and opens the right page.
- **Phones.** Full screen, with tabs at the bottom: Work, Services, Results, Contact, Search.
- Deep links: `#stores`, `#odds`, `#volcom`, `#labesny`, `#results`, `#contact`…

It is a static site with no build step. `index.html` loads `css/os.css`, `js/social.js` (the Instagram sets), `js/data.js` (every fact and image, and the categories), `js/core.js` (the logo, the animated barcode, the assistant) and `js/os.js` (the app). Images are in `img/`. They are made by the scripts in the studio's `brand/_src`: `shoot-os-work.mjs` and `shoot-os-directions.mjs` (live stores and website shots), `prep-os-work.mjs` (resizes them) and `prep-os-social.mjs` (the Instagram sets → `img/social` and `js/social.js` input).

Portfolio: https://band-agents.github.io/band/ · Instagram: [@band.cairo](https://www.instagram.com/band.cairo/)
