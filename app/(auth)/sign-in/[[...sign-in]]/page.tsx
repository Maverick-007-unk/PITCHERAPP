import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-ko-black flex items-center justify-center">
      <SignIn />
    </div>
  )
}
