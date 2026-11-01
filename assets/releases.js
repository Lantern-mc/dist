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
      sha: 'SHA-256',
    },
    en: {
      loading: 'Loading versions…',
      err: 'Could not load the list. You can still get the latest version below.',
      dlBtn: 'Download LanternLauncher.exe',
      allVersions: 'See all versions on GitHub',
      latest: 'Latest',
      preview: 'Preview',
      changes: 'What changed',
      sha: 'SHA-256',
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
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
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
      '<p>' +
      esc(t.err) +
      '</p><div class="actions"><a class="btn" href="' +
      esc(LATEST_EXE) +
      '">' +
      esc(t.dlBtn) +
      '</a></div><p class="small"><a href="' +
      esc(RELEASES_PAGE) +
      '">' +
      esc(t.allVersions) +
      '</a></p>'
    );
  }

  function renderRelease(r, isLatest) {
    var exe = exeAsset(r.assets);
    var sha = shaAsset(r.assets);
    var ver = versionFromTag(r.tag_name);
    var tagLabel = '';
    if (r.prerelease) {
      tagLabel = '<code>' + esc(t.preview) + '</code>';
    } else if (isLatest) {
      tagLabel = '<code>' + esc(t.latest) + '</code>';
    }
    var btnClass = isLatest ? 'btn' : 'btn second';
    var block =
      '<section class="rel"><div class="ver"><h2>' +
      esc(ver) +
      '</h2>' +
      tagLabel +
      '</div><p class="rel-meta">' +
      esc(formatDate(r.published_at)) +
      ' · ' +
      esc(formatMb(exe.size)) +
      '</p><div class="actions"><a class="' +
      btnClass +
      '" href="' +
      esc(exe.browser_download_url) +
      '">' +
      esc(t.dlBtn) +
      '</a></div>';
    if (sha) {
      block +=
        '<p class="small"><a href="' +
        esc(sha.browser_download_url) +
        '">' +
        esc(t.sha) +
        '</a></p>';
    }
    var bodyHtml = renderBody(r.body);
    if (bodyHtml) {
      block +=
        '<details><summary>' +
        esc(t.changes) +
        '</summary><div>' +
        bodyHtml +
        '</div></details>';
    }
    block += '</section>';
    return block;
  }

  function renderList(releases) {
    // The page says "take the one at the top": the newest stable release goes first, the rest stay newest first.
    var li = latestStableIndex(releases);
    var html = li >= 0 ? renderRelease(releases[li], true) : '';
    for (var i = 0; i < releases.length; i++) {
      if (i !== li) html += renderRelease(releases[i], false);
    }
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
