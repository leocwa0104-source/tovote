'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/app/actions'
import { revalidatePath } from 'next/cache'
import { Role } from '@prisma/client'

// --- Admin Check ---

export async function isAdmin() {
  const user = await getCurrentUser()
  if (!user) return false
  
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

export async function setUserAsAdmin(email: string) {
  // This function is intended to be called manually or via a secure script initially
  // In a real app, you might want a super-admin dashboard
  
  try {
    const user = await prisma.user.findFirst({
      where: { email } // Assuming user has email, but schema says email is optional?
    })
    
    // Fallback: If no email in DB (since we use username login), maybe we search by username if provided?
    // But user asked for "leocwa0104@gmail.com". Let's assume email field is populated.
    
    if (!user) {
        // If user login via username only, maybe they don't have email set?
        // Let's try to find by username if email looks like username (unlikely for gmail)
        return { success: false, error: "User not found" }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' }
    })
    
    return { success: true }
  } catch (e) {
    console.error("setUserAsAdmin error:", e)
    return { success: false, error: "Failed to set admin" }
  }
}

