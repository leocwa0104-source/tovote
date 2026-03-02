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

export type FactionSimilarityResult = {
  matches: {
    id: string
    name: string
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

  try {
    const query = newTitle.trim()
    
    const STOP_WORDS = new Set(['the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'is', 'are', 'was', 'were', 'it', 'that', 'this'])

    // Break down the title into keywords (filtering out short words and stop words)
    // Use simple regex for compatibility if unicode properties fail
    const keywords = query
      .split(/\s+/)
      .map(word => word.replace(/[^\w\u4e00-\u9fa5]/g, '')) // Keep letters, numbers, and Chinese characters
      .filter(word => word.length > 1 && !STOP_WORDS.has(word.toLowerCase())) // Filter short words and stop words


    if (keywords.length === 0) {
      // If no significant keywords, just do a direct partial match
      return await fallbackSearch(query)
    }

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

export async function checkFactionSimilarity(topicId: string, newName: string): Promise<FactionSimilarityResult> {
  if (!topicId || !newName || newName.trim().length < 2) return { matches: [] }
  
  try {
    const query = newName.trim()
    const STOP_WORDS = new Set(['the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'is', 'are', 'was', 'were', 'it', 'that', 'this'])
    
    const keywords = query
      .split(/\s+/)
      .map(word => word.replace(/[^\w\u4e00-\u9fa5]/g, ''))
      .filter(word => word.length > 1 && !STOP_WORDS.has(word.toLowerCase()))

    const keywordConditions = keywords.map(word => ({
      name: { contains: word, mode: 'insensitive' as const }
    }))

    const matches = await prisma.faction.findMany({
      where: {
        topicId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          ...keywordConditions
        ]
      },
      take: 5,
      select: { id: true, name: true, description: true },
      orderBy: { id: 'desc' }
    })

    return {
      matches: matches.map(m => {
        const isExactPhrase = m.name.toLowerCase().includes(query.toLowerCase())
        return {
          id: m.id,
          name: m.name,
          reason: isExactPhrase ? 'Contains exact phrase' : 'Contains similar keywords',
          similarityScore: isExactPhrase ? 1 : 0.8
        }
      })
    }
  } catch (error) {
    console.error('Faction Keyword Search Failed:', error)
    return { matches: [] }
  }
}

async function fallbackSearch(query: string) {
  try {
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
  } catch (error) {
    console.error('Fallback Search Failed:', error)
    return { matches: [] }
  }
}
