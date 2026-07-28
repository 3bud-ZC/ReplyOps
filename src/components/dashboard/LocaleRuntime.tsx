"use client"

import { useEffect } from "react"
import { localizedUiText, localizeExactText } from "@/lib/localized-ui"
import { localeDirection, type Locale } from "@/lib/i18n"

const ignoredNodeParents = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA"])
const localizedAttributes = ["aria-label", "placeholder", "title"]

function localizeTextNode(node: Text, locale: Locale) {
  const next = localizeExactText(node.nodeValue ?? "", locale)
  if (next !== node.nodeValue) node.nodeValue = next
}

function localizeElement(element: Element, locale: Locale) {
  if (element instanceof HTMLElement) {
    if (element.matches("[data-ltr], code, pre, textarea, input[type='password']")) {
      element.dir = "ltr"
    }
  }

  for (const attribute of localizedAttributes) {
    const value = element.getAttribute(attribute)
    if (!value) continue
    const next = localizeExactText(value, locale)
    if (next !== value) element.setAttribute(attribute, next)
  }
}

function walk(root: ParentNode, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement
      if (!parent || ignoredNodeParents.has(parent.tagName) || parent.closest("[data-no-localize]")) continue
      localizeTextNode(node as Text, locale)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      localizeElement(node as Element, locale)
    }
  }
}

export function LocaleRuntime({ locale }: { locale: Locale }) {
  useEffect(() => {
    const dir = localeDirection(locale)
    document.documentElement.lang = locale
    document.documentElement.dir = dir
    document.body.dir = dir
    document.body.dataset.locale = locale
    document.body.dataset.localizedPhraseCount = String(Object.keys(localizedUiText[locale]).length)
    walk(document.body, locale)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            const parent = node.parentElement
            if (parent && !ignoredNodeParents.has(parent.tagName) && !parent.closest("[data-no-localize]")) {
              localizeTextNode(node as Text, locale)
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            localizeElement(node as Element, locale)
            walk(node as Element, locale)
          }
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [locale])

  return null
}
