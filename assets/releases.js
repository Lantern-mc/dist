(function () {
  'use strict';

  var API_URL = 'https://api.github.com/repos/Lantern-mc/dist/releases?per_page=100';
  var CACHE_KEY = 'lantern-dist-releases';
  var CACHE_MS = 10 * 60 * 1000;
  var RELEASES_PAGE = 'https://github.com/Lantern-mc/dist/releases';
  var EXE_NAME = 'LanternLauncher.exe';
  var SHA256_SUFFIX = '.sha256';

  var $ = function (id) { return document.getElementById(id); };
  var cta = $('dl-cta');
  if (!cta) return;

  var lang = document.documentElement.lang === 'en' ? 'en' : 'ko';
  var t = {
    ko: {
      err: '버전 목록을 불러오지 못했습니다. 위의 버튼은 그대로 최신 버전을 받습니다.',
      allVersions: 'GitHub에서 모든 버전 보기',
      latest: '최신',
      preview: '미리보기',
      changes: '변경 내용',
      version: function (v) { return '버전 ' + v; },
      changedIn: function (v) { return v + '에서 바뀐 것'; },
      get: '받기',
      getAria: function (v) { return v + ' 받기'; },
    },
    en: {
      err: 'Could not load the version list. The button above still downloads the latest version.',
      allVersions: 'See all versions on GitHub',
      latest: 'Latest',
      preview: 'Preview',
      changes: 'What changed',
      version: function (v) { return 'Version ' + v; },
      changedIn: function (v) { return 'What changed in ' + v; },
      get: 'Download',
      getAria: function (v) { return 'Download ' + v; },
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

  function span(text) {
    return '<span>' + esc(text) + '</span>';
  }

  // Fills the hero, the change notes and the version timeline.
  function render(releases) {
    var li = latestStableIndex(releases);
    var latest = li >= 0 ? releases[li] : releases[0];
    var exe = exeAsset(latest.assets);
    var ver = versionFromTag(latest.tag_name);
    cta.href = exe.browser_download_url;
    $('dl-cta-sub').textContent = t.version(ver);
    var facts = $('dl-facts');
    facts.innerHTML = span(formatDate(latest.published_at)) + span(formatMb(exe.size)) + facts.innerHTML;
    var sha = shaAsset(latest.assets);
    if (sha) {
      var shaLink = $('dl-sha');
      shaLink.href = sha.browser_download_url;
      shaLink.hidden = false;
    }
    var notes = renderBody(latest.body);
    if (notes) {
      $('dl-changes-title').textContent = t.changedIn(ver);
      $('dl-changes-body').innerHTML = notes;
      $('dl-changes').hidden = false;
    }

    var html = '';
    for (var i = 0; i < releases.length; i++) {
      var r = releases[i];
      var e = exeAsset(r.assets);
      var v = versionFromTag(r.tag_name);
      var isLatest = i === li;
      var tag = isLatest
        ? '<span class="dl-tag">' + esc(t.latest) + '</span>'
        : r.prerelease ? '<span class="dl-tag dl-tag-quiet">' + esc(t.preview) + '</span>' : '';
      var body = renderBody(r.body);
      html +=
        '<li class="dl-tl-item' + (isLatest ? ' is-latest' : '') + '"><div class="dl-tl-head"><div class="dl-tl-info">' +
        '<strong class="dl-tl-ver">' + esc(v) + '</strong>' + tag +
        '<span class="dl-tl-meta"><time datetime="' + esc(r.published_at) + '">' + esc(formatDate(r.published_at)) + '</time>' +
        span(formatMb(e.size)) + '</span></div>' +
        '<a class="btn ' + (isLatest ? '' : 'second ') + 'dl-tl-get" href="' + esc(e.browser_download_url) + '" aria-label="' +
        esc(t.getAria(v)) + '">' + esc(t.get) + '</a></div>' +
        (body && !isLatest ? '<details><summary>' + esc(t.changes) + '</summary><div class="dl-notes">' + body + '</div></details>' : '') +
        '</li>';
    }
    $('dl-timeline').innerHTML = html;
  }

  function fail() {
    $('dl-timeline').innerHTML = '';
    var err = $('dl-error');
    err.innerHTML = esc(t.err) + ' <a href="' + esc(RELEASES_PAGE) + '">' + esc(t.allVersions) + '</a>';
    err.hidden = false;
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
    if (cached && filterReleases(cached).length) {
      render(filterReleases(cached));
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
        render(filtered);
      })
      .catch(fail);
  }

  load();
})();
