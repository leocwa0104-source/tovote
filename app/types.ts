export interface CitationTarget {
  id: string
  summary: string
  detail: string | null
  type: 'WHY' | 'WHY_NOT'
  author: {
    username: string
  }
  faction?: {
    name: string
    topic?: {
      title: string
    }
  }
}

export interface Opinion {
  id: string
  summary: string
  detail: string | null
  type: 'WHY' | 'WHY_NOT'
  authorId: string
  author: {
    username: string
  }
  createdAt: Date
  citations?: {
    id: string
    target: CitationTarget
  }[]
  citedBy?: {
    id: string
    source: {
      id: string
      summary: string
      type: 'WHY' | 'WHY_NOT'
      author: { username: string }
    }
  }[]
  factionId?: string
  faction?: {
    name: string
    topic?: {
      title: string
    }
  }
  neighborId?: string | null
  eyes: number
  trash: number
  userVote?: 'EYE' | 'TRASH'
  userVoteCreatedAt?: Date
}

export interface FactionWithOpinions {
  id: string
  name: string
  description: string | null
  _count: { members: number }
  opinions: Opinion[]
}

export type User = { 
  id: string; 
  username: string; 
  eyesCount?: number; 
  trashCount?: number;
  lastReplenishedAt?: Date;
  role?: 'USER' | 'ADMIN';
} | null

export interface TicketPackage {
  id: string
  name: string
  description: string | null
  ticketCount: number
  price: number
  duration: number
  cooldown: number
  isActive: boolean
  createdAt: Date
}

export interface VotePackage {
  id: string
  label: string
  cost: number
  value: number
  isActive: boolean
  createdAt: Date
}
