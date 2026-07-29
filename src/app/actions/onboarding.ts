"use server"

import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"
import { auditLog, checkTenantAccess } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"

const onboardingSteps = [
  "business_profile",
  "assistant_name",
  "language",
  "tone",
  "business_hours",
  "knowledge_document",
  "test_lab_ready",
  "safe_channel",
  "human_handoff",
  "launch_checklist",
] as const

export type OnboardingStep = (typeof onboardingSteps)[number]

function readText(formData: FormData, key: string, fallback = "") {
  return String(formData.get(key) ?? fallback).trim()
}

function existingContactData(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function nextOnboardingStep(completed: string[]) {
  return onboardingSteps.find((step) => !completed.includes(step)) ?? "completed"
}

export async function saveOnboardingProgress(formData: FormData) {
  const tenantId = readText(formData, "tenantId")
  const step = readText(formData, "step") as OnboardingStep
  const direction = readText(formData, "direction", "next")
  if (!tenantId || !onboardingSteps.includes(step)) throw new Error("invalid_onboarding_step")
  const { user } = await checkTenantAccess(tenantId, [Role.tenant_owner, Role.tenant_admin])
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      assistantConfiguration: true,
      knowledgeDocuments: { where: { deletedAt: null }, take: 1 },
      channelConnections: { where: { deletedAt: null, enabled: true }, take: 1 },
      handoffs: { take: 1 },
    },
  })
  if (!tenant) throw new Error("tenant_not_found")

  const current = existingContactData(tenant.contactData)
  const onboarding = existingContactData(current.onboarding)
  const completed = new Set(Array.isArray(onboarding.completedSteps) ? onboarding.completedSteps.map(String) : [])
  if (direction === "previous") completed.delete(step)
  if (direction === "skip") {
    if (["business_profile", "assistant_name", "knowledge_document"].includes(step)) throw new Error("required_step_cannot_be_skipped")
    completed.add(step)
  }
  if (direction === "next") {
    if (step === "business_profile" && (!tenant.industry || !tenant.description)) throw new Error("business_profile_required")
    if (step === "assistant_name" && !tenant.assistantConfiguration?.assistantName) throw new Error("assistant_name_required")
    if (step === "knowledge_document" && tenant.knowledgeDocuments.length === 0) throw new Error("knowledge_document_required")
    completed.add(step)
  }
  const completedSteps = [...completed]
  const complete = completedSteps.length === onboardingSteps.length
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      contactData: {
        ...current,
        onboarding: {
          completedSteps,
          currentStep: complete ? "completed" : nextOnboardingStep(completedSteps),
          completedAt: complete ? new Date().toISOString() : null,
          replayTourAvailable: true,
        },
      },
    },
  })
  await auditLog(tenantId, user.id, complete ? "onboarding.complete" : "onboarding.progress", "Tenant", { tenantId, step, direction })
  revalidatePath("/dashboard/onboarding")
}

export async function skipOnboardingForExperiencedUser(formData: FormData) {
  const tenantId = readText(formData, "tenantId")
  const { user } = await checkTenantAccess(tenantId, [Role.tenant_owner, Role.tenant_admin])
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new Error("tenant_not_found")
  const current = existingContactData(tenant.contactData)
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      contactData: {
        ...current,
        onboarding: {
          completedSteps: [...onboardingSteps],
          currentStep: "completed",
          completedAt: new Date().toISOString(),
          skippedByExperiencedUser: true,
          replayTourAvailable: true,
        },
      },
    },
  })
  await auditLog(tenantId, user.id, "onboarding.skip_experienced_user", "Tenant", { tenantId })
  revalidatePath("/dashboard/onboarding")
}
