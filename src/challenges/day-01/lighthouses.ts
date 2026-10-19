export type GeoJsonValue = string | number | boolean | null | GeoJsonValue[] | { [key: string]: GeoJsonValue }
export type LighthouseProperties = Record<string, GeoJsonValue>
export type Position = [longitude: number, latitude: number]

export interface LighthouseFeature {
  type: 'Feature'
  id?: string | number
  properties: LighthouseProperties | null
  geometry: {
    type: string
    coordinates: unknown
  } | null
}

export interface LighthouseCollection {
  type: 'FeatureCollection'
  features: unknown[]
  [key: string]: unknown
}

export interface Lighthouse {
  id: string
  position: Position
  properties: LighthouseProperties
  sourceFeature: LighthouseFeature
}

export interface DataIssues {
  invalidFeatures: number
  invalidGeometries: number
  invalidCoordinates: number
  missingProperties: number
  missingNames: number
  duplicateIds: number
}

export interface ParsedLighthouses {
  collection: LighthouseCollection
  features: Lighthouse[]
  issues: DataIssues
}

export interface MapLighthouseCollection {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    id: string
    properties: LighthouseProperties
    geometry: { type: 'Point'; coordinates: Position }
  }>
}

export interface LightDetail {
  number: number
  properties: Array<{ key: string; label: string; value: string }>
}

export const LIGHT_PROPERTY_LABELS: Record<string, string> = {
  category: 'Category',
  character: 'Light character',
  colour: 'Colour',
  group: 'Group',
  height: 'Height',
  period: 'Period',
  range: 'Range',
  reference: 'Reference',
  sector_end: 'Sector end',
  sector_start: 'Sector start',
  sequence: 'Sequence',
  exhibition: 'Exhibition',
  multiple: 'Multiple',
  visibility: 'Visibility',
}

export const LIGHTHOUSE_CLASS_LABELS: Record<string, string> = {
  lighthouse: 'Lighthouse',
  beacon: 'Beacon',
  tower: 'Tower',
}

export const SEAMARK_TYPE_LABELS: Record<string, string> = {
  landmark: 'Landmark',
  light_major: 'Major navigational light',
  light_minor: 'Minor navigational light',
}

const LIGHT_PROPERTY_ORDER: Record<string, number> = {
  character: 0,
  colour: 1,
  height: 2,
  period: 3,
  sector_start: 4,
  sector_end: 5,
  range: 6,
  group: 7,
  category: 8,
  sequence: 9,
  reference: 10,
  visibility: 11,
  exhibition: 12,
  multiple: 13,
}

export function parseLighthouseCollection(input: unknown): ParsedLighthouses {
  if (!isRecord(input) || input['type'] !== 'FeatureCollection' || !Array.isArray(input['features'])) {
    throw new Error('The lighthouse data is not a valid GeoJSON FeatureCollection.')
  }

  const collection: LighthouseCollection = {
    ...input,
    type: 'FeatureCollection',
    features: input['features'],
  }
  const issues: DataIssues = {
    invalidFeatures: 0,
    invalidGeometries: 0,
    invalidCoordinates: 0,
    missingProperties: 0,
    missingNames: 0,
    duplicateIds: 0,
  }
  const seenFeatures = new Set<string>()
  const features: Lighthouse[] = []

  for (const [index, candidate] of collection.features.entries()) {
    if (!isRecord(candidate) || candidate['type'] !== 'Feature') {
      issues.invalidFeatures += 1
      continue
    }

    const sourceFeature = candidate as unknown as LighthouseFeature
    if (!sourceFeature.geometry || sourceFeature.geometry.type !== 'Point') {
      issues.invalidGeometries += 1
      continue
    }

    const position = parsePosition(sourceFeature.geometry.coordinates)
    if (!position) {
      issues.invalidCoordinates += 1
      continue
    }

    const properties = isRecord(sourceFeature.properties)
      ? (sourceFeature.properties as LighthouseProperties)
      : null

    const id = resolveFeatureId(sourceFeature, properties, index, position)
    const identity = getFeatureIdentity(sourceFeature, properties, position)
    if (seenFeatures.has(identity)) {
      issues.duplicateIds += 1
      continue
    }
    seenFeatures.add(identity)
    if (!properties) issues.missingProperties += 1
    if (!displayValue(properties?.['name'])) issues.missingNames += 1
    features.push({
      id,
      position,
      properties: properties ?? {},
      sourceFeature,
    })
  }

  return { collection, features, issues }
}

export function parsePosition(coordinates: unknown): Position | undefined {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return undefined
  const [longitude, latitude] = coordinates
  if (
    typeof longitude !== 'number' ||
    typeof latitude !== 'number' ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return undefined
  }

  return [longitude, latitude]
}

export function resolveFeatureId(
  feature: LighthouseFeature,
  properties: LighthouseProperties | null,
  index: number,
  position: Position,
): string {
  if (typeof feature.id === 'string' || (typeof feature.id === 'number' && Number.isFinite(feature.id))) {
    if (String(feature.id)) return String(feature.id)
  }
  const sourceId = displayValue(properties?.['@id'])
  if (sourceId) return sourceId
  return `feature-${index}-${position[0]}-${position[1]}`
}

function getFeatureIdentity(
  feature: LighthouseFeature,
  properties: LighthouseProperties | null,
  position: Position,
): string {
  const sourceId =
    (typeof feature.id === 'string' && feature.id
      ? feature.id
      : typeof feature.id === 'number' && Number.isFinite(feature.id)
        ? String(feature.id)
        : undefined) ?? displayValue(properties?.['@id'])
  if (sourceId) return `id:${sourceId}`
  return `fallback:${position[0]},${position[1]}:${JSON.stringify(properties ?? {})}`
}

export function parseLightDetails(properties: LighthouseProperties): LightDetail[] {
  const groups = new Map<number, LightDetail['properties']>()

  for (const [key, rawValue] of Object.entries(properties)) {
    const match = /^seamark:light:(\d+):(.+)$/.exec(key)
    if (!match) continue

    const numberText = match[1]
    const propertyName = match[2]
    if (numberText === undefined || propertyName === undefined) continue

    const number = Number(numberText)
    const value = displayValue(rawValue)
    if (!Number.isSafeInteger(number) || number < 1 || !value) continue

    const group = groups.get(number) ?? []
    group.push({
      key,
      label: LIGHT_PROPERTY_LABELS[propertyName] ?? readableTagName(propertyName),
      value,
    })
    groups.set(number, group)
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([number, values]) => ({
      number,
      properties: values.sort(compareLightProperties),
    }))
}

export function parseGeneralLightDetails(properties: LighthouseProperties): LightDetail['properties'] {
  return Object.entries(properties)
    .flatMap(([key, rawValue]) => {
      const match = /^seamark:light:(?!\d+:)(.+)$/.exec(key)
      const propertyName = match?.[1]
      const value = displayValue(rawValue)
      if (!propertyName || !value) return []

      return [
        {
          key,
          label: LIGHT_PROPERTY_LABELS[propertyName] ?? readableTagName(propertyName),
          value,
        },
      ]
    })
    .sort(compareLightProperties)
}

export function displayValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() ? value : undefined
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}

export function readableTagName(value: string): string {
  return value
    .split(/[_:]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function compareLightProperties(
  left: LightDetail['properties'][number],
  right: LightDetail['properties'][number],
): number {
  const leftKey = left.key.split(':').pop() ?? ''
  const rightKey = right.key.split(':').pop() ?? ''
  const orderDifference =
    (LIGHT_PROPERTY_ORDER[leftKey] ?? Number.MAX_SAFE_INTEGER) -
    (LIGHT_PROPERTY_ORDER[rightKey] ?? Number.MAX_SAFE_INTEGER)

  return orderDifference || left.label.localeCompare(right.label)
}

export function getLighthouseBounds(
  features: Lighthouse[],
): [[number, number], [number, number]] | undefined {
  if (features.length === 0) return undefined

  type Bounds = [west: number, south: number, east: number, north: number]
  const bounds = features.reduce<Bounds>(
    ([west, south, east, north], { position: [longitude, latitude] }) => [
      Math.min(west, longitude),
      Math.min(south, latitude),
      Math.max(east, longitude),
      Math.max(north, latitude),
    ],
    [Infinity, Infinity, -Infinity, -Infinity],
  )

  return [
    [bounds[0], bounds[1]],
    [bounds[2], bounds[3]],
  ]
}

export function getOpenStreetMapUrl(feature: Lighthouse): string | undefined {
  const sourceId = displayValue(feature.properties['@id'])
  const featureId = sourceId ?? (typeof feature.sourceFeature.id === 'string' ? feature.sourceFeature.id : '')
  const match = /^(node|way|relation)\/([1-9]\d*)$/.exec(featureId)
  if (!match) return undefined

  return `https://www.openstreetmap.org/${match[1]}/${match[2]}`
}

export function getWikidataUrl(value: unknown): string | undefined {
  const id = displayValue(value)
  if (!id || !/^Q[1-9]\d*$/.test(id)) return undefined
  return `https://www.wikidata.org/wiki/${id}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
