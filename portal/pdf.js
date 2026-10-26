// A signed agreement as a PDF, built in the browser. jsPDF is only fetched when someone presses download.
const SRC = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const load = () => window.jspdf ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = SRC; s.onload = ok; s.onerror = () => no(new Error('Could not load the PDF tool. Use Print instead.')); document.head.append(s); });
const img = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

export async function agreementPdf({ title, text, client, signature, countersign, docHash, studio = 'band.' }) {
  await load(); const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const M = 60, W = 595 - M * 2, BOT = 780; let y = 70;
  const room = h => { if (y + h > BOT) { doc.addPage(); y = 70; } };
  const para = (s, { size = 10.5, bold = false, gap = 6, indent = 0, color = 40, lh = 1.5 } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(size).setTextColor(color);
    for (const ln of doc.splitTextToSize(s, W - indent)) { room(size * lh); doc.text(ln, M + indent, y); y += size * lh; } y += gap;
  };
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(120).text(`${studio.toUpperCase()}  ·  ${client.toUpperCase()}`, M, 40);
  for (const raw of String(text).split('\n')) {
    const l = raw.trimEnd().replace(/\*\*/g, '');
    if (!l) continue;
    if (l.startsWith('# ')) para(l.slice(2), { size: 22, bold: true, gap: 12, color: 10, lh: 1.25 });
    else if (l.startsWith('## ')) { y += 8; room(40); para(l.slice(3), { size: 12.5, bold: true, gap: 3, color: 10 }); }
    else if (l.startsWith('- ')) { room(16); doc.setFontSize(10.5).setTextColor(40).text('•', M + 4, y); const keep = y; para(l.slice(2), { indent: 16, gap: 2 }); if (y === keep) y += 14; }
    else para(l);
  }
  // signatures
  room(230); y += 18; doc.setDrawColor(200).line(M, y, M + W, y); y += 24;
  para('Signatures', { size: 12.5, bold: true, color: 10, gap: 10 });
  const top = y, col = W / 2 - 10;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(120).text('FOR THE CLIENT', M, top);
  if (signature) {
    const im = await img(signature.drawing);
    if (im) { const h = 52, w = Math.min(col, h * im.width / im.height); doc.addImage(signature.drawing, 'PNG', M, top + 8, w, h); }
    doc.setDrawColor(30).line(M, top + 66, M + col, top + 66);
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(10).text(signature.name, M, top + 82);
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(90).text([signature.title || '', `Signed ${new Date(signature.at).toUTCString()}`].filter(Boolean), M, top + 96);
  }
  const x2 = M + W / 2 + 10;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(120).text(`FOR ${studio.toUpperCase()}`, x2, top);
  doc.setDrawColor(30).line(x2, top + 66, x2 + col, top + 66);
  if (countersign) {
    doc.setFont('times', 'italic').setFontSize(22).setTextColor(10).text(countersign.name, x2, top + 52);
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(90).text(`Countersigned ${new Date(countersign.at).toUTCString()}`, x2, top + 82);
  } else doc.setFont('helvetica', 'italic').setFontSize(10).setTextColor(150).text('Awaiting countersignature', x2, top + 52);
  y = top + 120;
  if (signature) {
    doc.setFillColor(246, 246, 240).roundedRect(M, y, W, 64, 6, 6, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(90).text('SIGNATURE RECORD', M + 12, y + 16);
    doc.setFont('courier', 'normal').setFontSize(8).setTextColor(70).text(doc.splitTextToSize(`Signed electronically by typed name and drawn signature.\nTime: ${signature.at}   Network: ${signature.ip}\nDocument fingerprint (SHA-256): ${docHash || signature.docHash}`, W - 24), M + 12, y + 30);
  }
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(150).text(`${title}  ·  page ${i} of ${n}`, M, 820); }
  doc.save(`${client.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-agreement.pdf`);
}
