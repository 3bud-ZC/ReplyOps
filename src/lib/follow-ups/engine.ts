export type FollowupRuleSnapshot = {
  enabled: boolean
  consentRequired: boolean
  quietHoursStart: string
  quietHoursEnd: string
  timezone: string
  minimumDelay: number
  maximumAttempts: number
  channelLimits?: {
    customerDailyCap?: number
    tenantDailyCap?: number
  } | null
}

export type FollowupScheduleContext = {
  customerConsented: boolean
  customerOptedOut: boolean
  activeHandoff: boolean
  conversationResolved: boolean
  tenantDisabled: boolean
  customerRepliedAfterSchedule: boolean
  currentCustomerSends: number
  currentTenantSends: number
  duplicatePendingJob: boolean
  now: Date
}

export function isStopMessage(content: string) {
  return /^(stop|unsubscribe|cancel|الغاء|إلغاء)$/i.test(content.trim())
}

function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number)
  return hours * 60 + mins
}

export function isInsideQuietHours(now: Date, quietHoursStart: string, quietHoursEnd: string) {
  const current = now.getUTCHours() * 60 + now.getUTCMinutes()
  const start = minutes(quietHoursStart)
  const end = minutes(quietHoursEnd)
  if (start === end) return false
  if (start < end) return current >= start && current < end
  return current >= start || current < end
}

export function evaluateFollowupSchedule(rule: FollowupRuleSnapshot, context: FollowupScheduleContext) {
  if (!rule.enabled) return { allowed: false, reason: "followup_rule_disabled" }
  if (context.tenantDisabled) return { allowed: false, reason: "tenant_disabled" }
  if (rule.consentRequired && !context.customerConsented) return { allowed: false, reason: "customer_consent_required" }
  if (context.customerOptedOut) return { allowed: false, reason: "customer_opted_out" }
  if (context.activeHandoff) return { allowed: false, reason: "handoff_open" }
  if (context.conversationResolved) return { allowed: false, reason: "conversation_resolved" }
  if (context.customerRepliedAfterSchedule) return { allowed: false, reason: "customer_replied_after_schedule" }
  if (context.duplicatePendingJob) return { allowed: false, reason: "duplicate_followup_prevented" }
  if (isInsideQuietHours(context.now, rule.quietHoursStart, rule.quietHoursEnd)) return { allowed: false, reason: "quiet_hours_deferral" }
  if (context.currentCustomerSends >= (rule.channelLimits?.customerDailyCap ?? Number.POSITIVE_INFINITY)) return { allowed: false, reason: "customer_limit_exceeded" }
  if (context.currentTenantSends >= (rule.channelLimits?.tenantDailyCap ?? Number.POSITIVE_INFINITY)) return { allowed: false, reason: "tenant_limit_exceeded" }
  return { allowed: true, reason: "allowed", scheduledFor: new Date(context.now.getTime() + rule.minimumDelay * 1000) }
}

export function nextFollowupRetry(attempts: number, baseDelaySeconds = 60) {
  return baseDelaySeconds * 2 ** Math.max(0, attempts)
}

export function canClaimFollowupJob(job: { status: string; lockedAt?: Date | null }, now: Date, lockTtlMs = 5 * 60 * 1000) {
  if (job.status !== "pending" && job.status !== "retry") return false
  if (!job.lockedAt) return true
  return now.getTime() - job.lockedAt.getTime() > lockTtlMs
}
