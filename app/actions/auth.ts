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
  
  try {
    const token = await generateVerificationToken(email)
    await sendVerificationEmail(email, token.token)
    return { success: true }
  } catch (error) {
    console.error("Failed to send OTP:", error)
    return { success: false, error: "Failed to send verification code" }
  }
}

export async function register(prevState: any, formData: FormData) {
  try {
    const email = formData.get('email') as string
    const otp = formData.get('otp') as string
    const username = formData.get('username') as string
    const password = formData.get('password') as string

    if (!email || !otp || !username || !password) {
      return { success: false, error: "All fields are required" }
    }

    // 1. Verify OTP
    const verification = await verifyToken(email, otp)
    if (!verification.success) {
      return { success: false, error: verification.error || "Invalid verification code" }
    }

    // 2. Check username/email uniqueness
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    })

    if (existingUser) {
      if (existingUser.email === email) return { success: false, error: "Email already registered" }
      if (existingUser.username === username) return { success: false, error: "Username already taken" }
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // 4. Create User
    const user = await prisma.user.create({
      data: {
        username,
        email,
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

export async function loginWithPassword(prevState: any, formData: FormData) {
  try {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      return { success: false, error: "Email and password required" }
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password) {
      // Fallback: Check if user exists by username (legacy support?)
      // But user asked for Email + Password.
      // If user enters username in email field?
      // Maybe support username OR email login?
      // "Login: Email + Password" was the request.
      // But existing users have username only.
      // I'll stick to Email for now as requested.
      return { success: false, error: "Invalid credentials" }
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return { success: false, error: "Invalid credentials" }
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
