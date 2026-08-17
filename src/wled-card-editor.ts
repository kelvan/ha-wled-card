import { LitElement, html, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import { fireEvent } from "custom-card-helpers";
import type { WledCardConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";

const SCHEMA = [
  { name: "device_id", selector: { device: { filter: { integration: "wled" } } } },
  { name: "title", selector: { text: {} } },
  {
    name: "visibility",
    type: "expandable",
    title: "Visible sections",
    flatten: true,
    schema: [
      { name: "show_header", selector: { boolean: {} } },
      { name: "show_power", selector: { boolean: {} } },
      { name: "show_brightness", selector: { boolean: {} } },
      { name: "show_color", selector: { boolean: {} } },
      { name: "show_segments", selector: { boolean: {} } },
      { name: "show_effects", selector: { boolean: {} } },
      { name: "show_effect_controls", selector: { boolean: {} } },
      { name: "show_palette", selector: { boolean: {} } },
      { name: "show_reverse_freeze", selector: { boolean: {} } },
      { name: "show_presets", selector: { boolean: {} } },
      { name: "show_playlists", selector: { boolean: {} } },
      { name: "show_live_override", selector: { boolean: {} } },
      { name: "show_nightlight", selector: { boolean: {} } },
      { name: "show_sync", selector: { boolean: {} } },
    ],
  },
] as const;

const LABELS: Record<string, string> = {
  device_id: "WLED device",
  title: "Card title (optional)",
  show_header: "Header",
  show_power: "Power button",
  show_brightness: "Brightness slider",
  show_color: "Color picker",
  show_segments: "Segment tabs",
  show_effects: "Effect picker",
  show_effect_controls: "Speed / intensity sliders",
  show_palette: "Color palette picker",
  show_reverse_freeze: "Reverse / freeze switches",
  show_presets: "Presets",
  show_playlists: "Playlists",
  show_live_override: "Live override",
  show_nightlight: "Nightlight",
  show_sync: "Sync send / receive",
};

@customElement("ha-wled-card-editor")
export class HaWledCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: WledCardConfig;

  public setConfig(config: WledCardConfig): void {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) return html``;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${(s: { name: string }) => LABELS[s.name] ?? s.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent<{ value: WledCardConfig }>): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-wled-card-editor": HaWledCardEditor;
  }
}
