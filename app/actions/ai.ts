'use server'

import prisma from '@/lib/prisma'

// Simplified response type without Zod
export type SimilarityResult = {
  matches: {
    id: string
    title: string
    reason: string
    similarityScore: number
  }[]
}

/**
 * Checks for similar topics using database keyword matching.
 * This is a lightweight alternative to AI/Vector search.
 */
export async function checkTopicSimilarity(newTitle: string): Promise<SimilarityResult> {
  if (!newTitle || newTitle.trim().length < 2) return { matches: [] }

  const query = newTitle.trim()
  
  // Break down the title into keywords (filtering out short words)
  const keywords = query
    .split(/\s+/)
    .filter(word => word.length > 1) // Allow 2-letter words like "AI", "Go"
    .map(word => word.replace(/[^\w\s]/gi, '')) // Remove special chars

  if (keywords.length === 0) {
    // If no significant keywords, just do a direct partial match
    return fallbackSearch(query)
  }

  try {
    // Construct OR conditions for each keyword
    const keywordConditions = keywords.map(word => ({
      title: { contains: word, mode: 'insensitive' as const }
    }))

    // Find topics that match ANY of the keywords
    // We prioritize title matches but also check description
    const matches = await prisma.topic.findMany({
      where: {
        OR: [
          // Exact phrase match (highest priority)
          { title: { contains: query, mode: 'insensitive' } },
          // Keyword matches
          ...keywordConditions
        ]
      },
      take: 5,
      select: { id: true, title: true, description: true },
      orderBy: { createdAt: 'desc' }
    })

    return {
      matches: matches.map(m => {
        // Simple heuristic for "reason"
        const isExactPhrase = m.title.toLowerCase().includes(query.toLowerCase())
        return {
          id: m.id,
          title: m.title,
          reason: isExactPhrase ? 'Contains exact phrase' : 'Contains similar keywords',
          similarityScore: isExactPhrase ? 1 : 0.8
        }
      })
    }
  } catch (error) {
    console.error('Keyword Search Failed:', error)
    return { matches: [] }
  }
}

async function fallbackSearch(query: string) {
  const matches = await prisma.topic.findMany({
    where: {
      title: { contains: query, mode: 'insensitive' }
    },
    take: 5,
    select: { id: true, title: true }
  })

  return {
    matches: matches.map(m => ({
      id: m.id,
      title: m.title,
      reason: 'Contains similar text',
      similarityScore: 1
    }))
  }
}
