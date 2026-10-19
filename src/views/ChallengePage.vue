<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import LighthouseExplorer from '../challenges/day-01/LighthouseExplorer.vue'
import MapCanvas from '../components/MapCanvas.vue'
import { challenges, getChallenge, getChallengeDate } from '../data/challenges'

const props = defineProps<{ day: string }>()
const challenge = computed(() => getChallenge(props.day))
const previous = computed(() => challenges[Number(props.day) - 2])
const next = computed(() => challenges[Number(props.day)])
</script>

<template>
  <article v-if="challenge" class="challenge-page">
    <RouterLink class="back-link" to="/#calendar"><span aria-hidden="true">←</span> ALL PROMPTS</RouterLink>
    <LighthouseExplorer v-if="challenge.day === '01'" />
    <div v-else class="challenge-layout">
      <section class="challenge-copy" aria-labelledby="challenge-title">
        <p class="eyebrow">
          <span class="eyebrow-dot"></span> FIELD GUIDE <span>·</span> {{ getChallengeDate(challenge.day) }}
        </p>
        <p class="challenge-day">DAY {{ challenge.day }} <span>— 30</span></p>
        <h1 id="challenge-title">{{ challenge.name }}<span class="title-period">.</span></h1>
        <p v-if="challenge.description" class="challenge-description">{{ challenge.description }}</p>
        <p v-else class="challenge-description">An open page. Decide what this prompt means to you.</p>
        <div class="challenge-invitation">
          <span class="invitation-star" aria-hidden="true">✳</span>
          <p>Start with a place, a question, or an idea. There is no single way to answer a map prompt.</p>
        </div>
        <nav class="day-navigation" aria-label="Browse neighboring prompts">
          <RouterLink v-if="previous" :to="`/day/${previous.day}`">
            <span>← PREVIOUS</span>
            <strong>DAY {{ previous.day }} · {{ previous.name }}</strong>
          </RouterLink>
          <span v-else class="day-navigation-empty"></span>
          <RouterLink v-if="next" class="day-navigation-next" :to="`/day/${next.day}`">
            <span>NEXT →</span>
            <strong>DAY {{ next.day }} · {{ next.name }}</strong>
          </RouterLink>
        </nav>
      </section>
      <div class="challenge-map-column">
        <MapCanvas />
        <p class="map-index">A PLACE TO BEGIN <span>·</span> 51°30′N 00°07′W</p>
      </div>
    </div>
  </article>
</template>
