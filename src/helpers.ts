import type { Hass, SegmentEntities, WledEntities } from "./types";

interface EntityRegistryEntry {
  entity_id: string;
  device_id?: string;
  platform?: string;
}

/** hass.entities is present on modern frontends but not in the published
 * custom-card-helpers types, so we reach for it defensively. */
function entityRegistry(hass: Hass): Record<string, EntityRegistryEntry> {
  return (hass as unknown as { entities?: Record<string, EntityRegistryEntry> }).entities ?? {};
}

export function deviceIdForEntity(hass: Hass, entityId: string): string | undefined {
  return entityRegistry(hass)[entityId]?.device_id;
}

export function wledDeviceOptions(hass: Hass): { id: string; name: string }[] {
  const registry = entityRegistry(hass);
  const deviceIds = new Set<string>();
  for (const entry of Object.values(registry)) {
    if (entry.platform === "wled" && entry.device_id) deviceIds.add(entry.device_id);
  }
  const devices = (hass as unknown as { devices?: Record<string, { id: string; name?: string; name_by_user?: string }> }).devices ?? {};
  return [...deviceIds]
    .map((id) => ({ id, name: devices[id]?.name_by_user || devices[id]?.name || id }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const SEGMENT_LIGHT_RE = /_segment_(\d+)$/;
const SEGMENT_PALETTE_RE = /_segment_(\d+)_color_palette$/;
const SEGMENT_SPEED_RE = /_segment_(\d+)_speed$/;
const SEGMENT_INTENSITY_RE = /_segment_(\d+)_intensity$/;
const SEGMENT_REVERSE_RE = /_segment_(\d+)_reverse$/;
const SEGMENT_MIRROR_RE = /_segment_(\d+)_mirror$/;

/**
 * Groups a WLED device's entities into the shape the card renders.
 * Relies on the entity_id suffix conventions produced by the core WLED
 * integration (e.g. "_segment_1_speed", "_preset", "_nightlight") since
 * unique_id is not exposed on the frontend entity registry.
 */
export function discoverWledEntities(hass: Hass, deviceId: string): WledEntities {
  const registry = entityRegistry(hass);
  const devices = (hass as unknown as { devices?: Record<string, { name?: string; name_by_user?: string }> }).devices ?? {};
  const device = devices[deviceId];

  const result: WledEntities = {
    deviceId,
    deviceName: device?.name_by_user || device?.name || deviceId,
    segments: [],
  };
  const segmentMap = new Map<number, SegmentEntities>();

  const getSegment = (index: number): SegmentEntities => {
    let seg = segmentMap.get(index);
    if (!seg) {
      seg = { index, light: "" };
      segmentMap.set(index, seg);
    }
    return seg;
  };

  for (const [entityId, entry] of Object.entries(registry)) {
    if (entry.device_id !== deviceId) continue;
    const domain = entityId.split(".")[0];

    if (domain === "light") {
      const segMatch = entityId.match(SEGMENT_LIGHT_RE);
      if (segMatch) {
        getSegment(Number(segMatch[1])).light = entityId;
      } else {
        result.main = entityId;
      }
      continue;
    }

    if (domain === "select") {
      const paletteMatch = entityId.match(SEGMENT_PALETTE_RE);
      if (paletteMatch) {
        getSegment(Number(paletteMatch[1])).palette = entityId;
      } else if (entityId.endsWith("_preset")) {
        result.preset = entityId;
      } else if (entityId.endsWith("_playlist")) {
        result.playlist = entityId;
      } else if (entityId.endsWith("_live_override")) {
        result.liveOverride = entityId;
      }
      continue;
    }

    if (domain === "number") {
      const speedMatch = entityId.match(SEGMENT_SPEED_RE);
      const intensityMatch = entityId.match(SEGMENT_INTENSITY_RE);
      if (speedMatch) getSegment(Number(speedMatch[1])).speed = entityId;
      else if (intensityMatch) getSegment(Number(intensityMatch[1])).intensity = entityId;
      continue;
    }

    if (domain === "switch") {
      const reverseMatch = entityId.match(SEGMENT_REVERSE_RE);
      const mirrorMatch = entityId.match(SEGMENT_MIRROR_RE);
      if (reverseMatch) getSegment(Number(reverseMatch[1])).reverse = entityId;
      else if (mirrorMatch) getSegment(Number(mirrorMatch[1])).mirror = entityId;
      else if (entityId.endsWith("_nightlight")) result.nightlight = entityId;
      else if (entityId.endsWith("_sync_send")) result.syncSend = entityId;
      else if (entityId.endsWith("_sync_receive")) result.syncReceive = entityId;
      continue;
    }

    if (domain === "button" && entityId.endsWith("_restart")) {
      result.restart = entityId;
      continue;
    }

    if (domain === "update") {
      result.update = entityId;
    }
  }

  result.segments = [...segmentMap.values()]
    .filter((seg) => seg.light)
    .sort((a, b) => a.index - b.index);

  return result;
}
