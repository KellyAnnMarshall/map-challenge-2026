<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Map as MapboxMap } from 'mapbox-gl'

const mapContainer = ref<HTMLDivElement>()
const mapError = ref('')
const hasMapboxToken = Boolean(import.meta.env.VITE_MAPBOX_ACCESS_TOKEN)
let map: MapboxMap | undefined

onMounted(() => {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
  if (!token || !mapContainer.value) return

  void loadMap(token)
})

onBeforeUnmount(() => map?.remove())

async function loadMap(token: string): Promise<void> {
  try {
    const { default: mapboxgl } = await import('mapbox-gl')
    if (!mapContainer.value) return

    mapboxgl.accessToken = token
    map = new mapboxgl.Map({
      container: mapContainer.value,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-0.1, 51.51],
      zoom: 11.5,
      attributionControl: true,
      cooperativeGestures: true,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('error', (event) => {
      mapError.value = event.error.message
    })
  } catch (error) {
    mapError.value = error instanceof Error ? error.message : String(error)
  }
}
</script>

<template>
  <section class="map-frame" aria-label="Map preview">
    <div ref="mapContainer" class="map-canvas" :class="{ 'map-canvas-live': hasMapboxToken }">
      <div class="map-art" aria-hidden="true">
        <svg viewBox="0 0 900 540" preserveAspectRatio="xMidYMid slice">
          <path
            class="water"
            d="M620 -30 900 0 900 540 710 540 678 460 730 393 675 326 714 258 650 202 682 128Z"
          />
          <path
            class="park"
            d="m123 14 130-11 49 57-26 74-94 18-65-43zM382 364l94-26 66 55-39 91-87 29-61-62zM-18 273l87-31 56 48-21 98-75 38-53-62z"
          />
          <g class="minor-roads">
            <path
              d="M-20 88 920 412M-10 458 848 10M65-20 490 580M300-50 775 580M-30 194 890 224M170 560 665-20M-30 338 900 95M500-30 330 570"
            />
            <path d="M20 120 220 280 430 230 620 360 870 300M80 430 260 350 440 410 620 240 880 180" />
          </g>
          <g class="major-roads">
            <path
              d="M-15 382 175 335 337 365 505 278 673 290 915 196M113-24 188 142 312 235 350 380 451 554M-10 156 208 204 391 180 580 228 910 136"
            />
          </g>
          <g class="map-labels">
            <text x="300" y="147">ISLINGTON</text>
            <text x="515" y="334">THE CITY</text>
            <text x="225" y="405">SOUTHWARK</text>
            <text x="633" y="161">LONDON</text>
          </g>
          <circle class="map-pin" cx="458" cy="262" r="8" />
          <circle class="map-pin-halo" cx="458" cy="262" r="20" />
        </svg>
        <div class="map-coordinates"><span>51°30′N</span><span>00°07′W</span></div>
      </div>
    </div>
    <p v-if="mapError" class="map-error" role="status">The live map could not load: {{ mapError }}</p>
    <p v-else-if="!hasMapboxToken" class="map-note">
      A mapmaking space for your next idea <span aria-hidden="true">↗</span>
    </p>
  </section>
</template>
