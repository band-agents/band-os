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

Email: band.digi.tech@gmail.com · Instagram: [@band.cairo](https://www.instagram.com/band.cairo/)

## Portal (client and staff login)

`/portal/` is a private area on the same site. Clients sign in with their email and an access code a staff member makes for them. Staff sign in with one shared code.

- **Clients:** a checklist of what we need to start (access by invite, never a password), forms, the agreement with a typed and drawn e-signature and a PDF download, ads and results, invoices, links, support tickets, booking a call, and messages.
- **Staff:** overview, one workspace per client, verify each item, edit and send the agreement, countersign, enter results and ads, invoices, a support inbox, booked calls, a PDF of each client's data, activity, settings.

**Tickets and calls.** A client opens a ticket (one topic, its own thread); staff answer it from the Support inbox. A client books a call from the free hours set in Settings (Cairo time by default). Email goes through the studio Gmail: new tickets, client replies and bookings reach the studio inbox (a booking comes as a calendar invite plus an "Add to Google Calendar" link), and clients get an email when staff answer or a call is booked or cancelled. Without the Gmail settings below, everything still works in the portal and the emails are only written to the server log.

Code: `portal/` (front end, plain ES modules), `api/index.js` (one serverless function), `server/` (routes, auth, storage, `mail.js` for Gmail and calendar invites, `slots.js` for free call times, the default checklist and agreement in `seed.js`).

Run it on your machine: copy `.env.example` to `.env.local`, set `STAFF_CODE` and `SESSION_SECRET`, then `node dev.mjs` and open http://localhost:3000/portal/. Data is kept in `.data/store.json`.

Deploy on Vercel: import this repo, set `STAFF_CODE` and `SESSION_SECRET` under Environment Variables, and add Upstash Redis from the Marketplace (it sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`). Without Redis the API answers 503 on purpose.

Email: turn on 2-Step Verification for the studio Gmail, create an app password at https://myaccount.google.com/apppasswords, and set `GMAIL_USER` (the Gmail address) and `GMAIL_APP_PASSWORD` in Vercel, then redeploy. Settings in the staff portal has a "Send a test email" button.

The agreement text in `server/seed.js` is a draft. Have a lawyer read it before the first client signs.
