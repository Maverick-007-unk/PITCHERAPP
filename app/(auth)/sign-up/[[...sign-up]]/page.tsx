import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-ko-black flex items-center justify-center">
      <SignUp />
    </div>
  )
}
