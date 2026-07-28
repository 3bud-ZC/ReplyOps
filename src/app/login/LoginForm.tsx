"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

type LoginLabels = {
  email: string
  password: string
  invalidEmailOrPassword: string
  signIn: string
}

export default function LoginForm({ labels }: { labels: LoginLabels }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError(labels.invalidEmailOrPassword)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium mb-1">{labels.email}</label>
        <input 
          id="login-email"
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-md p-2 bg-background"
          autoComplete="email"
          required
        />
      </div>
      <div>
        <label htmlFor="login-password" className="block text-sm font-medium mb-1">{labels.password}</label>
        <input 
          id="login-password"
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-md p-2 bg-background"
          autoComplete="current-password"
          required
        />
      </div>
      <button 
        type="submit"
        className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors"
      >
        {labels.signIn}
      </button>
    </form>
  )
}
