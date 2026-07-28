"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"

export default function ChangePasswordForm() {
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
        <label className="block text-sm font-medium mb-1">Current Password</label>
        <input 
          type="password" 
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full border rounded-md p-2 bg-background"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">New Password</label>
        <input 
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
        {loading ? "Changing..." : "Change Password"}
      </button>
    </form>
  )
}
