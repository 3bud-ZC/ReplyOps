"use server"

import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"
import { auditLog, checkTenantAccess } from "@/lib/auth-utils"
import prisma from "@/lib/prisma"
import { safeJsonFetch } from "@/lib/security/safe-http"
import { decryptSecret, encryptSecret } from "@/lib/crypto/encryption"

function readText(formData: FormData, key: string, fallback = "") {
  return String(formData.get(key) ?? fallback).trim()
}

function readJson(value: string, fallback: unknown) {
  if (!value) return fallback
  return JSON.parse(value)
}

async function requireActionAdmin(tenantId: string) {
  return checkTenantAccess(tenantId, [Role.tenant_owner, Role.tenant_admin])
}

export async function createActionDefinition(formData: FormData) {
  const tenantId = readText(formData, "tenantId")
  const { user } = await requireActionAdmin(tenantId)
  const name = readText(formData, "name")
  const url = readText(formData, "url")
  if (!name || !url) throw new Error("name_and_url_required")
  const requiredFields = readText(formData, "requiredFields").split(",").map((item) => item.trim()).filter(Boolean)
  const authHeader = readText(formData, "authHeader")
  const encryptedAuth = authHeader ? encryptSecret(JSON.stringify({ authorization: authHeader })) : null
  const allowedDomains = readText(formData, "allowedDomains")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)
  await prisma.actionDefinition.create({
    data: {
      tenantId,
      name,
      enabled: formData.get("enabled") === "on",
      requiresApproval: formData.get("requiresApproval") === "on",
      requiredFields,
      method: readText(formData, "method", "POST").toUpperCase(),
      url,
      headers: readJson(readText(formData, "headers"), {}),
      encryptedAuthPayload: encryptedAuth?.encryptedPayload,
      authIv: encryptedAuth?.iv,
      authTag: encryptedAuth?.authTag,
      allowedDomains,
      requestTemplate: readJson(readText(formData, "requestTemplate"), {}),
      responseMapping: readJson(readText(formData, "responseMapping"), {}),
      timeout: Number(readText(formData, "timeout", "5000")),
      retry: Number(readText(formData, "retry", "0")),
    },
  })
  await auditLog(tenantId, user.id, "action_definition.create", "ActionDefinition", { name })
  revalidatePath("/dashboard/actions")
}

export async function requestActionExecution(formData: FormData) {
  const actionDefinitionId = readText(formData, "actionDefinitionId")
  const definition = await prisma.actionDefinition.findUnique({ where: { id: actionDefinitionId } })
  if (!definition) throw new Error("action_not_found")
  const { user } = await checkTenantAccess(definition.tenantId, [Role.tenant_owner, Role.tenant_admin, Role.agent])
  const request = await prisma.actionRequest.create({
    data: {
      actionDefinitionId,
      status: definition.requiresApproval ? "pending" : "approved",
      executionLog: {
        input: readJson(readText(formData, "input"), {}),
        requestedBy: user.id,
      },
      approvals: definition.requiresApproval ? { create: { status: "pending" } } : undefined,
    },
  })
  await auditLog(definition.tenantId, user.id, "action_request.create", "ActionRequest", { actionRequestId: request.id })
  revalidatePath("/dashboard/actions")
}

export async function approveActionRequest(formData: FormData) {
  const actionRequestId = readText(formData, "actionRequestId")
  const request = await prisma.actionRequest.findUnique({ where: { id: actionRequestId }, include: { actionDefinition: true } })
  if (!request) throw new Error("action_request_not_found")
  const { user } = await requireActionAdmin(request.actionDefinition.tenantId)
  await prisma.actionApproval.updateMany({ where: { actionRequestId }, data: { status: "approved" } })
  await prisma.actionRequest.update({ where: { id: actionRequestId }, data: { status: "approved" } })
  await auditLog(request.actionDefinition.tenantId, user.id, "action_request.approve", "ActionRequest", { actionRequestId })
  revalidatePath("/dashboard/actions")
}

export async function rejectActionRequest(formData: FormData) {
  const actionRequestId = readText(formData, "actionRequestId")
  const request = await prisma.actionRequest.findUnique({ where: { id: actionRequestId }, include: { actionDefinition: true } })
  if (!request) throw new Error("action_request_not_found")
  const { user } = await requireActionAdmin(request.actionDefinition.tenantId)
  await prisma.actionApproval.updateMany({ where: { actionRequestId }, data: { status: "rejected" } })
  await prisma.actionRequest.update({ where: { id: actionRequestId }, data: { status: "rejected" } })
  await auditLog(request.actionDefinition.tenantId, user.id, "action_request.reject", "ActionRequest", { actionRequestId })
  revalidatePath("/dashboard/actions")
}

export async function executeActionRequest(formData: FormData) {
  const actionRequestId = readText(formData, "actionRequestId")
  const request = await prisma.actionRequest.findUnique({ where: { id: actionRequestId }, include: { actionDefinition: true } })
  if (!request) throw new Error("action_request_not_found")
  const { user } = await checkTenantAccess(request.actionDefinition.tenantId, [Role.tenant_owner, Role.tenant_admin, Role.agent])
  if (!["approved", "failed"].includes(request.status)) throw new Error("action_not_approved")
  await prisma.actionRequest.update({ where: { id: actionRequestId }, data: { status: "executing" } })
  try {
    const log = (request.executionLog ?? {}) as any
    const authHeaders =
      request.actionDefinition.encryptedAuthPayload && request.actionDefinition.authIv && request.actionDefinition.authTag
        ? JSON.parse(decryptSecret({
            encryptedPayload: request.actionDefinition.encryptedAuthPayload,
            iv: request.actionDefinition.authIv,
            authTag: request.actionDefinition.authTag,
          }))
        : {}
    const response = await safeJsonFetch(request.actionDefinition.url, {
      method: request.actionDefinition.method,
      headers: { "content-type": "application/json", ...((request.actionDefinition.headers ?? {}) as Record<string, string>), ...authHeaders },
      body: JSON.stringify(log.input ?? request.actionDefinition.requestTemplate ?? {}),
      timeoutMs: request.actionDefinition.timeout,
      allowedDomains: request.actionDefinition.allowedDomains,
    })
    await prisma.actionRequest.update({
      where: { id: actionRequestId },
      data: { status: response.ok ? "completed" : "failed", result: response, executionLog: { ...log, executedBy: user.id } },
    })
    await auditLog(request.actionDefinition.tenantId, user.id, "action_request.execute", "ActionRequest", { actionRequestId, status: response.status })
  } catch (error) {
    await prisma.actionRequest.update({
      where: { id: actionRequestId },
      data: { status: "failed", result: { error: error instanceof Error ? error.message : "execution_failed" } },
    })
    await auditLog(request.actionDefinition.tenantId, user.id, "action_request.fail", "ActionRequest", { actionRequestId })
  }
  revalidatePath("/dashboard/actions")
}
