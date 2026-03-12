import { defineStore } from 'pinia'
import type { Ba, BaFormData, BaStatus } from '~/types/ba'

const API = '/api/bas'

const MESES_PT = [
  'janeiro',
  'fevereiro',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const

function normalizarTexto(valor?: string | number | null): string {
  return String(valor ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizarUF(valor?: string | number | null): string {
  return normalizarTexto(valor).toUpperCase().slice(0, 2)
}

function normalizarCentral(valor?: string | number | null): string {
  return normalizarTexto(valor).toUpperCase()
}

function normalizarNome(valor?: string | number | null): string {
  return normalizarTexto(valor)
}

function normalizarStatus(valor?: string | null): BaStatus {
  return String(valor ?? '').trim().toLowerCase() === 'encerrado'
    ? 'Encerrado'
    : 'Aberto'
}

function obterNumero(valor: unknown): number {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : 0
}

function parseDataLegada(valor: unknown): string | undefined {
  if (valor === null || valor === undefined || valor === '') {
    return undefined
  }

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString()
  }

  if (typeof valor === 'number') {
    const timestamp = valor > 1_000_000_000_000 ? valor : valor * 1000
    const data = new Date(timestamp)

    return Number.isNaN(data.getTime()) ? undefined : data.toISOString()
  }

  const texto = String(valor).trim()
  if (!texto) return undefined

  if (/^\d+$/.test(texto)) {
    return parseDataLegada(Number(texto))
  }

  const dataDireta = new Date(texto)
  if (!Number.isNaN(dataDireta.getTime())) {
    return dataDireta.toISOString()
  }

  const textoNormalizado = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(',', '')
    .replace(/\s+/g, ' ')
    .trim()

  const match = textoNormalizado.match(
    /^([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/
  )

  if (!match) return undefined

  const nomeMes = match[1]
  const diaTexto = match[2]
  const anoTexto = match[3]
  const horaTexto = match[4]
  const minutoTexto = match[5]

  if (!nomeMes || !diaTexto || !anoTexto) {
    return undefined
  }

  const mes = MESES_PT.indexOf(nomeMes.toLowerCase() as (typeof MESES_PT)[number])
  if (mes === -1) return undefined

  const dia = Number(diaTexto)
  const ano = Number(anoTexto)
  const hora = Number(horaTexto ?? 0)
  const minuto = Number(minutoTexto ?? 0)

  const data = new Date(ano, mes, dia, hora, minuto)
  return Number.isNaN(data.getTime()) ? undefined : data.toISOString()
}

function formatarData(valor?: string): string {
  if (!valor) return 'ï¿½'

  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return 'ï¿½'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}

function obterTempo(valor?: string): number {
  if (!valor) return 0

  const tempo = new Date(valor).getTime()
  return Number.isNaN(tempo) ? 0 : tempo
}

function mapearItemApi(item: any): Ba {
  const baDate = parseDataLegada(item.baDate ?? item.date)

  return {
    id: item.id,
    baUF: normalizarUF(item.baUF),
    baCentral: normalizarCentral(item.baCentral),
    baNumber: obterNumero(item.baNumber),
    baStatus: normalizarStatus(item.baStatus),
    name: normalizarNome(item.name) || 'Nï¿½o informado',
    baDate,
    date: formatarData(baDate),
  }
}

function montarPayload(form: BaFormData, baDate?: string) {
  const dataBase = baDate ?? new Date().toISOString()

  return {
    baUF: normalizarUF(form.baUF),
    baCentral: normalizarCentral(form.baCentral),
    baNumber: obterNumero(form.baNumber),
    baStatus: normalizarStatus(form.baStatus),
    name: normalizarNome(form.name) || 'Nï¿½o informado',
    baDate: dataBase,
  }
}

export const useBaStore = defineStore('ba', () => {
  const items = ref<Ba[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const total = computed(() => items.value.length)
  const totalAbertos = computed(() =>
    items.value.filter(item => item.baStatus === 'Aberto').length
  )
  const totalEncerrados = computed(() =>
    items.value.filter(item => item.baStatus === 'Encerrado').length
  )

  async function fetchAll() {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<any[]>(API)

      items.value = (data ?? [])
        .map(mapearItemApi)
        .sort((a, b) => obterTempo(b.baDate) - obterTempo(a.baDate))
    } catch (e: any) {
      error.value = e?.message ?? 'Erro ao buscar dados'
    } finally {
      loading.value = false
    }
  }

  async function add(form: BaFormData) {
    loading.value = true
    error.value = null

    try {
      await $fetch(API, {
        method: 'POST',
        body: montarPayload(form),
      })

      await fetchAll()
    } catch (e: any) {
      error.value = e?.message ?? 'Erro ao adicionar'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function update(id: string, form: BaFormData, baDate?: string) {
    loading.value = true
    error.value = null

    try {
      await $fetch(`${API}/${id}`, {
        method: 'PUT',
        body: {
          id,
          ...montarPayload(form, baDate),
        },
      })

      await fetchAll()
    } catch (e: any) {
      error.value = e?.message ?? 'Erro ao atualizar'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function remove(id: string) {
    loading.value = true
    error.value = null

    try {
      await $fetch(`${API}/${id}`, {
        method: 'DELETE',
      })

      await fetchAll()
    } catch (e: any) {
      error.value = e?.message ?? 'Erro ao excluir'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    loading,
    error,
    total,
    totalAbertos,
    totalEncerrados,
    fetchAll,
    add,
    update,
    remove,
  }
})

