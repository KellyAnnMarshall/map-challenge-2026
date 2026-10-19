<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { challenges, getCurrentChallenge } from '../data/challenges'

const currentChallenge = computed(() => getCurrentChallenge())
const challengeAnnouncement = computed(() => {
  if (currentChallenge.value) return undefined

  const startsAt = new Date(2026, 10, 1)
  return new Date() < startsAt
    ? { label: 'THE CHALLENGE BEGINS', message: '01 NOVEMBER 2026 · SAVE THE DATE' }
    : { label: 'THE FULL FIELD GUIDE', message: 'ALL 30 PROMPTS ARE OPEN' }
})
</script>

<template>
  <div class="home-page">
    <section class="intro-section" aria-labelledby="page-title">
      <div class="intro-copy">
        <p class="eyebrow"><span class="eyebrow-dot"></span> AN OPEN INVITATION TO MAKE</p>
        <h1 id="page-title">30 maps.<br /><em>30 days.</em><br />One November.</h1>
        <p class="intro-description">
          A month-long celebration of maps, place and the unexpected. Pick a prompt, follow your curiosity,
          and see where it takes you.
        </p>
        <RouterLink class="text-link" :to="{ path: '/', hash: '#calendar' }">
          EXPLORE THE PROMPTS <span aria-hidden="true">↓</span>
        </RouterLink>
      </div>
      <div class="intro-aside">
        <div class="hero-map">
          <span class="map-stamp">FIELD<br />NOTE <span>№ 26</span></span>
          <span class="hero-map-title">Somewhere<br />in the city</span>
          <span class="hero-map-caption">A PLACE IS NEVER JUST A PLACE</span>
          <svg class="hero-contours" viewBox="0 0 500 520" aria-hidden="true">
            <path
              d="M-42 126c60-90 166-94 226-34 64 64 122 71 206 27 51-27 96-35 149-19M-61 154c68-88 165-79 220-22 65 68 123 87 211 41 64-33 112-42 170-25M-76 184c66-82 157-68 213-9 64 67 127 99 217 53 77-40 127-51 187-30M-89 215c69-80 155-59 209 4 62 72 128 111 229 58 80-42 139-53 201-34M-101 246c76-79 156-48 205 15 59 76 133 126 235 72 88-47 146-63 209-42M-112 279c82-80 157-38 202 27 58 83 135 142 248 83 97-50 157-70 221-48M-119 312c86-79 158-27 199 41 54 87 139 153 260 91 99-51 163-75 229-52M-123 346c91-78 158-17 196 54 53 97 143 164 271 98 108-55 174-82 242-57M-120 382c94-76 159-7 193 68 48 106 145 176 285 104 109-56 177-85 248-58M-112 417c100-73 158 5 189 82 44 111 147 188 297 111 114-58 184-91 257-62"
            />
            <path
              d="M79-32c-26 81-8 128 35 175 48 52 55 104 15 160-40 57-36 113 9 169m228-498c-46 78-48 134-4 184 46 52 44 100-5 151-46 49-51 105-11 177M177-20c-33 77-19 123 22 171 48 57 54 107 14 166-42 62-37 120 13 184"
            />
          </svg>
          <div class="hero-map-scale"><span>0</span><span></span><span>2 KM</span></div>
        </div>
        <p class="aside-note"><span>01—30</span> NOVEMBER 2026<br />YOUR ATLAS STARTS HERE.</p>
      </div>
    </section>

    <section id="calendar" class="calendar-section" aria-labelledby="calendar-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">THE FIELD GUIDE <span>·</span> 30 DAILY PROMPTS</p>
          <h2 id="calendar-title">Choose your next map.</h2>
        </div>
        <p class="section-aside">No rules. No right answers.<br />Just a different way to see.</p>
      </div>

      <div v-if="currentChallenge" class="today-banner">
        <span class="today-marker"><span></span> TODAY'S PROMPT</span>
        <RouterLink :to="`/day/${currentChallenge.day}`">
          DAY {{ currentChallenge.day }} <span aria-hidden="true">·</span> {{ currentChallenge.name }}
          <span aria-hidden="true">↗</span>
        </RouterLink>
      </div>
      <div v-else-if="challengeAnnouncement" class="today-banner">
        <span class="today-marker"><span></span> {{ challengeAnnouncement.label }}</span>
        <span class="today-message">{{ challengeAnnouncement.message }}</span>
      </div>

      <nav class="challenge-grid" aria-label="Daily map challenges">
        <RouterLink
          v-for="challenge in challenges"
          :key="challenge.day"
          class="challenge-tile"
          :class="{ 'challenge-tile-today': currentChallenge?.day === challenge.day }"
          :to="`/day/${challenge.day}`"
        >
          <span class="tile-topline"
            ><span>DAY</span><span>{{ challenge.day }}</span></span
          >
          <span class="tile-name">{{ challenge.name }}</span>
          <span class="tile-arrow" aria-hidden="true">↗</span>
        </RouterLink>
      </nav>
      <p class="calendar-footnote"><span aria-hidden="true">✳</span> ONE PROMPT A DAY. MAKE IT YOUR OWN.</p>
    </section>
  </div>
</template>
