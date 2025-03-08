import { Link } from 'react-router'
import AuthForm from '@components/AuthForm'
import { Button } from '@/components/ui/button'
import { create, getUsers } from '@/database/user'
import { useEffect, useState } from 'react'
import { TUser } from '@/types/database'

export default function Auth() {
  const [users, setUsers] = useState<TUser[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const result = await getUsers();
      setUsers(result);
    };

    fetchUsers()
  }, [])
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 animate-pulse">
          Hanan Ventures CRM
        </h1>
        <p className="text-xl text-white opacity-75">Secure Verification</p>
      </div>
      <AuthForm />
    </main>
  )
}

