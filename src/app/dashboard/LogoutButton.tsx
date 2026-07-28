"use client"

import { signOut } from "next-auth/react"

export default function LogoutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="bg-destructive text-destructive-foreground px-4 py-2 rounded hover:bg-destructive/90 transition-colors"
    >
      Sign Out
    </button>
  )
}
