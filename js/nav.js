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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
