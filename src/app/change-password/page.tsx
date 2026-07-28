import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import ChangePasswordForm from "./ChangePasswordForm"

export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md p-8 bg-card border rounded-lg shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Change Password</h1>
          <p className="text-muted-foreground mt-2">
            {(session.user as any).forcePasswordChange 
              ? "You must change your password before continuing." 
              : "Update your account password"}
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  )
}
