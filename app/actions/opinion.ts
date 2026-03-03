'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { VoteType } from '@prisma/client';

export async function voteOpinion(opinionId: string, type: VoteType) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;

  if (!userId) {
    return { error: 'Unauthorized' };
  }

  // 1. Fetch user and current vote
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      eyesCount: true, 
      trashCount: true, 
      lastReplenishedAt: true 
    }
  });

  if (!user) return { error: 'User not found' };

  const existingVote = await prisma.opinionVote.findUnique({
    where: {
      userId_opinionId: {
        userId,
        opinionId,
      },
    },
  });

  // 2. Logic
  try {
    await prisma.$transaction(async (tx) => {
      // Case A: Retract (Clicking the same type again)
      if (existingVote && existingVote.type === type) {
        // Check timestamp cutoff
        if (existingVote.createdAt < user.lastReplenishedAt) {
          throw new Error('CANNOT_RETRACT_PREVIOUS_CYCLE');
        }

        // Retract vote
        await tx.opinionVote.delete({
          where: { id: existingVote.id },
        });

        // Refund balance
        if (type === 'EYE') {
          await tx.user.update({
            where: { id: userId },
            data: { eyesCount: { increment: 1 } },
          });
          await tx.opinion.update({
            where: { id: opinionId },
            data: { eyes: { decrement: 1 } },
          });
        } else {
          await tx.user.update({
            where: { id: userId },
            data: { trashCount: { increment: 1 } },
          });
          await tx.opinion.update({
            where: { id: opinionId },
            data: { trash: { decrement: 1 } },
          });
        }
        return;
      }

      // Case B: Switch (Clicking different type)
      if (existingVote && existingVote.type !== type) {
        // Check timestamp cutoff for the OLD vote
        if (existingVote.createdAt < user.lastReplenishedAt) {
           throw new Error('CANNOT_RETRACT_PREVIOUS_CYCLE');
        }
        
        // Check balance for NEW type
        if (type === 'EYE' && user.eyesCount <= 0) throw new Error('INSUFFICIENT_EYES');
        if (type === 'TRASH' && user.trashCount <= 0) throw new Error('INSUFFICIENT_TRASH');

        // Delete old vote
        await tx.opinionVote.delete({
          where: { id: existingVote.id },
        });

        // Refund old type
        if (existingVote.type === 'EYE') {
           await tx.user.update({ where: { id: userId }, data: { eyesCount: { increment: 1 } } });
           await tx.opinion.update({ where: { id: opinionId }, data: { eyes: { decrement: 1 } } });
        } else {
           await tx.user.update({ where: { id: userId }, data: { trashCount: { increment: 1 } } });
           await tx.opinion.update({ where: { id: opinionId }, data: { trash: { decrement: 1 } } });
        }

        // Create new vote
        await tx.opinionVote.create({
          data: {
            userId,
            opinionId,
            type,
          },
        });

        // Consume new type
        if (type === 'EYE') {
           await tx.user.update({ where: { id: userId }, data: { eyesCount: { decrement: 1 } } });
           await tx.opinion.update({ where: { id: opinionId }, data: { eyes: { increment: 1 } } });
        } else {
           await tx.user.update({ where: { id: userId }, data: { trashCount: { decrement: 1 } } });
           await tx.opinion.update({ where: { id: opinionId }, data: { trash: { increment: 1 } } });
        }
        
        return;
      }

      // Case C: New Vote
      if (!existingVote) {
        if (type === 'EYE' && user.eyesCount <= 0) throw new Error('INSUFFICIENT_EYES');
        if (type === 'TRASH' && user.trashCount <= 0) throw new Error('INSUFFICIENT_TRASH');

        await tx.opinionVote.create({
          data: {
            userId,
            opinionId,
            type,
          },
        });

        if (type === 'EYE') {
           await tx.user.update({ where: { id: userId }, data: { eyesCount: { decrement: 1 } } });
           await tx.opinion.update({ where: { id: opinionId }, data: { eyes: { increment: 1 } } });
        } else {
           await tx.user.update({ where: { id: userId }, data: { trashCount: { decrement: 1 } } });
           await tx.opinion.update({ where: { id: opinionId }, data: { trash: { increment: 1 } } });
        }
      }
    });

    // 3. Check Replenishment
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { eyesCount: true, trashCount: true }
    });

    if (updatedUser && updatedUser.eyesCount === 0 && updatedUser.trashCount === 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          eyesCount: 10,
          trashCount: 10,
          lastReplenishedAt: new Date(),
        }
      });
      revalidatePath('/topic/[id]', 'page');
      return { success: true, replenished: true };
    }

    revalidatePath('/topic/[id]', 'page');
    return { success: true };

  } catch (error: any) {
    if (error.message === 'INSUFFICIENT_EYES') return { error: 'Insufficient Eyes' };
    if (error.message === 'INSUFFICIENT_TRASH') return { error: 'Insufficient Trash' };
    if (error.message === 'CANNOT_RETRACT_PREVIOUS_CYCLE') return { error: 'Cannot retract votes from previous cycle' };
    console.error(error);
    return { error: 'Something went wrong' };
  }
}
