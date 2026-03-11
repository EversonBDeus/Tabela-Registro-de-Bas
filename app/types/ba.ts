export type BaStatus = 'Aberto' | 'Encerrado'

export interface Ba {
  id?: string
  baCentral: string
  baStatus: BaStatus
  baNumber: number
  baUF: string
  name: string
  baDate?: string
  date?: string
}

export interface BaFormData {
  baCentral: string
  baStatus: BaStatus
  baNumber: number
  baUF: string
  name: string
}
