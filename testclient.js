mocha.setup('bdd')

const dataStore = new WeakMap()

const wrapElements = elements => {
  const list = elements.filter(Boolean)
  const api = {
    length: list.length,
    toArray: () => list.slice(),
    get: index => list[index],
    each: fn => {
      list.forEach((el, i) => fn.call(el, i, el))
      return api
    },
    appendTo: target => {
      const targetEl =
        typeof target === 'string'
          ? document.querySelector(target)
          : target?.get
            ? target.get(0)
            : target
      if (!targetEl) return api
      list.forEach(el => targetEl.appendChild(el))
      return api
    },
    append: content => {
      list.forEach(el => {
        if (typeof content === 'string') {
          el.insertAdjacentHTML('beforeend', content)
        } else if (content?.get) {
          content.toArray().forEach(child => el.appendChild(child))
        } else if (content instanceof Node) {
          el.appendChild(content)
        }
      })
      return api
    },
    empty: () => {
      list.forEach(el => {
        el.innerHTML = ''
      })
      return api
    },
    html: value => {
      if (value === undefined) return list[0]?.innerHTML
      list.forEach(el => {
        el.innerHTML = value
      })
      return api
    },
    text: value => {
      if (value === undefined) return list[0]?.textContent ?? ''
      list.forEach(el => {
        el.textContent = value
      })
      return api
    },
    data: (key, value) => {
      if (!list[0]) return value === undefined ? undefined : api
      if (value === undefined) {
        return dataStore.get(list[0])?.[key]
      }
      list.forEach(el => {
        const existing = dataStore.get(el) || {}
        existing[key] = value
        dataStore.set(el, existing)
      })
      return api
    },
    addClass: className => {
      list.forEach(el => el.classList.add(className))
      return api
    },
    removeClass: className => {
      list.forEach(el => el.classList.remove(className))
      return api
    },
    hasClass: className => list[0]?.classList.contains(className) ?? false,
    attr: (name, value) => {
      if (value === undefined) return list[0]?.getAttribute(name)
      list.forEach(el => el.setAttribute(name, value))
      return api
    },
    find: selector => {
      const found = []
      list.forEach(el => found.push(...el.querySelectorAll(selector)))
      return wrapElements(found)
    },
    parents: selector => {
      const found = []
      list.forEach(el => {
        let current = el.parentElement
        while (current) {
          if (!selector || current.matches(selector)) found.push(current)
          current = current.parentElement
        }
      })
      return wrapElements(found)
    },
    index: target => {
      const el = target?.get ? target.get(0) : target || list[0]
      if (!el || !el.parentElement) return -1
      return Array.from(el.parentElement.children).indexOf(el)
    },
    slice: (start, end) => wrapElements(list.slice(start, end)),
  }
  return api
}

const createElementFromHtml = html => {
  const template = document.createElement('template')
  template.innerHTML = html.trim()
  return wrapElements(Array.from(template.content.childNodes))
}

const $ = selector => {
  if (typeof selector === 'function') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', selector, { once: true })
    } else {
      selector()
    }
    return undefined
  }

  if (typeof selector === 'string') {
    if (selector.trim().startsWith('<')) {
      return createElementFromHtml(selector)
    }
    return wrapElements(Array.from(document.querySelectorAll(selector)))
  }

  if (selector instanceof Node) {
    return wrapElements([selector])
  }

  if (Array.isArray(selector)) {
    return wrapElements(selector)
  }

  return wrapElements([])
}

const ajaxNotStubbed = () => {
  throw new Error('$.ajax called without a stub. Tests must stub jQuery.ajax.')
}

globalThis.jQuery = {
  ajax: ajaxNotStubbed,
}

Object.defineProperty($, 'ajax', {
  get: () => globalThis.jQuery.ajax,
  set: fn => {
    globalThis.jQuery.ajax = fn
  },
})

$.get = (url, success) => $.ajax({ type: 'GET', url, success })

window.$ = $

window.wiki = require('./lib/wiki')
require('./lib/plugins')

require('./test/util')
require('./test/active')
require('./test/pageHandler')
require('./test/page')
require('./test/refresh')
require('./test/plugin')
require('./test/revision')
require('./test/neighborhood')
require('./test/search')
require('./test/drop')
require('./test/lineup')
require('./test/target')
require('./test/wiki')
require('./test/random')

$(function () {
  const hr = document.createElement('hr')
  const heading = document.createElement('h2')
  heading.textContent = 'Testing artifacts:'
  document.body.appendChild(hr)
  document.body.appendChild(heading)
  mocha.run()
})
