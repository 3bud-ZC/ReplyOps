"use server"

import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"
import { auditLog, checkTenantAccess } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"

function readText(formData: FormData, key: string, fallback = "") {
  return String(formData.get(key) ?? fallback).trim()
}

async function requireFollowupAdmin(tenantId: string) {
  return checkTenantAccess(tenantId, [Role.tenant_owner, Role.tenant_admin])
}

export async function createFollowupRule(formData: FormData) {
  const tenantId = readText(formData, "tenantId")
  const { user } = await requireFollowupAdmin(tenantId)
  const rule = await prisma.followupRule.create({
    data: {
      tenantId,
      enabled: formData.get("enabled") === "on",
      consentRequired: formData.get("consentRequired") !== "off",
      quietHoursStart: readText(formData, "quietHoursStart", "22:00"),
      quietHoursEnd: readText(formData, "quietHoursEnd", "08:00"),
      timezone: readText(formData, "timezone", "Africa/Cairo"),
      minimumDelay: Number(readText(formData, "minimumDelay", "3600")),
      maximumAttempts: Number(readText(formData, "maximumAttempts", "3")),
      channelLimits: {
        customerDailyCap: Number(readText(formData, "customerDailyCap", "1")),
        tenantDailyCap: Number(readText(formData, "tenantDailyCap", "50")),
      },
      optOutLogic: "stop when customer replies with stop, unsubscribe, الغاء, or إلغاء",
      messageTemplates: { default: readText(formData, "template", "Can we help with anything else?") },
    },
  })
  await auditLog(tenantId, user.id, "followup_rule.create", "FollowupRule", { followupRuleId: rule.id })
  revalidatePath("/dashboard/follow-ups")
}

export async function scheduleFollowupJob(formData: FormData) {
  const followupRuleId = readText(formData, "followupRuleId")
  const conversationId = readText(formData, "conversationId")
  const rule = await prisma.followupRule.findUnique({ where: { id: followupRuleId } })
  if (!rule) throw new Error("followup_rule_not_found")
  const { user } = await checkTenantAccess(rule.tenantId, [Role.tenant_owner, Role.tenant_admin, Role.agent])
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId: rule.tenantId },
    include: { customer: true, messages: { orderBy: { createdAt: "desc" }, take: 1 }, handoffs: { where: { status: { in: ["open", "claimed"] } }, take: 1 } },
  })
  if (!conversation) throw new Error("conversation_not_found")
  if (rule.consentRequired && !conversation.customer.marketingConsent) throw new Error("customer_consent_required")
  if (conversation.customer.optedOutAt) throw new Error("customer_opted_out")
  if (conversation.handoffs.length > 0) throw new Error("handoff_open")
  const scheduledFor = new Date(Date.now() + rule.minimumDelay * 1000)
  await prisma.followupJob.create({
    data: {
      followupRuleId,
      conversationId,
      customerId: conversation.customerId,
      scheduledFor,
      payload: { stopOnReplyAfter: conversation.messages[0]?.createdAt ?? new Date(), requestedBy: user.id },
    },
  })
  await auditLog(rule.tenantId, user.id, "followup_job.schedule", "FollowupJob", { followupRuleId, conversationId })
  revalidatePath("/dashboard/follow-ups")
}

export async function cancelFollowupJob(formData: FormData) {
  const followupJobId = readText(formData, "followupJobId")
  const job = await prisma.followupJob.findUnique({ where: { id: followupJobId }, include: { followupRule: true } })
  if (!job) throw new Error("followup_job_not_found")
  const { user } = await requireFollowupAdmin(job.followupRule.tenantId)
  await prisma.followupJob.update({ where: { id: followupJobId }, data: { status: "cancelled" } })
  await auditLog(job.followupRule.tenantId, user.id, "followup_job.cancel", "FollowupJob", { followupJobId })
  revalidatePath("/dashboard/follow-ups")
}

export async function setCustomerConsent(formData: FormData) {
  const customerId = readText(formData, "customerId")
  const consent = readText(formData, "consent") === "true"
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer) throw new Error("customer_not_found")
  const { user } = await requireFollowupAdmin(customer.tenantId)
  await prisma.customer.update({
    where: { id: customerId },
    data: { marketingConsent: consent, optedOutAt: consent ? null : new Date() },
  })
  await auditLog(customer.tenantId, user.id, consent ? "customer.consent" : "customer.opt_out", "Customer", { customerId })
  revalidatePath("/dashboard/follow-ups")
}
