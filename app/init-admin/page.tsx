
import { setUserAsAdmin } from '@/app/actions/admin'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function SetupAdminPage() {
  // This is a temporary page to bootstrap the admin user
  // In production, you would remove this or protect it behind a secret
  
  const targetEmail = 'leocwa0104@gmail.com'
  
  // First, let's check if the user exists by email, or maybe we need to update their email if they only have username?
  // Since user said "existing user has email leocwa0104@gmail.com", I assume the record is there.
  
  let result = { success: false, error: '' }
  let user = await prisma.user.findFirst({ where: { email: targetEmail } })
  
  if (!user) {
    // Fallback: Check if user exists by username if email search fails, maybe email is not set in DB
    user = await prisma.user.findFirst({ where: { username: 'leocwa0104' } })
    
    if (user) {
         // Found by username, let's update email and role
         try {
            await prisma.user.update({
                where: { id: user.id },
                data: { role: 'ADMIN', email: targetEmail }
            })
            result = { success: true, error: '' }
        } catch (e) {
            result = { success: false, error: String(e) }
        }
    } else {
        result = { success: false, error: `User with email ${targetEmail} or username 'leocwa0104' not found.` }
    }
  } else {
    try {
        await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN' }
        })
        result = { success: true, error: '' }
    } catch (e) {
        result = { success: false, error: String(e) }
    }
  }

  // Reload user to get latest state
  if (user) {
      user = await prisma.user.findUnique({ where: { id: user.id } })
  }

  return (
    <div className="p-8 font-mono">
      <h1 className="text-xl font-bold mb-4">Admin Setup</h1>
      <div className="bg-gray-100 p-4 rounded">
        <p>Target: {targetEmail}</p>
        <p className={result.success ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
            Status: {result.success ? 'SUCCESS - User is now ADMIN' : `FAILED - ${result.error}`}
        </p>
        {user && (
            <div className="mt-4 border-t border-gray-300 pt-2">
                <p>User ID: {user.id}</p>
                <p>Username: {user.username}</p>
                <p>Email: {user.email || 'N/A'}</p>
                <p>Role: {user.role}</p>
            </div>
        )}
      </div>
    </div>
  )
}
