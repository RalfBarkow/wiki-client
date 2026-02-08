const hasJquery = () => typeof globalThis.$ === 'function'

const jq = input => {
  if (!hasJquery()) return null
  return globalThis.$(input)
}

const ready = fn => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true })
  } else {
    fn()
  }
}

const qs = (selector, root = document) => root.querySelector(selector)
const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector))

const isInput = el =>
  !!el && (el.matches?.('input,select,textarea,button') || el.closest?.('input,select,textarea,button'))

const on = (el, events, handler, opts) => {
  if (!el) return
  events.split(' ').forEach(event => el.addEventListener(event, handler, opts))
}

const onDelegate = (el, events, selector, handler) => {
  if (!el) return
  events.split(' ').forEach(event => {
    el.addEventListener(event, e => {
      const target = e.target?.closest?.(selector)
      if (target && el.contains(target)) {
        handler.call(target, e)
      }
    })
  })
}

const onJq = (el, events, handler) => {
  const $el = jq(el)
  if ($el) {
    $el.on(events, handler)
  }
}

const onAjaxError = handler => {
  const $doc = jq(document)
  if ($doc?.ajaxError) {
    $doc.ajaxError(handler)
  }
}

const sortable = (el, options) => {
  const $el = jq(el)
  if ($el?.sortable) {
    $el.sortable(options)
  }
}

const addClass = (el, className) => el?.classList?.add(className)
const removeClass = (el, className) => el?.classList?.remove(className)
const toggleClass = (el, className) => el?.classList?.toggle(className)
const hasClass = (el, className) => !!el?.classList?.contains(className)

const toggleDisplay = el => {
  if (!el) return
  const current = window.getComputedStyle(el).display
  el.style.display = current === 'none' ? '' : 'none'
}

const closest = (el, selector) => el?.closest?.(selector) || null

const trigger = (el, name, detail) => {
  if (!el) return
  const $el = jq(el)
  if ($el?.trigger) {
    $el.trigger(name, detail)
    return
  }
  const event = new CustomEvent(name, { detail, bubbles: true })
  el.dispatchEvent(event)
}

const attr = (el, name, value) => {
  if (!el) return undefined
  if (value === undefined) return el.getAttribute(name)
  el.setAttribute(name, value)
  return value
}

const text = (el, value) => {
  if (!el) return ''
  if (value === undefined) return el.textContent ?? ''
  el.textContent = value
  return value
}

const html = (el, value) => {
  if (!el) return ''
  if (value === undefined) return el.innerHTML
  el.innerHTML = value
  return value
}

const val = (el, value) => {
  if (!el) return undefined
  if (value === undefined) return el.value
  el.value = value
  return value
}

const css = (el, styles) => {
  if (!el) return
  Object.entries(styles).forEach(([key, value]) => {
    el.style[key] = value
  })
}

const append = (el, content) => {
  if (!el) return
  if (typeof content === 'string') {
    el.insertAdjacentHTML('beforeend', content)
  } else if (content instanceof Node) {
    el.appendChild(content)
  }
}

const appendTo = (el, parent) => {
  if (!el || !parent) return
  parent.appendChild(el)
}

const remove = el => {
  if (el?.remove) el.remove()
}

const nextAll = el => {
  const nodes = []
  let current = el?.nextElementSibling
  while (current) {
    nodes.push(current)
    current = current.nextElementSibling
  }
  return nodes
}

const parents = (el, selector) => {
  const nodes = []
  let current = el?.parentElement
  while (current) {
    if (!selector || current.matches(selector)) {
      nodes.push(current)
    }
    current = current.parentElement
  }
  return nodes
}

const find = (el, selector) => (el ? Array.from(el.querySelectorAll(selector)) : [])

const normalizeDataKey = key => key.replace(/-([a-z])/g, (_, char) => char.toUpperCase())

const data = (el, key, value) => {
  if (!el || !key) return undefined
  const $el = jq(el)
  if ($el?.data) {
    if (value === undefined) return $el.data(key)
    $el.data(key, value)
    return value
  }
  const dataKey = normalizeDataKey(key)
  if (value === undefined) return el.dataset?.[dataKey]
  if (el.dataset) {
    el.dataset[dataKey] = value
  }
  return value
}

module.exports = {
  hasJquery,
  jq,
  ready,
  qs,
  qsa,
  isInput,
  on,
  onDelegate,
  onJq,
  onAjaxError,
  sortable,
  addClass,
  removeClass,
  toggleClass,
  toggleDisplay,
  hasClass,
  closest,
  trigger,
  attr,
  text,
  html,
  val,
  css,
  append,
  appendTo,
  remove,
  nextAll,
  parents,
  find,
  data,
}
