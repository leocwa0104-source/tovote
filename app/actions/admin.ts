'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/app/actions'
import { revalidatePath } from 'next/cache'
import { Role } from '@prisma/client'

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
