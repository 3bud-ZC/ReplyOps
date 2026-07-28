import { randomUUID } from "crypto"
import prisma from "@/lib/prisma"

type RateLimitEntry = {
  count: number;
  resetAt: number;
}

const fallbackLimits = new Map<string, RateLimitEntry>()

async function checkPersistentRateLimit(identifier: string, limit: number, windowMs: number): Promise<boolean> {
  const now = new Date()
  const resetAt = new Date(Date.now() + windowMs)
  const bucket = await prisma.rateLimitBucket.findUnique({ where: { identifier } })

  if (!bucket || bucket.resetAt < now) {
    await prisma.rateLimitBucket.upsert({
      where: { identifier },
      create: {
        id: randomUUID(),
        identifier,
        count: 1,
        resetAt,
      },
      update: {
        count: 1,
        resetAt,
      },
    })
    return true
  }

  if (bucket.count >= limit) {
    return false
  }

  await prisma.rateLimitBucket.update({
    where: { identifier },
    data: { count: { increment: 1 } },
  })
  return true
}

export async function checkRateLimit(identifier: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    return await checkPersistentRateLimit(identifier, limit, windowMs)
  } catch {
    // Keep auth available if database migrations are not deployed yet.
  }

  const now = Date.now()
  const entry = fallbackLimits.get(identifier)

  if (!entry || entry.resetAt < now) {
    fallbackLimits.set(identifier, {
      count: 1,
      resetAt: now + windowMs
    })
    return true
  }

  if (entry.count >= limit) {
    return false
  }

  entry.count += 1
  return true
}

// Cleanup interval
const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of fallbackLimits.entries()) {
    if (entry.resetAt < now) {
      fallbackLimits.delete(key)
    }
  }
}, 60000)

cleanupTimer.unref?.()
