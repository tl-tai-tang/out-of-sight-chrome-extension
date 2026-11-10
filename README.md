<p align="center">
  <img src="icons/icon128.png" alt="Out of Sight logo" width="96" />
</p>

<h1 align="center">Out of Sight</h1>

<p align="center">A Chrome extension that hides GitHub comments and reviews from users you choose — noisy bots, chatty reviewers, anyone.</p>


## Installation

Out of Sight isn't on the Chrome Web Store; load it as an unpacked extension. Works in Chrome and other Chromium browsers (Edge, Brave, Arc).

### 1. Load Plugin
1. Open `chrome://extensions` in the address bar.
2. Turn on **Developer mode** (toggle, top-right).
3. Click **Load unpacked**.
4. Select the `out-of-sight-chrome-plugin` folder (the one containing `manifest.json`).

### 3. Add users to hide

1. Click the Out of Sight toolbar icon (or **Details → Extension options** in `chrome://extensions`).
2. Enter one GitHub username or display name per line, e.g. `octocat` or `some-app[bot]`.
3. Click **Save**. Open GitHub tabs update immediately.

The list syncs to other devices signed into the same Chrome profile (`chrome.storage.sync`).

## Screenshots

### Reveal hidden comments

Click the `N comments hidden` badge to temporarily show hidden comments. They are outlined so you can tell them apart. Click **Hide** to remove them again.

![Revealed hidden comments with badge](docs/screenshots/reveal-hidden-comments.png)

### Settings page

Add one username or display name per line, then click **Save**.

![Settings page](docs/screenshots/settings-page.png)

## Limitations

- Relies on GitHub's page markup, so a GitHub UI change may require selector updates in `content.js`.
- Display names only match where GitHub renders them; most views show the login, so prefer usernames.
- This does not work on the new Github experimental PR Overview page
