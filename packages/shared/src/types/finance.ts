export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  teamId: string
  type: TransactionType
  amount: number
  description: string
  date: string
  createdBy: string
  createdAt: string
}

export interface Due {
  id: string
  teamId: string
  userId: string
  amount: number
  description: string          // '1월 회비', '경기 비용' 등
  dueDate?: string
  paid: boolean
  paidAt?: string
}

export interface Fine {
  id: string
  teamId: string
  userId: string
  amount: number
  reason: string               // '지각', '노쇼' 등
  paid: boolean
  createdAt: string
}
