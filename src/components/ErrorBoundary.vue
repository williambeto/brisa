<script setup lang="ts">
import { onErrorCaptured, ref, useId, watch } from 'vue'

const props = defineProps<{
  recoveryKey: string | number
  recovering: boolean
}>()

const emit = defineEmits<{
  retry: []
}>()

const failed = ref(false)
const titleId = `contained-error-title-${useId()}`

onErrorCaptured((error) => {
  failed.value = true
  console.error('Falha contida em uma seção meteorológica:', error)
  return false
})

watch(() => props.recoveryKey, () => {
  failed.value = false
})

function retry() {
  if (props.recovering) return
  emit('retry')
}
</script>

<template>
  <slot v-if="!failed"></slot>
  <section v-else class="contained-error" :aria-labelledby="titleId">
    <div>
      <p class="section-kicker">Interrupção local</p>
      <h2 :id="titleId">Esta parte da previsão não pôde ser exibida.</h2>
      <p>O restante da página continua disponível. Recarregue os dados para tentar recuperar a seção.</p>
    </div>
    <button class="primary-button" type="button" :disabled="recovering" @click="retry">
      {{ recovering ? 'Recarregando previsão…' : 'Recarregar previsão' }}
    </button>
  </section>
</template>
