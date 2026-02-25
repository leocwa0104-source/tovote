'use server'

import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// --- User Management ---

export async function login(formData: FormData) {
  const username = formData.get('username') as string
  if (!username) throw new Error("Username required")
  
  let user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    user = await prisma.user.create({ data: { username } })
  }
  
  const cookieStore = await cookies()
  cookieStore.set('userId', user.id)
  
  revalidatePath('/')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('userId')
  revalidatePath('/')
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) return null
  return prisma.user.findUnique({ where: { id: userId } })
}

// --- Topics ---

export async function createTopic(formData: FormData) {
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  await prisma.topic.create({
    data: {
      title,
      description,
      creatorId: user.id
    }
  })
  
  revalidatePath('/')
}

export async function getTopics() {
  return prisma.topic.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { factions: true, memberships: true }
      }
    }
  })
}

export async function getTopic(id: string) {
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: {
      creator: true,
      factions: {
        include: {
          _count: {
            select: { members: true }
          },
          members: {
            take: 50, // Limit to 50 members for now
            include: {
              user: true
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            include: { author: true }
          }
        }
      }
    }
  })
  
  if (!topic) return null
  
  // Sort factions by member count descending
  topic.factions.sort((a, b) => b._count.members - a._count.members)
  
  return topic
}

// --- Factions ---

export async function createFaction(topicId: string, formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string | undefined
  
  await prisma.faction.create({
    data: {
      name,
      description: description || null, // Optional
      topicId: topicId,
    }
  })
  
  revalidatePath(`/topic/${topicId}`)
}

export async function joinFaction(topicId: string, factionId: string, _formData?: FormData) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  
  // Check if user is already a member of a faction in this topic
  const existingMembership = await prisma.membership.findUnique({
    where: {
      userId_topicId: {
        userId: user.id,
        topicId: topicId
      }
    }
  })

  if (existingMembership) {
    if (existingMembership.factionId === factionId) {
      return; // Already in this faction
    }
    // Switch faction
    await prisma.membership.update({
      where: { id: existingMembership.id },
      data: { factionId }
    })
  } else {
    // Join new
    await prisma.membership.create({
      data: {
        userId: user.id,
        topicId,
        factionId
      }
    })
  }
  
  revalidatePath(`/topic/${topicId}`)
}

export async function leaveFaction(topicId: string, _formData?: FormData) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  
  try {
    await prisma.membership.delete({
      where: {
        userId_topicId: {
          userId: user.id,
          topicId
        }
      }
    })
  } catch (e) {
    // Ignore if not found
  }
  
  revalidatePath(`/topic/${topicId}`)
}

export async function getUserMembership(topicId: string) {
  const user = await getCurrentUser()
  if (!user) return null
  
  return prisma.membership.findUnique({
    where: {
      userId_topicId: {
        userId: user.id,
        topicId
      }
    }
  })
}

// --- Messages ---

export async function postReason(factionId: string, type: 'WHY' | 'WHY_NOT', formData: FormData) {
  const content = formData.get('content') as string
  if (!content) return;

  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  
  await prisma.message.create({
    data: {
      content,
      type,
      factionId,
      authorId: user.id
    }
  })
  
  revalidatePath(`/topic/`) // Revalidate broadly or specifically
  
  // We need to know the topicId to revalidate the page
  const faction = await prisma.faction.findUnique({ where: { id: factionId } })
  if (faction) {
    revalidatePath(`/topic/${faction.topicId}`)
  }
}

export async function getFactionMessages(factionId: string) {
  return prisma.message.findMany({
    where: { factionId },
    orderBy: { createdAt: 'desc' },
    include: { author: true }
  })
}
