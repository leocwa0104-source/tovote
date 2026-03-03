'use server'

import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'

// BigInt JSON serialization helper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () { return this.toString() }

// --- User Management ---

export async function login(formData: FormData) {
  try {
    const username = formData.get('username') as string
    if (!username) throw new Error("Username required")
    
    let user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      user = await prisma.user.create({ data: { username } })
    }
    
    const cookieStore = await cookies()
    cookieStore.set('userId', user.id)
    
    revalidatePath('/')
  } catch (e) {
    console.error("login error:", e)
    // We can't return error message easily here since it's a form action without state
    // But preventing crash is better
  }
}

export async function logout() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('userId')
    redirect('/')
  } catch (e) {
    console.error("logout error:", e)
    redirect('/') // Ensure redirect happens even if cookie deletion fails
  }
}

export async function getCurrentUser() {
  try {
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
      const tickets = user.purchases ? user.purchases.reduce((sum, p) => sum + p.remainingTickets, 0) : 0
      Object.assign(user, { tickets })
    }

    return user
  } catch (e) {
    console.error("getCurrentUser error:", e)
    return null
  }
}

// --- Topics ---

export async function createTopic(prevState: unknown, formData: FormData) {
  try {
    const title = formData.get('title') as string
    const description = formData.get('description') as string | null
    const isPrivate = formData.get('isPrivate') === 'on'
    const password = formData.get('password') as string
    const seekBrainstorming = formData.get('seekBrainstorming') === 'on'
    const seekRational = formData.get('seekRational') === 'on'
    
    if (!seekBrainstorming && !seekRational) {
      return { success: false, error: 'Please select at least one discussion style (Brainstorming or Rational).' }
    }
    
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Only check for uniqueness if the new topic is public (isPrivate: false)
    if (!isPrivate) {
      const existingPublicTopic = await prisma.topic.findFirst({
        where: { 
          title,
          isPrivate: false
        }
      })

      if (existingPublicTopic) {
        return { success: false, error: 'A public topic with this title already exists. Please choose a different title.' }
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
    return { success: true }
  } catch (e) {
    console.error("createTopic error:", e)
    return { success: false, error: 'Failed to create topic' }
  }
}

export async function verifyTopicPassword(topicId: string, password: string) {
  try {
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
  } catch (e) {
    console.error("verifyTopicPassword error:", e)
    return { success: false, error: 'Verification failed' }
  }
}

export async function checkTopicAccess(topicId: string) {
  try {
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
  } catch (e) {
    console.error("checkTopicAccess error:", e)
    return false
  }
}

export async function getTopics(sortBy: 'latest' | 'value' = 'latest') {
  try {
    return await prisma.topic.findMany({
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
  } catch (e) {
    console.error("getTopics error:", e)
    return []
  }
}

export async function getJoinedPrivateTopics() {
  try {
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
  } catch (e) {
    console.error("getJoinedPrivateTopics error:", e)
    return []
  }
}

export async function joinPrivateTopic(title: string, creatorName: string, password: string) {
  try {
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
  } catch (e) {
    console.error("joinPrivateTopic error:", e)
    return { success: false, error: 'Failed to join topic' }
  }
}

export async function getTopic(id: string) {
  try {
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
  } catch (e) {
    console.error("getTopic error:", e)
    return null
  }
}

// --- Factions ---

export async function createFaction(topicId: string, prevState: unknown, formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string | undefined
  const seekBrainstorming = formData.get('seekBrainstorming') === 'on'
  const seekRational = formData.get('seekRational') === 'on'
  
  if (!seekBrainstorming && !seekRational) {
    return { success: false, error: 'Please select at least one faction style (Brainstorming or Rational).' }
  }
  
  try {
    const existingFaction = await prisma.faction.findFirst({
      where: {
        topicId: topicId,
        name: name
      }
    })

    if (existingFaction) {
      return { success: false, error: 'Faction with this name already exists in this topic. Please choose a different name.' }
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
    return { success: true }
  } catch (e) {
    console.error("createFaction error:", e)
    return { success: false, error: 'Failed to create faction' }
  }
}

export async function joinFaction(topicId: string, factionId: string, formData?: FormData) {
  void formData
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "Unauthorized" }
    
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
        return { success: true }; // Already in this faction
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
      if (!hasAccess) return { success: false, error: "Unauthorized" }

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
    return { success: true }
  } catch (e) {
    console.error("joinFaction error:", e)
    return { success: false, error: "Failed to join faction" }
  }
}

import { PACKAGES, PackageId } from '@/lib/constants'

export async function buyPackage(packageId: PackageId): Promise<{ success: boolean; error?: string; checkoutUrl?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

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

    // --- Payment Integration (Generic Wechat/Alipay) ---
    // 1. Get Payment Config from Env
    const paymentApiUrl = process.env.PAYMENT_API_URL
    const paymentAppId = process.env.PAYMENT_APP_ID
    const paymentSecret = process.env.PAYMENT_SECRET

    // 2. Fallback to Mock if no config (or use a simple direct link if you prefer)
    if (!paymentApiUrl || !paymentAppId || !paymentSecret) {
      // For now, return a placeholder or mock success for dev
      // In production, this should throw error or show "Payment not configured"
      
      // MOCK: Simulate immediate success for now (or you can return a QR code url if you have one)
      // Since user said "leave Wechat and Alipay", we can't really generate a real payment link without a provider.
      // We will simulate a "Checkout Page" that would exist.
      
      // TODO: Replace this with actual API call to your chosen payment provider (e.g. Jeepay, Xunhu, etc.)
      console.warn("Payment env vars missing. Using mock checkout.")
      
      return { 
        success: false, 
        error: "Payment provider integration pending. Please configure API details." 
      }
    }

    // 3. Construct Payment Request (Generic Structure)
    // This is a common structure for many 3rd party payment APIs (EasyPay, Jeepay, etc.)
    // You will need to adjust fields based on the specific provider you choose later.
    const orderId = `${user.id}_${Date.now()}`
    const amount = pkg.price // Use CNY for Wechat/Alipay
    const notifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/payment`
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/`
    
    // Example Payload (adjust to your provider)
    const payload = {
      pid: paymentAppId,
      type: 'alipay', // or 'wxpay', usually passed from frontend choice
      out_trade_no: orderId,
      notify_url: notifyUrl,
      return_url: returnUrl,
      name: `Ticket Package ${pkg.label}`,
      money: amount,
      // sign: generateSign(...) // You would need a signing function here
    }

    // For now, since we don't have a real provider, we just return error to prompt config.
    // If you have a specific provider doc, we can implement the exact signature.
    
    return { 
      success: false, 
      error: "Payment provider integration pending. Please configure API details." 
    }

  } catch (e) {
    console.error("buyPackage error:", e)
    return { success: false, error: 'Payment initialization failed' }
  }
}

export async function rechargeFaction(topicId: string, factionId: string, ticketsNeeded: number) {
  try {
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
    console.error("rechargeFaction error:", e)
    return { success: false, error: 'Transaction failed' }
  }
}

export async function leaveFaction(topicId: string, formData?: FormData) {
  void formData
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "Unauthorized" }
    
    const existingMembership = await prisma.membership.findUnique({
      where: { userId_topicId: { userId: user.id, topicId } }
    })

    if (!existingMembership || !existingMembership.factionId) {
      return { success: true }
    }

    await prisma.$transaction([
      prisma.membership.update({
        where: { userId_topicId: { userId: user.id, topicId } },
        data: { factionId: null }
      }),
      // Decrement topic total value
      prisma.topic.update({
        where: { id: topicId },
        data: { totalValue: { decrement: 1 } }
      })
    ])
    
    revalidatePath(`/topic/${topicId}`)
    return { success: true }
  } catch (e) {
    console.error("leaveFaction error:", e)
    return { success: false, error: "Failed to leave faction" }
  }
}

export async function getFaction(factionId: string) {
  try {
    const user = await getCurrentUser()
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
            votes: {
              where: { userId: user?.id ?? '' },
              select: { type: true }
            },
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
  } catch (e) {
    console.error("getFaction error:", e)
    return null
  }
}

export async function getUserMembership(topicId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) return null
    
    return await prisma.membership.findUnique({
      where: {
        userId_topicId: {
          userId: user.id,
          topicId
        }
      }
    })
  } catch (e) {
    console.error("getUserMembership error:", e)
    return null
  }
}

export async function getUserTopicMemberships() {
  try {
    const user = await getCurrentUser()
    if (!user) return []
    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      select: { topicId: true }
    })
    return memberships.map(m => m.topicId)
  } catch (e) {
    console.error("getUserTopicMemberships error:", e)
    return []
  }
}

export async function ensureTopicMembership(topicId: string) {
  try {
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
  } catch (e) {
    console.error("ensureTopicMembership error:", e)
  }
}

export async function joinTopic(topicId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "Unauthorized" }
    const hasAccess = await checkTopicAccess(topicId)
    if (!hasAccess) return { success: false, error: "Unauthorized" }
    
    await prisma.membership.upsert({
      where: { userId_topicId: { userId: user.id, topicId } },
      update: {},
      create: { userId: user.id, topicId }
    })
    
    revalidatePath(`/topic/${topicId}`)
    revalidatePath('/')
    return { success: true }
  } catch (e) {
    console.error("joinTopic error:", e)
    return { success: false, error: "Failed to join topic" }
  }
}

export async function leaveTopic(topicId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "Unauthorized" }

    await prisma.membership.delete({
      where: { userId_topicId: { userId: user.id, topicId } }
    })
    
    revalidatePath(`/topic/${topicId}`)
    revalidatePath('/')
    return { success: true }
  } catch (e) {
    console.error("leaveTopic error:", e)
    return { success: false, error: "Failed to leave topic" }
  }
}

// --- Messages ---

export async function postReason() {
  // This function is deprecated and replaced by createOpinion
  // Keeping it temporarily if needed, but the UI should now use createOpinion
  // or we can remove it entirely if we are sure no one uses it.
  console.warn("Deprecated: postReason called. Use createOpinion instead.")
  return;
}

export async function getFactionOpinions(factionId: string) {
  try {
    return await prisma.opinion.findMany({
      where: { factionId },
      orderBy: { createdAt: 'desc' },
      include: { author: true }
    })
  } catch (e) {
    console.error("getFactionOpinions error:", e)
    return []
  }
}

export async function createOpinion(formData: FormData) {
  try {
    const factionId = formData.get('factionId') as string
    // Force type to 'WHY' to unify all opinions as "Territories"
    const type = 'WHY'
    const summary = formData.get('summary') as string
    const detail = formData.get('detail') as string
    const citationIds = formData.get('citationIds') as string // JSON array string
    const neighborId = formData.get('neighborId') as string | null
    
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "Unauthorized" }
    
    const faction = await prisma.faction.findUnique({ where: { id: factionId } })
    if (!faction) return { success: false, error: "Faction not found" }

    const hasAccess = await checkTopicAccess(faction.topicId)
    if (!hasAccess) return { success: false, error: "Unauthorized" }
    
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
    return { success: true }
  } catch (e) {
    console.error("createOpinion error:", e)
    return { success: false, error: "Failed to create opinion" }
  }
}

export async function deleteOpinion(opinionId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "Unauthorized" }
    
    const opinion = await prisma.opinion.findUnique({ where: { id: opinionId } })
    if (!opinion) return { success: false, error: "Opinion not found" }
    
    if (opinion.authorId !== user.id) return { success: false, error: "Forbidden" }
    
    const faction = await prisma.faction.findUnique({ where: { id: opinion.factionId } })
    
    await prisma.opinion.delete({ where: { id: opinionId } })
    
    if (faction) {
      revalidatePath(`/topic/${faction.topicId}`)
      revalidatePath(`/topic/${faction.topicId}/faction/${faction.id}`)
    }
    return { success: true }
  } catch (e) {
    console.error("deleteOpinion error:", e)
    return { success: false, error: "Failed to delete opinion" }
  }
}

export async function setOpinionNeighbor(opinionId: string, neighborId: string | null) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const opinion = await prisma.opinion.findUnique({ where: { id: opinionId } })
    if (!opinion) return { success: false, error: "Opinion not found" }
    if (opinion.authorId !== user.id) return { success: false, error: "Forbidden" }

    if (neighborId === opinionId) return { success: false, error: "Cannot be neighbor to self" }

    if (neighborId) {
        const neighbor = await prisma.opinion.findUnique({ where: { id: neighborId } })
        if (!neighbor) return { success: false, error: "Neighbor not found" }
        if (neighbor.factionId !== opinion.factionId) return { success: false, error: "Neighbor must be in the same faction" }
    }

    await prisma.opinion.update({
      where: { id: opinionId },
      data: { neighborId }
    })

    const faction = await prisma.faction.findUnique({ where: { id: opinion.factionId } })
    if (faction) {
        revalidatePath(`/topic/${faction.topicId}`)
    }
    return { success: true }
  } catch (e) {
    console.error("setOpinionNeighbor error:", e)
    return { success: false, error: "Failed to set neighbor" }
  }
}

// --- Dashboard ---

export async function getUserDashboardData() {
  try {
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
  } catch (e) {
    console.error("getUserDashboardData error:", e)
    return null
  }
}

// --- Search ---

export async function searchOpinions(query: string) {
  if (!query || query.length < 2) return []
  
  try {
    const user = await getCurrentUser()
    if (!user) return []

    return await prisma.opinion.findMany({
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
  } catch (e) {
    console.error("searchOpinions error:", e)
    return []
  }
}

export async function getOpinionById(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) return null
    
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
  } catch {
    return null
  }
}
