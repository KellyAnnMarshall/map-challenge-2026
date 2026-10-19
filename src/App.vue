<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="site-shell">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <header class="site-header">
      <RouterLink class="wordmark" to="/">
        <span class="wordmark-mark" aria-hidden="true">F.</span>
        <span>FIELDNOTES <span class="wordmark-divider">/</span> MAP CHALLENGE</span>
      </RouterLink>
      <RouterLink class="header-date" :to="{ path: '/', hash: '#calendar' }">
        NOVEMBER 2026 <span aria-hidden="true">↘</span>
      </RouterLink>
    </header>
    <main id="main-content">
      <RouterView />
    </main>
    <footer class="site-footer">
      <RouterLink class="footer-home" to="/">A month of looking closer.</RouterLink>
      <span>MADE FOR CURIOUS MAPMAKERS · 2026</span>
    </footer>
  </div>
</template>
