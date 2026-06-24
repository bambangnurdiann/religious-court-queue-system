'use client'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export default function SignOut() {
  const router = useRouter()

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/sign-in')
          router.refresh()
        },
      },
    })
  }

  return (
    <Button
      onClick={handleSignOut}
      variant="outline"
      size="sm"
    >
      Sign Out
    </Button>
  )
}
