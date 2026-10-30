// A signed agreement as a PDF, built in the browser. jsPDF is only fetched when someone presses download.
const SRC = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const load = () => window.jspdf ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = SRC; s.onload = ok; s.onerror = () => no(new Error('Could not load the PDF tool. Use Print instead.')); document.head.append(s); });
const img = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

// The agreement as a PDF: blank (to print and sign by hand), or signed (drawn in the portal, or by hand with the signed pages attached).
// annex: the studio's legal papers [{ title, data }]; hand: photos or scans of the pages signed by hand [{ name, data }].
export async function agreementPdf({ title, text, client, signature, countersign, docHash, studio = 'band.', blank = false, annex = [], hand = [] }) {
  await load(); const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const M = 60, W = 595 - M * 2, BOT = 770; let y = 70;
  const room = h => { if (y + h > BOT) { doc.addPage(); y = 70; } };
  const para = (s, { size = 10.5, bold = false, gap = 6, indent = 0, color = 40, lh = 1.5 } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(size).setTextColor(color);
    for (const ln of doc.splitTextToSize(s, W - indent)) { room(size * lh); doc.text(ln, M + indent, y); y += size * lh; } y += gap;
  };
  // jsPDF's built-in fonts have no "…", so the dotted blanks become plain dots
  const clean = s => s.replace(/\*\*/g, '').replace(/…/g, '...');
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(120).text(`${studio.toUpperCase()}  ·  ${client.toUpperCase()}`, M, 40);
  for (const raw of String(text).split('\n')) {
    const l = clean(raw.trimEnd());
    if (!l) continue;
    if (l.startsWith('# ')) para(l.slice(2), { size: 20, bold: true, gap: 10, color: 10, lh: 1.25 });
    else if (l.startsWith('## ')) { y += 8; room(40); para(l.slice(3), { size: 12.5, bold: true, gap: 3, color: 10 }); }
    else if (l.startsWith('- ')) { room(16); doc.setFontSize(10.5).setTextColor(40).text('•', M + 4, y); const keep = y; para(l.slice(2), { indent: 16, gap: 2 }); if (y === keep) y += 14; }
    else para(l);
  }
  // signatures: two columns, the Client on the left and the Studio on the right
  room(250); y += 18; doc.setDrawColor(200).line(M, y, M + W, y); y += 24;
  para('Signatures', { size: 12.5, bold: true, color: 10, gap: 10 });
  const top = y, col = W / 2 - 10, x2 = M + W / 2 + 10;
  const lines = x => { doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(90); [['Name', 22], ['Title', 52], ['Signature', 92], ['Date', 122]].forEach(([l, d]) => { doc.text(l, x, top + d); doc.setDrawColor(160).line(x + 52, top + d + 2, x + col, top + d + 2); }); };
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(120).text('FOR THE CLIENT (SECOND PARTY)', M, top);
  if (signature?.method === 'hand') {
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(10).text(signature.name, M, top + 30);
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(90).text([signature.title || '', `Signed by hand, uploaded ${new Date(signature.at).toUTCString()}`, 'The signed pages are attached at the end.'].filter(Boolean), M, top + 46);
  } else if (signature) {
    const im = await img(signature.drawing);
    if (im) { const h = 52, w = Math.min(col, h * im.width / im.height); doc.addImage(signature.drawing, 'PNG', M, top + 8, w, h); }
    doc.setDrawColor(30).line(M, top + 66, M + col, top + 66);
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(10).text(signature.name, M, top + 82);
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(90).text([signature.title || '', `Signed ${new Date(signature.at).toUTCString()}`].filter(Boolean), M, top + 96);
  } else lines(M);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(120).text(`FOR ${studio.toUpperCase()} (FIRST PARTY)`, x2, top);
  if (countersign) {
    doc.setDrawColor(30).line(x2, top + 66, x2 + col, top + 66);
    doc.setFont('times', 'italic').setFontSize(22).setTextColor(10).text(countersign.name, x2, top + 52);
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(90).text(`Countersigned ${new Date(countersign.at).toUTCString()}`, x2, top + 82);
  } else if (blank) lines(x2);
  else { doc.setDrawColor(30).line(x2, top + 66, x2 + col, top + 66); doc.setFont('helvetica', 'italic').setFontSize(10).setTextColor(150).text('Awaiting countersignature', x2, top + 52); }
  y = top + 145;
  if (signature) {
    room(70); doc.setFillColor(246, 246, 240).roundedRect(M, y, W, 64, 6, 6, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(90).text('SIGNATURE RECORD', M + 12, y + 16);
    doc.setFont('courier', 'normal').setFontSize(8).setTextColor(70).text(doc.splitTextToSize(`${signature.method === 'hand' ? `Signed by hand on a printed copy; ${hand.length || (signature.files || []).length} page(s) uploaded to the portal.` : 'Signed electronically by typed name and drawn signature.'}\nTime: ${signature.at}   Network: ${signature.ip}\nDocument fingerprint (SHA-256): ${docHash || signature.docHash}`, W - 24), M + 12, y + 30);
  }
  // full pages after the agreement: the annexes, then the pages signed by hand
  // a wide scan (like a commercial register extract) gets a landscape page so it stays readable
  const page = async (heading, data) => {
    const pdf = data.startsWith('data:application/pdf'), im = pdf ? null : await img(data), wide = im && im.width > im.height;
    doc.addPage('a4', wide ? 'l' : 'p'); y = 60;
    doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(10).text(heading, M, y); y += 22;
    if (pdf || !im) return doc.setFont('helvetica', 'normal').setFontSize(10.5).setTextColor(110).text(pdf ? 'This document is a PDF. Open it from the Agreement page in the portal.' : 'This image could not be added.', M, y);
    const pw = doc.internal.pageSize.getWidth() - M * 2, ph = doc.internal.pageSize.getHeight() - y - 50, k = Math.min(pw / im.width, ph / im.height);
    doc.addImage(data, data.startsWith('data:image/png') ? 'PNG' : 'JPEG', M, y, im.width * k, im.height * k);
  };
  for (const [i, a] of annex.entries()) await page(`Annex ${i + 1}: ${a.title}`, a.data);
  for (const [i, h] of hand.entries()) await page(`Signed copy · page ${i + 1} of ${hand.length}`, h.data);
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); const fy = doc.internal.pageSize.getHeight() - 22, fx = doc.internal.pageSize.getWidth() - M;
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(150).text(`${title}  ·  page ${i} of ${n}`, M, fy);
    if (blank) { doc.text('Initials', fx - 120, fy); doc.setDrawColor(170).line(fx - 86, fy + 1, fx, fy + 1); }
  }
  doc.save(`${client.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-agreement${blank ? '-to-sign' : ''}.pdf`);
}

// Everything a client has sent us, as one tidy file for staff. The caller hands over plain sections; this only lays them out.
// sections: [{ title, hint, blocks: [{ title, sub, status: [label, tone], rows: [[label, value]], note, comment, quiet }] }]  quiet = no "Nothing sent yet" line
const TONE = { live: [16, 168, 98], ok: [20, 20, 20], warn: [201, 138, 11], bad: [208, 64, 43], '': [150, 150, 145] };
export async function clientDataPdf({ studio = 'band.', client, facts = [], progress, sections }) {
  await load(); const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const M = 50, W = 595 - M * 2, BOT = 790, LW = 150, VX = M + LW + 12, VW = W - LW - 12; let y = 0;
  const now = new Date(), stamp = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const room = h => { if (y + h > BOT) { doc.addPage(); y = 60; return true; } return false; };
  const font = (size, style = 'normal', color = 30) => doc.setFont('helvetica', style).setFontSize(size).setTextColor(...[].concat(color));

  // cover: black band with the client's name, then the key facts in a row
  doc.setFillColor(12, 12, 12).rect(0, 0, 595, 170, 'F');
  font(9, 'bold', 160).text(`${studio.toUpperCase()}  ·  CLIENT FILE`, M, 46);
  font(9, 'normal', 160).text(stamp, M + W, 46, { align: 'right' });
  font(30, 'bold', 255); const nm = doc.splitTextToSize(client, W); doc.text(nm.slice(0, 2), M, 102);
  if (progress) {
    const p = progress.done / Math.max(1, progress.total), by = 140;
    doc.setFillColor(60, 60, 60).rect(M, by, W, 4, 'F'); doc.setFillColor(...TONE.live).rect(M, by, W * p, 4, 'F');
    font(8.5, 'normal', 170).text(`${progress.done} of ${progress.total} required items done  ·  ${progress.verified} verified  ·  ${progress.awaiting} to review  ·  ${progress.help} need help`, M, by + 18);
  }
  y = 200;
  // facts are [label, value, width weight]; a wider column keeps an email on one line
  const unit = W / facts.reduce((a, f) => a + (f[2] || 1), 0); let x = M;
  facts.forEach(([k, v, wt = 1]) => { const cw = unit * wt; font(7.5, 'bold', 130).text(k.toUpperCase(), x, y); font(10.5, 'bold', 20).text(doc.splitTextToSize(String(v || '—'), cw - 12).slice(0, 4), x, y + 15); x += cw; });
  y += 58; doc.setDrawColor(220).line(M, y, M + W, y); y += 30;

  // one label/value row; long values wrap and may carry over to the next page
  const row = (label, value) => {
    const empty = value === undefined || value === null || value === '';
    const v = empty ? 'Not answered' : value === true ? 'Yes' : value === false ? 'No' : String(value);
    // each typed line keeps its own link, so a list of competitors links only the lines that are urls
    font(10, empty ? 'italic' : 'normal'); const lines = v.split('\n').flatMap(p => { const url = /^https?:\/\/\S+$/.test(p.trim()) ? p.trim() : null; return doc.splitTextToSize(p, VW).map(t => [t, url]); });
    font(8.5, 'bold'); const lab = doc.splitTextToSize(label, LW);
    const h = Math.max(lines.length, lab.length) * 14 + 10; if (h < BOT - 60) room(h);
    const top = y; font(8.5, 'bold', 110).text(lab, M, y);
    lines.forEach(([ln, url], i) => { if (i) room(14); font(10, empty ? 'italic' : 'normal', empty ? 165 : url ? [16, 120, 80] : 25); url ? doc.textWithLink(ln, VX, y, { url }) : doc.text(ln, VX, y); y += 14; });
    y = Math.max(y, top + lab.length * 14) - 4; doc.setDrawColor(232).line(M, y, M + W, y); y += 14;
  };
  const box = (label, text, fill) => {
    font(10, 'normal'); const lines = doc.splitTextToSize(text, W - 24), h = lines.length * 14 + 30; room(h + 6);
    doc.setFillColor(...fill).roundedRect(M, y - 6, W, h, 4, 4, 'F');
    font(7.5, 'bold', 110).text(label.toUpperCase(), M + 12, y + 8); font(10, 'normal', 35).text(lines, M + 12, y + 24); y += h + 6;
  };

  sections.forEach(s => {
    room(150); y += 6;
    doc.setFillColor(12, 12, 12).rect(M, y - 15, W, 26, 'F'); font(12, 'bold', 255).text(s.title.toUpperCase(), M + 10, y + 2); y += 24;
    if (s.hint) { font(9, 'italic', 120).text(s.hint, M, y); y += 20; }
    s.blocks.forEach(b => {
      room(100);
      font(12.5, 'bold', 10); const tl = doc.splitTextToSize(b.title, W - 120); doc.text(tl, M, y);
      if (b.status) { const [lab, tone] = b.status, c = TONE[tone] || TONE[''], tw = doc.setFontSize(7.5).getTextWidth(lab.toUpperCase()) + 14; doc.setFillColor(...c).roundedRect(M + W - tw, y - 10, tw, 15, 7, 7, 'F'); font(7.5, 'bold', 255).text(lab.toUpperCase(), M + W - tw / 2, y, { align: 'center' }); }
      y += (tl.length - 1) * 16 + 6;
      if (b.sub) { font(8.5, 'normal', 130).text(b.sub, M, y + 4); y += 12; }
      y += 14;
      if (b.rows.length) b.rows.forEach(([l, v]) => row(l, v)); else if (!b.note && !b.quiet) { font(9.5, 'italic', 165).text('Nothing sent yet.', M, y); y += 20; }
      if (b.note) box('Their note', b.note, [246, 246, 240]);
      if (b.comment) box('Our comment', b.comment, [232, 245, 238]);
      y += 20;
    });
    y += 6;
  });

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); font(7.5, 'normal', 150).text(`${client}  ·  client file  ·  ${stamp}`, M, 820); doc.text(`${i} / ${n}`, M + W, 820, { align: 'right' }); }
  doc.save(`${client.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-client-file-${now.toISOString().slice(0, 10)}.pdf`);
}
