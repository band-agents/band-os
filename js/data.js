/* band. OS — everything the desktop knows. Only real facts: from the builds, the portfolio and band.'s posts.
   Images: kind p = phone screen, d = desktop screen, f = photo, g = page from a deck. */
const OS = (() => {
  const im = (src, cap, k) => ({ src: 'img/' + src + '.jpg', cap, k });

  const PEOPLE = {
    alerta: {
      id: 'alerta', name: 'Alerta', role: 'Art Director', img: 'img/team/alerta.webp', head: 'img/team/alerta-head.webp',
      lead: 'Brand, identity and every visual decision in between.',
      quotes: ['I find the visual language a brand is hiding.', 'Typeface, whitespace, the exact warmth of a colour.', 'Sloth, Handler, end., Guess What. Ask me.', 'Click me. I’ll show you the decks.'],
      bio: ['Every brand has a visual language waiting to be uncovered: in the tension between a typeface and whitespace, in the exact warmth of a colour that makes a brand feel lived-in rather than manufactured.',
        'From Handler’s industrial honesty to end.’s quiet sophistication, Sloth’s soft-spoken world and Guess What’s editorial energy.'],
      tags: ['Art Direction', 'Visual Identity', 'Brand Systems', 'Typography', 'Packaging'],
      work: ['sloth', 'handler', 'end', 'guesswhat'], service: 'brand',
    },
    mamdouh: {
      id: 'mamdouh', name: 'Mamdouh', role: 'Head of Development', img: 'img/team/mamdouh.webp', head: 'img/team/mamdouh-head.webp',
      lead: 'Stores, platforms and the code under them.',
      quotes: ['I build stores that turn browsers into buyers.', '8 years deep in Shopify. Still curious.', 'No tool for it? I’ll write one.', 'Open the Terminal. Type ship.'],
      bio: ['9+ years in front-end, 8 deep in Shopify, now building full platforms. Thinks in conversion funnels, builds in clean code, ships stores that turn browsers into buyers.',
        'Alo Yoga’s cross-selling engine, Volcom’s collection and product pages, Oshoplin’s multi-brand store, Cole Haan, Pier 1, Koi Footwear.'],
      tags: ['Shopify', 'Headless', 'React', 'Platforms', 'WebGL'],
      stats: [['9+', 'Years in front-end'], ['8', 'Years in Shopify']],
      work: ['alo', 'volcom', 'colehaan', 'pier1', 'oshoplin'], service: 'ecommerce',
    },
    alaa: {
      id: 'alaa', name: 'Alaa', role: 'Head of Media Buying', img: 'img/team/alaa.webp', head: 'img/team/alaa-head.webp',
      lead: 'Budgets treated as a hypothesis, read at 48 hours.',
      quotes: ['I don’t run ads. I build revenue machines.', 'Ashya Egypt: 16× in 18 months.', '16× ROAS for Capital Office Furniture.', 'Numbers? Open Results.'],
      bio: ['7 years engineering high-ROAS campaigns across Egypt, Kuwait, Saudi Arabia and the UAE. Alaa doesn’t run ads — he builds revenue machines.',
        'Scaling Ashya Egypt 16× in 18 months, 16× ROAS for Capital Office Furniture, app install costs down 80%.'],
      tags: ['Meta Ads', 'Google Ads', 'TikTok', 'Snapchat', 'Programmatic'],
      stats: [['16×', 'Peak ROAS'], ['7+', 'Years'], ['4', 'Markets'], ['20+', 'Brands']],
      work: ['ashya', 'capital'], service: 'media',
    },
  };

  const FOLDERS = [
    ['all', 'All work'], ['stores', 'Stores'], ['web', 'Websites'], ['apps', 'Apps'], ['brands', 'Brands'], ['social', 'Social design'], ['software', 'Software'], ['media', 'Media'], ['lab', 'Lab'],
  ];
  // A live store: home, collection and product, on desktop and phone (full-page shots you can scroll).
  const shots = (id, pages) => {
    const cap = { home: 'Homepage', collection: 'Collection', product: 'Product page', arabic: 'Arabic, right to left', search: 'Search', cart: 'Cart drawer' };
    return pages.flatMap(n => [im(`${id}/${n}-d`, `${cap[n]}, desktop`, 'd'), ...(['home', 'collection', 'product', 'arabic'].includes(n) ? [im(`${id}/${n}-m`, `${cap[n]}, phone`, 'p')] : [])]);
  };
  const store = (id, pages) => ({ cover: im(id + '/cover', 'Homepage', 'd'), gallery: shots(id, pages) });

  const PROJECTS = [
    {
      id: 'womensecret', name: 'Women’secret', folder: 'stores', kind: 'Store', market: 'Egypt · Jordan · Kuwait',
      cover: im('womensecret/campaign-1', 'Women’secret campaign on the Egypt store', 'f'),
      tagline: 'One Shopify build. Three countries.',
      about: ['We built Women’secret’s online stores for Egypt, Jordan and Kuwait on a single Shopify build. Fix something once and all three stores get it.',
        'Each country still gets its own currency, branches, delivery rules and local content. Egypt shops in pounds, Kuwait in dinars, and Jordan gets its own offers, like 15% extra when you buy three or more.'],
      facts: [['Markets', 'Egypt, Jordan, Kuwait'], ['Platform', 'Shopify, one build'], ['Built', 'Design system, storefront, club, store finder'], ['Per country', 'Currency, branches, delivery, content']],
      numbers: [['3', 'countries'], ['1', 'build'], ['15%', 'extra on 3+ (Jordan)'], ['10%', 'extra, first purchase']],
      features: [
        { t: 'One build, three markets', x: 'Same design, same speed, same basket. The details change with the country.', imgs: [im('womensecret/home-eg', 'Egypt', 'p'), im('womensecret/home-jo', 'Jordan', 'p'), im('womensecret/home-kw', 'Kuwait', 'p')] },
        { t: 'It has to feel like the brand', x: 'Before we built it, we measured the reference store down to the spacing and the type, then set it up as one system: typefaces, colour and spacing. That’s why it feels like Women’secret, not a template.', imgs: [im('womensecret/home-desktop', 'Homepage, desktop', 'd')] },
        { t: 'Swim, sorted in two taps', x: 'Colour swatches on every product, quick add to basket, filters and sorting that work the same on phone and desktop.', imgs: [im('womensecret/swim-desktop', 'Swimwear, desktop', 'd'), im('womensecret/swim', 'Swimwear, phone', 'p')] },
        { t: 'Every screen, same store', x: 'Gallery, colours, sizes, add to basket and “Complete your look”, built for both screens, not squeezed from one to the other.', imgs: [im('womensecret/product-desktop', 'Product page, desktop', 'd'), im('womensecret/product', 'Product page, phone', 'p')] },
        { t: 'A club worth joining', x: 'Club WOW is built into the store: 10% extra on your first purchase, WowMoney on everything you buy, and a gift on your birthday.', imgs: [im('womensecret/club', 'Club WOW', 'p')] },
        { t: 'Online meets in-store', x: 'Every store has a store finder: search your street, see the nearest branch on the map. The website sends people to the shops.', imgs: [im('womensecret/stores', 'Store finder, Egypt', 'p'), im('womensecret/stores-jo', 'Store finder, Jordan', 'p')] },
      ],
      gallery: [im('womensecret/home-desktop', 'Homepage', 'd'), im('womensecret/campaign-1', 'Campaign', 'f'), im('womensecret/campaign-2', 'Campaign', 'f'), im('womensecret/campaign-3', 'Campaign', 'f'),
        im('womensecret/home-eg', 'Egypt homepage', 'p'), im('womensecret/home-jo', 'Jordan homepage', 'p'), im('womensecret/home-kw', 'Kuwait homepage', 'p'), im('womensecret/swim-desktop', 'Swimwear', 'd'),
        im('womensecret/swim', 'Swimwear, phone', 'p'), im('womensecret/swim-kw', 'Swimwear, Kuwait', 'p'), im('womensecret/product-desktop', 'Product page', 'd'), im('womensecret/product', 'Product, phone', 'p'),
        im('womensecret/bras-jo', 'Bras, Jordan', 'p'), im('womensecret/sleep', 'Sleep & homewear', 'p'), im('womensecret/club', 'Club WOW', 'p'), im('womensecret/stores', 'Store finder', 'p'), im('womensecret/tile-swim', 'Swim tile', 'f')],
      people: [], service: 'ecommerce',
    },
    {
      id: 'colehaan', name: 'Cole Haan', folder: 'stores', kind: 'Store', market: 'USA',
      cover: im('colehaan/cover', 'Cole Haan homepage', 'd'),
      gallery: [im('colehaan/home-d', 'Homepage', 'd'), im('colehaan/home2-d', 'Homepage, men’s and women’s', 'd'), im('colehaan/collection-d', 'Men’s sneakers', 'd'), im('colehaan/product-d', 'Product page', 'd')],
      tagline: 'The New York brand, on Shopify.',
      about: ['Shopify development for Cole Haan at colehaan.com: the New York brand’s shoes, bags, outerwear and accessories for men and women, sold in US dollars.',
        'An editorial store: campaign film and photography up front, men’s and women’s side by side, then collections you can filter by size and width, and product pages built to decide fast.'],
      facts: [['Market', 'USA'], ['Platform', 'Shopify'], ['Live', 'colehaan.com'], ['Currency', 'US dollars']],
      features: [
        { t: 'Campaign first', x: '“Comfortable Anywhere”, then men’s and women’s side by side. The menu goes straight to new, men, women, bags, collections, outerwear and sale.', imgs: [im('colehaan/home-d', 'Homepage', 'd'), im('colehaan/home2-d', 'Men’s and women’s', 'd')] },
        { t: 'Filter by the thing that matters', x: 'Men’s sneakers, 150 styles: sub-categories, then size and width as buttons, not a long dropdown. Every card shows its colours.', imgs: [im('colehaan/collection-d', 'Men’s sneakers', 'd')] },
        { t: 'The product page', x: 'Size and width, add to bag, an estimated delivery date and free shipping from $99, all above the fold.', imgs: [im('colehaan/product-d', 'Product page', 'd')] },
      ],
      links: [['Visit colehaan.com', 'https://www.colehaan.com/']],
      people: ['mamdouh'], service: 'ecommerce',
    },
    {
      id: 'fig-web', name: 'FIG website', folder: 'web', kind: 'Website · Shopify theme', market: 'Egypt',
      cover: im('fig-web/cover', 'FIG Couture homepage', 'd'),
      tagline: 'The Evening Edit. FIG’s new store on Shopify.',
      about: ['The new website for FIG (Fashion International Group), Egypt’s fashion franchise group: FIG Couture, a custom Shopify theme, replacing figeg.com. Twenty houses under one roof, from Women’secret and Benetton to BCBGMAXAZRIA, shopped in Egyptian pounds.',
        'It reads like a fashion magazine and sells like a marketplace: a seasonal edit up front, the wardrobe by category, a rail of brand logos, new in, then brand collections and product pages built on FIG’s real catalogue. Free delivery over LE 2,000 and cash on delivery across Egypt, stated in the first line.'],
      facts: [['Market', 'Egypt'], ['Platform', 'Shopify, custom theme'], ['Theme', 'FIG Couture'], ['Replaces', 'figeg.com']],
      features: [
        { t: 'A magazine on the homepage', x: '“The Evening Edit” for autumn/winter 2026, then the wardrobe by category, the brands as a rail of logos, and what’s new in.', imgs: [im('fig-web/home-d', 'Homepage, desktop', 'd'), im('fig-web/home-m', 'Homepage, phone', 'p')] },
        { t: 'Every brand gets its own page', x: 'BCBGMAXAZRIA womenswear: the brand’s name set large, its categories as tiles, then the products with filter and sort.', imgs: [im('fig-web/collection-d', 'Brand collection, desktop', 'd'), im('fig-web/collection-m', 'Brand collection, phone', 'p')] },
        { t: 'The product page', x: 'A tall gallery, colours and sizes, add to bag and express checkout, the delivery promise right under it.', imgs: [im('fig-web/product-d', 'Product page, desktop', 'd'), im('fig-web/product-m', 'Product page, phone', 'p')] },
      ],
      gallery: shots('fig-web', ['home', 'collection', 'product']),
      links: [['See the FIG app', 'https://band-agents.github.io/fig-app-preview/']], see: ['fig', 'labesny-web'],
      people: ['mamdouh'], service: 'ecommerce',
    },
    {
      id: 'labesny-web', name: 'Labesny website', folder: 'web', kind: 'Website · Shopify theme', market: 'Kuwait',
      cover: im('labesny-web/cover', 'Labesny Couture homepage', 'd'),
      tagline: 'The Evening Edit, in Kuwait. Labesny’s new store.',
      about: ['The new website for Labesny, the multi-brand fashion store in Kuwait: Labesny Couture, a custom Shopify theme for labesny.com. Women, men, kids and lingerie from brands like Women’secret, La vie en rose and Tom Tailor, priced in Kuwaiti dinars.',
        'It shares FIG Couture’s design and runs on Labesny’s own catalogue: the seasonal edit, the wardrobe by category, brand logos and new in, then collections and product pages. Free delivery over KWD 20 and delivery across Kuwait in 48 hours, up front.'],
      facts: [['Market', 'Kuwait'], ['Platform', 'Shopify, custom theme'], ['Theme', 'Labesny Couture'], ['Free delivery', 'Over KWD 20']],
      features: [
        { t: 'One design, two stores', x: 'The same editorial homepage as FIG, set up for Kuwait: the edit, the wardrobe, the brands and new in.', imgs: [im('labesny-web/home-d', 'Homepage, desktop', 'd'), im('labesny-web/home-m', 'Homepage, phone', 'p')] },
        { t: 'Collections', x: 'Womenswear: categories as tiles up top, then the products, with filter and sort on desktop and phone.', imgs: [im('labesny-web/collection-d', 'Womenswear, desktop', 'd'), im('labesny-web/collection-m', 'Womenswear, phone', 'p')] },
        { t: 'The product page', x: 'Gallery, sizes, add to bag, and the 48-hour delivery promise where you decide.', imgs: [im('labesny-web/product-d', 'Product page, desktop', 'd'), im('labesny-web/product-m', 'Product page, phone', 'p')] },
      ],
      gallery: shots('labesny-web', ['home', 'collection', 'product']),
      links: [['See the Labesny app', 'https://band-agents.github.io/labesny-app-preview/']], see: ['labesny', 'fig-web'],
      people: ['mamdouh'], service: 'ecommerce',
    },
    {
      id: 'labesny', name: 'Labesny', folder: 'apps', kind: 'App', market: 'Kuwait',
      cover: im('labesny/home', 'Labesny app home', 'p'),
      tagline: 'Eighteen brands, one bag. In English and Arabic.',
      about: ['A shopping app for Kuwait: eighteen brands in one bag, KNET checkout, club points and full Arabic.',
        'Arabic isn’t a translated copy: the whole layout mirrors right to left, and one tap switches it. The FIG app runs on the same engine, so every improvement ships to both.'],
      facts: [['Market', 'Kuwait'], ['Languages', 'English and Arabic, right to left'], ['Payment', 'KNET or card'], ['Delivery', 'Free from KWD 20'], ['Club', 'Member, Silver, Gold']],
      numbers: [['18', 'brands'], ['1,755', 'products'], ['KWD 20', 'free delivery from'], ['1,000', 'points = KWD 12 off']],
      features: [
        { t: 'Both directions, one app', x: 'English and Arabic. The Arabic layout mirrors right to left; one tap switches it.', imgs: [im('labesny/home', 'English', 'p'), im('labesny/home-in-arabic', 'Arabic, right to left', 'p')] },
        { t: '1,755 products, two taps', x: 'Filter by size, brand and colour. It tells you how many results you’ll get before you commit: “View 412 results.”', imgs: [im('labesny/filter-and-sort', 'Filter and sort', 'p'), im('labesny/collection', 'Collection', 'p')] },
        { t: 'No dead ends', x: 'Search for something the store doesn’t carry and it shows “Try these instead”, then what everyone else is looking at right now.', imgs: [im('labesny/nothing-found', 'Nothing found', 'p'), im('labesny/search', 'Search', 'p')] },
        { t: 'The nudge that sells', x: '“KWD 4.000 away from free delivery.” Then three things that close the gap, one tap each.', imgs: [im('labesny/free-delivery-nudge', 'Free delivery nudge', 'p'), im('labesny/bag', 'Bag', 'p')] },
        { t: 'Checkout, Kuwait-style', x: 'Addresses the way people give directions: governorate, area, block, street, building. KNET or card. Then the thank-you page keeps selling: “While you wait.”', imgs: [im('labesny/checkout', 'Checkout', 'p'), im('labesny/order-placed', 'Order placed', 'p')] },
        { t: 'Points that pay out', x: 'Labesny Club lives in the app: 200 points for free delivery, 500 for KWD 5 off, 1,000 for KWD 12 off. Member, Silver and Gold levels.', imgs: [im('labesny/labesny-club', 'Labesny Club', 'p'), im('labesny/account', 'Account', 'p')] },
        { t: 'Still deciding? Keep it.', x: 'Torn between a few? It suggests saving them, and the saved list comes with “More like the ones you saved”.', imgs: [im('labesny/still-deciding', 'Still deciding', 'p'), im('labesny/saved', 'Saved', 'p')] },
      ],
      gallery: ['home', 'home-in-arabic', 'brands', 'collection', 'filter-and-sort', 'product-page', 'quick-add', 'bag', 'free-delivery-nudge', 'checkout', 'order-placed', 'labesny-club', 'account', 'search', 'nothing-found', 'saved', 'still-deciding', 'welcome', 'returns', 'questions']
        .map(n => im('labesny/' + n, n.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()), 'p')),
      links: [['Open the app preview', 'https://band-agents.github.io/labesny-app-preview/']],
      people: [], service: 'software',
    },
    {
      id: 'fig', name: 'FIG', folder: 'apps', kind: 'App · Migration', market: 'Egypt',
      cover: im('fig/home-desktop', 'FIG marketplace homepage', 'd'),
      tagline: '6,730 products moving to Shopify. Zero lost.',
      about: ['A shopping app for Egypt, and figeg.com moving onto Shopify: 6,730 products, 26,829 sizes and colours, 1,706 customers and 246 categories, all exported and checked before a single thing moves.',
        'The new look is a marketplace, with brand rails, a flash-sale strip and recommendations everywhere. The FIG app and the Labesny app run on the same code: each has its own brand, catalogue, currency and country; the engine underneath is shared.'],
      facts: [['Market', 'Egypt'], ['Moving', 'figeg.com to Shopify'], ['Shared engine', 'FIG app and Labesny app'], ['New look', 'Brand rails, flash sales, recommendations']],
      numbers: [['6,730', 'products'], ['26,829', 'sizes & colours'], ['1,706', 'customers'], ['246', 'categories']],
      chart: { k: 'fig' },
      features: [
        { t: 'A marketplace look', x: 'Brand rails, a flash-sale strip and recommendations everywhere.', imgs: [im('fig/home-desktop', 'Homepage, desktop', 'd'), im('fig/home-mobile', 'Homepage, phone', 'p')] },
        { t: 'Two brands, one engine', x: 'Each app has its own brand, catalogue, currency and country. Every improvement ships to both.', imgs: [im('fig/app', 'FIG app', 'p'), im('fig/labesny-app', 'Labesny app', 'p')] },
      ],
      gallery: [im('fig/home-desktop', 'Homepage', 'd'), im('fig/home-mobile', 'Homepage, phone', 'p'), im('fig/app', 'FIG app', 'p'), im('fig/labesny-app', 'Same engine: Labesny', 'p')],
      links: [['Open the app preview', 'https://band-agents.github.io/fig-app-preview/']],
      people: [], service: 'ecommerce',
    },
    {
      id: 'alo', name: 'Alo Yoga', folder: 'stores', kind: 'Store', market: 'Egypt region',
      cover: im('alo/photo-1', 'Alo Yoga', 'f'),
      tagline: 'A cross-selling engine, and a store that reads right to left.',
      about: ['Shopify storefront, product pages and cross-selling for Alo Yoga, and the Alo Yoga Egypt store rebuilt to read right to left in Arabic.',
        'The product page does more than show one item: “Shop the look”, “Style inspiration” and “You may also like” turn one pair of leggings into an outfit.'],
      facts: [['Region', 'Egypt'], ['Platform', 'Shopify'], ['Built', 'Storefront, product pages, cross-selling'], ['Languages', 'English and Arabic, right to left']],
      features: [
        { t: 'The product page that sells the outfit', x: 'Colours, sizes and add to bag up top; “Shop the look” right under it.', imgs: [im('alo/product', 'Product page', 'd')] },
        { t: 'Cross-selling engine', x: '“Complete the look” and “Style inspiration, styled by you” keep the basket growing.', imgs: [im('alo/complete', 'Shop the look', 'd'), im('alo/style', 'Style inspiration', 'p')] },
        { t: 'Right to left', x: 'The Egypt store in Arabic, mirrored properly, not translated labels on an English layout.', imgs: [im('alo/arabic', 'Arabic, right to left', 'p'), im('alo/mobile', 'Phone', 'p')] },
      ],
      gallery: [im('alo/photo-1', 'Campaign', 'f'), im('alo/photo-2', 'Campaign', 'f'), im('alo/product', 'Product page', 'd'), im('alo/complete', 'Shop the look', 'd'), im('alo/style', 'Style inspiration', 'p'), im('alo/mobile', 'Phone', 'p'), im('alo/arabic', 'Arabic', 'p')],
      people: ['mamdouh'], service: 'ecommerce',
    },
    {
      id: 'volcom', name: 'Volcom Spain', folder: 'stores', kind: 'Store · Media', market: 'Spain',
      cover: im('volcom/photo-1', 'Volcom', 'f'),
      tagline: '€18,892 in ads. €63,034 in sales. 30 days.',
      about: ['Collection and product pages for Volcom Spain, and the paid media that fills them: €18,892 in ads became €63,034 in sales in 30 days, across 788 orders.',
        'The numbers live in Studio, our own agency OS, where the client sees the same live figures we work from.'],
      facts: [['Market', 'Spain'], ['Built', 'Collection and product pages'], ['Media', 'Paid media'], ['Reporting', 'Live in Studio']],
      numbers: [['3.34×', 'return on ad spend'], ['€63,034', 'sales'], ['788', 'orders'], ['€23.98', 'per order']],
      chart: { k: 'volcom' },
      features: [
        { t: 'Collections that scan fast', x: 'Workwear, tees and denim in a grid you can read at a glance.', imgs: [im('volcom/collection', 'Collection', 'd'), im('volcom/mobile', 'Collection, phone', 'p')] },
        { t: 'Product pages', x: 'Everything to decide, nothing in the way.', imgs: [im('volcom/product', 'Product page', 'd'), im('volcom/product-mobile', 'Product, phone', 'p')] },
        { t: 'The numbers, live', x: 'Spend, sales and orders in Studio, next to the board of the people spending it.', imgs: [im('volcom/studio', 'Volcom in Studio', 'd')] },
      ],
      gallery: [im('volcom/photo-1', 'Campaign', 'f'), im('volcom/photo-2', 'Campaign', 'f'), im('volcom/collection', 'Collection', 'd'), im('volcom/grid', 'Grid', 'd'), im('volcom/product', 'Product page', 'd'),
        im('volcom/live-collection', 'Live collection', 'd'), im('volcom/live-product', 'Live product page', 'd'), im('volcom/mobile', 'Phone', 'p'), im('volcom/product-mobile', 'Product, phone', 'p'), im('volcom/studio', 'Numbers in Studio', 'd')],
      people: ['mamdouh'], service: 'ecommerce',
    },
    {
      id: 'oshoplin', name: 'Oshoplin', folder: 'stores', kind: 'Store', market: 'Egypt',
      cover: im('oshoplin/home', 'Oshoplin homepage', 'd'),
      tagline: 'Many brands, one store.',
      about: ['A multi-brand Shopify store for Egypt: several labels side by side, each easy to find, all in one basket.'],
      facts: [['Market', 'Egypt'], ['Platform', 'Shopify'], ['Type', 'Multi-brand store']],
      features: [
        { t: 'Many brands, one basket', x: 'Brands side by side, offers visible on every card.', imgs: [im('oshoplin/grid', 'Collection grid', 'd'), im('oshoplin/mobile', 'Phone', 'p')] },
      ],
      gallery: [im('oshoplin/home', 'Homepage', 'd'), im('oshoplin/grid', 'Collection', 'd'), im('oshoplin/mobile', 'Phone', 'p')],
      people: ['mamdouh'], service: 'ecommerce',
    },
    {
      id: 'ayas', name: 'AYA-S', folder: 'stores', kind: 'Website', market: 'Scandinavia',
      cover: im('ayas/hero', 'AYA-S', 'f'),
      tagline: 'A Scandinavian fashion brand, designed and built.',
      about: ['AYA-S is a Scandinavian fashion brand. We designed and built aya-s.com: clean, fast and easy to shop, from the first scroll to checkout.'],
      facts: [['Brand', 'Scandinavian fashion'], ['Built', 'Design and development'], ['Live', 'aya-s.com']],
      features: [{ t: 'From the first scroll to checkout', x: 'A hero that lets the collection speak, then a store that stays out of the way.', imgs: [im('ayas/mobile', 'aya-s.com on a phone', 'p')] }],
      gallery: [im('ayas/hero', 'Hero', 'f'), im('ayas/mobile', 'Phone', 'p')],
      links: [['Visit aya-s.com', 'https://aya-s.com/']],
      people: [], service: 'ecommerce',
    },
    {
      id: 'pier1', name: 'Pier 1', folder: 'stores', kind: 'Store', market: 'USA',
      ...store('pier1', ['home', 'collection', 'product']),
      tagline: 'America’s home-décor name, on Shopify.',
      about: ['Shopify development for Pier 1, the American home-décor brand, at pier1.com: seasonal edits, deep collections and product pages that sell the set, not just the piece.'],
      facts: [['Market', 'USA'], ['Platform', 'Shopify'], ['Live', 'pier1.com'], ['Category', 'Home décor']],
      features: [
        { t: 'A season on the homepage', x: '“The Merry Edit”: the season leads, with gift and décor rails right under it and free shipping over $99 in the bar.', imgs: [im('pier1/home-d', 'Homepage, desktop', 'd'), im('pier1/home-m', 'Homepage, phone', 'p')] },
        { t: 'Collections', x: 'Product grids with ratings, filter and sort, the same on desktop and phone.', imgs: [im('pier1/collection-d', 'Collection, desktop', 'd'), im('pier1/collection-m', 'Collection, phone', 'p')] },
        { t: 'Product pages', x: 'A big gallery, the details, and “You may also like” to keep the basket growing.', imgs: [im('pier1/product-d', 'Product page, desktop', 'd'), im('pier1/product-m', 'Product page, phone', 'p')] },
      ],
      links: [['Visit pier1.com', 'https://www.pier1.com/']],
      people: ['mamdouh'], service: 'ecommerce',
    },
    {
      id: 'steinmart', name: 'Stein Mart', folder: 'stores', kind: 'Store', market: 'USA',
      ...store('steinmart', ['home', 'collection', 'product']),
      tagline: 'Designer brands for less, on Shopify.',
      about: ['Shopify development for Stein Mart, the American off-price retailer selling designer brands for less, at steinmart.com.'],
      facts: [['Market', 'USA'], ['Platform', 'Shopify'], ['Live', 'steinmart.com'], ['Category', 'Fashion, home and accessories']],
      features: [
        { t: 'Brands up front', x: 'Designer drops lead the homepage, with shop-by-category and a search that lets you pick the department first.', imgs: [im('steinmart/home-d', 'Homepage, desktop', 'd'), im('steinmart/home-m', 'Homepage, phone', 'p')] },
        { t: 'Collections', x: 'Women’s activewear, 212 products: filters down the side on desktop, one tap away on the phone.', imgs: [im('steinmart/collection-d', 'Collection, desktop', 'd'), im('steinmart/collection-m', 'Collection, phone', 'p')] },
        { t: 'Product pages', x: 'Gallery, colours, add to bag and express checkout above the fold.', imgs: [im('steinmart/product-d', 'Product page, desktop', 'd'), im('steinmart/product-m', 'Product page, phone', 'p')] },
      ],
      links: [['Visit steinmart.com', 'https://steinmart.com/']],
      people: ['mamdouh'], service: 'ecommerce',
    },
    {
      id: 'dressbarn', name: 'Dressbarn', folder: 'stores', kind: 'Store', market: 'USA',
      ...store('dressbarn', ['home', 'collection', 'product']),
      tagline: 'Women’s fashion, offers that add up, on Shopify.',
      about: ['Shopify development for Dressbarn, the American women’s fashion brand, at dressbarn.com: dresses, denim and plus sizes, with offers that stack the way the customer expects.'],
      facts: [['Market', 'USA'], ['Platform', 'Shopify'], ['Live', 'dressbarn.com'], ['Category', 'Women’s fashion']],
      features: [
        { t: 'Offers that read at a glance', x: '“Petite week”, “Buy 2 pairs of jeans, get a knit top free”, “Buy 3, save an extra 20%”: each offer gets its own block.', imgs: [im('dressbarn/home-d', 'Homepage, desktop', 'd'), im('dressbarn/home-m', 'Homepage, phone', 'p')] },
        { t: 'Collections', x: 'Big product photography, colours on every card, filters and sort.', imgs: [im('dressbarn/collection-d', 'Collection, desktop', 'd'), im('dressbarn/collection-m', 'Collection, phone', 'p')] },
        { t: 'Product pages', x: 'Sizes, colours and add to bag up top, with more like it underneath.', imgs: [im('dressbarn/product-d', 'Product page, desktop', 'd'), im('dressbarn/product-m', 'Product page, phone', 'p')] },
      ],
      links: [['Visit dressbarn.com', 'https://dressbarn.com/']],
      people: ['mamdouh'], service: 'ecommerce',
    },
    {
      id: 'radioshack', name: 'RadioShack', folder: 'stores', kind: 'Store', market: 'USA',
      cover: im('radioshack/cover', 'RadioShack homepage', 'd'),
      gallery: [im('radioshack/home-d', 'Homepage', 'd'), im('radioshack/collection-d', 'Radios', 'd'), im('radioshack/product-d', 'Product page', 'd')],
      tagline: 'The electronics name everyone knows.',
      about: ['Store development for RadioShack, the American electronics brand, at radioshack.com: trending tech and fresh drops up front, then radios, weather stations, speakers, turntables and batteries, each a click away.'],
      facts: [['Market', 'USA'], ['Platform', 'Magento'], ['Live', 'radioshack.com'], ['Category', 'Electronics']],
      features: [
        { t: 'Trending, then everything else', x: 'Four trending products with their prices, “Fresh drops” and deals, and free shipping above $49.99 in the bar.', imgs: [im('radioshack/home-d', 'Homepage', 'd')] },
        { t: 'Categories with real filters', x: 'Radios: 14 results, filtered by price, colour, connectivity, brand, size, power source and AM/FM.', imgs: [im('radioshack/collection-d', 'Radios', 'd')] },
        { t: 'Product pages that add on', x: 'Price against MSRP, stock status, and “Other customers bought” add-ons right next to the buy button.', imgs: [im('radioshack/product-d', 'Product page', 'd')] },
      ],
      links: [['Visit radioshack.com', 'https://www.radioshack.com/']],
      people: ['mamdouh'], service: 'ecommerce',
    },
    {
      id: 'sloth', name: 'Sloth', folder: 'brands', kind: 'Brand identity', market: 'Soft furniture',
      cover: im('sloth/cover', 'Sloth brand guidelines', 'g'),
      tagline: 'A soft-spoken world, page by page.',
      about: ['Visual identity guidelines for a furniture brand: essence, tone of voice, colour, type and how it all behaves, page by page.'],
      facts: [['Category', 'Soft furniture'], ['Delivered', 'Full guideline deck'], ['Covers', 'Essence, voice, colour, type, application']],
      features: [{ t: 'The deck', x: 'Every rule the brand needs to stay itself, wherever it shows up.', imgs: [im('sloth/p2', 'Guidelines', 'g'), im('sloth/photo', 'Fabric', 'f')] }],
      gallery: [1, 2, 3, 4, 5, 6, 7, 8].map(n => im('sloth/p' + n, 'Page ' + n, 'g')).concat(im('sloth/photo', 'Fabric', 'f')),
      people: ['alerta'], service: 'brand',
    },
    {
      id: 'handler', name: 'Handler Auto Service', folder: 'brands', kind: 'Identity · Profile', market: 'Auto service',
      cover: im('handler/cover', 'Handler', 'g'),
      tagline: 'Industrial honesty.',
      about: ['Identity and company profile for an auto service: a mark you can put on a building, a car and a page, and a profile that reads like the workshop feels.'],
      facts: [['Category', 'Auto service'], ['Delivered', 'Identity and company profile']],
      features: [{ t: 'Profile, page by page', x: 'The identity at work, from signage to spreads.', imgs: [im('handler/p1', 'Profile', 'g'), im('handler/photo', 'On the building', 'f')] }],
      gallery: [1, 2, 3, 4, 5, 6, 7, 8].map(n => im('handler/p' + n, 'Page ' + n, 'g')).concat(im('handler/photo', 'On the building', 'f')),
      people: ['alerta'], service: 'brand',
    },
    {
      id: 'end', name: 'end.', folder: 'brands', kind: 'Brand guidelines', market: 'Fashion',
      cover: im('end/page', 'end. guidelines', 'g'),
      tagline: 'Quiet sophistication.',
      about: ['Brand guidelines and a visual system for end.: restraint as a rule, written down so it stays that way.'],
      facts: [['Delivered', 'Brand guidelines, visual system']],
      features: [{ t: 'The system', x: 'Type, colour and space doing the talking.', imgs: [im('end/p3', 'Guidelines', 'g'), im('end/photo', 'In use', 'f')] }],
      gallery: [im('end/cover', 'Cover', 'g'), ...[2, 3, 5, 6, 8].map(n => im('end/p' + n, 'Page ' + n, 'g')), im('end/photo', 'In use', 'f')],
      people: ['alerta'], service: 'brand',
    },
    {
      id: 'guesswhat', name: 'Guess What', folder: 'brands', kind: 'Website visual system', market: 'Fashion',
      cover: im('guesswhat/photo-1', 'Guess What', 'f'),
      tagline: 'Editorial energy.',
      about: ['A website visual system for a fashion brand: how the pages look and hold together, written down so the site stays itself.'],
      facts: [['Category', 'Fashion'], ['Delivered', 'Website visual system, brand book']],
      features: [{ t: 'The visual system', x: 'Layouts, type and image rules for the site.', imgs: [im('guesswhat/system', 'Visual system', 'g'), im('guesswhat/photo-2', 'Campaign', 'f')] }],
      gallery: [im('guesswhat/system', 'Visual system', 'g'), im('guesswhat/site', 'Website', 'g'), im('guesswhat/photo-1', 'Campaign', 'f'), im('guesswhat/photo-2', 'Campaign', 'f')],
      people: ['alerta'], service: 'brand',
    },
    {
      id: 'mas', name: 'MAS SofaBed', folder: 'brands', kind: 'Mood · Content', market: 'Furniture',
      cover: im('mas/mood', 'MAS mood board', 'g'),
      tagline: 'Mood, social and campaign design.',
      about: ['Mood board and content design for MAS SofaBed: one look across the feed and the campaign.'],
      facts: [['Delivered', 'Mood board, social and campaign design']],
      features: [{ t: 'One look across the feed', x: 'The mood board, then the posts it became.', imgs: [im('mas/mood', 'Mood board', 'g'), im('mas/social', 'Social', 'g')] }],
      gallery: [im('mas/mood', 'Mood board', 'g'), im('mas/social', 'Social', 'g')],
      people: ['alerta'], service: 'brand',
    },
    {
      id: 'thoth', name: 'THOTH', folder: 'software', kind: 'Business OS · EN/AR', market: 'Retail & garment',
      cover: im('thoth/home', 'THOTH home', 'd'),
      tagline: 'A whole business, on one screen.',
      about: ['Our own retail and garment ERP: POS, catalogue, branches, loyalty, two-way Shopify sync and an intelligence layer that reads the data and says what to do next. English and Arabic, first-class.',
        'We built it to prove the point rather than to sell it. Yours would be built the same way: for your business, owned by you.'],
      facts: [['Type', 'Retail & garment ERP'], ['Languages', 'English and Arabic'], ['Syncs with', 'Shopify, both ways']],
      numbers: [['12', 'modules'], ['EN/AR', 'first-class']],
      features: [
        ['home', 'Home', 'Sales today, active branches, loyalty points and Shopify sync: the whole business in four numbers.'],
        ['intelligence', 'Intelligence', 'It reads the data and tells you what to act on: failed syncs, dormant members, void rates, next-day forecast.'],
        ['analytics', 'Analytics', 'POS, branches, loyalty and Shopify in one view. Revenue trend, payment mix, top products.'],
        ['loyalty', 'Loyalty', 'Members, points issued and redeemed, tier distribution and campaigns that actually reconcile.'],
        ['catalog', 'Catalog', 'Products, variants and pricing in your own code system, not a template’s.'],
        ['pos', 'Point of Sale', 'Every till, every branch, every transaction, recorded the moment it happens.'],
        ['branches', 'Branches', 'Each location reporting the same way, so comparison is possible at all.'],
        ['data', 'Data', 'Import, export and audit. Your data stays yours and stays portable.'],
      ].map(([n, t, x]) => ({ t, x, imgs: [im('thoth/' + n, t, 'd')] })),
      gallery: ['home', 'intelligence', 'analytics', 'loyalty', 'catalog', 'pos', 'branches', 'data'].map(n => im('thoth/' + n, n[0].toUpperCase() + n.slice(1), 'd')),
      people: [], service: 'software',
    },
    {
      id: 'studio', name: 'Studio', folder: 'software', kind: 'Agency OS · Portals', market: 'Our own',
      cover: im('studio/volcom', 'Studio client portal', 'd'),
      tagline: 'Docs, tasks, chat and client portals behind one login.',
      about: ['Our agency OS: docs, tasks, chat, feed and client portals behind one login, with live Meta, TikTok and Shopify numbers next to the board of the people spending it.'],
      facts: [['Type', 'Agency OS, client portals'], ['Live data', 'Meta, TikTok, Shopify']],
      numbers: [['3.34×', 'live ROAS tracked'], ['€63k', 'tracked in 30 days'], ['788', 'orders']],
      features: [['volcom', 'Client portal', 'Clients log in and see their own numbers instead of emailing for a status.'], ['feed', 'Feed', 'What happened today, across every client.'], ['inbox', 'Inbox', 'Every message in one place.'], ['chat', 'Chat', 'The conversation next to the work.']]
        .map(([n, t, x]) => ({ t, x, imgs: [im('studio/' + n, t, 'd')] })),
      gallery: ['volcom', 'feed', 'inbox', 'chat'].map(n => im('studio/' + n, n[0].toUpperCase() + n.slice(1), 'd')),
      people: [], service: 'software',
    },
    {
      id: 'ashya', name: 'Ashya Egypt', folder: 'media', kind: 'Media buying', market: 'Egypt',
      cover: null, tagline: 'EGP 260K to EGP 4.2M a month, in 18 months.',
      about: ['Media buying for Ashya Egypt: from EGP 260K to EGP 4.2M a month in 18 months. Sixteen times, in a year and a half.'],
      facts: [['Market', 'Egypt'], ['Service', 'Media buying'], ['Period', '18 months']],
      numbers: [['16×', 'growth'], ['EGP 4.2M', 'a month'], ['18', 'months']],
      chart: { k: 'ashya' }, features: [], gallery: [], people: ['alaa'], service: 'media',
    },
    {
      id: 'capital', name: 'Capital Office Furniture', folder: 'media', kind: 'Media buying', market: 'Office furniture',
      cover: null, tagline: '16× return on ad spend.',
      about: ['Media buying for Capital Office Furniture, at a peak return of 16× on ad spend.'],
      facts: [['Category', 'Office furniture'], ['Peak ROAS', '16×']],
      numbers: [['16×', 'peak ROAS']],
      chart: { k: 'roas16' }, features: [], gallery: [], people: ['alaa'], service: 'media',
    },
    {
      id: 'lab', name: 'Live shader', folder: 'lab', kind: 'Creative tech', market: 'In the browser',
      cover: im('lab/shader', 'A campaign image rendered live through a shader', 'd'),
      tagline: 'Campaign visuals that run in the browser.',
      about: ['A product shot is a still. This is an image rendered live through a shader: pixel grid, ASCII mapping, chromatic split, glitch and bloom, stacked as real post-processing passes.',
        'It loads as a hero, reacts to the visitor, and never needs a re-export. Hand the client the sliders and they tune their own launch look.'],
      facts: [['Runs on', 'The GPU, in the browser'], ['Passes', 'Pixel grid, ASCII, chromatic split, glitch, bloom']],
      features: [
        { t: 'Launch heroes', x: 'A product reveals itself as the visitor scrolls. No video file, no loading spinner.', imgs: [im('lab/shader', 'Live shader', 'd')] },
        { t: 'Interactive lookbooks, social cutdowns', x: 'The same pipeline over campaign photography, tuned per drop. Record the canvas straight to a reel: one build, every format.', imgs: [] },
      ],
      gallery: [im('lab/shader', 'Live shader', 'd')],
      links: [['Play with the live shader', 'https://band-agents.github.io/band/#lab']],
      people: [], service: 'lab',
    },
  ];
  // Social design: Instagram feeds (posts, carousels, highlight covers), from js/social.js
  const IG = {
    '1pass': ['Fitness app', 'Your move, your gear, your rules.'], capital: ['Office furniture', 'Engineered for you.'], elsafwa: ['Serviced residences, New Cairo', 'Wake up inspired.'],
    handler: ['Auto service', 'Where icons meet.'], hunna: ['Lifestyle brand', 'A soft world for you.'], mas: ['Sofa beds', 'Small space, big relaxation.'],
    menna: ['Fashion store', 'The new era of Menna Elsonny Store.'], yqn: ['Eyewear', 'Where light meets pattern.'],
  };
  const SEE = { handler: 'handler', mas: 'mas', capital: 'capital' };
  for (const [k, s] of Object.entries(window.SOCIAL || {})) {
    const [market, tagline] = IG[k] || ['', ''], slides = s.posts.reduce((t, p) => t + p.slides.length, 0), car = s.posts.filter(p => p.slides.length > 1).length;
    PROJECTS.push({
      id: 'ig-' + k, name: s.name, folder: 'social', kind: 'Instagram feed', market,
      cover: { src: s.posts[0].thumb, cap: s.name + ' on Instagram', k: 'f' },
      tagline,
      about: [`Instagram design for ${s.name}: ${s.posts.length} posts${car ? `, ${car} of them carousels,` : ''} and ${s.highlights.length} story highlight covers, planned as one grid so the profile reads like the brand.`,
        'Every post is written and designed for the feed: the image, the type on it and the caption under it. Click any post to see it full size, swipe through the carousels.'],
      facts: [['Handle', '@' + s.handle], ['Followers', s.stats?.followers || '—'], ['Posts', String(s.posts.length)], ['Highlights', String(s.highlights.length)], ['Category', market]],
      feed: s, features: [],
      gallery: s.posts.flatMap((p, i) => p.slides.map((src, j) => ({ src, thumb: j ? src : p.thumb, cap: p.cap || `Post ${i + 1}`, k: 'f', post: i + 1, n: j + 1, of: p.slides.length }))),
      see: SEE[k] ? [SEE[k]] : [], people: ['alerta'], service: 'brand',
    });
    const t = SEE[k] && PROJECTS.find(p => p.id === SEE[k]); if (t) (t.see ||= []).push('ig-' + k);
  }
  const byId = Object.fromEntries(PROJECTS.map(p => [p.id, p]));
  for (const p of Object.values(PEOPLE)) p.work.forEach(id => byId[id] && !byId[id].people.includes(p.id) && byId[id].people.push(p.id));

  const SERVICES = [
    { id: 'ecommerce', name: 'Ecommerce development', sub: 'Think → Innovate → Execute', lead: 'We sit with your team, study your customer, stress-test your UX, and build a Shopify store or headless setup that actually converts.',
      get: ['Shopify or headless storefronts', 'One build for several countries: currency, branches and delivery per market', 'Arabic done properly, right to left', 'Product pages and cross-selling that grow the basket', 'Migrations that lose nothing (FIG: 6,730 products)'],
      work: ['womensecret', 'colehaan', 'fig-web', 'labesny-web', 'alo', 'volcom', 'pier1', 'steinmart', 'dressbarn', 'radioshack', 'oshoplin', 'ayas'], person: 'mamdouh' },
    { id: 'software', name: 'Custom software', sub: 'The tool that doesn’t exist yet', lead: 'Business systems, client portals, internal tools and shopping apps. Built from scratch, owned by you, documented so anyone after us can continue.',
      get: ['Systems that run a business: orders, inventory, bookings, production, accounts', 'Client-facing portals: customers see their own numbers', 'Real-time data plumbing: Meta, TikTok, Google and Shopify in one place', 'Shopping apps in English and Arabic'],
      work: ['thoth', 'studio', 'labesny', 'fig'], person: null },
    { id: 'brand', name: 'Design & brand', sub: 'Your vision → Our execution', lead: 'From social creatives to full brand guidelines, packaging to campaign visuals. Fast, and at the quality your brand demands.',
      get: ['Visual identities', 'Full guideline decks: essence, tone of voice, colour, type, application', 'Website visual systems', 'Instagram feeds: posts, carousels and highlight covers, planned as one grid', 'Mood boards and campaign design'],
      work: ['sloth', 'handler', 'end', 'guesswhat', 'mas', 'ig-yqn', 'ig-elsafwa', 'ig-hunna', 'ig-1pass'], person: 'alerta' },
    { id: 'media', name: 'Media buying', sub: 'Your strategy → Our scale', lead: 'Meta, TikTok, Google, Snapchat. Budget treated as a hypothesis and read at 48 hours, not at month end.',
      get: ['Paid social and search', '48-hour reads, not month-end post-mortems', 'Live numbers your team can see', 'Creative tested, not guessed'],
      work: ['volcom', 'ashya', 'capital'], person: 'alaa' },
    { id: 'ai', name: 'AI content', sub: 'Faster, still on brand', lead: 'Product visuals, copy and video, made faster with AI and finished by people who know the brand.',
      get: ['Product visuals', 'Copy in English and Arabic', 'Video cutdowns for every format'], work: [], person: null },
    { id: 'lab', name: 'Creative tech', sub: 'Visuals that run live', lead: 'Campaign visuals that run in the browser as GPU shaders: launch heroes, interactive lookbooks and social cutdowns from one build.',
      get: ['Launch heroes with no video file', 'Interactive lookbooks', 'Social cutdowns recorded from the canvas'], work: ['lab'], person: null },
  ];

  const CLIENTS = [
    ['Ecommerce — International', ['Alo Yoga', 'Pier 1', 'Stein Mart', 'Dressbarn', 'RadioShack', 'Koi Footwear', 'Volcom', 'The Brandery']],
    ['Ecommerce — Middle East', ['Women’secret', 'Cole Haan', 'Labesny', 'FIG', 'Skechers', 'ECCO', 'Umbro', 'ANT', 'Cizaro', 'Oshoplin']],
    ['Design, software & media', ['AYA-S', 'Capital Office Furniture', 'MAS SofaBed', 'Handler Auto', 'El Safwa Resort', 'YQN Eyewear', 'Hunna World', 'Menna Elsonny Store', '1Pass', 'Guess What', 'Ashya Egypt', 'Be Glowy', 'WOW Sewing', 'UNSTMPD', 'am:pm Coffee']],
  ];

  const RESULTS = [
    { id: 'volcom', t: 'Volcom Spain · 30 days', big: '3.34×', l: 'return on ad spend', chart: 'volcom', rows: [['Ad spend', '€18,892'], ['Sales', '€63,034'], ['Orders', '788'], ['Per order', '€23.98']] },
    { id: 'ashya', t: 'Ashya Egypt · 18 months', big: '16×', l: 'EGP 260K → EGP 4.2M a month', chart: 'ashya', person: 'alaa' },
    { id: 'capital', t: 'Capital Office Furniture', big: '16×', l: 'peak return on ad spend', chart: 'roas16', person: 'alaa' },
    { id: null, t: 'App installs', big: '−80%', l: 'cost per install', chart: 'installs', person: 'alaa' },
    { id: 'womensecret', t: 'Women’secret', big: '3 → 1', l: 'countries on one Shopify build', chart: 'markets' },
    { id: 'fig', t: 'FIG → Shopify', big: '6,730', l: 'products moving, zero lost', chart: 'fig' },
    { id: 'labesny', t: 'Labesny', big: '18', l: 'brands in one bag · 1,755 products', chart: null },
    { id: null, t: 'band.', big: '20+', l: 'brands served · 9+ years in dev', chart: null },
  ];

  const LINKS = [['Instagram', '@band.cairo', 'https://www.instagram.com/band.cairo/'], ['Threads', '@band.cairo', 'https://www.threads.com/@band.cairo'], ['X', '@band_cairo', 'https://x.com/band_cairo'],
    ['LinkedIn', 'band.', 'https://www.linkedin.com/company/104876648/'], ['Portfolio', 'band-agents.github.io/band', 'https://band-agents.github.io/band/']];
  const EMAIL = 'hello@band.agency';

  return { PEOPLE, FOLDERS, PROJECTS, byId, SERVICES, CLIENTS, RESULTS, LINKS, EMAIL };
})();
