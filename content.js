// Out of Sight — hides GitHub comments/reviews authored by blocked users.
(() => {
  const HIDDEN = 'oos-hidden';

  // Elements that identify a comment's author.
  const AUTHOR_SELECTOR = [
    'a.author',
    'a[data-hovercard-type="user"]',
    'a[data-hovercard-url^="/users/"]',
    'a[data-testid="avatar-link"]',
    '[data-testid="author-link"]',
  ].join(',');

  // Author links that are NOT comment authors (mentions, comment bodies, sidebar).
  const IGNORE_SELECTOR =
    '.user-mention, .comment-body, .markdown-body, .discussion-sidebar, #partial-discussion-sidebar, .js-comment-edit-history';

  // A single comment, nearest-first (classic GitHub UI + new React UI fallbacks).
  const COMMENT_SELECTOR = [
    '.review-comment',
    '.timeline-comment-group',
    '.js-comment-container',
    '.timeline-comment',
    '[data-testid="review-thread-comment"]',
    '[data-testid="comment-viewer-outer-box"]',
    '[data-testid*="comment-container" i]',
  ].join(',');

  // Containers that should vanish when every comment inside them is hidden.
  const THREAD_SELECTOR = [
    '.js-resolvable-timeline-thread-container',
    '.review-thread-component',
    '.js-inline-comments-container',
    '.inline-comments',
    '[data-testid="review-thread"]',
    '.js-timeline-item',
  ].join(',');

  const normalize = (s) => (s || '').trim().replace(/^@/, '').replace(/\s+/g, ' ').toLowerCase();

  function authorKeys(el) {
    const keys = new Set();
    const add = (v) => { const n = normalize(v); if (n) keys.add(n); };

    add(el.textContent);
    const img = el.querySelector('img[alt]');
    if (img) add(img.getAttribute('alt'));
    add(el.getAttribute('aria-label'));

    const hovercard = el.getAttribute('data-hovercard-url');
    const m = hovercard && hovercard.match(/^\/users\/([^/]+)/);
    if (m) add(decodeURIComponent(m[1]));

    const href = el.getAttribute('href');
    if (href) {
      try {
        const url = new URL(href, 'https://github.com');
        const parts = url.pathname.split('/').filter(Boolean);
        if (url.hostname === 'github.com' && parts.length === 1) add(decodeURIComponent(parts[0]));
      } catch (_) { /* ignore bad href */ }
    }
    return keys;
  }

  function isBlocked(el, blocked) {
    for (const k of authorKeys(el)) if (blocked.has(k)) return true;
    return false;
  }

  function hide(el) { el.classList.add(HIDDEN); }

  function apply(root, blocked) {
    if (!blocked.size) return;

    root.querySelectorAll(AUTHOR_SELECTOR).forEach((a) => {
      if (a.closest(IGNORE_SELECTOR) || a.closest('.' + HIDDEN)) return;
      if (!isBlocked(a, blocked)) return;

      const comment = a.closest(COMMENT_SELECTOR);
      if (comment) { hide(comment); return; }

      // Review header ("X reviewed / approved / requested changes") — hide whole review.
      const item = a.closest('.js-timeline-item');
      if (item && item.querySelector('[id^="pullrequestreview-"], .js-comment, .review-comment')) {
        hide(item);
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
    root.querySelectorAll('.' + HIDDEN).forEach((el) => el.classList.remove(HIDDEN));
  }

  // Exported for tests (Node). In the browser, run as a content script.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { apply, reset, normalize };
    return;
  }

  let blocked = new Set();
  let scheduled = false;

  const run = () => {
    scheduled = false;
    apply(document, blocked);
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
