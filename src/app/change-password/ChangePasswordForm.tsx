"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"

type ChangePasswordLabels = {
  currentPassword: string
  newPassword: string
  changePassword: string
  changing: string
}

export default function ChangePasswordForm({ labels }: { labels: ChangePasswordLabels }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const csrfRes = await fetch("/api/auth/csrf")
      const { csrfToken } = await csrfRes.json()
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ currentPassword, newPassword })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to change password")
      }

      // Password changed successfully, we should sign them out so they login with new credentials
      // Or they can stay logged in since the session doesn't store the password, 
      // but their forcePasswordChange claim in the JWT needs to be refreshed!
      // The easiest way to refresh the JWT is to force a re-login.
      await signOut({ callbackUrl: "/login" })
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <div>
        <label htmlFor="current-password" className="block text-sm font-medium mb-1">{labels.currentPassword}</label>
        <input 
          id="current-password"
          type="password" 
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full border rounded-md p-2 bg-background"
          required
        />
      </div>
      <div>
        <label htmlFor="new-password" className="block text-sm font-medium mb-1">{labels.newPassword}</label>
        <input 
          id="new-password"
          type="password" 
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full border rounded-md p-2 bg-background"
          required
          minLength={8}
        />
      </div>
      <button 
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? labels.changing : labels.changePassword}
      </button>
    </form>
  )
}
