'use server'

import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'

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
  redirect('/')
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) return null
  return prisma.user.findUnique({ where: { id: userId } })
}

// --- Topics ---

export async function createTopic(prevState: any, formData: FormData) {
  const title = formData.get('title') as string
  const description = formData.get('description') as string | null
  const isPrivate = formData.get('isPrivate') === 'on'
  const password = formData.get('password') as string
  const seekBrainstorming = formData.get('seekBrainstorming') === 'on'
  const seekRational = formData.get('seekRational') === 'on'
  
  const user = await getCurrentUser()
  if (!user) return { message: 'Unauthorized' }

  try {
    const existingTopic = await prisma.topic.findUnique({
      where: { title }
    })

    if (existingTopic) {
      return { message: 'Topic with this title already exists. Please choose a different title.' }
    }

    let hashedPassword = null
    if (isPrivate && password) {
      hashedPassword = await bcrypt.hash(password, 10)
    }

    await prisma.topic.create({
      data: {
        title,
        description: description || null,
        creatorId: user.id,
        isPrivate,
        password: hashedPassword,
        seekBrainstorming,
        seekRational
      }
    })
    
    revalidatePath('/')
    return { message: 'success' }
  } catch (e) {
    return { message: 'Failed to create topic' }
  }
}

export async function verifyTopicPassword(topicId: string, password: string) {
  const topic = await prisma.topic.findUnique({ where: { id: topicId } })
  if (!topic || !topic.isPrivate || !topic.password) return { success: false, error: 'Topic not found or public' }

  const isValid = await bcrypt.compare(password, topic.password)
  if (isValid) {
    const user = await getCurrentUser()
    const cookieStore = await cookies()
    // Set cookie value to user ID or 'anonymous'
    const cookieValue = user ? user.id : 'anonymous'
    cookieStore.set(`access_topic_${topicId}`, cookieValue, { httpOnly: true, secure: process.env.NODE_ENV === 'production' })

    // Auto-join user
    if (user) {
      const existing = await prisma.membership.findUnique({
        where: { userId_topicId: { userId: user.id, topicId } }
      })
      if (!existing) {
        await prisma.membership.create({
          data: { userId: user.id, topicId }
        })
        revalidatePath(`/topic/${topicId}`)
        revalidatePath('/')
      }
    }
    
    return { success: true }
  }
  
  return { success: false, error: 'Incorrect password' }
}

export async function checkTopicAccess(topicId: string) {
    const topic = await prisma.topic.findUnique({ where: { id: topicId } })
    if (!topic) return false
    if (!topic.isPrivate) return true
    
    const user = await getCurrentUser()
    if (user && user.id === topic.creatorId) return true

    const cookieStore = await cookies()
    const cookieValue = cookieStore.get(`access_topic_${topicId}`)?.value
    
    if (!cookieValue) return false

    // If user is logged in, cookie must match user ID
    if (user) {
      return cookieValue === user.id
    }

    // If user is anonymous, cookie must be 'anonymous'
    return cookieValue === 'anonymous'
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
      _count: {
        select: { memberships: true }
      },
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
          opinions: {
            orderBy: { createdAt: 'desc' },
            include: { 
              author: true,
              citations: {
                include: {
                  target: {
                    include: { 
                      author: true,
                      faction: {
                        include: {
                          topic: true
                        }
                      }
                    }
                  }
                }
              },
              citedBy: {
                include: {
                  source: {
                    include: {
                      author: true
                    }
                  }
                }
              }
            }
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

export async function createFaction(topicId: string, prevState: any, formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string | undefined
  
  try {
    const existingFaction = await prisma.faction.findFirst({
      where: {
        topicId: topicId,
        name: name
      }
    })

    if (existingFaction) {
      return { message: 'Faction with this name already exists in this topic. Please choose a different name.' }
    }

    await prisma.faction.create({
      data: {
        name,
        description: description || null, // Optional
        topicId: topicId,
      }
    })
    
    revalidatePath(`/topic/${topicId}`)
    return { message: 'success' }
  } catch (e) {
    return { message: 'Failed to create faction' }
  }
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
    const hasAccess = await checkTopicAccess(topicId)
    if (!hasAccess) throw new Error("Unauthorized")

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

export async function getFaction(factionId: string) {
  const faction = await prisma.faction.findUnique({
    where: { id: factionId },
    include: {
      topic: true,
      _count: {
        select: { members: true }
      },
      opinions: {
        orderBy: { createdAt: 'desc' },
        include: {
          author: true,
          citations: {
            include: {
              target: {
                include: {
                  author: true,
                  faction: {
                    include: {
                      topic: true
                    }
                  }
                }
              }
            }
          },
          citedBy: {
            include: {
              source: {
                include: {
                  author: true
                }
              }
            }
          }
        }
      }
    }
  })
  return faction
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

export async function getUserTopicMemberships() {
  const user = await getCurrentUser()
  if (!user) return []
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    select: { topicId: true }
  })
  return memberships.map(m => m.topicId)
}

async function getOrCreateNeutralFaction(topicId: string) {
  const name = 'General'
  const existing = await prisma.faction.findFirst({ where: { topicId, name } })
  if (existing) return existing
  return prisma.faction.create({ data: { name, topicId } })
}

export async function joinTopic(topicId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  const hasAccess = await checkTopicAccess(topicId)
  if (!hasAccess) throw new Error("Unauthorized")
  const existing = await prisma.membership.findUnique({
    where: { userId_topicId: { userId: user.id, topicId } }
  })
  if (!existing) {
    await prisma.membership.create({
      data: { userId: user.id, topicId }
    })
  }
  revalidatePath(`/topic/${topicId}`)
  revalidatePath('/')
  redirect(`/topic/${topicId}`)
}

export async function leaveTopic(topicId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  try {
    await prisma.membership.delete({
      where: { userId_topicId: { userId: user.id, topicId } }
    })
  } catch {}
  revalidatePath(`/topic/${topicId}`)
  revalidatePath('/')
}

// --- Messages ---

export async function postReason(formData: FormData) {
  // This function is deprecated and replaced by createOpinion
  // Keeping it temporarily if needed, but the UI should now use createOpinion
  // or we can remove it entirely if we are sure no one uses it.
  // For now, let's just implement it as a wrapper around createOpinion if possible,
  // or just throw an error.
  throw new Error("Deprecated: Use createOpinion instead")
}

export async function getFactionOpinions(factionId: string) {
  return prisma.opinion.findMany({
    where: { factionId },
    orderBy: { createdAt: 'desc' },
    include: { author: true }
  })
}

export async function createOpinion(formData: FormData) {
  const factionId = formData.get('factionId') as string
  const type = formData.get('type') as 'WHY' | 'WHY_NOT'
  const summary = formData.get('summary') as string
  const detail = formData.get('detail') as string
  const citationIds = formData.get('citationIds') as string // JSON array string
  
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  
  const faction = await prisma.faction.findUnique({ where: { id: factionId } })
  if (!faction) throw new Error("Faction not found")

  const hasAccess = await checkTopicAccess(faction.topicId)
  if (!hasAccess) throw new Error("Unauthorized")
  
  const opinion = await prisma.opinion.upsert({
    where: {
      authorId_factionId_type: {
        authorId: user.id,
        factionId,
        type
      }
    },
    update: {
      summary,
      detail,
      updatedAt: new Date()
    },
    create: {
      summary,
      detail,
      type,
      authorId: user.id,
      factionId
    }
  })

  // Handle citations
  if (citationIds) {
    try {
      const ids = JSON.parse(citationIds) as string[]
      if (Array.isArray(ids) && ids.length > 0) {
        // Create citations
        await Promise.all(ids.map(targetId => 
          prisma.citation.upsert({
            where: {
              sourceId_targetId: {
                sourceId: opinion.id,
                targetId
              }
            },
            update: {}, // Do nothing if exists
            create: {
              sourceId: opinion.id,
              targetId
            }
          })
        ))
      }
    } catch (e) {
      console.error("Failed to parse citation IDs", e)
    }
  }
  
  // Ensure user is in the faction they are posting to
  const existingMembership = await prisma.membership.findUnique({
    where: { userId_topicId: { userId: user.id, topicId: faction.topicId } }
  })
  
  if (existingMembership) {
    if (existingMembership.factionId !== factionId) {
      await prisma.membership.update({
        where: { id: existingMembership.id },
        data: { factionId }
      })
    }
  } else {
    await prisma.membership.create({
      data: {
        userId: user.id,
        topicId: faction.topicId,
        factionId
      }
    })
  }

  revalidatePath(`/topic/${faction.topicId}`)
}

export async function deleteOpinion(opinionId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  
  const opinion = await prisma.opinion.findUnique({ where: { id: opinionId } })
  if (!opinion) throw new Error("Opinion not found")
  
  if (opinion.authorId !== user.id) throw new Error("Forbidden")
  
  const faction = await prisma.faction.findUnique({ where: { id: opinion.factionId } })
  
  await prisma.opinion.delete({ where: { id: opinionId } })
  
  if (faction) {
    revalidatePath(`/topic/${faction.topicId}`)
  }
}

// --- Dashboard ---

export async function getUserDashboardData() {
  const user = await getCurrentUser()
  if (!user) return null

  const [joinedFactions, createdTopics] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: user.id },
      include: {
        topic: true,
        faction: {
          include: {
            _count: {
              select: { members: true }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    }),
    prisma.topic.findMany({
      where: { creatorId: user.id },
      include: {
        _count: {
          select: { factions: true, memberships: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  ])

  return {
    user,
    joinedFactions,
    createdTopics
  }
}

// --- Search ---

export async function searchOpinions(query: string) {
  if (!query || query.length < 2) return []
  
  const user = await getCurrentUser()
  if (!user) return []

  return prisma.opinion.findMany({
    where: {
      OR: [
        { summary: { contains: query, mode: 'insensitive' } },
        { detail: { contains: query, mode: 'insensitive' } },
        { author: { username: { contains: query, mode: 'insensitive' } } }
      ]
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      author: true,
      faction: {
        include: {
          topic: true
        }
      }
    }
  })
}
