/*
 * nav.js
 * Satellite-aware navigation router for case studies and shared pages.
 *
 * How it works:
 *   - Reads the ?from= query parameter from the URL
 *   - If present and matches a known satellite, rewrites nav links to point
 *     back to that satellite's index/about/competencies/resume
 *   - Preserves the ?from= parameter on links to Foundation and other case
 *     studies, so navigation across the main Portfolio keeps the satellite
 *     context intact
 *   - Rewrites both the top header nav (.site-nav) AND the project sub-nav
 *     (sibling case-study tabs at the top of each case study)
 *   - If no ?from= parameter is present, leaves nav links untouched (default
 *     main-Portfolio routing applies)
 */
(function () {
  'use strict';

  var SATELLITES = {
    revops: 'https://adamkolt.github.io/RevOps',
    salesgtm: 'https://adamkolt.github.io/SalesGTM',
    comms: 'https://adamkolt.github.io/Comms',
    enablement: 'https://adamkolt.github.io/Enablement'
  };

  var PORTFOLIO_BASE = 'https://adamkolt.github.io/Portfolio';

  // Per-satellite ordered list of case-study slugs (filename without .html).
  // When set, the sub-nav on case-study pages is filtered + reordered to match.
  // When a satellite is absent from this map, the sub-nav is left as-is.
  var SATELLITE_CASES = {
    comms: [
      { slug: 'market-creation', label: 'Market Creation' },
      { slug: 'data-monetization', label: 'Data Monetization' },
      { slug: 'embedded-onboarding', label: 'Embedded Distribution' },
      { slug: 'digital-self-service', label: 'Digital Self-Service' },
      { slug: 'cctv-as-a-service', label: 'CCTV-as-a-Service' },
      { slug: 'huawei-ideahub', label: 'Account Entrenchment' }
    ]
  };

  function rewriteLink(link, satellite, from) {
    var href = link.getAttribute('href');
    if (!href) return;
    if (href.charAt(0) === '#') return;
    if (href.indexOf('mailto:') === 0) return;
    if (href.indexOf('http://') === 0 || href.indexOf('https://') === 0) return;

    // Strip a leading "../" if present (case studies sit in /impact/)
    var clean = href.replace(/^\.\.\//, '');

    // Skip non-html link targets (PDFs, images, anchors)
    if (clean.slice(-5) !== '.html' && clean !== '' && clean !== '/') {
      return;
    }

    if (clean === 'index.html' || clean === '' || clean === '/') {
      link.href = satellite + '/index.html';
    } else if (clean === 'about.html') {
      link.href = satellite + '/about.html';
    } else if (clean === 'competencies.html') {
      link.href = satellite + '/competencies.html';
    } else if (clean === 'resume.html') {
      link.href = satellite + '/resume.html';
    } else if (clean === 'education.html') {
      link.href = PORTFOLIO_BASE + '/education.html?from=' + from;
    } else if (clean.slice(-5) === '.html') {
      // Likely a case-study link. Preserve ?from= so satellite context
      // is carried across case-to-case navigation.
      var pathname = window.location.pathname;
      var isInImpact = pathname.indexOf('/impact/') !== -1;

      if (isInImpact && href.indexOf('..') !== 0) {
        // Same-directory case study link (e.g., "digital-self-service.html")
        link.href = PORTFOLIO_BASE + '/impact/' + clean + '?from=' + from;
      } else {
        link.href = PORTFOLIO_BASE + '/' + clean + '?from=' + from;
      }
    }
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    var from = params.get('from');

    // Default to RevOps when no satellite context is provided. This keeps
    // case studies and the Foundation page navigable when visited directly
    // (e.g., from a shared link, a search result, or a redirect from the
    // legacy main-Portfolio URL).
    if (!from || !SATELLITES[from]) {
      from = 'revops';
    }

    var satellite = SATELLITES[from];

    // Rewrite top header nav links
    var siteNavLinks = document.querySelectorAll('.site-nav a');
    siteNavLinks.forEach(function (link) {
      rewriteLink(link, satellite, from);
    });

    // Rewrite header logo link
    var logo = document.querySelector('.header-logo');
    if (logo) {
      logo.href = satellite + '/index.html';
    }

    // Rewrite all other relative-html links on the page (catches case-study
    // sub-nav tabs and any inter-case-study links in body content)
    var allLinks = document.querySelectorAll('a[href]');
    allLinks.forEach(function (link) {
      // Skip links already handled above (site-nav and logo)
      if (link.closest('.site-nav')) return;
      if (link.classList.contains('header-logo')) return;
      rewriteLink(link, satellite, from);
    });

    // Filter + reorder the case-study sub-nav for satellites that define a
    // curated case list. Detect the sub-nav by finding any anchor whose
    // (original) href matches a known case slug; its parent flex row is the
    // sub-nav container.
    var caseList = SATELLITE_CASES[from];
    if (caseList && window.location.pathname.indexOf('/impact/') !== -1) {
      var subnav = null;
      var anchors = document.querySelectorAll('a[href]');
      for (var i = 0; i < anchors.length; i++) {
        var a = anchors[i];
        if (a.closest('.site-nav')) continue;
        if (a.classList.contains('header-logo')) continue;
        var h = a.getAttribute('href') || '';
        // Match either the rewritten absolute URL or the original relative one
        if (/\/impact\/[a-zA-Z0-9-]+\.html/.test(h) || /^[a-zA-Z0-9-]+\.html$/.test(h)) {
          // Heuristic: sub-nav parent contains multiple such links
          var parent = a.parentElement;
          if (parent && parent.querySelectorAll('a[href]').length >= 3) {
            subnav = parent;
            break;
          }
        }
      }

      if (subnav) {
        var tabs = Array.prototype.slice.call(subnav.querySelectorAll(':scope > a'));
        var bySlug = {};
        tabs.forEach(function (t) {
          var href = t.getAttribute('href') || '';
          var m = href.match(/([a-zA-Z0-9-]+)\.html/);
          if (m) bySlug[m[1].toLowerCase()] = t;
        });

        // Current page slug (to mark active tab)
        var pageMatch = window.location.pathname.match(/\/impact\/([a-zA-Z0-9-]+)\.html/);
        var currentSlug = pageMatch ? pageMatch[1].toLowerCase() : '';

        // Template tab to clone styling from (pick any existing inactive tab)
        var templateTab = tabs[0];

        // Detach all existing tabs
        tabs.forEach(function (t) { if (t.parentElement) t.parentElement.removeChild(t); });

        // Build curated tabs in order. Clone the template for missing slugs.
        caseList.forEach(function (entry) {
          var slug = entry.slug.toLowerCase();
          var t = bySlug[slug];
          if (!t && templateTab) {
            t = templateTab.cloneNode(true);
            t.textContent = entry.label;
            t.href = PORTFOLIO_BASE + '/impact/' + entry.slug + '.html?from=' + from;
          }
          if (!t) return;
          // Style active vs inactive
          var isActive = (slug === currentSlug);
          var baseStyle = 'padding:10px 10px;font-size:13px;white-space:nowrap;';
          if (isActive) {
            t.setAttribute('style', baseStyle + 'font-weight:600;color:var(--navy);border-bottom:2px solid var(--gold);');
          } else {
            t.setAttribute('style', baseStyle + 'font-weight:500;color:var(--muted);border-bottom:2px solid transparent;');
          }
          subnav.appendChild(t);
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
