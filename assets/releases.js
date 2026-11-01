(function () {
  'use strict';

  var API_URL = 'https://api.github.com/repos/Lantern-mc/dist/releases?per_page=100';
  var CACHE_KEY = 'lantern-dist-releases';
  var CACHE_MS = 10 * 60 * 1000;
  var LATEST_EXE =
    'https://github.com/Lantern-mc/dist/releases/latest/download/LanternLauncher.exe';
  var RELEASES_PAGE = 'https://github.com/Lantern-mc/dist/releases';
  var EXE_NAME = 'LanternLauncher.exe';
  var SHA256_SUFFIX = '.sha256';

  var root = document.getElementById('releases');
  if (!root) return;

  var lang = document.documentElement.lang === 'en' ? 'en' : 'ko';
  var t = {
    ko: {
      loading: '버전 목록을 불러오는 중…',
      err: '목록을 불러오지 못했습니다. 최신 버전은 아래 버튼으로 받을 수 있습니다.',
      dlBtn: 'LanternLauncher.exe 받기',
      allVersions: 'GitHub에서 모든 버전 보기',
      latest: '최신',
      preview: '미리보기',
      changes: '변경 내용',
      sha: 'SHA-256 해시',
      thisVersion: '이 버전에서 바뀐 것',
      older: '이전 버전',
      dlShort: '받기',
      tip: 'Windows의 PC 보호 창이 뜨면 추가 정보, 실행 순서로 누르세요.',
    },
    en: {
      loading: 'Loading versions…',
      err: 'Could not load the list. You can still get the latest version below.',
      dlBtn: 'Download LanternLauncher.exe',
      allVersions: 'See all versions on GitHub',
      latest: 'Latest',
      preview: 'Preview',
      changes: 'What changed',
      sha: 'SHA-256 hash',
      thisVersion: 'What changed in this version',
      older: 'Earlier versions',
      dlShort: 'Download',
      tip: 'If Windows shows "Windows protected your PC", choose More info, then Run anyway.',
    },
  }[lang];

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function inlineMd(line) {
    var out = esc(line);
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    return out;
  }

  function renderBody(body) {
    if (!body || !String(body).trim()) return '';
    var lines = String(body).replace(/\r\n/g, '\n').split('\n');
    var html = '';
    var inUl = false;
    var para = [];

    function closeUl() {
      if (inUl) {
        html += '</ul>';
        inUl = false;
      }
    }

    function flushPara() {
      if (para.length) {
        html += '<p>' + para.map(inlineMd).join('<br>') + '</p>';
        para = [];
      }
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();
      if (/^SHA-256:/i.test(trimmed)) continue; // shown as its own link next to the button
      if (trimmed === '') {
        closeUl();
        flushPara();
        continue;
      }
      var hm = trimmed.match(/^(#{1,3})\s+(.*)$/);
      if (hm) {
        closeUl();
        flushPara();
        html += '<h4>' + inlineMd(hm[2]) + '</h4>';
        continue;
      }
      if (/^[-*]\s+/.test(trimmed)) {
        flushPara();
        if (!inUl) {
          html += '<ul>';
          inUl = true;
        }
        html += '<li>' + inlineMd(trimmed.replace(/^[-*]\s+/, '')) + '</li>';
        continue;
      }
      closeUl();
      para.push(line);
    }
    closeUl();
    flushPara();
    return html;
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatMb(bytes) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function versionFromTag(tag) {
    return tag.charAt(0) === 'v' || tag.charAt(0) === 'V' ? tag.slice(1) : tag;
  }

  function exeAsset(assets) {
    if (!assets) return null;
    for (var i = 0; i < assets.length; i++) {
      if (assets[i].name === EXE_NAME) return assets[i];
    }
    return null;
  }

  function shaAsset(assets) {
    if (!assets) return null;
    var want = EXE_NAME + SHA256_SUFFIX;
    for (var i = 0; i < assets.length; i++) {
      if (assets[i].name === want) return assets[i];
    }
    return null;
  }

  function filterReleases(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (r.draft) continue;
      if (!exeAsset(r.assets)) continue;
      out.push(r);
    }
    return out;
  }

  // Index of the newest stable release (the list is newest first), or -1.
  function latestStableIndex(releases) {
    for (var i = 0; i < releases.length; i++) {
      if (!releases[i].prerelease) return i;
    }
    return -1;
  }

  function fallbackHtml() {
    return (
      '<article class="dl-latest dl-fallback"><div class="dl-latest-main"><p class="dl-msg">' +
      esc(t.err) +
      '</p><div class="actions"><a class="btn" href="' +
      esc(LATEST_EXE) +
      '">' +
      esc(t.dlBtn) +
      '</a></div><p class="dl-sub"><a href="' +
      esc(RELEASES_PAGE) +
      '">' +
      esc(t.allVersions) +
      '</a></p></div></article>'
    );
  }

  function meta(r, exe) {
    return (
      '<p class="dl-meta"><time datetime="' +
      esc(r.published_at) +
      '">' +
      esc(formatDate(r.published_at)) +
      '</time><span>' +
      esc(formatMb(exe.size)) +
      '</span></p>'
    );
  }

  // The newest stable release: the one most visitors want.
  function renderLatest(r) {
    var exe = exeAsset(r.assets);
    var sha = shaAsset(r.assets);
    var notes = renderBody(r.body);
    var html =
      '<article class="dl-latest" aria-labelledby="dl-latest-ver"><div class="dl-latest-main">' +
      '<h2 id="dl-latest-ver" class="dl-ver">' +
      esc(versionFromTag(r.tag_name)) +
      '<span class="dl-tag">' +
      esc(t.latest) +
      '</span></h2>' +
      meta(r, exe) +
      '<div class="actions"><a class="btn" href="' +
      esc(exe.browser_download_url) +
      '">' +
      esc(t.dlBtn) +
      '</a></div><p class="dl-sub">' +
      esc(t.tip) +
      '</p>';
    if (sha) html += '<p class="dl-sub"><a href="' + esc(sha.browser_download_url) + '">' + esc(t.sha) + '</a></p>';
    html += '</div>';
    if (notes) html += '<div class="dl-notes"><h3>' + esc(t.thisVersion) + '</h3>' + notes + '</div>';
    return html + '</article>';
  }

  // Every other release: one compact row each.
  function renderRow(r) {
    var exe = exeAsset(r.assets);
    var notes = renderBody(r.body);
    var tag = r.prerelease ? '<span class="dl-tag dl-tag-quiet">' + esc(t.preview) + '</span>' : '';
    var html =
      '<li class="dl-row"><div class="dl-row-head"><div class="dl-row-info"><strong class="dl-row-ver">' +
      esc(versionFromTag(r.tag_name)) +
      '</strong>' +
      tag +
      meta(r, exe) +
      '</div><a class="btn second dl-row-btn" href="' +
      esc(exe.browser_download_url) +
      '" aria-label="' +
      esc(versionFromTag(r.tag_name) + ' ' + t.dlBtn) +
      '">' +
      esc(t.dlShort) +
      '</a></div>';
    if (notes) html += '<details><summary>' + esc(t.changes) + '</summary><div class="dl-row-notes">' + notes + '</div></details>';
    return html + '</li>';
  }

  function renderList(releases) {
    // The page says "take the one at the top": the newest stable release goes first, the rest stay newest first.
    var li = latestStableIndex(releases);
    var html = li >= 0 ? renderLatest(releases[li]) : '';
    var rows = '';
    for (var i = 0; i < releases.length; i++) {
      if (i !== li) rows += renderRow(releases[i]);
    }
    if (rows) html += '<h2 class="dl-older-title">' + esc(t.older) + '</h2><ul class="dl-list">' + rows + '</ul>';
    root.innerHTML = html;
  }

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || Date.now() - parsed.t > CACHE_MS) return null;
      return parsed.data;
    } catch (e) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: data }));
    } catch (e) {
      /* ignore */
    }
  }

  function load() {
    var cached = readCache();
    if (cached) {
      renderList(filterReleases(cached));
      return;
    }
    fetch(API_URL)
      .then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) throw new Error('bad payload');
        writeCache(data);
        var filtered = filterReleases(data);
        if (!filtered.length) throw new Error('empty');
        renderList(filtered);
      })
      .catch(function () {
        root.innerHTML = fallbackHtml();
      });
  }

  load();
})();
