# band. OS

The work of band., a studio in Cairo, shown on the studio's own desktop.

**Live:** https://band-agents.github.io/band-os/

- **Boot.** The barcode logo rises bar by bar and the wordmark writes itself.
- **The crew.** Alerta, Mamdouh and Alaa stand in the bottom-right corner, on phones too. They take turns saying what they do. They react to what you open, and clicking one opens their profile and their work.
- **Work.** One big Finder: Stores, Websites, Apps, Brands, Social design, Software, Media and Lab. Click a folder and its files list under it in the sidebar; click a project and it opens right there, with a path (Work › Stores › Cole Haan), Back, Previous and Next (or ← →), and **Pop out ↗** to open it in its own window. Filter by person, search, or switch between icons and a list.
- **Projects.** Each has a hero, key facts, the story, and numbered features with real screens you can scroll (full pages, desktop and phone). There are Screens and Numbers tabs, links to live sites and previews, and Previous and Next.
- **Social design.** Eight Instagram feeds shown as a real profile: avatar, highlight covers, then the grid. Click a post to see it big with its caption; carousels flip slide by slide.
- **Quick Look.** Any screen or post opens in a big viewer with arrows, a filmstrip and the full caption.
- **Gallery.** Every screen from every project, with a viewer you can flip through using ← →.
- **Results.** Real figures only, drawn as bars in the logo's own proportions.
- **Services, Readme, Start a build** (email or Instagram DM), **Terminal** (`help`, `ls`, `open volcom`, `ship`…), and a Trash with one file in it.
- **bqnd, the assistant.** Open it with `⌘K` / `Ctrl+K`, `/`, or the dock. It answers from band.'s real work and numbers, and opens the right windows.
- Windows drag, resize, minimise to the dock and zoom. Big windows open almost full-screen; the crew stands behind them. Double-click a title bar to zoom. Icons can be moved. Right-click the desktop for wallpapers.
- Deep links: `#volcom`, `#labesny`, `#alaa`, `#results`…

It is a static site with no build step. `index.html` loads `css/os.css`, `js/social.js` (the Instagram sets), `js/data.js` (every fact and image), `js/core.js` (the logo, the animated barcode, the assistant) and `js/os.js` (the desktop and the apps). Images are in `img/`. They are made by the scripts in the studio's `brand/_src`: `shoot-os-work.mjs` and `shoot-os-directions.mjs` (live stores and website shots), `prep-os-work.mjs` (resizes them) and `prep-os-social.mjs` (the Instagram sets → `img/social` and `js/social.js` input).

Portfolio: https://band-agents.github.io/band/ · Instagram: [@band.cairo](https://www.instagram.com/band.cairo/)
