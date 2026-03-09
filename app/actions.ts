'use server'

import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'

try {
  const bigIntProto = BigInt.prototype as unknown as { toJSON?: unknown }
  if (typeof bigIntProto.toJSON !== 'function') {
    Object.defineProperty(BigInt.prototype, 'toJSON', {
      value: function () {
        return this.toString()
      },
      configurable: true,
    })
  }
} catch {
  void 0
}

// --- User Management ---

export async function login(formData: FormData) {
  try {
    const username = formData.get('username') as string
    if (!username) throw new Error("Username required")
    
    // Use findFirst since username is not unique anymore
    let user = await prisma.user.findFirst({ where: { username } })
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

export async function updateUsername(newUsername: string) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    if (!userId) return { success: false, error: "Not authenticated" }

    if (!newUsername || newUsername.trim().length < 3) {
      return { success: false, error: "Username must be at least 3 characters long" }
    }

    const trimmedUsername = newUsername.trim()

    // Check if username is taken by another user
    const existingUser = await prisma.user.findFirst({
      where: { 
        username: trimmedUsername,
        NOT: { id: userId }
      }
    })

    if (existingUser) {
      return { success: false, error: "Username already taken" }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { username: trimmedUsername }
    })

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (e) {
    console.error("updateUsername error:", e)
    return { success: false, error: "Failed to update username" }
  }
}

export async function getSystemLogo() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'system_logo_pixel_data' }
    })
    return setting?.value ? JSON.parse(setting.value) : null
  } catch (e) {
    console.error("Failed to fetch system logo:", e)
    return null
  }
}

export async function updatePassphrase(newPassphrase: string) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    if (!userId) return { success: false, error: "Not authenticated" }

    if (!newPassphrase || newPassphrase.trim().length < 1) {
      return { success: false, error: "Passphrase cannot be empty" }
    }

    const trimmedPassphrase = newPassphrase.trim()

    // Check if passphrase is taken by another user
    const existingUser = await prisma.user.findFirst({
      where: { 
        passphrase: trimmedPassphrase,
        NOT: { id: userId }
      }
    })

    if (existingUser) {
      return { success: false, error: "Passphrase already taken" }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passphrase: trimmedPassphrase }
    })

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (e) {
    console.error("updatePassphrase error:", e)
    return { success: false, error: "Failed to update passphrase" }
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
      
      // Ensure role is valid (default to USER if null/undefined in DB for some reason)
      // Check environment variable override
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
      const role = (user.email && adminEmails.includes(user.email.toLowerCase())) ? 'ADMIN' : (user.role || 'USER')
      
      return {
        ...user,
        tickets,
        role
      }
    }

    return null
  } catch (e) {
    console.error("getCurrentUser error:", e)
    return null
  }
}

// Helper to generate a unique 6-digit room code
async function generateUniqueRoomCode(): Promise<string> {
  const characters = '0123456789'
  const length = 6
  let isUnique = false
  let code = ''

  while (!isUnique) {
    code = ''
    for (let i = 0; i < length; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length))
    }

    const existing = await prisma.topic.findUnique({
      where: { roomCode: code }
    })
    
    if (!existing) {
      isUnique = true
    }
  }
  return code
}

// --- Topics ---

export async function createTopic(prevState: unknown, formData: FormData) {
  void prevState
  try {
    const rawTitle = formData.get('title')
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : ''
    if (!title) return { success: false, error: 'Topic title is required.' }

    const rawDescription = formData.get('description')
    const description = typeof rawDescription === 'string' ? rawDescription.trim() : null

    const isPrivateValue = formData.get('isPrivate')
    const isPrivate = typeof isPrivateValue === 'string'
      ? ['on', 'true', '1', 'yes'].includes(isPrivateValue.toLowerCase())
      : false

    const rawPassword = formData.get('password')
    const password = typeof rawPassword === 'string' ? rawPassword : ''
    const seekBrainstorming = formData.get('seekBrainstorming') === 'on'
    const seekRational = formData.get('seekRational') === 'on'
    
    if (!seekBrainstorming && !seekRational) {
      return { success: false, error: 'Please select at least one discussion style (Brainstorming or Rational).' }
    }
    if (isPrivate && !password.trim()) {
      return { success: false, error: 'Password is required for private topics.' }
    }
    
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Check public topic creation cooldown
    if (!isPrivate) {
      // 1. Get cooldown setting (default to 0 if not set)
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'public_topic_cooldown_minutes' }
      })
      const cooldownMinutes = setting ? parseInt(setting.value) : 0

      if (cooldownMinutes > 0) {
        // 2. Find last public topic created by this user
        const lastPublicTopic = await prisma.topic.findFirst({
          where: {
            creatorId: user.id,
            isPrivate: false
          },
          orderBy: { createdAt: 'desc' }
        })

        if (lastPublicTopic) {
          const elapsedMinutes = (Date.now() - lastPublicTopic.createdAt.getTime()) / (1000 * 60)
          if (elapsedMinutes < cooldownMinutes) {
            const remainingMinutes = Math.ceil(cooldownMinutes - elapsedMinutes)
            return { 
              success: false, 
              error: `Please wait ${remainingMinutes} minutes before creating another public topic.` 
            }
          }
        }
      }
    }

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
    let roomCode: string | null = null

    if (isPrivate) {
      hashedPassword = await bcrypt.hash(password, 10)
    }

    let newTopic: { id: string } | null = null
    const maxAttempts = isPrivate ? 5 : 1
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (isPrivate) {
        roomCode = await generateUniqueRoomCode()
      }
      try {
        newTopic = await prisma.topic.create({
          data: {
            title,
            description: description || null,
            creatorId: user.id,
            isPrivate,
            password: hashedPassword,
            roomCode,
            seekBrainstorming,
            seekRational
          },
          select: { id: true }
        })
        break
      } catch (e) {
        const target = typeof e === 'object' && e && 'meta' in e
          ? (e as { meta?: { target?: unknown } }).meta?.target
          : undefined

        const targets = Array.isArray(target)
          ? target.map(String)
          : typeof target === 'string'
            ? [target]
            : []

        const hasTarget = (needle: string) => targets.some(t => t.toLowerCase().includes(needle.toLowerCase()))

        const isUniqueViolation = typeof e === 'object' && e !== null && 'code' in e && (e as { code?: unknown }).code === 'P2002'

        if (isUniqueViolation) {
          if (hasTarget('roomCode') && isPrivate && attempt < maxAttempts - 1) {
            continue
          }
          if (hasTarget('title')) {
            return { success: false, error: 'A topic with this title already exists. Please choose a different title.' }
          }
        }

        throw e
      }
    }

    if (!newTopic) return { success: false, error: 'Failed to create topic' }

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
    const name = typeof e === 'object' && e !== null && 'name' in e
      ? String((e as { name?: unknown }).name ?? '')
      : ''

    const code = typeof e === 'object' && e !== null && 'code' in e
      ? String((e as { code?: unknown }).code ?? '')
      : ''

    if (name === 'PrismaClientInitializationError') {
      return { success: false, error: '数据库连接失败，请稍后重试。' }
    }

    if (name === 'PrismaClientValidationError') {
      return { success: false, error: '服务端数据库客户端不匹配：请重新生成 Prisma Client 后再试。' }
    }

    const meta = typeof e === 'object' && e !== null && 'meta' in e
      ? (e as { meta?: unknown }).meta
      : undefined

    const metaTable = typeof meta === 'object' && meta !== null && 'table' in meta
      ? String((meta as { table?: unknown }).table ?? '')
      : ''

    const metaColumn = typeof meta === 'object' && meta !== null && 'column' in meta
      ? String((meta as { column?: unknown }).column ?? '')
      : ''

    if (code === 'P2021') {
      const suffix = metaTable ? `（缺表：${metaTable}）` : ''
      return { success: false, error: `数据库表不存在${suffix}：请先初始化/同步数据库结构（prisma db push / migrate）。` }
    }

    if (code === 'P2022') {
      const suffix = metaColumn ? `（缺字段：${metaColumn}）` : ''
      return { success: false, error: `数据库字段不存在${suffix}：请先同步数据库结构（prisma db push / migrate）。` }
    }

    if (code === 'P2002') {
      return { success: false, error: '数据冲突（唯一约束）：请换个标题或重试。' }
    }

    const errorMessage = e instanceof Error ? e.message : String(e)
    return { success: false, error: `Failed to create topic: ${errorMessage}` }
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

export async function joinPrivateTopic(roomCode: string, password: string) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const topic = await prisma.topic.findUnique({
      where: { 
        roomCode
      }
    })

    if (!topic || !topic.isPrivate) return { success: false, error: 'Topic not found or invalid room code' }

    // Check if user is already a member
    const existing = await prisma.membership.findUnique({
      where: { userId_topicId: { userId: user.id, topicId: topic.id } }
    })
    
    if (existing) {
      return { success: true, topicId: topic.id }
    }

    // Verify password if set
    if (topic.password) {
      const isValid = await bcrypt.compare(password, topic.password)
      if (!isValid) return { success: false, error: 'Incorrect password' }
    }

    // Set access cookie
    const cookieStore = await cookies()
    cookieStore.set(`access_topic_${topic.id}`, user.id, { httpOnly: true, secure: process.env.NODE_ENV === 'production' })

    // Add membership
    await prisma.membership.create({
      data: { userId: user.id, topicId: topic.id }
    })

    revalidatePath('/')
    return { success: true, topicId: topic.id }
  } catch (e) {
    console.error("joinPrivateTopic error:", e)
    return { success: false, error: 'Failed to join topic' }
  }
}

export async function getTopic(id: string) {
  try {
    const user = await getCurrentUser()
    
    // Check and cleanup expired zero-vote factions
    // This is a "lazy" cleanup triggered on read.
    // In a high-traffic app, move this to a cron job.
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'zero_vote_faction_ttl_hours' }
      })
      const ttlHours = setting ? parseFloat(setting.value) : 0
      
      if (ttlHours > 0) {
        // Find expired factions first to handle potential deletion errors individually
        const expiredFactions = await prisma.faction.findMany({
          where: {
            topicId: id,
            lastZeroedAt: {
              lt: new Date(Date.now() - ttlHours * 60 * 60 * 1000)
            }
          },
          select: { id: true }
        })

        if (expiredFactions.length > 0) {
          console.log(`Found ${expiredFactions.length} expired factions in topic ${id}, attempting cleanup...`)
          
          for (const faction of expiredFactions) {
            try {
              // Use a transaction to ensure clean removal of dependencies if constraints exist
              // Note: We should ideally have onDelete: Cascade in schema, but this is a safeguard
              await prisma.$transaction(async (tx) => {
                // Manually delete transactions first (safeguard for missing cascade)
                await tx.transaction.deleteMany({
                  where: { factionId: faction.id }
                })
                
                // Then delete the faction
                await tx.faction.delete({
                  where: { id: faction.id }
                })
              })
              console.log(`Successfully cleaned up faction ${faction.id}`)
            } catch (e) {
              console.error(`Failed to cleanup faction ${faction.id}:`, e)
              // Continue to next faction
            }
          }
        }
      }
    } catch (cleanupError) {
      console.warn("Lazy cleanup process failed:", cleanupError)
      // Don't block the main read operation
    }

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
                votes: user ? {
            where: { userId: user.id },
            select: { type: true, createdAt: true }
          } : false,
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
    
    // Enhance opinions with userVote
    const enhancedFactions = topic.factions.map(faction => ({
      ...faction,
      opinions: faction.opinions.map(op => ({
        ...op,
        userVote: op.votes?.[0]?.type as 'EYE' | 'TRASH' | undefined,
        userVoteCreatedAt: op.votes?.[0]?.createdAt
      }))
    }))

    return {
      ...topic,
      factions: enhancedFactions
    }
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
      // We need to check if the old faction becomes empty
      if (existingMembership.factionId) {
        const oldFactionId = existingMembership.factionId
        await prisma.$transaction(async (tx) => {
          // 1. Move member
          await tx.membership.update({
            where: { id: existingMembership.id },
            data: { factionId }
          })
          
          // 2. Check old faction
          const oldFaction = await tx.faction.findUnique({
            where: { id: oldFactionId },
            include: { _count: { select: { members: true } } }
          })
          
          if (oldFaction && oldFaction._count.members === 0 && oldFaction.paidVoteCount === 0) {
            await tx.faction.update({
              where: { id: oldFactionId },
              data: { lastZeroedAt: new Date() }
            })
          }

          // 3. Clear new faction lastZeroedAt (it now has a member)
          await tx.faction.update({
            where: { id: factionId },
            data: { lastZeroedAt: null }
          })
        })
      } else {
        // Was not in any faction, just joining
        await prisma.$transaction([
          prisma.membership.update({
            where: { id: existingMembership.id },
            data: { factionId }
          }),
          prisma.faction.update({
            where: { id: factionId },
            data: { lastZeroedAt: null }
          }),
          prisma.topic.update({
            where: { id: topicId },
            data: { totalValue: { increment: 1 } }
          })
        ])
      }
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
        prisma.faction.update({
          where: { id: factionId },
          data: { lastZeroedAt: null }
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

export async function getActiveTicketPackages() {
  try {
    return await prisma.ticketPackage.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    })
  } catch (e) {
    console.error("getActiveTicketPackages error:", e)
    return []
  }
}

export async function buyPackage(packageId: string): Promise<{ success: boolean; error?: string; checkoutUrl?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const pkg = await prisma.ticketPackage.findUnique({
      where: { id: packageId }
    })
    
    if (!pkg || !pkg.isActive) return { success: false, error: 'Invalid or inactive package' }

    // Check purchase cooldown
    if (pkg.cooldown > 0) {
      const lastPurchase = await prisma.purchase.findFirst({
        where: {
          userId: user.id,
          packageId: packageId,
          createdAt: {
            gt: new Date(Date.now() - pkg.cooldown * 60 * 60 * 1000)
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      if (lastPurchase) {
        const hoursLeft = (pkg.cooldown * 60 * 60 * 1000 - (Date.now() - lastPurchase.createdAt.getTime())) / (1000 * 60 * 60)
        return { success: false, error: `Package limit reached. Wait ${hoursLeft.toFixed(1)} hours.` }
      }
    }

    // --- Payment Integration (Generic Wechat/Alipay) ---
    // 1. Get Payment Config from Env
    const paymentApiUrl = process.env.PAYMENT_API_URL
    const paymentAppId = process.env.PAYMENT_APP_ID
    const paymentSecret = process.env.PAYMENT_SECRET

    // 2. Fallback to Mock if no config (or use a simple direct link if you prefer)
    if (!paymentApiUrl || !paymentAppId || !paymentSecret) {
      // In production, we should NOT allow mock purchases.
      // Returning error to prompt configuration.
      console.warn("Payment env vars missing. Purchase failed.")
      
      return { 
        success: false, 
        error: "Payment service not configured. Please contact admin." 
      }
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

export async function rechargeFaction(topicId: string, factionId: string, votePackageId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Check if topic is private
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      select: { isPrivate: true }
    })

    if (topic && topic.isPrivate) {
      return { success: false, error: 'Paid voting is disabled for private topics' }
    }

    // Get vote package
    const votePackage = await prisma.votePackage.findUnique({
      where: { id: votePackageId }
    })
    
    if (!votePackage) return { success: false, error: 'Invalid vote option' }
    
    const ticketsNeeded = votePackage.cost
    const votes = votePackage.value

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
    // Get dynamic cooldown setting (default to 12h if not set)
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'faction_vote_cooldown_hours' }
    })
    const cooldownHours = setting ? parseFloat(setting.value) : 12.0

    if (cooldownHours > 0) {
      const lastTransaction = await prisma.transaction.findFirst({
        where: {
          userId: user.id,
          factionId: factionId,
          createdAt: {
            gt: new Date(Date.now() - cooldownHours * 60 * 60 * 1000)
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      if (lastTransaction) {
        const hoursLeft = cooldownHours - (Date.now() - lastTransaction.createdAt.getTime()) / (1000 * 60 * 60)
        return { success: false, error: `Cooldown active. Please wait ${hoursLeft.toFixed(1)} hours.` }
      }
    }
    
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
        data: { 
          paidVoteCount: { increment: votes },
          lastZeroedAt: null // Reset zero timer as we now have votes
        }
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

    const factionId = existingMembership.factionId

    await prisma.$transaction(async (tx) => {
      // 1. Remove membership
      await tx.membership.update({
        where: { userId_topicId: { userId: user.id, topicId } },
        data: { factionId: null }
      })
      
      // 2. Decrement topic total value
      await tx.topic.update({
        where: { id: topicId },
        data: { totalValue: { decrement: 1 } }
      })

      // 3. Check if faction is now empty
      const faction = await tx.faction.findUnique({
        where: { id: factionId },
        include: { _count: { select: { members: true } } }
      })
      
      if (faction && faction._count.members === 0 && faction.paidVoteCount === 0) {
        await tx.faction.update({
          where: { id: factionId },
          data: { lastZeroedAt: new Date() }
        })
      }
    })

    revalidatePath(`/topic/${topicId}`)
    revalidatePath('/')
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
            votes: user ? {
              where: { userId: user.id },
              select: { type: true }
            } : false,
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

    if (!faction) return null

    // Transform to include userVote
    const enhancedOpinions = faction.opinions.map(op => ({
      ...op,
      userVote: op.votes?.[0]?.type as 'EYE' | 'TRASH' | undefined,
      userVoteCreatedAt: op.votes?.[0]?.createdAt
    }))

    return {
      ...faction,
      opinions: enhancedOpinions
    }
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
      where: { 
        userId: user.id,
        factionId: { not: null }
      },
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
    const user = await getCurrentUser()
    const opinions = await prisma.opinion.findMany({
      where: { factionId },
      orderBy: { createdAt: 'desc' },
      include: { 
        author: true,
        votes: user ? {
          where: { userId: user.id },
          select: { type: true, createdAt: true }
        } : false,
      }
    })

    return opinions.map(op => ({
      ...op,
      userVote: op.votes?.[0]?.type as 'EYE' | 'TRASH' | undefined,
      userVoteCreatedAt: op.votes?.[0]?.createdAt
    }))
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
