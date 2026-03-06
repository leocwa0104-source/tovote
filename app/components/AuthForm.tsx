'use client'

import { useState } from 'react'
import { sendOtp, register, loginWithPassword } from '@/app/actions/auth'

export default function AuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Register state
  const [step, setStep] = useState<'email' | 'details'>('email')
  const [email, setEmail] = useState('')
  
  async function handleSendOtp(formData: FormData) {
    setLoading(true)
    setError('')
    setSuccess('')
    
    const emailVal = formData.get('email') as string
    const res = await sendOtp(emailVal)
    setLoading(false)
    
    if (res?.success) { // Optional chaining in case res is undefined (shouldn't be)
      setSuccess('Verification code sent!')
      setEmail(emailVal)
      setStep('details')
    } else {
      setError(res?.error || 'Failed to send code')
    }
  }

  async function handleRegister(formData: FormData) {
    setLoading(true)
    setError('')
    setSuccess('')
    
    const res = await register(null, formData)
    setLoading(false)
    
    if (!res?.success) {
      setError(res?.error || 'Registration failed')
    }
  }

  async function handleLogin(formData: FormData) {
    setLoading(true)
    setError('')
    setSuccess('')
    
    const res = await loginWithPassword(null, formData)
    setLoading(false)
    
    if (!res?.success) {
      setError(res?.error || 'Login failed')
    }
  }

  return (
    <div className="flex flex-col gap-3 min-w-[280px] p-4 bg-gray-50 border rounded-lg shadow-sm">
       {/* Tabs */}
       <div className="flex gap-4 text-sm border-b pb-2 mb-2">
         <button 
           onClick={() => { setMode('login'); setError(''); setSuccess(''); }} 
           className={`${mode === 'login' ? 'font-bold text-black border-b-2 border-black' : 'text-gray-500 hover:text-gray-800'}`}
         >
           Login
         </button>
         <button 
           onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
           className={`${mode === 'register' ? 'font-bold text-black border-b-2 border-black' : 'text-gray-500 hover:text-gray-800'}`}
         >
           Register
         </button>
       </div>

       {error && <div className="text-red-600 text-xs bg-red-50 p-2 rounded">{error}</div>}
       {success && <div className="text-green-600 text-xs bg-green-50 p-2 rounded">{success}</div>}

       {mode === 'login' ? (
         <form action={handleLogin} className="flex flex-col gap-3">
           <div>
             <label className="text-xs text-gray-500 mb-1 block">Email / Passphrase</label>
             <input name="email" type="text" required className="w-full border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-1 focus:ring-black" />
           </div>
           <div>
             <label className="text-xs text-gray-500 mb-1 block">Password</label>
             <input name="password" type="password" required className="w-full border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-1 focus:ring-black" />
           </div>
           <button type="submit" disabled={loading} className="bg-black text-white py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors">
             {loading ? 'Logging in...' : 'Login'}
           </button>
         </form>
       ) : (
         // Register Flow
         step === 'email' ? (
           <form action={handleSendOtp} className="flex flex-col gap-3">
             <div>
               <label className="text-xs text-gray-500 mb-1 block">Email</label>
               <input name="email" type="email" required className="w-full border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-1 focus:ring-black" />
             </div>
             <button type="submit" disabled={loading} className="bg-black text-white py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors">
               {loading ? 'Sending Code...' : 'Send Verification Code'}
             </button>
           </form>
         ) : (
           <form action={handleRegister} className="flex flex-col gap-3">
             <input type="hidden" name="email" value={email} />
             <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
               Code sent to <strong>{email}</strong>
             </div>
             <div>
               <label className="text-xs text-gray-500 mb-1 block">Verification Code</label>
               <input name="otp" placeholder="6-digit code" required className="w-full border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-1 focus:ring-black" />
             </div>
             <div>
               <label className="text-xs text-gray-500 mb-1 block">Username</label>
               <input name="username" placeholder="Choose a username" required className="w-full border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-1 focus:ring-black" />
             </div>
             <div>
               <label className="text-xs text-gray-500 mb-1 block">Passphrase (Login ID)</label>
               <input name="passphrase" placeholder="e.g. Open Sesame" required className="w-full border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-1 focus:ring-black" />
             </div>
             <div>
               <label className="text-xs text-gray-500 mb-1 block">Password</label>
               <input name="password" type="password" placeholder="Set a password" required className="w-full border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-1 focus:ring-black" />
             </div>
             <button type="submit" disabled={loading} className="bg-black text-white py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors">
               {loading ? 'Registering...' : 'Complete Registration'}
             </button>
             <button type="button" onClick={() => setStep('email')} className="text-xs text-gray-500 hover:text-black text-center mt-1">
               Change Email
             </button>
           </form>
         )
       )}
    </div>
  )
}
