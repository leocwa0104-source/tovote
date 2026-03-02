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
  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    include: {
      purchases: {
        where: {
          remainingTickets: { gt: 0 },
          expiresAt: { gt: new Date() }
        },
        orderBy: { expiresAt: 'asc' }
      }
    }
  })

  if (user) {
    // Calculate total valid tickets dynamically
    // @ts-ignore: User type extension
    user.tickets = user.purchases ? user.purchases.reduce((sum, p) => sum + p.remainingTickets, 0) : 0
  }

  return user
}

// --- Topics ---

export async function createTopic(prevState: unknown, formData: FormData) {
  const title = formData.get('title') as string
  const description = formData.get('description') as string | null
  const isPrivate = formData.get('isPrivate') === 'on'
  const password = formData.get('password') as string
  const seekBrainstorming = formData.get('seekBrainstorming') === 'on'
  const seekRational = formData.get('seekRational') === 'on'
  
  if (!seekBrainstorming && !seekRational) {
    return { message: 'Please select at least one discussion style (Brainstorming or Rational).' }
  }
  
  const user = await getCurrentUser()
  if (!user) return { message: 'Unauthorized' }

  try {
    // Only check for uniqueness if the new topic is public (isPrivate: false)
    if (!isPrivate) {
      const existingPublicTopic = await prisma.topic.findFirst({
        where: { 
          title,
          isPrivate: false
        }
      })

      if (existingPublicTopic) {
        return { message: 'A public topic with this title already exists. Please choose a different title.' }
      }
    }

    let hashedPassword = null
    if (isPrivate && password) {
      hashedPassword = await bcrypt.hash(password, 10)
    }

    const newTopic = await prisma.topic.create({
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

    if (isPrivate) {
      await prisma.membership.create({
        data: {
          userId: user.id,
          topicId: newTopic.id
        }
      })
    }
    
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
    
    if (user) {
      // 1. Creator always has access
      if (user.id === topic.creatorId) return true

      // 2. Members always have access
      const membership = await prisma.membership.findUnique({
        where: {
          userId_topicId: {
            userId: user.id,
            topicId: topic.id
          }
        }
      })
      if (membership) return true
    }

    // 3. Fallback to cookie check (for anonymous users or temporary access)
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

export async function getTopics(sortBy: 'latest' | 'value' = 'latest') {
  return prisma.topic.findMany({
    where: { isPrivate: false },
    orderBy: sortBy === 'value' ? { totalValue: 'desc' } : { createdAt: 'desc' },
    include: {
      creator: {
        select: { username: true }
      },
      _count: {
        select: {
          factions: true,
          memberships: {
            where: {
              factionId: { not: null }
            }
          }
        }
      }
    }
  })
}

export async function getJoinedPrivateTopics() {
  const user = await getCurrentUser()
  if (!user) return []

  const memberships = await prisma.membership.findMany({
    where: { 
      userId: user.id,
      topic: { isPrivate: true }
    },
    include: {
      topic: {
        include: {
          creator: {
            select: { username: true }
          },
          _count: {
            select: { 
              factions: true, 
              memberships: {
                where: {
                  factionId: { not: null }
                }
              }
            }
          }
        }
      }
    },
    orderBy: { joinedAt: 'desc' }
  })

  return memberships.map(m => m.topic)
}

export async function joinPrivateTopic(title: string, creatorName: string, password: string) {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const creator = await prisma.user.findUnique({ where: { username: creatorName } })
  if (!creator) return { success: false, error: 'Topic not found' }

  const topic = await prisma.topic.findFirst({
    where: { 
      title,
      creatorId: creator.id,
      isPrivate: true
    }
  })

  if (!topic || !topic.password) return { success: false, error: 'Topic not found' }

  const isValid = await bcrypt.compare(password, topic.password)
  if (!isValid) return { success: false, error: 'Incorrect password' }

  // Set access cookie
  const cookieStore = await cookies()
  cookieStore.set(`access_topic_${topic.id}`, user.id, { httpOnly: true, secure: process.env.NODE_ENV === 'production' })

  // Add membership if not exists
  const existing = await prisma.membership.findUnique({
    where: { userId_topicId: { userId: user.id, topicId: topic.id } }
  })
  
  if (!existing) {
    await prisma.membership.create({
      data: { userId: user.id, topicId: topic.id }
    })
  }

  revalidatePath('/')
  return { success: true, topicId: topic.id }
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
  
  // Sort factions by total votes (members + paid votes) descending
  topic.factions.sort((a, b) => (b._count.members + b.paidVoteCount) - (a._count.members + a.paidVoteCount))
  
  return topic
}

// --- Factions ---

export async function createFaction(topicId: string, prevState: unknown, formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string | undefined
  const seekBrainstorming = formData.get('seekBrainstorming') === 'on'
  const seekRational = formData.get('seekRational') === 'on'
  
  if (!seekBrainstorming && !seekRational) {
    return { message: 'Please select at least one faction style (Brainstorming or Rational).' }
  }
  
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
        seekBrainstorming,
        seekRational
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
    await prisma.$transaction([
      prisma.membership.update({
        where: { id: existingMembership.id },
        data: { factionId }
      }),
      // If user was not in any faction before, increment topic total value
      ...(existingMembership.factionId === null ? [
        prisma.topic.update({
          where: { id: topicId },
          data: { totalValue: { increment: 1 } }
        })
      ] : [])
    ])
  } else {
    // Join new
    const hasAccess = await checkTopicAccess(topicId)
    if (!hasAccess) throw new Error("Unauthorized")

    await prisma.$transaction([
      prisma.membership.create({
        data: {
          userId: user.id,
          topicId,
          factionId
        }
      }),
      prisma.topic.update({
        where: { id: topicId },
        data: { totalValue: { increment: 1 } }
      })
    ])
  }
  
  revalidatePath(`/topic/${topicId}`)
  revalidatePath('/')
}

export async function buyPackage(packageId: 'daily' | 'weekly' | 'monthly') {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Define packages
  const PACKAGES = {
    daily: { price: 2, tickets: 3, limitMs: 24 * 60 * 60 * 1000 },
    weekly: { price: 10, tickets: 15, limitMs: 7 * 24 * 60 * 60 * 1000 },
    monthly: { price: 30, tickets: 60, limitMs: 30 * 24 * 60 * 60 * 1000 }
  }

  const pkg = PACKAGES[packageId]
  if (!pkg) return { success: false, error: 'Invalid package' }

  // Check purchase limit
  const lastPurchase = await prisma.purchase.findFirst({
    where: {
      userId: user.id,
      packageId: packageId,
      createdAt: {
        gt: new Date(Date.now() - pkg.limitMs)
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  if (lastPurchase) {
    const hoursLeft = (pkg.limitMs - (Date.now() - lastPurchase.createdAt.getTime())) / (1000 * 60 * 60)
    return { success: false, error: `Package limit reached. Wait ${hoursLeft.toFixed(1)} hours.` }
  }

  // Mock Payment & Add Tickets
  try {
    await prisma.purchase.create({
      data: {
        userId: user.id,
        packageId,
        amount: pkg.price,
        tickets: pkg.tickets,
        remainingTickets: pkg.tickets,
        expiresAt: new Date(Date.now() + pkg.limitMs)
      }
    })

    revalidatePath('/')
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: 'Purchase failed' }
  }
}

export async function rechargeFaction(topicId: string, factionId: string, ticketsNeeded: number) {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // 1. Get all valid purchases with remaining tickets, sorted by expiration (FIFO)
  const validPurchases = await prisma.purchase.findMany({
    where: {
      userId: user.id,
      remainingTickets: { gt: 0 },
      expiresAt: { gt: new Date() }
    },
    orderBy: { expiresAt: 'asc' }
  })

  const totalAvailable = validPurchases.reduce((sum, p) => sum + p.remainingTickets, 0)
  
  if (totalAvailable < ticketsNeeded) {
    return { success: false, error: 'Insufficient tickets' }
  }

  // Check cooldown
  const lastTransaction = await prisma.transaction.findFirst({
    where: {
      userId: user.id,
      factionId: factionId,
      createdAt: {
        gt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  if (lastTransaction) {
    const hoursLeft = 12 - (Date.now() - lastTransaction.createdAt.getTime()) / (1000 * 60 * 60)
    return { success: false, error: `Cooldown active. Please wait ${hoursLeft.toFixed(1)} hours.` }
  }

  try {
    const votes = ticketsNeeded
    
    // Prepare updates
    const purchaseUpdates = []
    let remainingToDeduct = ticketsNeeded

    for (const purchase of validPurchases) {
      if (remainingToDeduct <= 0) break

      const deductAmount = Math.min(purchase.remainingTickets, remainingToDeduct)
      
      purchaseUpdates.push(
        prisma.purchase.update({
          where: { id: purchase.id },
          data: { remainingTickets: { decrement: deductAmount } }
        })
      )
      
      remainingToDeduct -= deductAmount
    }

    await prisma.$transaction([
      ...purchaseUpdates,
      // Record transaction
      prisma.transaction.create({
        data: {
          userId: user.id,
          factionId,
          amount: 0, // No direct money spent here
          votes
        }
      }),
      // Update faction
      prisma.faction.update({
        where: { id: factionId },
        data: { paidVoteCount: { increment: votes } }
      }),
      // Update topic value
      prisma.topic.update({
        where: { id: topicId },
        data: { totalValue: { increment: votes } }
      })
    ])

    revalidatePath(`/topic/${topicId}`)
    revalidatePath('/')
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: 'Transaction failed' }
  }
}

export async function leaveFaction(topicId: string, _formData?: FormData) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  
  try {
    await prisma.membership.update({
      where: {
        userId_topicId: {
          userId: user.id,
          topicId
        }
      },
      data: {
        factionId: null
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

export async function ensureTopicMembership(topicId: string) {
  const user = await getCurrentUser()
  if (!user) return

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
  // Force type to 'WHY' to unify all opinions as "Territories"
  const type = 'WHY'
  const summary = formData.get('summary') as string
  const detail = formData.get('detail') as string
  const citationIds = formData.get('citationIds') as string // JSON array string
  const neighborId = formData.get('neighborId') as string | null
  
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
      // Only update neighbor if explicitly provided, otherwise keep existing
      ...(neighborId ? { neighborId } : {}),
      updatedAt: new Date()
    },
    create: {
      summary,
      detail,
      type,
      authorId: user.id,
      factionId,
      neighborId: neighborId || null
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
  revalidatePath(`/topic/${faction.topicId}/faction/${faction.id}`)
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
    revalidatePath(`/topic/${faction.topicId}/faction/${faction.id}`)
  }
}

export async function setOpinionNeighbor(opinionId: string, neighborId: string | null) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const opinion = await prisma.opinion.findUnique({ where: { id: opinionId } })
  if (!opinion) throw new Error("Opinion not found")
  if (opinion.authorId !== user.id) throw new Error("Forbidden")

  if (neighborId === opinionId) throw new Error("Cannot be neighbor to self")

  if (neighborId) {
      const neighbor = await prisma.opinion.findUnique({ where: { id: neighborId } })
      if (!neighbor) throw new Error("Neighbor not found")
      if (neighbor.factionId !== opinion.factionId) throw new Error("Neighbor must be in the same faction")
  }

  await prisma.opinion.update({
    where: { id: opinionId },
    data: { neighborId }
  })

  const faction = await prisma.faction.findUnique({ where: { id: opinion.factionId } })
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

export async function getOpinionById(id: string) {
  const user = await getCurrentUser()
  if (!user) return null
  
  try {
    const opinion = await prisma.opinion.findUnique({
      where: { id },
      include: {
        author: true,
        faction: {
          include: {
            topic: true
          }
        }
      }
    })
    return opinion
  } catch (e) {
    return null
  }
}
