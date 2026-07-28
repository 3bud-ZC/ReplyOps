'use server'

import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { auditLog, checkTenantAccess } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"

function text(formData: FormData, key: string, fallback = "") {
  return String(formData.get(key) ?? fallback).trim()
}

function list(formData: FormData, key: string) {
  return text(formData, key).split(",").map((item) => item.trim()).filter(Boolean)
}

function boundedNumber(value: string, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

export async function saveAssistantConfiguration(formData: FormData) {
  const tenantId = text(formData, "tenantId")
  if (!tenantId) throw new Error("Tenant ID is required")
  const { user } = await checkTenantAccess(tenantId, [Role.tenant_owner, Role.tenant_admin])

  await prisma.assistantConfiguration.upsert({
    where: { tenantId },
    create: {
      tenantId,
      assistantName: text(formData, "assistantName", "Assistant"),
      language: text(formData, "language", "ar"),
      dialect: text(formData, "dialect", "egyptian"),
      tone: text(formData, "tone", "professional"),
      responseLength: text(formData, "responseLength", "concise"),
      emojiPolicy: text(formData, "emojiPolicy", "allowed"),
      greeting: text(formData, "greeting") || null,
      helpMessage: text(formData, "helpMessage") || null,
      apologyStyle: text(formData, "apologyStyle") || null,
      escalationStyle: text(formData, "escalationStyle") || null,
      systemRules: text(formData, "systemRules") || null,
      prohibitedTopics: text(formData, "prohibitedTopics") || null,
      confidenceThreshold: boundedNumber(text(formData, "confidenceThreshold"), 0.7, 0, 1),
      groundingThreshold: boundedNumber(text(formData, "groundingThreshold"), 0.7, 0, 1),
      memoryLength: boundedNumber(text(formData, "memoryLength"), 10, 0, 50),
      maxResponseLength: boundedNumber(text(formData, "maxResponseLength"), 1200, 100, 4000),
      enabledActions: list(formData, "enabledActions"),
      approvalRequiredActions: list(formData, "approvalRequiredActions"),
      businessHoursBehavior: text(formData, "businessHoursBehavior", "answer_with_offline_notice"),
      offlineResponseBehavior: text(formData, "offlineResponseBehavior", "answer_with_handoff_option"),
    },
    update: {
      assistantName: text(formData, "assistantName", "Assistant"),
      language: text(formData, "language", "ar"),
      dialect: text(formData, "dialect", "egyptian"),
      tone: text(formData, "tone", "professional"),
      responseLength: text(formData, "responseLength", "concise"),
      emojiPolicy: text(formData, "emojiPolicy", "allowed"),
      greeting: text(formData, "greeting") || null,
      helpMessage: text(formData, "helpMessage") || null,
      apologyStyle: text(formData, "apologyStyle") || null,
      escalationStyle: text(formData, "escalationStyle") || null,
      systemRules: text(formData, "systemRules") || null,
      prohibitedTopics: text(formData, "prohibitedTopics") || null,
      confidenceThreshold: boundedNumber(text(formData, "confidenceThreshold"), 0.7, 0, 1),
      groundingThreshold: boundedNumber(text(formData, "groundingThreshold"), 0.7, 0, 1),
      memoryLength: boundedNumber(text(formData, "memoryLength"), 10, 0, 50),
      maxResponseLength: boundedNumber(text(formData, "maxResponseLength"), 1200, 100, 4000),
      enabledActions: list(formData, "enabledActions"),
      approvalRequiredActions: list(formData, "approvalRequiredActions"),
      businessHoursBehavior: text(formData, "businessHoursBehavior", "answer_with_offline_notice"),
      offlineResponseBehavior: text(formData, "offlineResponseBehavior", "answer_with_handoff_option"),
    },
  })

  await auditLog(tenantId, user.id, "assistant.update", "AssistantConfiguration", { tenantId })
  revalidatePath("/dashboard/assistant")
  revalidatePath("/dashboard/test-lab")
}
