import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'

import { PACKAGES } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-signature') || ''
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || ''

    if (!secret) {
      console.error('LEMONSQUEEZY_WEBHOOK_SECRET not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Verify signature
    const hmac = crypto.createHmac('sha256', secret)
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8')
    const signatureBuffer = Buffer.from(signature, 'utf8')

    if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
      console.error('Invalid Lemon Squeezy signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const data = JSON.parse(rawBody)
    const eventName = data.meta.event_name

    if (eventName === 'order_created') {
      const attributes = data.data.attributes
      const customData = data?.meta?.custom_data // { userId, packageId }
      
      if (!customData || !customData.userId || !customData.packageId) {
        console.error('Missing custom_data in Lemon Squeezy webhook')
        return NextResponse.json({ received: true })
      }

      const { userId, packageId } = customData
      
      const pkg = PACKAGES[packageId as keyof typeof PACKAGES]
      if (!pkg) {
         console.error('Invalid packageId:', packageId)
         return NextResponse.json({ received: true })
      }

      const providerOrderId = typeof attributes?.identifier === 'string' && attributes.identifier
        ? attributes.identifier
        : String(data?.data?.id ?? '')

      if (providerOrderId) {
        const existing = await prisma.purchase.findUnique({ where: { providerOrderId } })
        if (existing) {
          return NextResponse.json({ received: true })
        }
      }

      await prisma.purchase.create({
        data: {
          userId,
          packageId,
          amount: pkg.prices.HKD, // Default to HKD for Lemon Squeezy
          tickets: pkg.tickets,
          remainingTickets: pkg.tickets,
          expiresAt: new Date(Date.now() + pkg.limitMs),
          provider: 'lemonsqueezy',
          ...(providerOrderId ? { providerOrderId } : {})
        }
      })
      
      console.log(`Lemon Squeezy Purchase successful for user ${userId}, package ${packageId}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Lemon Squeezy Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
