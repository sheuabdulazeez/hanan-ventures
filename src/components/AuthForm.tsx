import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from '../hooks/use-toast'
import { login } from '@/database/user'

export default function AuthForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  // TODO: Implement check for authentication token and redirect to dashboard


  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setIsVerifying(true)
    await login(username, password).then(res => {
      if (!res || 'error' in res) {
        toast({ title: 'Invalid username or password', variant: "destructive" })
        setIsVerifying(false)
        return
      }
      toast({ title: 'Login successful', variant: "default" })
    }).catch(err => {
      toast({ variant: "destructive", title: 'Error', description: err.message })
      setIsVerifying(false)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-2xl w-full max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-white bg-opacity-20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-200"
            placeholder="Enter your username"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
            Password
          </label>
          <input
            type="text"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-white bg-opacity-20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-200"
            placeholder="Enter your password"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isVerifying}
          className={`w-full py-2 px-4 rounded-md text-white font-semibold transition duration-200 ${
            isVerifying
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50'
          }`}
        >
          {isVerifying ? 'Verifying...' : 'Login'}
        </button>
      </form>
    </motion.div>
  )
}

