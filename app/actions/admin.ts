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
