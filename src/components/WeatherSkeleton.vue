<template>
  <section class="loading-section" aria-labelledby="loading-title">
    <div class="loading-section__message">
      <p class="section-kicker">Abrindo a janela</p>
      <h2 id="loading-title">Preparando a previsão…</h2>
      <p>Conectando aos dados públicos da Open-Meteo.</p>
    </div>
    <div class="skeleton-grid" aria-hidden="true">
      <span v-for="index in 4" :key="index" class="skeleton-block"></span>
    </div>
    <div class="skeleton-lines" aria-hidden="true">
      <span v-for="index in 3" :key="index"></span>
    </div>
  </section>
</template>
