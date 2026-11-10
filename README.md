# HackerTube for Samsung TV

Browse [HackerTube](https://hackertube.org) from the sofa with your Samsung remote, then play a selected video in the TV’s YouTube app.

An unofficial Tizen client built with plain HTML, CSS and JavaScript. No computer or server needs to stay running after installation.

![HackerTube home screen in the desktop preview](docs/home.png)

## Features

- Home feed, search with an on-screen keyboard, topics and long videos.
- Video descriptions and recommendation context from HackerTube.
- Watch later and recently opened videos, stored locally on the TV.
- Arrow/OK navigation, restored list focus and Back navigation.
- Selected-video handoff to YouTube, with an explicit TV-browser option.

## Compatibility

**Verified:** Samsung QN90C (2023) running Tizen 9.0, with the installed YouTube app. Catalogue loading and selected-video playback were confirmed on November 10, 2026, using v1.0.1.

The manifest requires Tizen 7.0 or newer. Other models and firmware versions are untested. YouTube handoff behavior may vary: this version sends both the watch URL and Samsung’s `PAYLOAD` containing the video ID. The TV-browser fallback is included but has not been verified on hardware.

This app depends on HackerTube’s public API and the installed YouTube app. API or firmware changes may affect it. History records videos opened, not playback progress.

## Install with Apps2Samsung

1. Download `HackerTube-1.0.1-unsigned.wgt` from the [latest release](https://github.com/KLamti/hackertube-samsung-tv/releases/latest).
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
| Play / Play-Pause on a video’s details | Open the video in YouTube |

Choose **Watch on YouTube** on a video’s detail page. Reopen HackerTube from the TV’s apps list if leaving YouTube returns to Samsung Home. Saved lists and recent history are retained, with a limit of 100 entries each.

## Preview and develop

Python 3 serves the desktop preview and proxies the catalogue API for browser CORS. This proxy is development-only; the installed TV app contacts HackerTube directly.

```sh
python3 tools/preview-hackertube.py
```

Open <http://127.0.0.1:8767>. Use arrows and Enter; Escape acts as Back, and `/` opens search. Desktop playback opens YouTube in a browser tab.

Run the dependency-free tests with Node.js 22 or newer:

```sh
node --test tests/hackertube.test.js
```

The 10 tests cover video-ID validation, malformed data, storage failures, focus movement, API errors and the YouTube handoff. Live Chromium checks also exercised catalogue/search/topics, navigation, saved-list removal and persistence. Hardware playback was verified separately; a successful launch callback alone is not proof that the video played.

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

The app requests internet access, application launch and TV remote input privileges. Saved videos and history remain in the TV’s local storage. Catalogue requests go to HackerTube, thumbnails come from YouTube, and playback opens YouTube. The app adds no analytics, account system or stream extraction.

## License and credits

App source: [MIT](LICENSE). The bundled Inter font has its own [SIL Open Font License](hackertube/fonts/OFL.txt). See [third-party notices](THIRD_PARTY_NOTICES.md).

Independent of HackerTube, Samsung, YouTube and Hacker News. Video content and thumbnails belong to their respective creators.
