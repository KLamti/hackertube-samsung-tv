# HackerTube for Samsung TV

Browse [HackerTube](https://hackertube.org) from the sofa with your Samsung remote, then choose to play a video inside HackerTube or open it in the TV’s YouTube app.

An unofficial Tizen client built with plain HTML, CSS and JavaScript. No computer or server needs to stay running after installation.

![HackerTube home screen in the desktop preview](docs/home.png)

## Features

- Home feed, search with an on-screen keyboard, topics and long videos.
- Video descriptions and recommendation context from HackerTube.
- Watch later and recently opened videos, stored locally on the TV.
- Arrow/OK navigation, restored list focus and Back navigation.
- Two playback choices on every video: **Play here** and **Open in YouTube**.
- Embedded playback with pause/resume, 10-second seeking and Back to the video details.
- A YouTube option remains available when embedded playback is unavailable, plus a TV-browser option.

## Compatibility

**Verified:** Samsung QN90C (2023) running Tizen 9.0, with the installed YouTube app. Catalogue loading and both playback choices were confirmed on November 10, 2026, using v1.1.0.

The manifest requires Tizen 7.0 or newer. Other models and firmware versions are untested. YouTube handoff behavior may vary: this version sends both the watch URL and Samsung’s `PAYLOAD` containing the video ID. The TV-browser fallback is included but has not been verified on hardware.

The integrated v1.1.0 build was verified on that TV: embedded picture and sound, OK pause/resume, Back to details, and selected-video playback through the YouTube app.

This app depends on HackerTube’s public API, the HTTPS player hosted on GitHub Pages, and YouTube. Some videos may disallow embedding or require the YouTube app. API or firmware changes may affect it. History records videos opened, not playback progress.

## Install with Apps2Samsung

1. Download `HackerTube-1.1.0-unsigned.wgt` from the [latest release](https://github.com/KLamti/hackertube-samsung-tv/releases/latest).
2. Put your TV and computer on the same local network. Enable Developer Mode on the TV, set Host PC IP to your computer’s current local IP, then restart the TV. See [Samsung’s device setup guide](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html).
3. Open [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung), select your TV, and choose **Custom WGT / TPK**. Browse to the downloaded HackerTube package.
4. Follow Apps2Samsung’s signing setup for your TV, then install. Open **HackerTube** from the TV’s apps list or Apps2Samsung’s installed-apps panel.

The release package is **unsigned**. Apps2Samsung must sign it for your TV; a package signed for someone else’s TV is not a portable installer. Keep the same signing identity when updating so the app can be replaced without uninstalling it.

If an error asks to delete an existing app, check that you selected the HackerTube package and inspect the reported app ID before removing anything.

## Controls

| Remote | Action |
| --- | --- |
| Arrows | Move focus |
| OK | Select a video, button or keyboard key |
| Back | Close overlays, return to the list/sidebar, then offer Exit |
| Play / Play-Pause on a video’s details | Play here, or open YouTube when its button is focused |
| OK during embedded playback | Pause / resume |
| Left / Right during embedded playback | Seek back / forward 10 seconds |
| Up / Down during embedded playback | Switch between video controls and player buttons |
| Back during embedded playback | Stop playback and return to details |

Choose **Play here** or **Open in YouTube** on a video’s detail page. The choice is offered every time, with no saved default. In the embedded player, press Up to reach the Pause/Play, Open in YouTube and Back buttons. If loading fails, focus moves to Open in YouTube; it never switches apps automatically. Reopen HackerTube from the TV’s apps list if leaving YouTube returns to Samsung Home. Saved lists and recent history are retained, with a limit of 100 entries each.

## Preview and develop

Python 3 serves the desktop preview and proxies the catalogue API for browser CORS. This proxy is development-only; the installed TV app contacts HackerTube directly.

```sh
python3 tools/preview-hackertube.py
```

Open <http://127.0.0.1:8767>. Use arrows and Enter; Escape acts as Back, and `/` opens search. Play here uses the same HTTPS player; Open in YouTube opens a browser tab in desktop preview.

Run the dependency-free tests with Node.js 22 or newer:

```sh
node --test tests/*.test.js
```

The tests cover video-ID validation, malformed data, storage failures, focus movement, API errors, YouTube handoff, embedded-player message validation, timeouts and cleanup. Earlier live Chromium checks exercised catalogue/search/topics, navigation, saved-list removal and persistence. For v1.1.0, the browser preview additionally verified both choice buttons, embedded Playing/Paused states, timeout fallback, and Back restoring detail focus. Hardware playback was verified separately; a successful launch callback alone is not proof that the video played.

An optional integration script is in `tools/hackertube-browser-check.mjs`. Start the preview and an **isolated** Chrome/Chromium instance with `--remote-debugging-port=9223`, `--user-data-dir` pointing to a temporary folder, and one blank tab, then run:

```sh
node tools/hackertube-browser-check.mjs
```

It clears the preview app’s local storage and writes screenshots to the system temporary directory. Use a separate browser profile for this check.

## Build

Create an unsigned release package using Python’s standard library:

```sh
python3 tools/build.py
```

The WGT and SHA-256 checksum appear in `dist/`. Sign the WGT with Apps2Samsung before installation.

For developers with Tizen Studio and a Samsung TV certificate profile already configured, the source can also be packaged directly:

```sh
mkdir -p dist
tizen package -t wgt -s YOUR_CERTIFICATE_PROFILE -o dist -- hackertube
```

Application ID: `HackerTV01.HackerTube`. Package ID: `HackerTV01`.

## Privacy and permissions

The app requests internet access, application launch and TV remote input privileges. Saved videos and history remain in the TV’s local storage. Catalogue requests go to HackerTube, thumbnails come from YouTube, and embedded playback loads the public HTTPS player at `https://klamti.github.io/hackertube-samsung-tv/player/`, which uses YouTube’s official iframe API. The video ID is sent to that page; saved lists and history are not. YouTube receives its normal player/media requests and may show ads or collect usage data according to its own policies. Open in YouTube launches the installed app. App-owned code adds no analytics, account system or stream extraction.

## License and credits

App source: [MIT](LICENSE). The bundled Inter font has its own [SIL Open Font License](hackertube/fonts/OFL.txt). See [third-party notices](THIRD_PARTY_NOTICES.md).

Independent of HackerTube, Samsung, YouTube and Hacker News. Video content and thumbnails belong to their respective creators.

## Hosted player

The `player/` directory contains the HTTPS wrapper needed for embedded playback. Deploy these three files to `player/` on the repository’s `gh-pages` branch. HTTPS provides the browser origin/referrer expected by YouTube. The Tizen manifest allows navigation only to the player host and YouTube; parent/child messages are checked against the frame, origin and per-view channel. Forks must update the player URL and manifest hosts together. The older root-level Pages experiment is separate.
