<p align="center">
  <img src="icons/icon128.png" alt="Out of Sight logo" width="96" />
</p>

<h1 align="center">Out of Sight</h1>

<p align="center">A Chrome extension that hides GitHub comments and reviews from users you choose — noisy bots, chatty reviewers, anyone.</p>

<p align="center">Works on both the classic pull request page and GitHub's new pull request overview page.</p>

### Changelog

<details open>
<summary><sub><b>2026-11-11</b> — Time window per user</sub></summary>
<sub>

- Add a duration after a name (e.g. `my-bot 15m`): newer comments stay visible, older ones hide automatically.

</sub>
</details>

<details>
<summary><sub><b>2026-11-10</b> — Initial release, badge, new PR overview</sub></summary>
<sub>

- Support GitHub's new pull request overview page.
- Hidden-count badge: click to show (outlined) or hide hidden comments.
- Hide bot/app comments and avatars; count one per hidden comment.
- Logo and README.
- Initial release: hide GitHub comments and reviews from a list of users.

</sub>
</details>

## Installation

Out of Sight isn't on the Chrome Web Store; load it as an unpacked extension. Works in Chrome and other Chromium browsers (Edge, Brave, Arc).

### 1. Load Plugin
1. Open `chrome://extensions` in the address bar.
2. Turn on **Developer mode** (toggle, top-right).
3. Click **Load unpacked**.
4. Select the `out-of-sight-chrome-plugin` folder (the one containing `manifest.json`).
5. Click Extension Icon and hide user

The list syncs to other devices signed into the same Chrome profile (`chrome.storage.sync`).

## Limitations

- Relies on GitHub's page markup, so a GitHub UI change may require selector updates in `content.js`.
- Display names only match where GitHub renders them; most views show the login, so prefer usernames.

## Screenshots

### Reveal hidden comments

Click the `N comments hidden` badge to temporarily show hidden comments. They are outlined so you can tell them apart. Click **Hide** to remove them again.

![Revealed hidden comments with badge](docs/screenshots/reveal-hidden-comments.png)

### Settings page

Add one username or display name per line, then click **Save**. Optionally add a time window after a name (e.g. `sonarqubecloud 10m`) to keep that user's comments from the last 10 minutes visible and hide older ones. Units: `m` minutes, `h` hours, `d` days.

![Settings page](docs/screenshots/settings-page.png)