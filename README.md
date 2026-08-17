# WLED Card

> **⚠️ Vibe-coded warning:** This project was written by Claude (Anthropic's
> AI) with human review of behavior, not a full manual code audit. It works
> against a real WLED device in testing, but treat it as unaudited
> third-party code: read it before you trust it, expect rough edges, and use
> it at your own risk.

A Lovelace card for Home Assistant that gives you full control over a
[WLED](https://kno.wled.ge/) device set up via the core `wled` integration:
per-segment power, brightness, color (plus a white channel slider on
RGBW segments), effects (with speed/intensity variables), color
palettes, reverse/freeze, presets, playlists, live
override, nightlight, and sync send/receive. Every section can be shown or
hidden from the card editor.

The card discovers all entities that belong to your WLED device
automatically — no need to list entities by hand.

## Requirements

- Home Assistant with the [WLED integration](https://www.home-assistant.io/integrations/wled/) set up.

## Installation

### HACS (recommended)

1. HACS → Frontend → menu (⋮) → Custom repositories.
2. Add this repository URL, category **Dashboard**.
3. Install "WLED Card" and reload your browser.

### Manual

1. Download `ha-wled-card.js` from the [latest release](../../releases/latest).
2. Copy it to `<config>/www/ha-wled-card.js`.
3. Add a resource in Settings → Dashboards → Resources:
   - URL: `/local/ha-wled-card.js`
   - Type: JavaScript module

## Usage

Add a card with type `custom:ha-wled-card` and pick your WLED device, either
through the visual editor or YAML:

```yaml
type: custom:ha-wled-card
device_id: 4f6a1e2b3c4d5e6f7a8b9c0d1e2f3a4b
title: Living Room LEDs
show_presets: true
show_playlists: true
show_effect_controls: true
```

## Configuration options

| Option                  | Default | Description                                      |
| ------------------------ | ------- | ------------------------------------------------- |
| `device_id`               | —       | WLED device to control (required unless `entity` is set) |
| `entity`                  | —       | Main WLED light entity, used to resolve the device if `device_id` isn't set |
| `title`                   | device name | Card title |
| `segments`                 | all     | List of segment indices (0-based) to show, e.g. `[0, 2]` |
| `show_header`              | `true`  | Title row |
| `show_power`               | `true`  | Main power button |
| `show_brightness`          | `true`  | Brightness sliders |
| `show_color`               | `true`  | Color picker per segment |
| `show_segments`            | `true`  | Per-segment tabs |
| `show_effects`             | `true`  | Effect picker per segment |
| `show_effect_controls`     | `true`  | Speed / intensity sliders per segment |
| `show_palette`             | `true`  | Color palette picker per segment |
| `show_reverse_freeze`      | `true`  | Reverse / freeze switches per segment |
| `show_presets`             | `true`  | Preset picker |
| `show_playlists`           | `true`  | Playlist picker |
| `show_live_override`       | `true`  | Live override picker |
| `show_nightlight`          | `true`  | Nightlight switch |
| `show_sync`                | `true`  | Sync send / receive switches |

## Development

```sh
npm install
npm run build   # dist/ha-wled-card.js
npm run watch   # rebuild on change
npm run lint    # type-check only
```
