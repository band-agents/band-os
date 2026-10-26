// What every client is asked for, and the default agreement. Staff can hide items, add their own and edit the contract per client.
// Rule for access items: we never ask for a password. We ask for an invite or a partner link, which the client can remove at any time.

export const GROUPS = [
  { id: 'access', title: 'Access', hint: 'Invites and permissions. Never send us a password.' },
  { id: 'assets', title: 'Material', hint: 'What the ads are made from.' },
  { id: 'data', title: 'Numbers', hint: 'So we know what an order or a member is worth.' },
  { id: 'decide', title: 'Decisions', hint: 'A few things only you can decide.' },
  { id: 'admin', title: 'Admin', hint: 'Agreement, payment, kick-off.' },
];

// kind: access | assets | data | decide | admin. owner: client (they act) or staff (we act, they watch).
export const CHECKLIST = [
  { id: 'bm', group: 'access', kind: 'access', required: true, title: 'Add band. as a partner in your Meta Business Manager',
    why: 'This is how we build and run ads without ever holding your login. You can remove us in one click.',
    steps: ['Open business.facebook.com and go to Business settings.', 'Users, then Partners, then Add. Choose “Give a partner access to your assets”.', 'Enter our Business ID (shown below) and tick the ad account, the Page and the pixel.', 'Press Submit here when it is sent. We accept it on our side.'],
    show: ['bandBmId'], fields: [{ id: 'bmId', label: 'Your Business Manager ID', type: 'text', ph: '16-digit number' }] },
  { id: 'adacct', group: 'access', kind: 'access', required: true, title: 'Ad account with a working payment method',
    why: 'Ad money goes from your card straight to Meta. We never hold it.',
    steps: ['In Business settings, open Accounts, then Ad accounts.', 'Check a payment method is added and the account is not restricted.', 'Share the account ID and the monthly spending limit, if one is set.'],
    fields: [{ id: 'adAccountId', label: 'Ad account ID', type: 'text' }, { id: 'limit', label: 'Spending limit (if any)', type: 'text' }] },
  { id: 'page', group: 'access', kind: 'access', required: true, title: 'Facebook Page and Instagram account',
    why: 'Ads run from your Page and your Instagram. We need permission to create ads on both.',
    steps: ['In Business settings, open Accounts, then Pages and Instagram accounts.', 'Check both are connected to the same Business Manager.', 'Give our partner access to both.'],
    fields: [{ id: 'pageName', label: 'Page name', type: 'text' }, { id: 'ig', label: 'Instagram handle', type: 'text', ph: '@handle' }] },
  { id: 'pixel', group: 'access', kind: 'access', required: true, title: 'Pixel / dataset and domain verification',
    why: 'Without this Meta cannot see what happens after the click, and ads cannot learn.',
    steps: ['Open Events Manager and check a pixel or dataset exists for your site.', 'Give our partner access to it.', 'Check your domain is verified under Brand safety, then Domains. If it is not, say who can edit your DNS.'],
    fields: [{ id: 'pixelId', label: 'Pixel / dataset ID', type: 'text' }, { id: 'dns', label: 'Who can edit your DNS?', type: 'text', ph: 'Name and email' }] },
  { id: 'site', group: 'access', kind: 'access', required: false, title: 'Website access (Shopify, WordPress or other)',
    why: 'To place tracking on the site and check the pages ads send people to.',
    steps: ['Shopify: Settings, Users, Add staff, with our email and no access to payments or customers.', 'Other platforms: add us as a collaborator the same way.', 'No website? Mark this as not applicable.'],
    fields: [{ id: 'platform', label: 'Platform', type: 'text', ph: 'Shopify, WordPress, none…' }] },
  { id: 'dev', group: 'access', kind: 'access', required: false, title: 'Your app or booking-system developer',
    why: 'Bookings and purchases have to reach Meta from your backend. We brief your developer directly.',
    steps: ['Tell us who built your app or booking system.', 'We send them exactly what to send to Meta. If they charge for the extra work, that is between you and them.'],
    fields: [{ id: 'devName', label: 'Developer or company', type: 'text' }, { id: 'devEmail', label: 'Email', type: 'email' }] },
  { id: 'wa', group: 'access', kind: 'access', required: false, title: 'WhatsApp Business number',
    why: 'If ads open a WhatsApp chat, the number must be a WhatsApp Business number connected to your Meta account.',
    steps: ['Give us the number that will take the chats.', 'Check it is connected in Business settings, under Accounts, WhatsApp accounts.'],
    fields: [{ id: 'waNumber', label: 'WhatsApp Business number', type: 'text' }] },
  { id: 'delivery', group: 'access', kind: 'access', required: false, title: 'Delivery platform (Toters or similar)',
    why: 'We need to see which ad led to which order. Codes per ad, and a way to see redemptions.',
    steps: ['Tell us how to see code redemptions: a vendor portal view, or a weekly export.', 'Send the store link.'],
    fields: [{ id: 'storeLink', label: 'Store link', type: 'url' }, { id: 'redemptions', label: 'How can we see redemptions?', type: 'text' }] },
  { id: 'ga', group: 'access', kind: 'access', required: false, title: 'Google Analytics (viewer)',
    why: 'A second source for site traffic, to cross-check Meta.',
    steps: ['Admin, Property access management, add our email as Viewer.'], fields: [] },

  { id: 'brand', group: 'assets', kind: 'assets', required: true, title: 'Logos and brand guidelines',
    why: 'So every ad looks like you.', steps: ['Share a folder link (Drive, Dropbox, anything) that anyone with the link can open.'],
    fields: [{ id: 'folder', label: 'Folder link', type: 'url' }] },
  { id: 'creative', group: 'assets', kind: 'assets', required: true, title: 'Photos and videos for the ads',
    why: 'We run the ads. We do not produce the photos or videos, so the ads can only be as good as what you send.',
    steps: ['Send the best, most recent photos and videos you own.', 'Vertical video (9:16) works best for Reels and Stories.', 'Confirm you own the rights, including any people in them.'],
    fields: [{ id: 'folder', label: 'Folder link', type: 'url' }, { id: 'rights', label: 'I own or have the rights to this material', type: 'check' }] },
  { id: 'offers', group: 'assets', kind: 'assets', required: true, title: 'The offers we can advertise',
    why: 'Ads need something concrete: a first class, a first-order discount, a bundle.',
    steps: ['Write each offer, its price, and its dates.', 'Say how someone redeems it.'],
    fields: [{ id: 'offerText', label: 'Offers', type: 'area' }] },
  { id: 'history', group: 'assets', kind: 'assets', required: false, title: 'Past ad results',
    why: 'To avoid repeating what already failed.', steps: ['Export from Ads Manager (CSV) or send screenshots. Link or note below.'],
    fields: [{ id: 'history', label: 'Link or note', type: 'text' }] },

  { id: 'margin', group: 'data', kind: 'data', required: true, title: 'What one sale is worth',
    why: 'This sets the most we can spend to win one order or one member, and we stay under it.',
    steps: ['Margin per order, or per membership, after costs.', 'Any delivery-platform commission.'],
    fields: [{ id: 'margin', label: 'Margin / profit per sale', type: 'text' }, { id: 'commission', label: 'Platform commission', type: 'text' }, { id: 'aov', label: 'Average order or member value', type: 'text' }] },
  { id: 'capacity', group: 'data', kind: 'data', required: false, title: 'Class or table capacity and attendance',
    why: 'To send ad money only to the slots that are empty.', steps: ['An export from your booking system: each class or slot, its capacity, and how full it was.'],
    fields: [{ id: 'link', label: 'Link to the export', type: 'url' }] },
  { id: 'list', group: 'data', kind: 'data', required: false, title: 'Customer or member list (for lookalikes)',
    why: 'We use it to find similar people, and to leave current customers out of acquisition ads. Emails and phones are hashed before they reach Meta.',
    steps: ['Share a link to the list. Do not paste it here.', 'Confirm your customers agreed to be contacted.'],
    fields: [{ id: 'link', label: 'Link', type: 'url' }, { id: 'consent', label: 'My customers agreed to be contacted', type: 'check' }] },
  { id: 'active', group: 'data', kind: 'data', required: true, title: 'What counts as an “active” customer',
    why: 'Retention cannot be measured until “active” means something exact.', steps: ['For example: booked at least one class in the last 30 days.'],
    fields: [{ id: 'def', label: 'Your definition', type: 'area' }] },

  { id: 'budget', group: 'decide', kind: 'decide', required: true, title: 'Monthly ad budget, per brand',
    why: 'The ad money you load onto your own Meta account. You can change it any month.', steps: ['One number per brand.'],
    fields: [{ id: 'budget', label: 'Budget per brand per month', type: 'area', ph: 'Brand A: $…\nBrand B: $…' }] },
  { id: 'areas', group: 'decide', kind: 'decide', required: true, title: 'Where to advertise',
    why: 'Cities, neighbourhoods, or radius around each location.', steps: ['List the areas, and any area to avoid.'],
    fields: [{ id: 'areas', label: 'Areas', type: 'area' }] },
  { id: 'approver', group: 'decide', kind: 'decide', required: true, title: 'Who approves ads, and how fast',
    why: 'Slow approvals are the most common reason ads stall.', steps: ['One name, one way to reach them, a reply time.'],
    fields: [{ id: 'who', label: 'Approver', type: 'text' }, { id: 'sla', label: 'Usual reply time', type: 'text', ph: 'Same day / 24h' }] },

  { id: 'sign', group: 'admin', kind: 'admin', required: true, auto: 'contract', title: 'Sign the agreement', why: 'Read it, sign it, download your copy.', steps: [], fields: [] },
  { id: 'pay', group: 'admin', kind: 'admin', required: true, owner: 'staff', title: 'First month paid', why: 'Month one is paid before work starts. We mark this when the payment arrives.', steps: [], fields: [] },
  { id: 'kick', group: 'admin', kind: 'admin', required: true, owner: 'staff', title: 'Kick-off call', why: 'One call with you and your developer: margins, class numbers, the first offer.', steps: [], fields: [] },
];

export const FORMS = [
  { id: 'company', title: 'Your company', hint: 'For the agreement and your invoices.', fields: [
    { id: 'legal', label: 'Legal company name', type: 'text', req: true },
    { id: 'taxid', label: 'Tax or registration number', type: 'text' },
    { id: 'address', label: 'Billing address', type: 'area', req: true },
    { id: 'invoiceEmail', label: 'Invoices go to', type: 'email', req: true },
    { id: 'currency', label: 'You prefer to pay in', type: 'select', opts: ['USD', 'EGP', 'EUR', 'KWD', 'Other'] },
  ] },
  { id: 'people', title: 'Your people', hint: 'Who we talk to about what.', fields: [
    { id: 'owner', label: 'Decision maker', type: 'text', req: true },
    { id: 'ownerEmail', label: 'Their email', type: 'email', req: true },
    { id: 'ops', label: 'Day-to-day contact', type: 'text' },
    { id: 'opsPhone', label: 'Their WhatsApp number', type: 'text' },
    { id: 'urgent', label: 'Who to call if an ad goes wrong', type: 'text' },
    { id: 'hours', label: 'Best hours to reach you', type: 'text', ph: 'Mon–Fri, 10:00–18:00' },
  ] },
  { id: 'business', title: 'The business', hint: 'Fill one for each brand. Short answers are fine.', perBrand: true, fields: [
    { id: 'what', label: 'What you sell, in two lines', type: 'area', req: true },
    { id: 'who', label: 'Who buys it today', type: 'area' },
    { id: 'goal', label: 'The one result you want in 12 weeks', type: 'select', opts: ['More orders', 'More bookings', 'More memberships', 'More walk-ins', 'A waitlist for a new location', 'Other'], req: true },
    { id: 'goalNote', label: 'In your words', type: 'area' },
    { id: 'locations', label: 'Locations and opening hours', type: 'area' },
    { id: 'competitors', label: 'Three competitors you watch', type: 'area', ph: 'Name or link, one per line' },
    { id: 'tone', label: 'How the brand talks', type: 'area' },
    { id: 'never', label: 'Never say or show', type: 'area' },
    { id: 'seasons', label: 'Busy and slow periods', type: 'area' },
  ] },
];

export const TIMELINE = [
  { id: 't1', weeks: '1–2', title: 'Set up', body: 'We get into your Meta account and connect the app and website, so Meta can see bookings and orders.' },
  { id: 't2', weeks: '3–6', title: 'Run the ads', body: 'Ads go live. We change one thing at a time and check the numbers every few days. First monthly call at the end of week 4.' },
  { id: 't3', weeks: '7–12', title: 'Put more behind what works', body: 'Money moves to the ads that bring results. In week 12 we go through everything with you and you decide: carry on, change something, or stop.' },
];

export const DEFAULT_SETTINGS = {
  studio: 'band.', studioEmail: 'band.digi.tech@gmail.com', bandBmId: '', governingLaw: 'the Arab Republic of Egypt',
  contractTitle: 'Media buying agreement',
};

export const CONTRACT = `# Media buying agreement

This agreement is between **{{studio}}**, a studio in Cairo ("the Studio"), and **{{client}}** ("the Client"), for the brands {{brands}}. It starts on {{start}}.

## 1. What the Studio does
Media buying, and only that. In detail:
- checks and sets up the Client's Meta ad account;
- tells the Client's developer exactly what data to send to Meta, so that bookings and orders are visible to the ads;
- builds, launches and manages the ad campaigns for {{brands}};
- chooses audiences, sets and moves budgets, and checks results every few days;
- gives the Client a live dashboard and a monthly call for each account.

## 2. What is not included
Photos, videos and posts. Running the Client's Instagram or answering comments and messages. Answering WhatsApp chats or taking bookings. Building forms, pages, apps or websites. Design and branding. If the Client asks for any of these later, the Studio quotes them separately and in writing.

## 3. Fees and ad spend
The fee is **{{fee}} {{currency}} per month** for {{accounts}}, billed monthly in advance. The first month is paid before work starts, and later months on the 1st. VAT is added where it applies.

Ad spend is separate. The Client pays it straight to Meta from the Client's own ad account. The Studio never holds the Client's ad money. If the Client wants to spend more than 3,000 USD a month on ads, the Studio and the Client agree the fee for that before the spend goes up.

## 4. Term
A three-month pilot from the start date, then month to month. Either side can end it with 30 days' written notice. In week 12 the Studio reviews the results with the Client, and the Client decides whether to carry on, change something or stop.

## 5. What the Client provides
- Access through partner invites and permissions, never a password. The Client can remove that access at any time.
- Photos, videos and text for the ads, and the right to use them.
- Accurate numbers: what a sale is worth, class or table capacity, and customer lists where agreed.
- Approvals within the time the Client states on the portal.
- The Client is responsible for the offers it advertises and for what happens after someone replies or books.

## 6. Accounts and data
The ad account, Page, pixel and audiences stay the Client's property. The Studio uses its access only to provide this service and gives it up when the agreement ends. Customer lists are used only to build audiences, are hashed before they reach Meta, and are not shared with anyone else.

## 7. No guaranteed results
Results depend on the market, the budget, the offer, the material and how the Client handles the people who respond. The Studio does not promise any number of sales, bookings or any return on ad spend. It does promise to show the real numbers every month and say what it would change.

## 8. Confidentiality
Each side keeps the other's non-public information confidential during the agreement and for two years after it.

## 9. Ownership
The Client owns its own material and its accounts. The Studio keeps its own methods, tools and dashboards. Reports made for the Client are the Client's to keep and use.

## 10. Liability
The Studio's total liability under this agreement is limited to the fees the Client paid in the three months before the claim. Neither side is liable for indirect or consequential loss.

## 11. Ending early
Either side can end the agreement at once if the other breaks it and does not fix it within 14 days of written notice. Fees for work already done stay due.

## 12. Law
This agreement is governed by {{law}}.

## 13. Signing electronically
Both sides agree that a typed name together with a drawn signature, recorded with the date, time and a fingerprint of this text, is a valid signature of this agreement.`;
