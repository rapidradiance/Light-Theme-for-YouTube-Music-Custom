// ==UserScript==
// @name         YTM lyrics beside queue
// @match        https://music.youtube.com/*
// @grant        none
// ==/UserScript==

(function () {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const style = document.createElement('style');
  style.textContent = `
    #my-lyrics-panel {
  position: relative !important;
  top: auto !important; left: auto !important;
  right: auto !important; bottom: auto !important;
  flex: 1 1 0;
  min-width: 0;
  margin: 100px 40px 0 40px;
  height: calc(100vh - 220px);
  overflow-y: auto;
  font-size: 20px; font-weight: 700; line-height: 1.5;
  white-space: pre-wrap; color: #000 !important;
}
    #my-lyrics-panel .src { font-size: 12px; font-weight: 400; opacity: .6; margin-top: 16px; }
    html.my-lyrics-scraping ytmusic-player-page #side-panel { opacity: 0 !important; }
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'my-lyrics-panel';
   function attachPanel() {
    const content = document.querySelector('ytmusic-player-page > .content');
    if (content && panel.parentElement !== content) content.appendChild(panel);
  }
  attachPanel();
  setInterval(attachPanel, 1000);

  function setLyrics(text, source) {
    panel.textContent = text;
    if (source) {
      const s = document.createElement('div');
      s.className = 'src';
      s.textContent = source;
      panel.appendChild(s);
    }
    panel.scrollTop = 0;
  }

  async function scrape() {
    const tabs = [...document.querySelectorAll('ytmusic-player-page #side-panel tp-yt-paper-tab')];
    if (tabs.length < 2) return false;
    const lyricsTab = tabs[1];

    if (lyricsTab.getAttribute('aria-disabled') === 'true') {
      setLyrics('No lyrics available for this song.');
      return true;
    }

    const original = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
    if (original === lyricsTab) return true;

    document.documentElement.classList.add('my-lyrics-scraping');
    lyricsTab.click();

    let text = '', source = '';
    const shelf = 'ytmusic-description-shelf-renderer[is-track-lyrics-page]';
    for (let i = 0; i < 25 && !text; i++) {
      await sleep(200);
      const el = document.querySelector(shelf + ' yt-formatted-string.non-expandable');
      text = el ? (el.innerText || el.textContent).trim() : '';
      const f = document.querySelector(shelf + ' yt-formatted-string.footer');
      source = f ? f.textContent.trim() : '';
    }

    original.click();
    await sleep(150);
    document.documentElement.classList.remove('my-lyrics-scraping');

    setLyrics(text || 'Lyrics not found.', source);
    return true;
  }

  let lastKey = '', busy = false;

  setInterval(async () => {
    const pp = document.querySelector('ytmusic-player-page');
    const open = pp && pp.hasAttribute('player-page-open');
    const tabs = document.querySelectorAll('ytmusic-player-page #side-panel tp-yt-paper-tab');
    const onLyricsTab = tabs[1] && tabs[1].getAttribute('aria-selected') === 'true';


    panel.style.display = (open && !onLyricsTab) ? 'block' : 'none';

    const t = document.querySelector('ytmusic-player-bar .title');
    const key = t && t.textContent.trim();
    if (!open || !key || key === lastKey || busy) return;

    busy = true;
    await sleep(1000);
    if (await scrape()) lastKey = key;
    busy = false;
  }, 1000);
})();
