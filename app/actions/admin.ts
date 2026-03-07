'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/app/actions'
import { revalidatePath } from 'next/cache'

// --- Admin Check ---

export async function isAdmin() {
  const user = await getCurrentUser()
  if (!user) return false
  
  // Check environment variable for admin email override
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
  if (user.email && adminEmails.includes(user.email.toLowerCase())) {
    return true
  }

  // We need to fetch the user again to get the role, as getCurrentUser might not include it
  // or the type definition might not be updated yet in the runtime
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true }
  })
  
  return dbUser?.role === 'ADMIN'
}

export async function ensureAdmin() {
  if (!(await isAdmin())) {
    throw new Error("Unauthorized: Admin access required")
  }
}

// --- Ticket Package Management ---

export async function getTicketPackages() {
  await ensureAdmin()
  return await prisma.ticketPackage.findMany({
    orderBy: { price: 'asc' }
  })
}

export async function createTicketPackage(data: {
  name: string
  ticketCount: number
  price: number
  duration: number
  cooldown: number
}) {
  await ensureAdmin()
  
  try {
    await prisma.ticketPackage.create({
      data: {
        ...data,
        isActive: true
      }
    })
    revalidatePath('/admin')
    return { success: true }
  } catch (e) {
    console.error("Failed to create ticket package:", e)
    return { success: false, error: "Failed to create package" }
  }
}

export async function updateTicketPackage(id: string, data: {
  name?: string
  ticketCount?: number
  price?: number
  duration?: number
  cooldown?: number
  isActive?: boolean
}) {
  await ensureAdmin()
  
  try {
    await prisma.ticketPackage.update({
      where: { id },
      data
    })
    revalidatePath('/admin')
    return { success: true }
  } catch (e) {
    console.error("Failed to update ticket package:", e)
    return { success: false, error: "Failed to update package" }
  }
}

export async function deleteTicketPackage(id: string) {
  await ensureAdmin()
  
  try {
    // We soft delete by setting isActive to false, or hard delete if no purchases?
    // For now, let's just delete it. If there are relations, it might fail.
    // Better to just set isActive to false usually, but user asked for add/remove.
    // Let's try delete, if it fails, we can suggest deactivating.
    await prisma.ticketPackage.delete({
      where: { id }
    })
    revalidatePath('/admin')
    return { success: true }
  } catch (e) {
    console.error("Failed to delete ticket package:", e)
    return { success: false, error: "Failed to delete package. It might be in use." }
  }
}

// --- System Settings ---

export async function getSystemSettings() {
  await ensureAdmin()
  const settings = await prisma.systemSetting.findMany()
  
  // Transform to object for easier consumption
  const settingsMap: Record<string, string> = {}
  settings.forEach(s => {
    settingsMap[s.key] = s.value
  })
  
  return settingsMap
}

export async function updateSystemSetting(key: string, value: string) {
  await ensureAdmin()
  
  try {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })
    revalidatePath('/admin')
    revalidatePath('/') // Global settings might affect home page actions
    return { success: true }
  } catch (e) {
    console.error("Failed to update system setting:", e)
    return { success: false, error: "Failed to update setting" }
  }
}

// --- Data Management ---

export async function resetAllUserData() {
  await ensureAdmin()
  
  try {
    // Use transaction to ensure partial cleanup doesn't happen
    await prisma.$transaction([
      // 1. Delete all Topics (cascades to Factions, Opinions, Memberships)
      prisma.topic.deleteMany(),
      
      // 2. Delete all Purchases (resets ticket history)
      prisma.purchase.deleteMany(),
      
      // 3. Delete all Transactions (resets voting spend history)
      prisma.transaction.deleteMany(),

      // 4. Delete all Opinion Votes (resets eye/trash votes)
      prisma.opinionVote.deleteMany(),
      
      // 5. Reset User stats to default
      prisma.user.updateMany({
        data: {
          eyesCount: 10,
          trashCount: 10,
          lastReplenishedAt: new Date()
        }
      })
    ])

    revalidatePath('/')
    revalidatePath('/admin')
    return { success: true }
  } catch (e) {
    console.error("Failed to reset all user data:", e)
    return { success: false, error: "Failed to reset data" }
  }
}

// --- Vote Package Management ---

export async function getVotePackages() {
  await ensureAdmin()
  return await prisma.votePackage.findMany({
    orderBy: { cost: 'asc' }
  })
}

export async function createVotePackage(data: {
  cost: number
  value: number
}) {
  await ensureAdmin()
  
  try {
    await prisma.votePackage.create({
      data: {
        ...data,
        isActive: true
      }
    })
    revalidatePath('/admin')
    revalidatePath('/') // Affects vote UI
    return { success: true }
  } catch (e) {
    console.error("Failed to create vote package:", e)
    return { success: false, error: "Failed to create package" }
  }
}

export async function updateVotePackage(id: string, data: {
  cost?: number
  value?: number
  isActive?: boolean
}) {
  await ensureAdmin()
  
  try {
    await prisma.votePackage.update({
      where: { id },
      data
    })
    revalidatePath('/admin')
    revalidatePath('/')
    return { success: true }
  } catch (e) {
    console.error("Failed to update vote package:", e)
    return { success: false, error: "Failed to update package" }
  }
}

export async function deleteVotePackage(id: string) {
  await ensureAdmin()
  
  try {
    await prisma.votePackage.delete({
      where: { id }
    })
    revalidatePath('/admin')
    revalidatePath('/')
    return { success: true }
  } catch (e) {
    console.error("Failed to delete vote package:", e)
    return { success: false, error: "Failed to delete package" }
  }
}

// --- System Logo ---

export async function saveSystemLogo(data: string[]) {
  await ensureAdmin()
  
  try {
    await prisma.systemSetting.upsert({
      where: { key: 'system_logo_pixel_data' },
      update: { value: JSON.stringify(data) },
      create: { key: 'system_logo_pixel_data', value: JSON.stringify(data) }
    })
    revalidatePath('/')
    revalidatePath('/admin')
    return { success: true }
  } catch (e) {
    console.error("Failed to save system logo:", e)
    return { success: false, error: "Failed to save logo" }
  }
}

// --- Skin Management ---

export async function getSkins() {
  // Publicly accessible for now, or maybe just admin? 
  // Admin needs it for list, Users need it for display.
  // Let's allow public read.
  return await prisma.skin.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function createSkin(data: { name: string, pixelData: string }) {
  await ensureAdmin()
  
  try {
    await prisma.skin.create({
      data: {
        ...data,
        isActive: true
      }
    })
    revalidatePath('/admin')
    revalidatePath('/')
    return { success: true }
  } catch (e) {
    console.error("Failed to create skin:", e)
    return { success: false, error: "Failed to create skin" }
  }
}

export async function updateSkin(id: string, data: { name?: string, pixelData?: string, isActive?: boolean }) {
  await ensureAdmin()
  
  try {
    await prisma.skin.update({
      where: { id },
      data
    })
    revalidatePath('/admin')
    revalidatePath('/')
    return { success: true }
  } catch (e) {
    console.error("Failed to update skin:", e)
    return { success: false, error: "Failed to update skin" }
  }
}

export async function deleteSkin(id: string) {
  await ensureAdmin()
  
  try {
    await prisma.skin.delete({
      where: { id }
    })
    revalidatePath('/admin')
    revalidatePath('/')
    return { success: true }
  } catch (e) {
    console.error("Failed to delete skin:", e)
    return { success: false, error: "Failed to delete skin" }
  }
}

// Set active skin for topic cards (Global setting for now, or random?)
// For now, let's assume we pick one "default" skin or just list them all.
// But the requirement says "topic cards HAVE skins".
// Maybe we can set a global "active skin" that applies to all, or allow users to pick?
// "管理员处能有一个像素画板来设计、保存皮肤" -> "Administrator can design and save skins".
// Let's add a function to set a skin as the "default" one used by TopicNav.
export async function setActiveSkin(skinId: string) {
    await ensureAdmin()
    try {
        await prisma.systemSetting.upsert({
            where: { key: 'active_topic_skin_id' },
            update: { value: skinId },
            create: { key: 'active_topic_skin_id', value: skinId }
        })
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        return { success: false, error: "Failed to set active skin" }
    }
}

export async function getActiveSkin() {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'active_topic_skin_id' }
        })
        if (!setting) return null
        return await prisma.skin.findUnique({
            where: { id: setting.value }
        })
    } catch {
        return null
    }
}


