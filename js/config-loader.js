(function () {
  'use strict';
  const showFatal = (message) => {
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#04302c;color:white;display:grid;place-items:center;padding:24px;text-align:center;font-family:system-ui';
    box.innerHTML = '<div><h2>Undangan belum dapat dimuat</h2><p style="margin-top:10px;opacity:.85">' + message + '</p></div>';
    document.body.appendChild(box);
  };
  try {
    const d = window.WEDDING_DATA;
    if (!d || typeof d !== 'object') throw new Error('Data undangan tidak ditemukan');
    const required = [d?.couple?.groom?.nickname, d?.couple?.bride?.nickname, d?.event?.isoDate, d?.event?.mapsUrl];
    if (required.some(v => !v)) throw new Error('Data utama belum lengkap');
    // Sinkronkan teks statis utama dengan JSON agar data klien cukup diedit di satu tempat.
    const replacements = new Map([
      ['Indra & Ande Ica', `${d.couple.groom.nickname} & ${d.couple.bride.nickname}`],
      ['Indra dan Ande Ica', `${d.couple.groom.nickname} dan ${d.couple.bride.nickname}`],
      ['Senin, 15 Maret 2027', d.event.displayDate],
      ['07.00 WIB s/d selesai', d.event.time],
      ['Kediaman Mempelai Wanita', d.event.venue],
      ['0747 0103 8536 530', d.gift.bank.display],
      ['0815 7308 3307', d.gift.ewallet.display],
      ['Indra Lesman', d.gift.bank.accountName]
    ]);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => { let value = node.nodeValue; replacements.forEach((next, old) => { value = value.split(old).join(next); }); node.nodeValue = value; });
    document.querySelectorAll('a[href*="maps.app.goo.gl"]').forEach(a => { a.href = d.event.mapsUrl; });
    document.title = `Grup Hajatan 💍 — Undangan Digital ${d.couple.groom.nickname} & ${d.couple.bride.nickname}`;

    window.WEDDING_CONFIG = {
      groupName: d.groupName || 'Grup Hajatan',
      pria: { name:d.couple.groom.nickname, fullName:d.couple.groom.fullName, father:d.couple.groom.father, mother:d.couple.groom.mother, childOrder:d.couple.groom.childOrder, address:d.couple.groom.address, instagram:d.couple.groom.instagram || '', avatar:'', color:'#0369a1', avaBg:`url(${d.media.groomProfile}) center/cover no-repeat` },
      wanita: { name:d.couple.bride.nickname, fullName:d.couple.bride.fullName, father:d.couple.bride.father, mother:d.couple.bride.mother, childOrder:d.couple.bride.childOrder, address:d.couple.bride.address, instagram:d.couple.bride.instagram || '', avatar:'', color:'#be185d', avaBg:`url(${d.media.brideProfile}) center/cover no-repeat` },
      ustad: { name:d.host?.name || 'Pembawa Acara', avatar:d.host?.avatar || '🕌', color:'#b45309', avaBg:'linear-gradient(145deg,#fbbf24,#b45309)' },
      eventDate:d.event.isoDate, eventDateText:d.event.displayDate, eventTime:d.event.time,
      akadTime:d.event.akad, receptionTime:d.event.reception, venueName:d.event.venue,
      eventPlace:d.event.place, mapsUrl:d.event.mapsUrl,
      bank:{ name:d.gift.bank.name, number:d.gift.bank.accountNumber, display:d.gift.bank.display, owner:d.gift.bank.accountName },
      ewallet:{ name:d.gift.ewallet.name, number:d.gift.ewallet.number, display:d.gift.ewallet.display, owner:d.gift.ewallet.accountName },
      musicTitle:'🎵 Musik Latar Undangan', musicFile:d.media.music, musicFallback:d.media.music,
      videoCallFile:d.media.videoCall, voiceCallFile:d.media.voiceCall, gallery:d.media.gallery || []
    };
    const script = document.createElement('script');
    script.src = 'js/app.js';
    script.defer = true;
    script.onerror = () => showFatal('File aplikasi tidak ditemukan.');
    document.body.appendChild(script);
  } catch (error) {
    console.error(error);
    showFatal('Periksa file data/wedding-data.js dan pastikan seluruh folder proyek tetap utuh.');
  }
})();
