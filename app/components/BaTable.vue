<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Ba, BaFormData } from '~/types/ba'

const store = useBaStore()
const colorMode = useColorMode()

onMounted(async () => {
  if (!store.items.length) {
    await store.fetchAll()
  }
})

const temaEscuroAtivo = computed(() => colorMode.value === 'dark')
const iconeTema = computed(() => (temaEscuroAtivo.value ? 'i-lucide-sun' : 'i-lucide-moon'))
const tituloTema = computed(() => (temaEscuroAtivo.value ? 'Ativar modo claro' : 'Ativar modo escuro'))

function alternarTema() {
  colorMode.preference = temaEscuroAtivo.value ? 'light' : 'dark'
}

const modalOpen = ref(false)
const editData = ref<Ba | null>(null)

function abrirAdd() {
  editData.value = null
  modalOpen.value = true
}

function abrirEdit(ba: Ba) {
  editData.value = { ...ba }
  modalOpen.value = true
}

async function salvar(form: BaFormData) {
  if (editData.value?.id) {
    await store.update(editData.value.id, form, editData.value.baDate)
    return
  }

  await store.add(form)
}

const excluirAlvo = ref<Ba | null>(null)
const confirmarOpen = ref(false)

function pedirExclusao(ba: Ba) {
  excluirAlvo.value = ba
  confirmarOpen.value = true
}

async function confirmarExclusao() {
  if (excluirAlvo.value?.id) {
    await store.remove(excluirAlvo.value.id)
  }

  confirmarOpen.value = false
  excluirAlvo.value = null
}

const graficosOpen = ref(false)

const busca = ref('')
const pagina = ref(1)
const porPagina = 10

watch(busca, () => {
  pagina.value = 1
})

const filtrado = computed(() => {
  const termo = busca.value.toLowerCase().trim()

  if (!termo) return store.items

  return store.items.filter(item =>
    item.baUF.toLowerCase().includes(termo) ||
    item.baCentral.toLowerCase().includes(termo) ||
    String(item.baNumber).includes(termo) ||
    item.baStatus.toLowerCase().includes(termo) ||
    String(item.name ?? '').toLowerCase().includes(termo) ||
    String(item.date ?? '').toLowerCase().includes(termo)
  )
})

const totalPaginas = computed(() => Math.max(1, Math.ceil(filtrado.value.length / porPagina)))

watch(totalPaginas, (valor) => {
  if (pagina.value > valor) {
    pagina.value = valor
  }
})

const paginado = computed(() => {
  const inicio = (pagina.value - 1) * porPagina
  return filtrado.value.slice(inicio, inicio + porPagina)
})

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const columns: TableColumn<Ba>[] = [
  {
    id: 'index',
    header: '#',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-sm font-semibold opacity-50' },
        String((pagina.value - 1) * porPagina + row.index + 1)
      ),
  },
  {
    accessorKey: 'name',
    header: 'Nome',
    cell: ({ row }) =>
      h('span', { class: 'text-sm font-medium' }, row.original.name ?? 'Não informado'),
  },
  {
    accessorKey: 'baUF',
    header: 'UF',
    cell: ({ row }) =>
      h(
        UBadge,
        { variant: 'subtle', color: 'primary', class: 'font-mono' },
        () => row.original.baUF
      ),
  },
  {
    accessorKey: 'baCentral',
    header: 'Central',
    cell: ({ row }) =>
      h('span', { class: 'font-mono font-semibold uppercase' }, row.original.baCentral),
  },
  {
    accessorKey: 'baNumber',
    header: 'Número BA',
    cell: ({ row }) =>
      h('span', { class: 'font-mono text-sm' }, String(row.original.baNumber)),
  },
  {
    accessorKey: 'baStatus',
    header: 'Status',
    cell: ({ row }) =>
      h(
        UBadge,
        {
          variant: 'subtle',
          color: row.original.baStatus === 'Aberto' ? 'success' : 'error',
        },
        () => row.original.baStatus
      ),
  },
  {
    accessorKey: 'date',
    header: 'Data',
    cell: ({ row }) =>
      h('span', { class: 'text-sm opacity-70' }, row.original.date ?? '—'),
  },
  {
    id: 'acoes',
    header: 'Ações',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-1' }, [
        h(UButton, {
          icon: 'i-lucide-pencil',
          size: 'xs',
          variant: 'ghost',
          color: 'primary',
          onClick: () => abrirEdit(row.original),
        }),
        h(UButton, {
          icon: 'i-lucide-trash-2',
          size: 'xs',
          variant: 'ghost',
          color: 'error',
          onClick: () => pedirExclusao(row.original),
        }),
      ]),
  },
]

function escapeCsv(valor: unknown): string {
  const texto = String(valor ?? '')

  if (/[;"\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`
  }

  return texto
}

function exportar() {
  const header = ['#', 'Nome', 'UF', 'Central', 'Número BA', 'Status', 'Data']

  const linhas = filtrado.value.map((item, index) => [
    index + 1,
    item.name ?? '',
    item.baUF,
    item.baCentral,
    item.baNumber,
    item.baStatus,
    item.date ?? '',
  ])

  const csv = [header, ...linhas]
    .map(linha => linha.map(escapeCsv).join(';'))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csv], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'bas.csv'
  link.click()

  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-bold text-primary sm:text-2xl">
        Registro de BA's
      </h1>

      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="busca"
          icon="i-lucide-search"
          placeholder="Buscar..."
          class="w-48 sm:w-64"
        />

        <UButton
          :icon="iconeTema"
          variant="outline"
          color="neutral"
          :title="tituloTema"
          @click="alternarTema"
        />

        <UButton
          icon="i-lucide-refresh-cw"
          variant="outline"
          color="neutral"
          :loading="store.loading"
          title="Recarregar"
          @click="store.fetchAll()"
        />

        <UButton
          icon="i-lucide-bar-chart-2"
          variant="outline"
          color="primary"
          @click="graficosOpen = true"
        >
          <span class="hidden sm:inline">Gráficos</span>
        </UButton>

        <UButton
          icon="i-lucide-download"
          variant="outline"
          color="neutral"
          title="Exportar CSV"
          @click="exportar"
        />

        <UButton
          icon="i-lucide-plus"
          color="primary"
          @click="abrirAdd"
        >
          <span class="hidden sm:inline">Adicionar</span>
        </UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <UCard>
        <div class="py-2 text-center">
          <p class="text-3xl font-bold">{{ store.total }}</p>
          <p class="text-sm opacity-70">Total</p>
        </div>
      </UCard>

      <UCard>
        <div class="py-2 text-center">
          <p class="text-3xl font-bold text-green-600 dark:text-green-400">
            {{ store.totalAbertos }}
          </p>
          <p class="text-sm opacity-70">Abertos</p>
        </div>
      </UCard>

      <UCard>
        <div class="py-2 text-center">
          <p class="text-3xl font-bold text-red-600 dark:text-red-400">
            {{ store.totalEncerrados }}
          </p>
          <p class="text-sm opacity-70">Encerrados</p>
        </div>
      </UCard>
    </div>

    <UCard class="overflow-x-auto">
      <UTable
        :data="paginado"
        :columns="columns"
        :loading="store.loading"
        class="w-full min-w-[860px]"
      >
        <template #empty>
          <div class="py-10 text-center opacity-40">
            <UIcon name="i-lucide-database" class="mx-auto mb-2 size-10" />
            <p>Nenhum resultado encontrado</p>
          </div>
        </template>
      </UTable>

      <div
        v-if="filtrado.length"
        class="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3"
      >
        <p class="text-sm opacity-60">
          {{ filtrado.length }} registro(s)
        </p>

        <UPagination
          v-model:page="pagina"
          :total="filtrado.length"
          :items-per-page="porPagina"
        />
      </div>
    </UCard>

    <BaModal
      v-model:open="modalOpen"
      :edit-data="editData"
      @submit="salvar"
    />

    <BaGraficos v-model:open="graficosOpen" />

    <UModal
      :open="confirmarOpen"
      title="Confirmar exclusão"
      @update:open="confirmarOpen = $event"
    >
      <template #body>
        <p class="text-sm">
          Deseja excluir o BA
          <strong>{{ excluirAlvo?.baCentral }} — {{ excluirAlvo?.baNumber }}</strong>?
          Esta ação não pode ser desfeita.
        </p>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="confirmarOpen = false">
            Cancelar
          </UButton>

          <UButton color="error" @click="confirmarExclusao">
            Excluir
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
