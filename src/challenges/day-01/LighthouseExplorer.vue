<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl'
import {
  displayValue,
  getLighthouseBounds,
  getOpenStreetMapUrl,
  parseGeneralLightDetails,
  getWikidataUrl,
  LIGHTHOUSE_CLASS_LABELS,
  type MapLighthouseCollection,
  parseLightDetails,
  parseLighthouseCollection,
  readableTagName,
  SEAMARK_TYPE_LABELS,
  type DataIssues,
  type Lighthouse,
  type LighthouseProperties,
  type ParsedLighthouses,
} from './lighthouses'

const hasMapboxToken = Boolean(import.meta.env.VITE_MAPBOX_ACCESS_TOKEN)
const mapContainer = ref<HTMLDivElement>()
const resultList = ref<HTMLUListElement>()
const data = ref<ParsedLighthouses>()
const selectedFeature = ref<Lighthouse>()
const detailPanel = ref<HTMLElement>()
const detailCloseButton = ref<HTMLButtonElement>()
const isMobile = ref(false)
const search = ref('')
const ruinFilter = ref<'all' | 'ruins' | 'not-ruins'>('all')
const typeFilter = ref('')
const loadingError = ref('')
const mapError = ref('')
const mapLoading = ref(false)
const mapLoaded = ref(false)
let map: MapboxMap | undefined
let selectedMapId: string | undefined
let mobileQuery: MediaQueryList | undefined
let detailReturnFocus: HTMLElement | null = null

const features = computed(() => data.value?.features ?? [])
const seamarkTypes = computed(() =>
  [
    ...new Set(
      features.value.map(({ properties }) => displayValue(properties['seamark:type'])).filter(isString),
    ),
  ]
    .sort()
    .map((value) => ({ value, label: SEAMARK_TYPE_LABELS[value] ?? readableTagName(value) })),
)
const visibleFeatures = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()

  return features.value.filter(({ properties }) => {
    const name = displayValue(properties['name'])?.toLocaleLowerCase() ?? ''
    const isRuin = displayValue(properties['ruins'])?.toLocaleLowerCase() === 'yes'
    const classification = displayValue(properties['seamark:type']) ?? ''

    if (query && !name.includes(query)) return false
    if (ruinFilter.value === 'ruins' && !isRuin) return false
    if (ruinFilter.value === 'not-ruins' && isRuin) return false
    if (typeFilter.value && classification !== typeFilter.value) return false
    return true
  })
})
const lightDetails = computed(() =>
  selectedFeature.value ? parseLightDetails(selectedFeature.value.properties) : [],
)
const generalLightDetails = computed(() =>
  selectedFeature.value ? parseGeneralLightDetails(selectedFeature.value.properties) : [],
)
const selectedOpenStreetMapUrl = computed(() =>
  selectedFeature.value ? getOpenStreetMapUrl(selectedFeature.value) : undefined,
)
const selectedWikidataUrl = computed(() =>
  selectedFeature.value ? getWikidataUrl(selectedFeature.value.properties['wikidata']) : undefined,
)
const issueSummary = computed(() => {
  if (!data.value) return ''
  const issues = data.value.issues
  const messages = [
    issues.invalidFeatures &&
      `${issues.invalidFeatures} malformed feature${plural(issues.invalidFeatures)} skipped`,
    issues.invalidGeometries &&
      `${issues.invalidGeometries} non-point geometry${plural(issues.invalidGeometries)} skipped`,
    issues.invalidCoordinates &&
      `${issues.invalidCoordinates} invalid coordinate${plural(issues.invalidCoordinates)} skipped`,
    issues.duplicateIds &&
      `${issues.duplicateIds} duplicate feature ID${plural(issues.duplicateIds)} skipped`,
    issues.missingNames && `${issues.missingNames} unnamed feature${plural(issues.missingNames)} retained`,
    issues.missingProperties &&
      `${issues.missingProperties} feature${plural(issues.missingProperties)} without properties retained`,
  ].filter((message): message is string => typeof message === 'string')

  return messages.length ? messages.join(' · ') : 'All point features passed validation.'
})

onMounted(() => {
  mobileQuery = window.matchMedia('(max-width: 620px)')
  isMobile.value = mobileQuery.matches
  mobileQuery.addEventListener('change', onMobileQueryChange)
  void loadLighthouses()
})

onBeforeUnmount(() => {
  mobileQuery?.removeEventListener('change', onMobileQueryChange)
  window.removeEventListener('keydown', handleDetailKeydown)
  map?.remove()
})

watch([selectedFeature, isMobile], ([feature, mobile]) => {
  if (feature && mobile) {
    window.addEventListener('keydown', handleDetailKeydown)
  } else {
    window.removeEventListener('keydown', handleDetailKeydown)
  }
})

watch(visibleFeatures, (visible) => {
  if (selectedFeature.value && !visible.some(({ id }) => id === selectedFeature.value?.id)) {
    selectFeature(undefined)
  }
  updateMapSource(visible)
})

watch(
  mapContainer,
  (container) => {
    if (container && hasMapboxToken && !map) {
      void loadMap(import.meta.env.VITE_MAPBOX_ACCESS_TOKEN)
    }
  },
  { flush: 'post' },
)

async function loadLighthouses(): Promise<void> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/scottish-lighthouses.geojson`)
    if (!response.ok) {
      throw new Error(`The lighthouse data request failed (${response.status} ${response.statusText}).`)
    }

    const rawData: unknown = await response.json()
    data.value = parseLighthouseCollection(rawData)
    if (mapLoaded.value) resetView()
  } catch (error) {
    loadingError.value =
      error instanceof Error ? error.message : 'The lighthouse data could not be loaded or validated.'
  }
}

async function loadMap(token: string | undefined): Promise<void> {
  if (!token || !mapContainer.value) return
  mapLoading.value = true

  try {
    const { default: mapboxgl } = await import('mapbox-gl')
    if (!mapContainer.value) return

    mapboxgl.accessToken = token
    map = new mapboxgl.Map({
      container: mapContainer.value,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-4.3, 57.4],
      zoom: 5.5,
      maxBounds: getLighthouseBounds(features.value),
      attributionControl: true,
      cooperativeGestures: true,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', () => {
      if (!map) return
      installLighthouseLayers(map)
      mapLoaded.value = true
      mapLoading.value = false
      updateMapSource(visibleFeatures.value)
      constrainMapToDataBounds()
      resetView()
    })
    map.on('resize', constrainMapToDataBounds)
    map.on('error', (event) => {
      mapError.value = event.error.message
      mapLoading.value = false
    })
  } catch (error) {
    mapError.value = error instanceof Error ? error.message : String(error)
    mapLoading.value = false
  }
}

function installLighthouseLayers(mapInstance: MapboxMap): void {
  mapInstance.addSource('lighthouse-points', {
    type: 'geojson',
    data: toGeoJSON([]),
    cluster: true,
    clusterMaxZoom: 10,
    clusterRadius: 42,
    attribution: '© OpenStreetMap contributors',
  })
  mapInstance.addLayer({
    id: 'lighthouse-clusters',
    type: 'circle',
    source: 'lighthouse-points',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': ['step', ['get', 'point_count'], '#4b7559', 20, '#365c48', 60, '#263f34'],
      'circle-radius': ['step', ['get', 'point_count'], 16, 20, 21, 60, 27],
      'circle-stroke-color': '#f5f4ed',
      'circle-stroke-width': 2,
    },
  })
  mapInstance.addLayer({
    id: 'lighthouse-cluster-count',
    type: 'symbol',
    source: 'lighthouse-points',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
    paint: { 'text-color': '#ffffff' },
  })
  mapInstance.addLayer({
    id: 'lighthouse-unclustered',
    type: 'circle',
    source: 'lighthouse-points',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#20302d',
        ['==', ['downcase', ['to-string', ['get', 'ruins']]], 'yes'],
        '#a7472d',
        '#3a664f',
      ],
      'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 10, 6],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3, 1.75],
    },
  })

  mapInstance.on('click', 'lighthouse-clusters', (event) => {
    const cluster = mapInstance.queryRenderedFeatures(event.point, {
      layers: ['lighthouse-clusters'],
    })[0]
    const clusterData = cluster?.toJSON()
    const clusterId = clusterData?.properties?.['cluster_id']
    const source = mapInstance.getSource('lighthouse-points') as GeoJSONSource | undefined
    if (typeof clusterId !== 'number' || !source) return

    source.getClusterExpansionZoom(clusterId, (error, zoom) => {
      const geometry = clusterData?.geometry
      if (error || zoom === null || zoom === undefined || geometry?.type !== 'Point') return
      const [longitude, latitude] = geometry.coordinates
      if (typeof longitude !== 'number' || typeof latitude !== 'number') return
      mapInstance.easeTo({ center: { lng: longitude, lat: latitude }, zoom })
    })
  })

  mapInstance.on('click', 'lighthouse-unclustered', (event) => {
    const mapFeature = mapInstance.queryRenderedFeatures(event.point, {
      layers: ['lighthouse-unclustered'],
    })[0]
    if (!mapFeature) return

    const { id, geometry, properties } = mapFeature.toJSON()
    const sourceId = displayValue(properties?.['@id'])
    const lighthouse =
      (typeof id === 'string' || typeof id === 'number'
        ? features.value.find((item) => item.id === String(id))
        : undefined) ??
      (sourceId
        ? features.value.find((item) => displayValue(item.properties['@id']) === sourceId)
        : undefined) ??
      (geometry?.type === 'Point'
        ? features.value.find(
            ({ position }) =>
              Math.abs(position[0] - geometry.coordinates[0]) < 0.00001 &&
              Math.abs(position[1] - geometry.coordinates[1]) < 0.00001,
          )
        : undefined)
    if (lighthouse) selectFeature(lighthouse, true)
  })

  for (const layer of ['lighthouse-clusters', 'lighthouse-unclustered']) {
    mapInstance.on('mouseenter', layer, () => {
      mapInstance.getCanvas().style.cursor = 'pointer'
    })
    mapInstance.on('mouseleave', layer, () => {
      mapInstance.getCanvas().style.cursor = ''
    })
  }

  mapInstance.on('click', (event) => {
    if (
      mapInstance.queryRenderedFeatures(event.point, {
        layers: ['lighthouse-clusters', 'lighthouse-unclustered'],
      }).length
    ) {
      return
    }
    selectFeature(undefined)
  })
}

function updateMapSource(visible: Lighthouse[]): void {
  if (!mapLoaded.value || !map) return
  const source = map.getSource('lighthouse-points') as GeoJSONSource | undefined
  source?.setData(toGeoJSON(visible))
}

function toGeoJSON(features: Lighthouse[]): MapLighthouseCollection {
  return {
    type: 'FeatureCollection',
    features: features.map(({ id, position, properties }) => ({
      type: 'Feature',
      id,
      properties: { ...properties },
      geometry: { type: 'Point', coordinates: position },
    })),
  }
}

function selectFeature(feature: Lighthouse | undefined, focusOnMap = false): void {
  if (feature && !selectedFeature.value && isMobile.value) {
    detailReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    void nextTick(() => detailCloseButton.value?.focus())
  }
  if (map && selectedMapId) {
    map.setFeatureState({ source: 'lighthouse-points', id: selectedMapId }, { selected: false })
  }
  selectedFeature.value = feature
  selectedMapId = feature?.id
  if (map && selectedMapId) {
    map.setFeatureState({ source: 'lighthouse-points', id: selectedMapId }, { selected: true })
  }
  if (map && feature && focusOnMap) {
    map.easeTo({
      center: feature.position,
      zoom: Math.max(map.getZoom(), 11),
      duration: 500,
    })
  }
  if (feature) {
    void nextTick(() => {
      const result = [
        ...(resultList.value?.querySelectorAll<HTMLButtonElement>('.lighthouse-result') ?? []),
      ].find((button) => button.dataset['featureId'] === feature.id)
      result?.scrollIntoView({ block: 'nearest' })
    })
  }
}

function closeDetails(): void {
  if (!selectedFeature.value) return
  selectFeature(undefined)
  void nextTick(() => {
    detailReturnFocus?.focus()
    detailReturnFocus = null
  })
}

function onMobileQueryChange(event: MediaQueryListEvent): void {
  isMobile.value = event.matches
  if (!event.matches) detailReturnFocus = null
}

function handleDetailKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeDetails()
    return
  }
  if (event.key !== 'Tab' || !detailPanel.value) return

  const focusable = detailPanel.value.querySelectorAll<HTMLElement>(
    'button:not(:disabled), a[href], summary, [tabindex]:not([tabindex="-1"])',
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function resetView(): void {
  if (!map) return
  const bounds = getLighthouseBounds(features.value)
  if (!bounds) {
    map.jumpTo({ center: [-4.3, 57.4], zoom: 5.5 })
    return
  }

  map.fitBounds(bounds, {
    padding: { top: 64, right: 64, bottom: 64, left: 64 },
    maxZoom: 7.5,
    duration: 700,
  })
}

function constrainMapToDataBounds(): void {
  if (!map) return
  const bounds = getLighthouseBounds(features.value)
  if (!bounds) return

  const camera = map.cameraForBounds(bounds, {
    padding: { top: 64, right: 64, bottom: 64, left: 64 },
    maxZoom: 7.5,
  })
  if (camera?.zoom !== undefined) map.setMinZoom(camera.zoom)
}

function getFeatureName(feature: Lighthouse): string {
  return displayValue(feature.properties['name']) ?? 'Unnamed feature'
}

function getFeatureClassification(properties: LighthouseProperties): string[] {
  const manMade = displayValue(properties['man_made'])
  const seamarkType = displayValue(properties['seamark:type'])
  return [
    manMade ? (LIGHTHOUSE_CLASS_LABELS[manMade] ?? readableTagName(manMade)) : undefined,
    seamarkType ? (SEAMARK_TYPE_LABELS[seamarkType] ?? readableTagName(seamarkType)) : undefined,
  ].filter(isString)
}

function getFeatureReferences(properties: LighthouseProperties): Array<{ label: string; value: string }> {
  const references: Array<[string, string]> = [
    ['ref:canmore', 'Canmore reference'],
    ['ref', 'Reference'],
    ['source', 'Source'],
    ['wikidata', 'Wikidata'],
  ]
  return references.flatMap(([key, label]) => {
    const value = displayValue(properties[key])
    return value ? [{ label, value }] : []
  })
}

function getSourceTagValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value) ?? String(value)
}

function isString(value: string | undefined): value is string {
  return value !== undefined
}

function plural(value: number): string {
  return value === 1 ? '' : 's'
}

function isRuins(properties: LighthouseProperties): boolean {
  return displayValue(properties['ruins'])?.toLocaleLowerCase() === 'yes'
}

function issueCount(issues: DataIssues): number {
  return Object.values(issues).reduce((sum, value) => sum + value, 0)
}

function selectedFeatureIsRuins(): boolean {
  return selectedFeature.value ? isRuins(selectedFeature.value.properties) : false
}
</script>

<template>
  <section class="lighthouse-explorer" aria-labelledby="lighthouse-title">
    <div class="lighthouse-heading">
      <div>
        <p class="eyebrow"><span class="eyebrow-dot"></span> DAY ONE <span>·</span> A POINT ON THE COAST</p>
        <h1 id="lighthouse-title">Keepers of the <em>light.</em></h1>
        <p class="lighthouse-intro">
          A collection of points along Scotland's shoreline. Each one marks a signal, a place, or a story
          worth finding.
        </p>
      </div>
      <div class="lighthouse-heading-note">
        <span>01 / 30</span>
        <RouterLink to="/day/02">NEXT PROMPT <span aria-hidden="true">↗</span></RouterLink>
      </div>
    </div>

    <div class="lighthouse-tools" role="group" aria-label="Filter lighthouse features">
      <label class="lighthouse-filter" for="lighthouse-ruin-filter">
        <span class="sr-only">Filter by ruin status</span>
        <select id="lighthouse-ruin-filter" v-model="ruinFilter">
          <option value="all">All features</option>
          <option value="ruins">Tagged as ruins</option>
          <option value="not-ruins">Not tagged as ruins</option>
        </select>
      </label>
      <label class="lighthouse-filter" for="lighthouse-type-filter">
        <span class="sr-only">Filter by navigational classification</span>
        <select id="lighthouse-type-filter" v-model="typeFilter">
          <option value="">All classifications</option>
          <option v-for="type in seamarkTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
        </select>
      </label>
      <p class="lighthouse-result-count" aria-live="polite">
        <strong>{{ visibleFeatures.length }}</strong> <span>/ {{ features.length }} POINTS</span>
      </p>
    </div>

    <p v-if="loadingError" class="lighthouse-alert" role="alert">{{ loadingError }}</p>
    <div v-else-if="!data" class="lighthouse-loading" role="status">
      Loading the local lighthouse dataset…
    </div>
    <template v-else>
      <div v-if="issueCount(data.issues)" class="lighthouse-data-note" role="status">
        Dataset check: {{ issueSummary }}
      </div>
      <div class="lighthouse-workspace">
        <div class="lighthouse-map-column">
          <div class="lighthouse-map" :class="{ 'lighthouse-map-unavailable': !hasMapboxToken || mapError }">
            <div v-if="hasMapboxToken" ref="mapContainer" class="lighthouse-map-canvas"></div>
            <div v-if="!hasMapboxToken || mapError" class="lighthouse-map-message" role="status">
              <span class="map-message-mark" aria-hidden="true">✳</span>
              <strong>{{ mapError ? 'The map could not load.' : 'Map preview unavailable.' }}</strong>
              <span>{{
                mapError
                  ? mapError
                  : 'Add a restricted public Mapbox token to .env.local to view the interactive map.'
              }}</span>
            </div>
            <p v-if="mapLoading && !mapError" class="lighthouse-map-status" role="status">Loading map…</p>
            <button
              v-if="hasMapboxToken && !mapError"
              class="map-reset-button"
              type="button"
              aria-label="Reset view"
              @click="resetView"
            >
              <span aria-hidden="true">◎</span> RESET VIEW
            </button>
            <div class="map-legend" aria-label="Map legend">
              <span><i class="legend-dot"></i> FEATURE</span>
              <span><i class="legend-dot legend-dot-ruin"></i> TAGGED AS RUIN</span>
              <span><i class="legend-cluster">24</i> CLUSTER</span>
            </div>
          </div>
          <p class="lighthouse-attribution">
            Map data ©
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer"
              >OpenStreetMap contributors</a
            >
            <span>·</span> ODbL
          </p>

          <section class="lighthouse-results" aria-labelledby="results-title">
            <div class="lighthouse-subheading">
              <h2 id="results-title">Along the coast</h2>
              <label class="lighthouse-results-search" for="lighthouse-search">
                <span class="sr-only">Search lighthouse results</span>
                <span aria-hidden="true">⌕</span>
                <input
                  id="lighthouse-search"
                  v-model="search"
                  type="search"
                  placeholder="Search results…"
                  autocomplete="off"
                />
              </label>
              <span>{{ visibleFeatures.length }} RESULTS</span>
            </div>
            <ul v-if="visibleFeatures.length" ref="resultList" class="lighthouse-result-list">
              <li v-for="feature in visibleFeatures" :key="feature.id">
                <button
                  class="lighthouse-result"
                  :class="{ 'lighthouse-result-selected': selectedFeature?.id === feature.id }"
                  type="button"
                  :data-feature-id="feature.id"
                  :aria-pressed="selectedFeature?.id === feature.id"
                  @click="selectFeature(feature, true)"
                >
                  <span
                    class="result-marker"
                    :class="{ 'result-marker-ruin': isRuins(feature.properties) }"
                  ></span>
                  <span class="result-copy">
                    <strong>{{ getFeatureName(feature) }}</strong>
                    <span>{{
                      getFeatureClassification(feature.properties).join(' · ') || 'Mapped feature'
                    }}</span>
                  </span>
                  <span class="result-arrow" aria-hidden="true">↗</span>
                </button>
              </li>
            </ul>
            <p v-else class="lighthouse-empty">No features match those filters. Try a different search.</p>
          </section>
        </div>

        <aside
          class="lighthouse-detail"
          :class="{ 'lighthouse-detail-open': isMobile && selectedFeature }"
          :role="isMobile && selectedFeature ? 'dialog' : 'complementary'"
          :aria-modal="isMobile && selectedFeature ? 'true' : undefined"
          :tabindex="isMobile && selectedFeature ? -1 : undefined"
          aria-labelledby="detail-title"
        >
          <button
            v-if="isMobile && selectedFeature"
            class="detail-backdrop"
            type="button"
            aria-label="Close feature details"
            @click="closeDetails"
          ></button>
          <div ref="detailPanel" class="lighthouse-detail-panel" aria-live="polite">
            <button
              v-if="isMobile && selectedFeature"
              ref="detailCloseButton"
              class="detail-close detail-close-top"
              type="button"
              aria-label="Close feature details"
              @click="closeDetails"
            >
              <span aria-hidden="true">×</span>
            </button>
            <template v-if="selectedFeature">
              <p class="detail-kicker"><span class="eyebrow-dot"></span> FEATURE DETAILS</p>
              <h2 id="detail-title">{{ getFeatureName(selectedFeature) }}</h2>
              <p class="detail-classification">
                {{ getFeatureClassification(selectedFeature.properties).join(' · ') || 'Mapped feature' }}
              </p>
              <p v-if="selectedFeatureIsRuins()" class="ruin-status">
                <span aria-hidden="true">◆</span> Tagged as ruins in OpenStreetMap
              </p>
              <p v-else class="detail-caveat">
                No ruin tag recorded. This does not confirm operational status.
              </p>

              <section class="detail-section">
                <h3><span>LOCATION</span> GeoJSON point</h3>
                <dl class="detail-fields">
                  <div>
                    <dt>Latitude</dt>
                    <dd>{{ selectedFeature.position[1] }}</dd>
                  </div>
                  <div>
                    <dt>Longitude</dt>
                    <dd>{{ selectedFeature.position[0] }}</dd>
                  </div>
                </dl>
              </section>

              <section v-if="generalLightDetails.length" class="detail-section">
                <h3><span>LIGHT</span> Navigational light</h3>
                <dl class="detail-fields">
                  <div v-for="field in generalLightDetails" :key="field.key">
                    <dt>{{ field.label }}</dt>
                    <dd>{{ field.value }}</dd>
                  </div>
                </dl>
              </section>

              <section v-for="light in lightDetails" :key="light.number" class="detail-section">
                <h3>
                  <span>LIGHT {{ String(light.number).padStart(2, '0') }}</span> Navigational light
                </h3>
                <dl class="detail-fields">
                  <div v-for="field in light.properties" :key="field.key">
                    <dt>{{ field.label }}</dt>
                    <dd>{{ field.value }}</dd>
                  </div>
                </dl>
              </section>

              <section
                v-if="
                  displayValue(selectedFeature.properties['seamark:fog_signal:category']) ||
                  displayValue(selectedFeature.properties['seamark:fog_signal:group']) ||
                  displayValue(selectedFeature.properties['seamark:fog_signal:period'])
                "
                class="detail-section"
              >
                <h3><span>FOG SIGNAL</span> Audible signal</h3>
                <dl class="detail-fields">
                  <div v-if="displayValue(selectedFeature.properties['seamark:fog_signal:category'])">
                    <dt>Category</dt>
                    <dd>{{ displayValue(selectedFeature.properties['seamark:fog_signal:category']) }}</dd>
                  </div>
                  <div v-if="displayValue(selectedFeature.properties['seamark:fog_signal:group'])">
                    <dt>Group</dt>
                    <dd>{{ displayValue(selectedFeature.properties['seamark:fog_signal:group']) }}</dd>
                  </div>
                  <div v-if="displayValue(selectedFeature.properties['seamark:fog_signal:period'])">
                    <dt>Period</dt>
                    <dd>{{ displayValue(selectedFeature.properties['seamark:fog_signal:period']) }}</dd>
                  </div>
                </dl>
              </section>

              <section v-if="getFeatureReferences(selectedFeature.properties).length" class="detail-section">
                <h3><span>REFERENCES</span> Source notes</h3>
                <dl class="detail-fields">
                  <div
                    v-for="reference in getFeatureReferences(selectedFeature.properties)"
                    :key="reference.label"
                  >
                    <dt>{{ reference.label }}</dt>
                    <dd>
                      <a
                        v-if="reference.label === 'Wikidata' && selectedWikidataUrl"
                        :href="selectedWikidataUrl"
                        target="_blank"
                        rel="noreferrer"
                        >{{ reference.value }}</a
                      >
                      <span v-else>{{ reference.value }}</span>
                    </dd>
                  </div>
                </dl>
              </section>

              <details class="source-tags">
                <summary>Inspect original OSM tags</summary>
                <dl class="detail-fields source-tag-list">
                  <div v-for="(value, key) in selectedFeature.properties" :key="key">
                    <dt>{{ key }}</dt>
                    <dd>{{ getSourceTagValue(value) }}</dd>
                  </div>
                </dl>
              </details>

              <a
                v-if="selectedOpenStreetMapUrl"
                class="osm-feature-link"
                :href="selectedOpenStreetMapUrl"
                target="_blank"
                rel="noreferrer"
              >
                OPEN IN OPENSTREETMAP <span aria-hidden="true">↗</span>
              </a>
              <p v-else class="detail-caveat">No supported OpenStreetMap feature reference is available.</p>
              <button
                v-if="isMobile"
                class="detail-close detail-close-bottom"
                type="button"
                @click="closeDetails"
              >
                Close details
              </button>
            </template>
            <div v-else class="detail-empty">
              <span class="detail-empty-mark" aria-hidden="true">✳</span>
              <p class="detail-kicker">A CLOSER LOOK</p>
              <h2 id="detail-title">Choose a point.</h2>
              <p>Select a marker on the map or a place in the list to explore its recorded details.</p>
              <div class="detail-empty-rule"></div>
              <p class="detail-empty-note">
                Map data is sourced from OpenStreetMap. Details reflect recorded tags, not verified
                operational status.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </template>
    <p class="lighthouse-source-note">
      Map and feature data © OpenStreetMap contributors, available under the
      <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noreferrer"
        >Open Database License</a
      >. Source tags are not independently verified.
    </p>
  </section>
</template>
