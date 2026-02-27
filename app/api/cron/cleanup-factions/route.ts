import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verify authorization if CRON_SECRET is set
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Delete factions created more than 24 hours ago that have no members
    const thresholdDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await prisma.faction.deleteMany({
      where: {
        members: {
          none: {}
        },
        createdAt: {
          lt: thresholdDate
        }
      }
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `Successfully deleted ${result.count} empty factions created before ${thresholdDate.toISOString()}`
    });
  } catch (error) {
    console.error('Error in cleanup-factions cron:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
