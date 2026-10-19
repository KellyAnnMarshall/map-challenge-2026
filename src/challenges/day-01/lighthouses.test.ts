import { describe, expect, it } from 'vitest'
import {
  getLighthouseBounds,
  getOpenStreetMapUrl,
  getWikidataUrl,
  parseGeneralLightDetails,
  parseLightDetails,
  parseLighthouseCollection,
  type Lighthouse,
} from './lighthouses'

describe('lighthouse GeoJSON', () => {
  it('keeps point coordinates authoritative and preserves the source feature', () => {
    const sourceFeature = {
      type: 'Feature',
      id: 'node/123',
      properties: { '@id': 'node/123', name: 'Harbour Light', source: 'survey' },
      geometry: { type: 'Point', coordinates: [-5.2, 57.1] },
    }
    const parsed = parseLighthouseCollection({ type: 'FeatureCollection', features: [sourceFeature] })

    expect(parsed.features[0]?.position).toEqual([-5.2, 57.1])
    expect(parsed.features[0]?.sourceFeature).toEqual(sourceFeature)
    expect(parsed.features[0]?.properties).toBe(sourceFeature.properties)
    expect(parsed.issues).toEqual({
      invalidFeatures: 0,
      invalidGeometries: 0,
      invalidCoordinates: 0,
      missingProperties: 0,
      missingNames: 0,
      duplicateIds: 0,
    })
  })

  it('skips invalid data, counts incomplete records, and de-duplicates stable identifiers', () => {
    const parsed = parseLighthouseCollection({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', id: 'node/1', properties: {}, geometry: { type: 'Point', coordinates: [0, 0] } },
        { type: 'Feature', id: 'node/1', properties: {}, geometry: { type: 'Point', coordinates: [1, 1] } },
        { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
        { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [181, 20] } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [1] } },
        null,
      ],
    })

    expect(parsed.features).toHaveLength(1)
    expect(parsed.features[0]?.id).toBe('node/1')
    expect(parsed.issues).toEqual({
      invalidFeatures: 1,
      invalidGeometries: 1,
      invalidCoordinates: 2,
      missingProperties: 0,
      missingNames: 1,
      duplicateIds: 1,
    })
  })

  it('creates a stable fallback id and handles missing properties', () => {
    const parsed = parseLighthouseCollection({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [-4, 56] } }],
    })

    expect(parsed.features[0]?.id).toBe('feature-0--4-56')
    expect(parsed.features[0]?.properties).toEqual({})
    expect(parsed.issues.missingProperties).toBe(1)
  })

  it('deduplicates identical source features without identifiers', () => {
    const feature = {
      type: 'Feature',
      properties: { name: 'Unreferenced light' },
      geometry: { type: 'Point', coordinates: [-4, 56] },
    }
    const parsed = parseLighthouseCollection({
      type: 'FeatureCollection',
      features: [feature, structuredClone(feature)],
    })

    expect(parsed.features).toHaveLength(1)
    expect(parsed.issues.duplicateIds).toBe(1)
  })

  it('parses arbitrarily numbered light groups and retains original values', () => {
    const groups = parseLightDetails({
      'seamark:light:1:character': 'Fl',
      'seamark:light:1:height': '12',
      'seamark:light:12:sector_start': '253',
      'seamark:light:12:custom_tag': 'kept',
      'seamark:light:2:period': 3,
      'seamark:light:0:character': 'ignored group zero',
      'seamark:light:3:colour': null,
    })

    expect(groups.map(({ number }) => number)).toEqual([1, 2, 12])
    expect(groups[0]?.properties).toEqual([
      { key: 'seamark:light:1:character', label: 'Light character', value: 'Fl' },
      { key: 'seamark:light:1:height', label: 'Height', value: '12' },
    ])
    expect(groups[2]?.properties).toContainEqual({
      key: 'seamark:light:12:custom_tag',
      label: 'Custom Tag',
      value: 'kept',
    })
  })

  it('parses unnumbered navigational light tags separately', () => {
    expect(
      parseGeneralLightDetails({
        'seamark:light:character': 'Fl',
        'seamark:light:range': '12',
        'seamark:light:1:character': 'Oc',
      }),
    ).toEqual([
      { key: 'seamark:light:character', label: 'Light character', value: 'Fl' },
      { key: 'seamark:light:range', label: 'Range', value: '12' },
    ])
  })

  it('derives dataset bounds and validates source links', () => {
    const features = [{ position: [-5, 55] }, { position: [-3, 59] }] as Lighthouse[]

    expect(getLighthouseBounds(features)).toEqual([
      [-5, 55],
      [-3, 59],
    ])
    expect(getLighthouseBounds([])).toBeUndefined()

    const lighthouse = {
      id: 'node/123',
      position: [-5, 57],
      properties: { '@id': 'relation/456' },
      sourceFeature: { type: 'Feature', id: 'node/123', properties: {}, geometry: null },
    } as Lighthouse
    expect(getOpenStreetMapUrl(lighthouse)).toBe('https://www.openstreetmap.org/relation/456')
    expect(getWikidataUrl('Q42')).toBe('https://www.wikidata.org/wiki/Q42')
    expect(getWikidataUrl('javascript:alert(1)')).toBeUndefined()
  })
})
