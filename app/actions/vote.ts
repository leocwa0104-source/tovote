'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/app/actions'
import { VoteType } from '@prisma/client'

export async function toggleOpinionVote(opinionId: string, type: VoteType) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return { success: false, error: "Not logged in" }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    })

    if (!user) return { success: false, error: "User not found" }

    // Check if user already voted
    const existingVote = await prisma.opinionVote.findUnique({
      where: {
        userId_opinionId: {
          userId: user.id,
          opinionId: opinionId,
        },
      },
    })

    // If existing vote exists and is from a previous cycle (locked), prevent change
    if (existingVote && existingVote.createdAt < user.lastReplenishedAt) {
      return { success: false, error: "Vote is locked from previous cycle" }
    }

    // Logic for Retract or Switch
    if (existingVote) {
      if (existingVote.type === type) {
        // Retract (Same type)
        
        await prisma.$transaction([
          prisma.opinionVote.delete({
            where: { id: existingVote.id },
          }),
          prisma.user.update({
            where: { id: user.id },
            data: {
              eyesCount: type === 'EYE' ? { increment: 1 } : undefined,
              trashCount: type === 'TRASH' ? { increment: 1 } : undefined,
            },
          }),
          prisma.opinion.update({
            where: { id: opinionId },
            data: {
              eyes: type === 'EYE' ? { decrement: 1 } : undefined,
              trash: type === 'TRASH' ? { decrement: 1 } : undefined,
            },
          }),
        ])
        
        revalidatePath('/')
        return { success: true, action: 'retracted' }
      } else {
        // Switch (Different type)
        // Check balance for new type (must be > 0)
        
        const newTypeBalance = type === 'EYE' ? user.eyesCount : user.trashCount
        if (newTypeBalance <= 0) {
             return { success: false, error: `Not enough ${type === 'EYE' ? 'Eyes' : 'Trash'} to switch` }
        }

        await prisma.$transaction([
          prisma.opinionVote.update({
            where: { id: existingVote.id },
            data: { type: type, createdAt: new Date() }, // Update timestamp to now (bringing it to current cycle)
          }),
          prisma.user.update({
            where: { id: user.id },
            data: {
              eyesCount: type === 'EYE' ? { increment: -1 } : { increment: 1 },
              trashCount: type === 'TRASH' ? { increment: -1 } : { increment: 1 },
            },
          }),
          prisma.opinion.update({
            where: { id: opinionId },
            data: {
              eyes: type === 'EYE' ? { increment: 1 } : { decrement: 1 },
              trash: type === 'TRASH' ? { increment: 1 } : { decrement: 1 },
            },
          }),
        ])
        
        revalidatePath('/')
        return { success: true, action: 'switched' }
      }
    } else {
      // New Vote
      // Check balance
      const balance = type === 'EYE' ? user.eyesCount : user.trashCount
      if (balance <= 0) {
        return { success: false, error: `Not enough ${type === 'EYE' ? 'Eyes' : 'Trash'}` }
      }

      const [, updatedUser] = await prisma.$transaction([
        prisma.opinionVote.create({
          data: {
            userId: user.id,
            opinionId: opinionId,
            type: type,
            createdAt: new Date(),
          },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: {
            eyesCount: type === 'EYE' ? { increment: -1 } : undefined,
            trashCount: type === 'TRASH' ? { increment: -1 } : undefined,
          },
        }),
        prisma.opinion.update({
          where: { id: opinionId },
          data: {
            eyes: type === 'EYE' ? { increment: 1 } : undefined,
            trash: type === 'TRASH' ? { increment: 1 } : undefined,
          },
        }),
      ])
      
      // Replenish check
      if (updatedUser.eyesCount === 0 && updatedUser.trashCount === 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            eyesCount: 10,
            trashCount: 10,
            lastReplenishedAt: new Date(),
          },
        })
        revalidatePath('/')
        return { success: true, action: 'replenished' }
      }

      revalidatePath('/')
      return { success: true, action: 'created' }
    }
  } catch (error) {
    console.error("Vote error:", error)
    return { success: false, error: "Internal server error" }
  }
}

export async function getOpinionVoteStats(opinionId: string) {
  try {
    const opinion = await prisma.opinion.findUnique({
      where: { id: opinionId },
      select: { eyes: true, trash: true }
    })
    
    if (!opinion) return null
    
    return { 
      eyes: opinion.eyes, 
      trash: opinion.trash 
    }
  } catch (error) {
    console.error("Failed to fetch vote stats:", error)
    return null
  }
}
