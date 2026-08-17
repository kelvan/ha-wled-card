import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant, LovelaceCardEditor } from "custom-card-helpers";
import type { WledCardConfig, WledEntities, SegmentEntities } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { discoverWledEntities, deviceIdForEntity } from "./helpers";
import { hexToRgb, rgbToHex } from "./color-utils";

const CARD_VERSION = "0.1.0";

console.info(`%c HA-WLED-CARD %c v${CARD_VERSION} `, "color: white; background: #111; font-weight: bold;", "color: white; background: #0d6efd;");

@customElement("ha-wled-card")
export class HaWledCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: WledCardConfig;

  @state() private _activeSegment = 0;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./wled-card-editor");
    return document.createElement("ha-wled-card-editor") as unknown as LovelaceCardEditor;
  }

  public static getStubConfig(): Partial<WledCardConfig> {
    return { type: "custom:ha-wled-card" };
  }

  public setConfig(config: WledCardConfig): void {
    if (!config.device_id && !config.entity) {
      throw new Error("Please select a WLED device.");
    }
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._activeSegment = 0;
  }

  public getCardSize(): number {
    return 6;
  }

  private get _entities(): WledEntities | undefined {
    if (!this.hass || !this._config) return undefined;
    const deviceId = this._config.device_id ?? (this._config.entity ? deviceIdForEntity(this.hass, this._config.entity) : undefined);
    if (!deviceId) return undefined;
    return discoverWledEntities(this.hass, deviceId);
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has("_config")) this._activeSegment = 0;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) return html``;

    const entities = this._entities;
    if (!entities || !entities.main) {
      return html`
        <ha-card>
          <div class="not-found">
            No WLED device found for this configuration. Pick a WLED device in the card editor.
          </div>
        </ha-card>
      `;
    }

    const visibleSegments = this._config.segments?.length
      ? entities.segments.filter((s) => this._config.segments!.includes(s.index))
      : entities.segments;

    const mainState = this.hass.states[entities.main];
    const isOn = mainState?.state === "on";

    return html`
      <ha-card>
        ${this._config.show_header !== false ? this._renderHeader(entities, isOn) : nothing}
        ${this._config.show_power !== false || this._config.show_brightness !== false
          ? this._renderMainControls(entities, mainState, isOn)
          : nothing}
        ${this._config.show_segments !== false && visibleSegments.length > 0
          ? this._renderSegments(visibleSegments)
          : nothing}
        ${this._renderGlobalSection(entities)}
      </ha-card>
    `;
  }

  private _renderHeader(entities: WledEntities, isOn: boolean): TemplateResult {
    return html`
      <div class="header">
        <ha-icon icon="mdi:led-strip-variant" class=${isOn ? "on" : ""}></ha-icon>
        <span class="title">${this._config.title ?? entities.deviceName}</span>
      </div>
    `;
  }

  private _renderMainControls(entities: WledEntities, mainState: HomeAssistant["states"][string], isOn: boolean): TemplateResult {
    const brightness = mainState?.attributes.brightness ?? 0;
    return html`
      <div class="row main-controls">
        ${this._config.show_power !== false
          ? html`
              <ha-icon-button
                .path=${"M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.89L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13"}
                class=${isOn ? "on" : ""}
                @click=${() => this._toggle(entities.main!)}
              ></ha-icon-button>
            `
          : nothing}
        ${this._config.show_brightness !== false
          ? html`
              <input
                type="range"
                min="1"
                max="255"
                .value=${String(brightness)}
                ?disabled=${!isOn}
                @change=${(e: Event) => this._setBrightness(entities.main!, e)}
                class="brightness-slider"
              />
            `
          : nothing}
      </div>
    `;
  }

  private _renderSegments(segments: SegmentEntities[]): TemplateResult {
    const active = segments.find((s) => s.index === this._activeSegment) ?? segments[0];
    return html`
      <div class="tabs">
        ${segments.map(
          (seg) => html`
            <button class=${seg.index === active.index ? "tab active" : "tab"} @click=${() => (this._activeSegment = seg.index)}>
              Segment ${seg.index + 1}
            </button>
          `,
        )}
      </div>
      ${this._renderSegmentPanel(active)}
    `;
  }

  private _renderSegmentPanel(seg: SegmentEntities): TemplateResult {
    const state = this.hass.states[seg.light];
    if (!state) return html``;
    const isOn = state.state === "on";
    const brightness = state.attributes.brightness ?? 0;
    const effectList: string[] = state.attributes.effect_list ?? [];
    const currentEffect: string = state.attributes.effect ?? "";
    const rgbw: number[] | undefined = state.attributes.rgbw_color;
    const rgb: number[] | undefined = rgbw ?? state.attributes.rgb_color;

    return html`
      <div class="segment-panel">
        <div class="row">
          <ha-icon-button
            .path=${"M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.89L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13"}
            class=${isOn ? "on" : ""}
            @click=${() => this._toggle(seg.light)}
          ></ha-icon-button>
          ${this._config.show_brightness !== false
            ? html`
                <input
                  type="range"
                  min="1"
                  max="255"
                  .value=${String(brightness)}
                  ?disabled=${!isOn}
                  @change=${(e: Event) => this._setBrightness(seg.light, e)}
                  class="brightness-slider"
                />
              `
            : nothing}
          ${this._config.show_color !== false
            ? html`
                <input
                  type="color"
                  .value=${rgbToHex(rgb)}
                  @change=${(e: Event) => this._setColor(seg.light, rgbw, e)}
                  class="color-input"
                />
              `
            : nothing}
        </div>
        ${this._config.show_color !== false && rgbw
          ? html`
              <div class="field">
                <label>White <span class="value">${rgbw[3] ?? 0}</span></label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  .value=${String(rgbw[3] ?? 0)}
                  @change=${(e: Event) => this._setWhite(seg.light, rgbw, e)}
                />
              </div>
            `
          : nothing}

        ${this._config.show_effects !== false && effectList.length
          ? html`
              <div class="field">
                <label>Effect</label>
                <select @change=${(e: Event) => this._setEffect(seg.light, e)}>
                  ${effectList.map((fx) => html`<option value=${fx} ?selected=${fx === currentEffect}>${fx}</option>`)}
                </select>
              </div>
            `
          : nothing}
        ${this._config.show_effect_controls !== false ? this._renderNumberSlider("Speed", seg.speed) : nothing}
        ${this._config.show_effect_controls !== false ? this._renderNumberSlider("Intensity", seg.intensity) : nothing}
        ${this._config.show_palette !== false ? this._renderSelect("Palette", seg.palette) : nothing}
        ${this._config.show_reverse_freeze !== false
          ? html`
              <div class="row switches">
                ${seg.reverse ? this._renderSwitch("Reverse", seg.reverse) : nothing}
                ${seg.freeze ? this._renderSwitch("Freeze", seg.freeze) : nothing}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderGlobalSection(entities: WledEntities): TemplateResult | typeof nothing {
    const items: (TemplateResult | typeof nothing)[] = [];
    if (this._config.show_presets !== false && entities.preset) items.push(this._renderSelect("Preset", entities.preset));
    if (this._config.show_playlists !== false && entities.playlist) items.push(this._renderSelect("Playlist", entities.playlist));
    if (this._config.show_live_override !== false && entities.liveOverride)
      items.push(this._renderSelect("Live override", entities.liveOverride));
    if (!items.length && this._config.show_nightlight === false && this._config.show_sync === false) return nothing;

    return html`
      <div class="global-section">
        ${items}
        ${this._config.show_nightlight !== false && entities.nightlight ? this._renderSwitch("Nightlight", entities.nightlight) : nothing}
        ${this._config.show_sync !== false
          ? html`
              <div class="row switches">
                ${entities.syncSend ? this._renderSwitch("Sync send", entities.syncSend) : nothing}
                ${entities.syncReceive ? this._renderSwitch("Sync receive", entities.syncReceive) : nothing}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderSelect(label: string, entityId?: string): TemplateResult | typeof nothing {
    if (!entityId) return nothing;
    const state = this.hass.states[entityId];
    if (!state) return nothing;
    const options: string[] = state.attributes.options ?? [];
    return html`
      <div class="field">
        <label>${label}</label>
        <select @change=${(e: Event) => this._selectOption(entityId, e)}>
          ${options.map((opt) => html`<option value=${opt} ?selected=${opt === state.state}>${opt}</option>`)}
        </select>
      </div>
    `;
  }

  private _renderNumberSlider(label: string, entityId?: string): TemplateResult | typeof nothing {
    if (!entityId) return nothing;
    const state = this.hass.states[entityId];
    if (!state) return nothing;
    const min = state.attributes.min ?? 0;
    const max = state.attributes.max ?? 255;
    const step = state.attributes.step ?? 1;
    return html`
      <div class="field">
        <label>${label} <span class="value">${state.state}</span></label>
        <input
          type="range"
          min=${min}
          max=${max}
          step=${step}
          .value=${state.state}
          @change=${(e: Event) => this._setNumber(entityId, e)}
        />
      </div>
    `;
  }

  private _renderSwitch(label: string, entityId: string): TemplateResult {
    const state = this.hass.states[entityId];
    const isOn = state?.state === "on";
    return html`
      <div class="switch-row">
        <label>${label}</label>
        <ha-icon-button
          .path=${isOn
            ? "M17,7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7M17,15A3,3 0 0,1 14,12A3,3 0 0,1 17,9A3,3 0 0,1 20,12A3,3 0 0,1 17,15Z"
            : "M17,7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7M7,15A3,3 0 0,1 4,12A3,3 0 0,1 7,9A3,3 0 0,1 10,12A3,3 0 0,1 7,15Z"}
          class=${isOn ? "on" : ""}
          @click=${() => this._toggle(entityId)}
        ></ha-icon-button>
      </div>
    `;
  }

  private _toggle(entityId: string): void {
    const domain = entityId.split(".")[0];
    const isOn = this.hass.states[entityId]?.state === "on";
    this.hass.callService(domain, isOn ? "turn_off" : "turn_on", { entity_id: entityId });
  }

  private _setBrightness(entityId: string, e: Event): void {
    const value = Number((e.target as HTMLInputElement).value);
    this.hass.callService("light", "turn_on", { entity_id: entityId, brightness: value });
  }

  private _setColor(entityId: string, currentRgbw: number[] | undefined, e: Event): void {
    const hex = (e.target as HTMLInputElement).value;
    const [r, g, b] = hexToRgb(hex);
    if (currentRgbw) {
      this.hass.callService("light", "turn_on", { entity_id: entityId, rgbw_color: [r, g, b, currentRgbw[3] ?? 0] });
    } else {
      this.hass.callService("light", "turn_on", { entity_id: entityId, rgb_color: [r, g, b] });
    }
  }

  private _setWhite(entityId: string, currentRgbw: number[], e: Event): void {
    const white = Number((e.target as HTMLInputElement).value);
    const [r, g, b] = currentRgbw;
    this.hass.callService("light", "turn_on", { entity_id: entityId, rgbw_color: [r, g, b, white] });
  }

  private _setEffect(entityId: string, e: Event): void {
    const effect = (e.target as HTMLSelectElement).value;
    this.hass.callService("light", "turn_on", { entity_id: entityId, effect });
  }

  private _selectOption(entityId: string, e: Event): void {
    const option = (e.target as HTMLSelectElement).value;
    this.hass.callService("select", "select_option", { entity_id: entityId, option });
  }

  private _setNumber(entityId: string, e: Event): void {
    const value = Number((e.target as HTMLInputElement).value);
    this.hass.callService("number", "set_value", { entity_id: entityId, value });
  }

  static styles = css`
    :host {
      --wled-accent: var(--primary-color, #03a9f4);
    }
    ha-card {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .not-found {
      padding: 16px;
      color: var(--secondary-text-color);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header ha-icon {
      color: var(--secondary-text-color);
    }
    .header ha-icon.on {
      color: var(--wled-accent);
    }
    .title {
      font-size: 1.2em;
      font-weight: 500;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .main-controls,
    .segment-panel > .row {
      flex-wrap: wrap;
    }
    ha-icon-button {
      color: var(--secondary-text-color);
      --mdc-icon-button-size: 40px;
    }
    ha-icon-button.on {
      color: var(--wled-accent);
    }
    .brightness-slider {
      flex: 1;
      min-width: 100px;
      accent-color: var(--wled-accent);
    }
    .color-input {
      width: 36px;
      height: 36px;
      border: 2px solid var(--divider-color);
      border-radius: 50%;
      overflow: hidden;
      padding: 0;
      background: none;
      cursor: pointer;
    }
    .color-input::-webkit-color-swatch-wrapper {
      padding: 0;
    }
    .color-input::-webkit-color-swatch {
      border: none;
      border-radius: 50%;
    }
    .color-input::-moz-color-swatch {
      border: none;
      border-radius: 50%;
    }
    .tabs {
      display: flex;
      gap: 4px;
      overflow-x: auto;
      border-bottom: 1px solid var(--divider-color);
    }
    .tab {
      background: none;
      border: none;
      padding: 8px 12px;
      font-size: 0.9em;
      color: var(--secondary-text-color);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      white-space: nowrap;
    }
    .tab.active {
      color: var(--wled-accent);
      border-bottom-color: var(--wled-accent);
      font-weight: 500;
    }
    .segment-panel {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .field label {
      font-size: 0.85em;
      color: var(--secondary-text-color);
      display: flex;
      justify-content: space-between;
    }
    .field select {
      padding: 6px 8px;
      border-radius: 6px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
    }
    .field input[type="range"] {
      width: 100%;
      accent-color: var(--wled-accent);
    }
    .switches {
      gap: 16px;
    }
    .switch-row {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .switch-row label {
      font-size: 0.85em;
      color: var(--secondary-text-color);
    }
    .switch-row ha-icon-button {
      --mdc-icon-button-size: 32px;
    }
    .global-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-top: 8px;
      border-top: 1px solid var(--divider-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-wled-card": HaWledCard;
  }
}

(window as unknown as { customCards: unknown[] }).customCards = (window as unknown as { customCards: unknown[] }).customCards || [];
(window as unknown as { customCards: unknown[] }).customCards.push({
  type: "ha-wled-card",
  name: "WLED Card",
  description: "A full-featured card for WLED: segments, effects, palettes, presets, playlists and more.",
});
