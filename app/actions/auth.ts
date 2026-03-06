'use server'

import prisma from '@/lib/prisma'
import { generateVerificationToken, verifyToken } from '@/lib/tokens'
import { sendVerificationEmail } from '@/lib/mail'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

export async function sendOtp(email: string) {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return { success: false, error: "Invalid email address" }
  }
  
  const normalizedEmail = email.toLowerCase()
  
  // Check if email already registered
  const existingUser = await prisma.user.findFirst({
    where: { email: normalizedEmail }
  })

  if (existingUser) {
    return { success: false, error: "该邮箱已注册，请直接登录" }
  }

  try {
    const token = await generateVerificationToken(normalizedEmail)
    const emailResult = await sendVerificationEmail(normalizedEmail, token.token)
    
    if (!emailResult.success) {
      return { success: false, error: emailResult.error || "Failed to send email" }
    }
    
    return { success: true }
  } catch (error) {
    console.error("Failed to send OTP:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, error: `Failed to send verification code: ${errorMessage}` }
  }
}

export async function register(_prevState: unknown, formData: FormData) {
  try {
    const emailRaw = formData.get('email') as string
    const email = emailRaw ? emailRaw.toLowerCase() : ''
    const otp = formData.get('otp') as string
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const passphrase = (formData.get('passphrase') as string)?.trim()

    if (!email || !otp || !username || !password || !passphrase) {
      return { success: false, error: "All fields are required" }
    }

    // 1. Verify OTP
    const verification = await verifyToken(email, otp)
    if (!verification.success) {
      return { success: false, error: verification.error || "Invalid verification code" }
    }

    // 2. Check uniqueness (email and passphrase)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { passphrase }
        ]
      }
    })

    if (existingUser) {
      if (existingUser.email === email) return { success: false, error: "Email already registered" }
      if (existingUser.passphrase === passphrase) return { success: false, error: "Passphrase already taken" }
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // 4. Create User
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passphrase,
        password: hashedPassword,
        emailVerified: new Date(),
      }
    })

    // 5. Login (Set cookie)
    const cookieStore = await cookies()
    cookieStore.set('userId', user.id)

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error("Registration error:", error)
    return { success: false, error: "Registration failed" }
  }
}

export async function loginWithPassword(_prevState: unknown, formData: FormData) {
  try {
    const identifierRaw = formData.get('email') as string
    const identifier = identifierRaw ? identifierRaw.trim() : ''
    const password = formData.get('password') as string

    if (!identifier || !password) {
      return { success: false, error: "Email/Passphrase and password required" }
    }

    // Find user by email (lowercase) OR passphrase (exact)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { passphrase: identifier }
        ]
      }
    })

    if (!user || !user.password) {
      return { success: false, error: "Invalid credentials" }
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return { success: false, error: "Invalid credentials" }
    }

    // Lazy migration: If passphrase is null, set it to email (if unique)
    if (!user.passphrase && user.email) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { passphrase: user.email }
        })
      } catch (e) {
        // Ignore unique constraint error (passphrase already taken)
        console.warn(`Failed to auto-set passphrase for user ${user.id}:`, e)
      }
    }

    const cookieStore = await cookies()
    cookieStore.set('userId', user.id)

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, error: "Login failed" }
  }
}
