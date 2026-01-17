import AuthForm from '@components/AuthForm'
import { useAppStore } from '@/lib/store'

export default function Auth() {
  const { businessInfo } = useAppStore();
  return (
     <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <AuthForm />
    </div>
  )
}

