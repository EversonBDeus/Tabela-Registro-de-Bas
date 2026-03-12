<script setup lang="ts">
import type { Ba } from '~/types/ba'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const store = useBaStore()
const colorMode = useColorMode()

type Periodo = 'total' | 'mes' | 'semana' | 'dia'

const periodoAtivo = ref<Periodo>('total')

const periodos: Array<{ label: string; value: Periodo }> = [
  { label: 'Total', value: 'total' },
  { label: 'Mês', value: 'mes' },
  { label: 'Semana', value: 'semana' },
  { label: 'Dia', value: 'dia' },
]

function obterData(item: Ba): Date | null {
  if (!item.baDate) return null

  const data = new Date(item.baDate)
  return Number.isNaN(data.getTime()) ? null : data
}

function inicioDoDia(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate())
}

function filtrarPeriodo(items: Ba[]): Ba[] {
  if (periodoAtivo.value === 'total') return items

  const agora = new Date()
  const hoje = inicioDoDia(agora)

  return items.filter((item) => {
    const data = obterData(item)
    if (!data) return false

    if (periodoAtivo.value === 'dia') {
      return inicioDoDia(data).getTime() === hoje.getTime()
    }

    if (periodoAtivo.value === 'mes') {
      return (
        data.getMonth() === agora.getMonth() &&
        data.getFullYear() === agora.getFullYear()
      )
    }

    if (periodoAtivo.value === 'semana') {
      const diff = hoje.getTime() - inicioDoDia(data).getTime()
      const diffDias = Math.floor(diff / 86400000)

      return diffDias >= 0 && diffDias < 7
    }

    return true
  })
}

function agruparPor(items: Ba[], selecionar: (item: Ba) => string | undefined) {
  const contagem = new Map<string, number>()

  for (const item of items) {
    const chave = String(selecionar(item) ?? '').trim()
    if (!chave) continue

    contagem.set(chave, (contagem.get(chave) ?? 0) + 1)
  }

  return Array.from(contagem.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return a[0].localeCompare(b[0], 'pt-BR')
  })
}

const itensPeriodo = computed(() => filtrarPeriodo(store.items))

const totalPeriodo = computed(() => itensPeriodo.value.length)
const abertosPeriodo = computed(() =>
  itensPeriodo.value.filter(item => item.baStatus === 'Aberto').length
)
const encerradosPeriodo = computed(() =>
  itensPeriodo.value.filter(item => item.baStatus === 'Encerrado').length
)

const dadosUF = computed(() => {
  const entries = agruparPor(itensPeriodo.value, item => item.baUF)

  return {
    labels: entries.map(entry => entry[0]),
    valores: entries.map(entry => entry[1]),
  }
})

const dadosCentralHistorico = computed(() => {
  const entries = agruparPor(store.items, item => item.baCentral)

  return {
    labels: entries.map(entry => entry[0]),
    valores: entries.map(entry => entry[1]),
  }
})

const descricaoPeriodo = computed(() => {
  if (periodoAtivo.value === 'mes') return 'mês atual'
  if (periodoAtivo.value === 'semana') return 'últimos 7 dias'
  if (periodoAtivo.value === 'dia') return 'dia atual'
  return 'histórico completo'
})

const temaGrafico = computed(() => {
  if (colorMode.value === 'dark') {
    return {
      titulo: '#f8fafc',
      ticks: '#cbd5e1',
      grade: 'rgba(148, 163, 184, 0.18)',
      trilha: '#1e293b',
    }
  }

  return {
    titulo: '#0f172a',
    ticks: '#475569',
    grade: 'rgba(100, 116, 139, 0.18)',
    trilha: '#e5e7eb',
  }
})

function gerarCores(qtd: number): string[] {
  const paleta = [
    '#22c55e',
    '#ef4444',
    '#3b82f6',
    '#eab308',
    '#8b5cf6',
    '#f97316',
    '#14b8a6',
    '#ec4899',
    '#06b6d4',
    '#a855f7',
    '#84cc16',
    '#f43f5e',
  ] as const

  return Array.from({ length: qtd }, (_, index) => {
    const cor = paleta[index % paleta.length]
    return cor ?? '#94a3b8'
  })
}

const canvasUF = ref<HTMLCanvasElement | null>(null)
const canvasCentral = ref<HTMLCanvasElement | null>(null)

const alturaGraficoCentral = computed(() => {
  return `${Math.max(dadosCentralHistorico.value.labels.length * 38, 360)}px`
})

let chartUF: any = null
let chartCentral: any = null

function destruirGraficos() {
  chartUF?.destroy()
  chartUF = null

  chartCentral?.destroy()
  chartCentral = null
}

async function renderizar() {
  if (!props.open) return

  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)

  await nextTick()

  const tema = temaGrafico.value

  if (canvasUF.value) {
    chartUF?.destroy()

    chartUF = new Chart(canvasUF.value, {
      type: 'bar',
      data: {
        labels: dadosUF.value.labels,
        datasets: [
          {
            label: 'Quantidade',
            data: dadosUF.value.valores,
            backgroundColor: gerarCores(dadosUF.value.labels.length),
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: `Quantidade de BA por UF (${descricaoPeriodo.value})`,
            color: tema.titulo,
            font: {
              size: 15,
              weight: 'bold',
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` ${ctx.parsed.y} BA(s)`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: tema.ticks,
            },
            grid: {
              color: tema.grade,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: tema.ticks,
              precision: 0,
            },
            grid: {
              color: tema.grade,
            },
          },
        },
      },
    })
  }

  if (canvasCentral.value) {
    chartCentral?.destroy()

    chartCentral = new Chart(canvasCentral.value, {
      type: 'bar',
      data: {
        labels: dadosCentralHistorico.value.labels,
        datasets: [
          {
            label: 'Quantidade',
            data: dadosCentralHistorico.value.valores,
            backgroundColor: gerarCores(dadosCentralHistorico.value.labels.length),
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Quantidade de BA por Central (histórico completo)',
            color: tema.titulo,
            font: {
              size: 15,
              weight: 'bold',
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` ${ctx.parsed.x} BA(s)`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              color: tema.ticks,
              precision: 0,
            },
            grid: {
              color: tema.grade,
            },
          },
          y: {
            ticks: {
              color: tema.ticks,
              autoSkip: false,
            },
            grid: {
              color: tema.grade,
            },
          },
        },
      },
    })
  }
}

async function atualizarDados() {
  await store.fetchAll()
  await renderizar()
}

watch(
  () => props.open,
  async (aberto) => {
    if (!aberto) {
      destruirGraficos()
      return
    }

    if (!store.items.length) {
      await store.fetchAll()
    }

    await renderizar()
  }
)

watch(
  [periodoAtivo, () => store.items, () => colorMode.value],
  async () => {
    if (!props.open) return
    await renderizar()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  destruirGraficos()
})

function pct(valor: number, total: number) {
  return total ? Math.round((valor / total) * 100) : 0
}
</script>

<template>
  <UModal
    :open="open"
    title="Gráficos — BA's"
    :ui="{ content: 'max-w-7xl w-full' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-6">
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="periodo in periodos"
            :key="periodo.value"
            size="sm"
            :variant="periodoAtivo === periodo.value ? 'solid' : 'outline'"
            :color="periodoAtivo === periodo.value ? 'primary' : 'neutral'"
            @click="periodoAtivo = periodo.value"
          >
            {{ periodo.label }}
          </UButton>
        </div>

        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <UCard>
            <div class="py-2 text-center">
              <p class="text-3xl font-bold">{{ totalPeriodo }}</p>
              <p class="text-sm opacity-70">Total ({{ descricaoPeriodo }})</p>
            </div>
          </UCard>

          <UCard>
            <div class="py-2 text-center">
              <p class="text-3xl font-bold text-green-600 dark:text-green-400">
                {{ abertosPeriodo }}
              </p>
              <p class="text-sm opacity-70">Abertos</p>
            </div>
          </UCard>

          <UCard>
            <div class="py-2 text-center">
              <p class="text-3xl font-bold text-red-600 dark:text-red-400">
                {{ encerradosPeriodo }}
              </p>
              <p class="text-sm opacity-70">Encerrados</p>
            </div>
          </UCard>
        </div>

        <div class="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
          O gráfico por central sempre usa o histórico completo, sem limitar por mês, semana ou dia.
        </div>

        <UCard>
          <div class="flex flex-col items-center justify-center gap-8 py-2 lg:flex-row">
            <div class="relative h-[180px] w-[180px]">
              <svg viewBox="0 0 36 36" class="h-full w-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  :stroke="temaGrafico.trilha"
                  stroke-width="4"
                />

                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="#22c55e"
                  stroke-width="4"
                  :stroke-dasharray="`${pct(abertosPeriodo, totalPeriodo)} 100`"
                  stroke-linecap="round"
                />

                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="#ef4444"
                  stroke-width="4"
                  :stroke-dasharray="`${pct(encerradosPeriodo, totalPeriodo)} 100`"
                  :stroke-dashoffset="`${-pct(abertosPeriodo, totalPeriodo)}`"
                  stroke-linecap="round"
                />
              </svg>

              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-2xl font-bold">{{ totalPeriodo }}</span>
                <span class="text-xs opacity-70">total</span>
              </div>
            </div>

            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="inline-block h-3 w-3 rounded-full bg-green-500" />
                <span>
                  Abertos:
                  <strong>{{ abertosPeriodo }}</strong>
                  ({{ pct(abertosPeriodo, totalPeriodo) }}%)
                </span>
              </div>

              <div class="flex items-center gap-2">
                <span class="inline-block h-3 w-3 rounded-full bg-red-500" />
                <span>
                  Encerrados:
                  <strong>{{ encerradosPeriodo }}</strong>
                  ({{ pct(encerradosPeriodo, totalPeriodo) }}%)
                </span>
              </div>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="h-[320px]">
            <canvas ref="canvasUF" />
          </div>
        </UCard>

        <UCard>
          <div class="max-h-[70vh] overflow-auto">
            <div :style="{ height: alturaGraficoCentral }">
              <canvas ref="canvasCentral" />
            </div>
          </div>
        </UCard>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <UButton
          icon="i-lucide-refresh-cw"
          variant="ghost"
          color="neutral"
          :loading="store.loading"
          @click="atualizarDados"
        >
          Atualizar dados
        </UButton>

        <UButton variant="ghost" color="neutral" @click="emit('update:open', false)">
          Fechar
        </UButton>
      </div>
    </template>
  </UModal>
</template>
