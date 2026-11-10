// Out of Sight — hides GitHub comments/reviews authored by blocked users.
(() => {
  const HIDDEN = 'oos-hidden';
  const HIT = 'oos-hit'; // hidden because of its author (vs. emptied container)

  // Elements that identify a comment's author (users and bots/apps).
  const AUTHOR_SELECTOR = [
    'a.author',
    'a[data-hovercard-type="user"]',
    'a[data-hovercard-type="bot"]',
    'a[data-hovercard-type="integration"]',
    'a[data-hovercard-url^="/users/"]',
    'a[data-testid="avatar-link"]',
    '[data-testid="author-link"]',
  ].join(',');

  // Author links that are NOT comment authors (mentions, comment bodies, sidebar).
  const IGNORE_SELECTOR =
    '.user-mention, .comment-body, .markdown-body, .discussion-sidebar, #partial-discussion-sidebar, .js-comment-edit-history';

  // One whole comment (avatar + box), tried in order. Inline review comments
  // first, then the outer timeline wrapper so the avatar is hidden too.
  const UNIT_SELECTORS = [
    '.review-comment',
    '.js-comment-container',
    '.timeline-comment-group',
    '.timeline-comment',
    '[data-testid="review-thread-comment"]',
    '[data-testid="comment-viewer-outer-box"]',
    '[data-testid*="comment-container" i]',
  ];
  const COMMENT_SELECTOR = UNIT_SELECTORS.join(',');

  // Containers that should vanish when every comment inside them is hidden.
  const THREAD_SELECTOR = [
    '.js-resolvable-timeline-thread-container',
    '.review-thread-component',
    '.js-inline-comments-container',
    '.inline-comments',
    '[data-testid="review-thread"]',
    '.js-timeline-item',
  ].join(',');

  // "@Name[bot]" -> "name": case-insensitive, ignores leading @ and [bot] suffix.
  const normalize = (s) =>
    (s || '').trim().replace(/^@/, '').replace(/\[bot\]$/i, '').replace(/\s+/g, ' ').trim().toLowerCase();

  function authorKeys(el) {
    const keys = new Set();
    const add = (v) => { const n = normalize(v); if (n) keys.add(n); };

    add(el.textContent);
    const img = el.querySelector('img[alt]');
    if (img) add(img.getAttribute('alt'));
    add(el.getAttribute('aria-label'));

    const hovercard = el.getAttribute('data-hovercard-url');
    const m = hovercard && hovercard.match(/^\/(?:users|apps)\/([^/]+)/);
    if (m) add(decodeURIComponent(m[1]));

    const href = el.getAttribute('href');
    if (href) {
      try {
        const url = new URL(href, 'https://github.com');
        const parts = url.pathname.split('/').filter(Boolean);
        if (url.hostname === 'github.com') {
          if (parts.length === 1) add(decodeURIComponent(parts[0]));
          if (parts.length === 2 && parts[0] === 'apps') add(decodeURIComponent(parts[1]));
        }
      } catch (_) { /* ignore bad href */ }
    }
    return keys;
  }

  function isBlocked(el, blocked) {
    for (const k of authorKeys(el)) if (blocked.has(k)) return true;
    return false;
  }

  function hide(el, hit) {
    el.classList.add(HIDDEN);
    if (hit) el.classList.add(HIT);
  }

  function commentUnit(a) {
    for (const sel of UNIT_SELECTORS) {
      const unit = a.closest(sel);
      if (unit) return unit;
    }
    return null;
  }

  function apply(root, blocked) {
    if (!blocked.size) return;

    root.querySelectorAll(AUTHOR_SELECTOR).forEach((a) => {
      if (a.closest(IGNORE_SELECTOR)) return;
      if (!isBlocked(a, blocked)) return;

      const unit = commentUnit(a);
      if (unit) { hide(unit, true); return; }

      // Review header ("X reviewed / approved / requested changes") — hide whole review.
      const item = a.closest('.js-timeline-item');
      if (item && item.querySelector('[id^="pullrequestreview-"], .js-comment, .review-comment')) {
        hide(item, true);
      }
    });

    // Collapse threads/timeline items left with only hidden comments.
    root.querySelectorAll(THREAD_SELECTOR).forEach((t) => {
      if (t.classList.contains(HIDDEN)) return;
      const comments = t.querySelectorAll(COMMENT_SELECTOR);
      if (comments.length && [...comments].every((c) => c.closest('.' + HIDDEN))) hide(t);
    });
  }

  function reset(root) {
    root.querySelectorAll('.' + HIDDEN).forEach((el) => el.classList.remove(HIDDEN, HIT));
  }

  // Number of hidden comments: every comment by a blocked author counts once.
  // A hidden review counts only via its comments, or as one if it has none
  // by the blocked author (e.g. a plain "approved").
  function countHidden(root) {
    return [...root.querySelectorAll('.' + HIT)].filter((el) => !el.querySelector('.' + HIT)).length;
  }

  // Exported for tests (Node). In the browser, run as a content script.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { apply, reset, normalize, countHidden };
    return;
  }

  let blocked = new Set();
  let scheduled = false;

  let revealed = false;
  let badge = null;

  function updateBadge() {
    const n = countHidden(document);
    if (!n) { if (badge) badge.remove(); badge = null; return; }
    if (!badge) {
      badge = document.createElement('button');
      badge.type = 'button';
      badge.className = 'oos-badge';
      badge.addEventListener('click', () => {
        revealed = !revealed;
        document.documentElement.classList.toggle('oos-reveal', revealed);
        updateBadge();
      });
    }
    if (!badge.isConnected && document.body) document.body.appendChild(badge);
    const text = `${n} comment${n === 1 ? '' : 's'} hidden · ${revealed ? 'Hide' : 'Show'}`;
    if (badge.textContent !== text) badge.textContent = text;
  }

  const run = () => {
    scheduled = false;
    apply(document, blocked);
    updateBadge();
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(run);
  };

  const load = (users) => {
    blocked = new Set((users || []).map(normalize).filter(Boolean));
    reset(document);
    schedule();
  };

  chrome.storage.sync.get({ users: [] }, ({ users }) => load(users));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.users) load(changes.users.newValue);
  });

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('turbo:load', schedule);
})();
