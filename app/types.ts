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
  createdAt: string
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
  userVoteCreatedAt?: string
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
  lastReplenishedAt?: string;
} | null
