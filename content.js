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
    // Classic PR page
    '.review-comment',
    '.js-comment-container',
    '.timeline-comment-group',
    '.timeline-comment',
    // New React PR overview: review-thread comment, then the comment/review
    // <article> (issuecomment-N / pullrequestreview-N / PR description).
    '[id^="discussion_r"]',
    'article',
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
    '[data-testid="timeline-item"]',
  ].join(',');

  // "@Name[bot]" -> "name": case-insensitive, ignores leading @ and [bot] suffix.
  const normalize = (s) =>
    (s || '').trim().replace(/^@/, '').replace(/\[bot\]$/i, '').replace(/\s+/g, ' ').trim().toLowerCase();

  // Settings line -> [name, graceMs]. An optional trailing duration keeps the
  // user's recent comments visible: "my-bot 15m" hides only comments older
  // than 15 minutes. Units: m (minutes), h (hours), d (days). No duration =
  // always hide.
  const UNIT_MS = { m: 60e3, h: 3600e3, d: 86400e3 };
  function parseEntry(line) {
    const m = (line || '').trim().match(/^(.*?)\s+(\d+)\s*([mhd])$/i);
    if (!m) return [normalize(line), 0];
    return [normalize(m[1]), Number(m[2]) * UNIT_MS[m[3].toLowerCase()]];
  }
  function parseList(lines) {
    const map = new Map();
    for (const line of lines || []) {
      const [name, grace] = parseEntry(line);
      if (name) map.set(name, grace);
    }
    return map;
  }

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

  // Grace period (ms) if the author is blocked, otherwise undefined.
  function blockedGrace(el, blocked) {
    for (const k of authorKeys(el)) if (blocked.has(k)) return blocked.get(k);
    return undefined;
  }

  // Still inside the grace window? Uses the comment's own timestamp; comments
  // without one are treated as old.
  function withinGrace(container, grace, now) {
    if (!grace) return false;
    const t = container.querySelector('relative-time[datetime], time[datetime]');
    const posted = t && Date.parse(t.getAttribute('datetime'));
    return Boolean(posted) && now - posted < grace;
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

  // blocked: Map of normalized name -> grace period in ms (see parseList).
  function apply(root, blocked, now = Date.now()) {
    if (!blocked.size) return;

    root.querySelectorAll(AUTHOR_SELECTOR).forEach((a) => {
      if (a.closest(IGNORE_SELECTOR)) return;
      const grace = blockedGrace(a, blocked);
      if (grace === undefined) return;

      const unit = commentUnit(a);
      if (unit) {
        if (!withinGrace(unit, grace, now)) hide(unit, true);
        return;
      }

      // Review header ("X reviewed / approved / requested changes") — hide whole review.
      const item = a.closest('.js-timeline-item');
      if (item && item.querySelector('[id^="pullrequestreview-"], .js-comment, .review-comment')) {
        if (!withinGrace(item, grace, now)) hide(item, true);
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
    module.exports = { apply, reset, normalize, countHidden, parseList };
    return;
  }

  let blocked = new Map();
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
    blocked = parseList(users);
    reset(document);
    schedule();
  };

  chrome.storage.sync.get({ users: [] }, ({ users }) => load(users));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.users) load(changes.users.newValue);
  });

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('turbo:load', schedule);
  // Re-check periodically so comments get hidden once their grace window ends.
  setInterval(() => { if ([...blocked.values()].some(Boolean)) schedule(); }, 30e3);
})();
