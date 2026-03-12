<script setup lang="ts">
import type { Ba, BaFormData } from '~/types/ba'

const props = defineProps<{
  open: boolean
  editData?: Ba | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [data: BaFormData]
}>()

const form = reactive<BaFormData>({
  baUF: '',
  baCentral: '',
  baNumber: 0,
  baStatus: 'Aberto',
  name: '',
})

const erros = reactive({
  baUF: '',
  baCentral: '',
  baNumber: '',
  name: '',
})

watch(
  () => props.editData,
  (valor) => {
    if (valor) {
      form.baUF = valor.baUF
      form.baCentral = valor.baCentral
      form.baNumber = valor.baNumber
      form.baStatus = valor.baStatus
      form.name = valor.name ?? ''
      return
    }

    resetar()
  },
  { immediate: true }
)

function resetar() {
  form.baUF = ''
  form.baCentral = ''
  form.baNumber = 0
  form.baStatus = 'Aberto'
  form.name = ''

  erros.baUF = ''
  erros.baCentral = ''
  erros.baNumber = ''
  erros.name = ''
}

function validar(): boolean {
  erros.baUF = form.baUF.trim() ? '' : 'UF obrigatória'
  erros.baCentral = form.baCentral.trim() ? '' : 'Central obrigatória'
  erros.baNumber = Number(form.baNumber) > 0 ? '' : 'Número inválido'
  erros.name = form.name.trim() ? '' : 'Nome obrigatório'

  return !erros.baUF && !erros.baCentral && !erros.baNumber && !erros.name
}

function salvar() {
  if (!validar()) return

  emit('submit', {
    baUF: form.baUF.trim().toUpperCase(),
    baCentral: form.baCentral.trim().toUpperCase(),
    baNumber: Number(form.baNumber),
    baStatus: form.baStatus,
    name: form.name.trim(),
  })

  emit('update:open', false)
  resetar()
}

function fechar() {
  emit('update:open', false)
  resetar()
}

const isEdicao = computed(() => Boolean(props.editData?.id))

const statusOpcoes = [
  { label: 'Aberto', value: 'Aberto' },
  { label: 'Encerrado', value: 'Encerrado' },
]
</script>

<template>
  <UModal
    :open="open"
    :title="isEdicao ? 'Editar BA' : 'Adicionar novo BA'"
    @update:open="fechar"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Nome" :error="erros.name" required>
          <UInput
            v-model="form.name"
            placeholder="Ex: Everson"
            maxlength="60"
            class="w-full"
          />
        </UFormField>

        <UFormField label="UF" :error="erros.baUF" required>
          <UInput
            v-model="form.baUF"
            placeholder="Ex: SP"
            maxlength="2"
            class="w-full"
            input-class="uppercase"
            @input="form.baUF = form.baUF.toUpperCase()"
          />
        </UFormField>

        <UFormField label="Central" :error="erros.baCentral" required>
          <UInput
            v-model="form.baCentral"
            placeholder="Ex: SPBEV"
            maxlength="20"
            class="w-full"
            input-class="uppercase"
            @input="form.baCentral = form.baCentral.toUpperCase()"
          />
        </UFormField>

        <UFormField label="Número BA" :error="erros.baNumber" required>
          <UInput
            v-model.number="form.baNumber"
            type="number"
            placeholder="Ex: 123456789"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Status">
          <USelect
            v-model="form.baStatus"
            :items="statusOpcoes"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="fechar">
          Cancelar
        </UButton>

        <UButton color="primary" @click="salvar">
          {{ isEdicao ? 'Salvar' : 'Adicionar' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
