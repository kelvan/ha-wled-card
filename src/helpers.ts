import type { Hass, SegmentEntities, WledEntities } from "./types";

interface EntityRegistryEntry {
  entity_id: string;
  device_id?: string;
  platform?: string;
  translation_key?: string;
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

/**
 * Segment number placeholders (e.g. "Segment {segment} speed") are
 * substituted with a plain decimal number regardless of UI language, so we
 * can recover the segment index from the localized friendly_name once the
 * device-name prefix is stripped off. translation_key itself is never
 * localized, so it is what we use to classify *what* an entity is.
 */
function segmentIndexFromName(friendlyName: string | undefined, deviceName: string): number {
  if (!friendlyName) return 0;
  const remainder = friendlyName.startsWith(deviceName) ? friendlyName.slice(deviceName.length) : friendlyName;
  const match = remainder.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

/**
 * Groups a WLED device's entities into the shape the card renders, based on
 * the core WLED integration's entity translation_key conventions (see
 * homeassistant/components/wled/{light,number,select,switch}.py). Segment 0
 * is special-cased throughout the integration: it uses the unprefixed
 * translation_key (e.g. "speed" instead of "segment_speed") and, for the
 * light entity, no entity name at all.
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

  const segmentIndexOf = (entityId: string): number =>
    segmentIndexFromName(hass.states[entityId]?.attributes.friendly_name, result.deviceName);

  for (const [entityId, entry] of Object.entries(registry)) {
    if (entry.device_id !== deviceId) continue;
    const domain = entityId.split(".")[0];
    const key = entry.translation_key;

    if (domain === "light") {
      if (key === "main") result.main = entityId;
      else if (key === "segment") getSegment(segmentIndexOf(entityId)).light = entityId;
      continue;
    }

    if (domain === "number") {
      if (key === "speed") getSegment(0).speed = entityId;
      else if (key === "segment_speed") getSegment(segmentIndexOf(entityId)).speed = entityId;
      else if (key === "intensity") getSegment(0).intensity = entityId;
      else if (key === "segment_intensity") getSegment(segmentIndexOf(entityId)).intensity = entityId;
      continue;
    }

    if (domain === "select") {
      if (key === "preset") result.preset = entityId;
      else if (key === "playlist") result.playlist = entityId;
      else if (key === "live_override") result.liveOverride = entityId;
      else if (key === "color_palette") getSegment(0).palette = entityId;
      else if (key === "segment_color_palette") getSegment(segmentIndexOf(entityId)).palette = entityId;
      continue;
    }

    if (domain === "switch") {
      if (key === "nightlight") result.nightlight = entityId;
      else if (key === "sync_send") result.syncSend = entityId;
      else if (key === "sync_receive") result.syncReceive = entityId;
      else if (key === "reverse") getSegment(0).reverse = entityId;
      else if (key === "segment_reverse") getSegment(segmentIndexOf(entityId)).reverse = entityId;
      else if (key === "freeze") getSegment(0).freeze = entityId;
      else if (key === "segment_freeze") getSegment(segmentIndexOf(entityId)).freeze = entityId;
      continue;
    }

    if (domain === "button") {
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

  // With only one segment, WLED skips the separate master light entity and
  // uses segment 0's own light as the main control.
  if (!result.main) {
    result.main = result.segments.find((seg) => seg.index === 0)?.light;
  }

  return result;
}
