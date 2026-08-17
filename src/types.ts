import type { HomeAssistant } from "custom-card-helpers";

export interface WledCardConfig {
  type: string;
  device_id?: string;
  entity?: string;
  title?: string;
  segments?: number[];
  show_header?: boolean;
  show_power?: boolean;
  show_brightness?: boolean;
  show_color?: boolean;
  show_effects?: boolean;
  show_effect_controls?: boolean;
  show_palette?: boolean;
  show_segments?: boolean;
  show_presets?: boolean;
  show_playlists?: boolean;
  show_live_override?: boolean;
  show_nightlight?: boolean;
  show_sync?: boolean;
  show_reverse_freeze?: boolean;
}

export const DEFAULT_CONFIG: Partial<WledCardConfig> = {
  show_header: true,
  show_power: true,
  show_brightness: true,
  show_color: true,
  show_effects: true,
  show_effect_controls: true,
  show_palette: true,
  show_segments: true,
  show_presets: true,
  show_playlists: true,
  show_live_override: true,
  show_nightlight: true,
  show_sync: true,
  show_reverse_freeze: true,
};

export interface SegmentEntities {
  index: number;
  light: string;
  palette?: string;
  speed?: string;
  intensity?: string;
  reverse?: string;
  freeze?: string;
}

export interface WledEntities {
  deviceId: string;
  deviceName: string;
  main?: string;
  segments: SegmentEntities[];
  preset?: string;
  playlist?: string;
  liveOverride?: string;
  nightlight?: string;
  syncSend?: string;
  syncReceive?: string;
  restart?: string;
  update?: string;
}

export type Hass = HomeAssistant;
