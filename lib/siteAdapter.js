// The siteAdapter handles fetching resources from sites, including origin
// and local browser storage.

let siteAdapter
const queue = require('async/queue')
const localForage = require('localforage')

module.exports = siteAdapter = {}

// we save the site prefix once we have determined it,
const sitePrefix = {}
// and if the CORS request requires credentials...
const credentialsNeeded = {}

// when asked for a site's flag, if we don't know the current prefix we create
// a temporary greyscale flag. We save them here, so we can replace them when
// we know how to get a site's flag
const tempFlags = {}

// cache 404s for site-index and similar index-like text fetches
// key: `${site}::${route}`
const missingIndex = {}

// some settings
const fetchTimeoutMS = 3000
const findQueueWorkers = 8

console.log('siteAdapter: loading data')
const routeStore = localForage.createInstance({ name: 'routes' })
routeStore
  .iterate(function (value, key) {
    sitePrefix[key] = value
  })
  .then(() => console.log('siteAdapter: data loaded'))
  .catch(err => console.log('siteAdapter: error loading data ', err))

const withCredsStore = localForage.createInstance({ name: 'withCredentials' })
withCredsStore
  .iterate(function (value, key) {
    credentialsNeeded[key] = value
  })
  .then(() => console.log('siteAdapter: withCredentials data loaded'))
  .catch(err => console.log('siteAdapter: error loading withCredentials data ', err))

// Probe a png by loading it as an Image (this matches the historical behavior
// and avoids CORS/XHR differences). Used for favicon probing.
const testImageURL = function (url, good, bad) {
  const img = new Image()
  let finished = false

  const timer = setTimeout(function () {
    if (finished) return
    finished = true
    try {
      img.src = ''
    } catch (_) {}
    bad(new Error(`timeout after ${fetchTimeoutMS}ms`))
  }, fetchTimeoutMS)

  img.onload = function () {
    if (finished) return
    finished = true
    clearTimeout(timer)
    good()
  }

  img.onerror = function () {
    if (finished) return
    finished = true
    clearTimeout(timer)
    bad(new Error('image load error'))
  }

  img.src = url
}

// Deterministic-ish SVG temp flag (no canvas readback; satisfies tests and avoids
// Firefox “Blocked ... extracting canvas data ...” warnings).
const createTempFlagSVG = () => {
  const a = Math.floor(Math.random() * 256)
  const b = Math.floor(Math.random() * 256)
  const c1 = `rgb(${a},${a},${a})`
  const c2 = `rgb(${b},${b},${b})`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">` +
    `<defs><radialGradient id="g" cx="25%" cy="25%" r="90%">` +
    `<stop offset="0%" stop-color="${c1}"/>` +
    `<stop offset="100%" stop-color="${c2}"/>` +
    `</radialGradient></defs>` +
    `<rect width="32" height="32" fill="url(#g)"/>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const findAdapterQ = queue(function (task, done) {
  let testURL
  const { site } = task
  if (sitePrefix[site] != null) return done(sitePrefix[site])
  const probeURL = url => `${url}?cb=${Date.now()}`

  // First attempt: protocol-relative for normal hosts, hard http for localhost-ish.
  if (site.split('.').at(-1).split(':')[0] === 'localhost') {
    testURL = `http://${site}/favicon.png`
  } else {
    testURL = `//${site}/favicon.png`
  }

  return testImageURL(
    probeURL(testURL),
    function () {
      sitePrefix[site] = testURL.slice(0, -12)
      done(testURL.slice(0, -12))
    },
    function () {
      const protocol =
        (typeof location !== 'undefined' && location && location.protocol) ||
        (typeof window !== 'undefined' && window.location && window.location.protocol) ||
        ''
      switch (protocol) {
        case 'http:':
          // Key change requested:
          // When running on http origins, browsers may still enforce HTTPS-Only mode
          // and upgrade http://... requests, breaking HTTP-only sites.
          // Try the same-origin proxy first; it can fall back to http server-side.
          testURL = `/proxy/${site}/favicon.png`
          testImageURL(
            probeURL(testURL),
            () => {
              sitePrefix[site] = `/proxy/${site}`
              done(`/proxy/${site}`)
            },
            () => {
              // historical behavior: try explicit https next
              testURL = `https://${site}/favicon.png`
              testImageURL(
                probeURL(testURL),
                () => {
                  sitePrefix[site] = `https://${site}`
                  done(`https://${site}`)
                },
                () => {
                  sitePrefix[site] = ''
                  done('')
                },
              )
            },
          )
          break

        case 'https:':
          testURL = `/proxy/${site}/favicon.png`
          testImageURL(
            probeURL(testURL),
            () => {
              sitePrefix[site] = `/proxy/${site}`
              done(`/proxy/${site}`)
            },
            () => {
              sitePrefix[site] = ''
              done('')
            },
          )
          break

        default:
          sitePrefix[site] = ''
          done('')
      }
    },
  )
}, findQueueWorkers)

const findAdapter = (site, done) =>
  routeStore
    .getItem(site)
    .then(function (value) {
      if (!value) {
        findAdapterQ.push({ site }, function (prefix) {
          sitePrefix[site] = prefix
          routeStore
            .setItem(site, prefix)
            .then(() => done(prefix))
            .catch(function (err) {
              console.log('findAdapter setItem error: ', site, err)
              done(prefix)
            })
        })
      } else {
        sitePrefix[site] = value
        done(value)
      }
    })
    .catch(function (err) {
      console.log('findAdapter error: ', site, err)
      sitePrefix[site] = ''
      done('')
    })

siteAdapter.local = {
  flag() {
    return '/favicon.png'
  },
  getURL(route) {
    return `/${route}`
  },
  getDirectURL(route) {
    return `/${route}`
  },
  get(route, callback) {
    let page
    const done = function (err, value) {
      if (callback) callback(err, value)
    }

    if ((page = localStorage.getItem(route.replace(/\.json$/, '')))) {
      const parsedPage = JSON.parse(page)
      done(null, parsedPage)
      if (!callback) Promise.resolve(parsedPage)
    } else {
      const errMsg = { msg: `no page named '${route}' in browser local storage` }
      done(errMsg, null)
      if (!callback) Promise.reject(errMsg)
    }
  },
  put(route, data, done) {
    localStorage.setItem(route, JSON.stringify(data))
    done()
  },
  delete(route) {
    localStorage.removeItem(route)
  },
}

siteAdapter.origin = {
  flag() {
    return '/favicon.png'
  },
  getURL(route) {
    return `/${route}`
  },
  getDirectURL(route) {
    return `/${route}`
  },
  get(route, callback) {
    const done = function (err, value) {
      if (callback) callback(err, value)
    }
    return $.ajax({
      type: 'GET',
      dataType: 'json',
      url: `/${route}`,
      success(page, code, xhr) {
        if (route === 'system/sitemap.json') {
          done(null, { data: page, lastModified: Date.parse(xhr.getResponseHeader('Last-Modified')) })
        } else {
          done(null, page)
        }
        if (!callback) return Promise.resolve(page)
      },
      error(xhr, type, msg) {
        done({ msg, xhr }, null)
      },
    })
  },
  getIndex(route, callback) {
    const done = function (err, value) {
      if (callback) callback(err, value)
    }

    const key = `origin::${route}`
    if (missingIndex[key]) {
      done({ xhr: { status: 404 }, cached: true }, null)
      return
    }

    return $.ajax({
      type: 'GET',
      dataType: 'text',
      url: `/${route}`,
      success(page) {
        done(null, page)
      },
      error(xhr, type, msg) {
        if (xhr && xhr.status === 404) {
          missingIndex[key] = true
          done({ xhr, type, msg }, null)
        } else {
          done({ msg, xhr }, null)
        }
      },
    })
  },
  put(route, data, done) {
    $.ajax({
      type: 'PUT',
      url: `/page/${route}/action`,
      data: { action: JSON.stringify(data) },
      success() {
        done(null)
      },
      error(xhr, type, msg) {
        done({ xhr, type, msg })
      },
    })
  },
  delete(route, done) {
    $.ajax({
      type: 'DELETE',
      url: `/${route}`,
      success() {
        done(null)
      },
      error(xhr, type, msg) {
        done({ xhr, type, msg })
      },
    })
  },
}

siteAdapter.recycler = {
  flag() {
    return '/recycler/favicon.png'
  },
  getURL(route) {
    return `/recycler/${route}`
  },
  getDirectURL(route) {
    return `/recycler/${route}`
  },
  get(route, callback) {
    const done = function (err, value) {
      if (callback) callback(err, value)
    }
    return $.ajax({
      type: 'GET',
      dataType: 'json',
      url: `/recycler/${route}`,
      success(page) {
        done(null, page)
      },
      error(xhr, type, msg) {
        done({ msg, xhr }, null)
      },
    })
  },
  delete(route, done) {
    $.ajax({
      type: 'DELETE',
      url: `/recycler/${route}`,
      success() {
        done(null)
      },
      error(xhr, type, msg) {
        done({ xhr, type, msg })
      },
    })
  },
}

siteAdapter.site = function (site) {
  if (!site || site === window.location.host) return siteAdapter.origin
  if (site === 'recycler') return siteAdapter.recycler

  return {
    flag() {
      if (sitePrefix[site] != null) {
        if (sitePrefix[site] === '') {
          if (tempFlags[site]) return tempFlags[site]
          return (tempFlags[site] = createTempFlagSVG())
        }
        return sitePrefix[site] + '/favicon.png'
      }

      if (tempFlags[site]) return tempFlags[site]

      findAdapter(site, function (prefix) {
        if (prefix === '') {
          console.log(`Prefix for ${site} is undetermined...`)
        } else {
          console.log(`Prefix for ${site} is ${prefix}`)
          const tempFlag = tempFlags[site]
          const realFlag = sitePrefix[site] + '/favicon.png'
          $('img[src="' + tempFlag + '"]').attr('src', realFlag)
          $('a[target="' + site + '"]').attr('style', 'background-image: url(' + realFlag + ')')
          tempFlags[site] = null
        }
      })

      const tempFlag = createTempFlagSVG()
      tempFlags[site] = tempFlag
      return tempFlag
    },

    getURL(route) {
      if (sitePrefix[site] != null) {
        if (sitePrefix[site] === '') {
          console.log(`${site} is unreachable, can't link to ${route}`)
          return ''
        }
        return `${sitePrefix[site]}/${route}`
      }

      findAdapter(site, function (prefix) {
        if (prefix === '') {
          console.log(`${site} is unreachable`)
        } else {
          console.log(`Prefix for ${site} is ${prefix}, about to fixup links`)
          $('a[target="' + site + '"]').each(function () {
            let thisPrefix
            if (/proxy/.test(prefix)) {
              const thisSite = prefix.substring(7)
              thisPrefix = `http://${thisSite}`
            } else {
              thisPrefix = prefix
            }
            $(this).attr('href', `${thisPrefix}/${$(this).data('slug')}.html`)
          })
        }
      })
      return ''
    },

    getDirectURL(route) {
      let thisPrefix, thisSite
      if (sitePrefix[site] != null) {
        if (sitePrefix[site] === '') {
          console.log(`${site} is unreachable, can't link to ${route}`)
          return ''
        }
        if (/proxy/.test(sitePrefix[site])) {
          thisSite = sitePrefix[site].substring(7)
          thisPrefix = `http://${thisSite}`
        } else {
          thisPrefix = sitePrefix[site]
        }
        return `${thisPrefix}/${route}`
      }

      findAdapter(site, function (prefix) {
        if (prefix === '') {
          console.log(`${site} is unreachable`)
        } else {
          console.log(`Prefix for ${site} is ${prefix}, about to fixup links`)
          $('a[target="' + site + '"]').each(function () {
            if (/proxy/.test(prefix)) {
              thisSite = prefix.substring(7)
              thisPrefix = `http://${thisSite}`
            } else {
              thisPrefix = prefix
            }
            $(this).attr('href', `${thisPrefix}/${$(this).data('slug')}.html`)
          })
        }
      })
      return ''
    },

    get(route, callback) {
      let errMsg
      const done = function (err, value) {
        if (callback) callback(err, value)
      }

      const getContent = function (route, done) {
        const url = `${sitePrefix[site]}/${route}`
        const useCredentials = credentialsNeeded[site] || false

        return $.ajax({
          type: 'GET',
          dataType: 'json',
          url,
          xhrFields: { withCredentials: useCredentials },
          success(data, code, xhr) {
            if (
              ((route === 'system/sitemap.json' && Array.isArray(data) && data[0] === 'Login Required') ||
                data.title === 'Login Required') &&
              !url.includes('login-required') &&
              credentialsNeeded[site] !== true
            ) {
              credentialsNeeded[site] = true
              getContent(route, function (err, page) {
                if (!err) {
                  withCredsStore.setItem(site, true)
                  done(err, page)
                } else {
                  credentialsNeeded[site] = false
                  done(err, page)
                }
              })
            } else {
              if (route === 'system/sitemap.json') {
                done(null, { data, lastModified: Date.parse(xhr.getResponseHeader('Last-Modified')) })
              } else {
                done(null, data)
              }
              if (!callback) return Promise.resolve(data)
            }
          },
          error(xhr, type, msg) {
            if (xhr && xhr.status === 404) {
              done(404, null)
              if (!callback) return Promise.reject(errMsg)
            } else {
              errMsg = { msg, xhr }
              done(errMsg, null)
              if (!callback) return Promise.reject(errMsg)
            }
          },
        })
      }

      if (sitePrefix[site] != null) {
        if (sitePrefix[site] === '') {
          console.log(`${site} is unreachable, can't get ${route}`)
          done({ msg: `${site} is unreachable` }, null)
          if (!callback) return Promise.reject(errMsg)
        }
        return getContent(route, done)
      }

      findAdapter(site, function (prefix) {
        if (prefix === '') {
          done({ msg: `${site} is unreachable` }, null)
          if (!callback) return Promise.reject(errMsg)
        } else {
          getContent(route, done)
        }
      })
    },

    getIndex(route, callback) {
      const done = function (err, value) {
        if (callback) callback(err, value)
      }

      const key = `${site}::${route}`
      if (missingIndex[key]) {
        done({ xhr: { status: 404 }, cached: true }, null)
        return
      }

      const getContent = function (route, done) {
        const url = `${sitePrefix[site]}/${route}`
        const useCredentials = credentialsNeeded[site] || false

        return $.ajax({
          type: 'GET',
          dataType: 'text',
          url,
          xhrFields: { withCredentials: useCredentials },
          success(data) {
            done(null, data)
          },
          error(xhr, type, msg) {
            if (xhr && xhr.status === 404) {
              missingIndex[key] = true
              done({ xhr, type, msg }, null)
            } else {
              done({ msg, xhr }, null)
            }
          },
        })
      }

      if (sitePrefix[site] != null) {
        if (sitePrefix[site] === '') {
          console.log(`${site} is unreachable, can't get ${route}`)
          done({ msg: `${site} is unreachable` }, null)
        } else {
          getContent(route, done)
        }
        return
      }

      findAdapter(site, function (prefix) {
        if (prefix === '') {
          done({ msg: `${site} is unreachable` }, null)
        } else {
          getContent(route, done)
        }
      })
    },

    put(route, data, done) {
      if (sitePrefix[site] != null) {
        if (sitePrefix[site] === '') {
          console.log(`${site} is unreachable, can't put ${route}`)
          done({ msg: `${site} is unreachable` }, null)
          return
        }
        const url = `${sitePrefix[site]}/page/${route}/action`
        const useCredentials = credentialsNeeded[site] || false
        $.ajax({
          type: 'PUT',
          url,
          xhrFields: { withCredentials: useCredentials },
          data: { action: JSON.stringify(data) },
          success() {
            done(null)
          },
          error(xhr, type, msg) {
            done({ xhr, type, msg })
          },
        })
        return
      }

      findAdapter(site, function (prefix) {
        if (prefix === '') {
          done({ msg: `${site} is unreachable` }, null)
        } else {
          const url = `${sitePrefix[site]}/page/${route}/action`
          const useCredentials = credentialsNeeded[site] || false
          $.ajax({
            type: 'PUT',
            url,
            xhrFields: { withCredentials: useCredentials },
            data: { action: JSON.stringify(data) },
            success() {
              done(null)
            },
            error(xhr, type, msg) {
              done({ xhr, type, msg })
            },
          })
        }
      })
    },

    delete(route, done) {
      if (sitePrefix[site] != null) {
        if (sitePrefix[site] === '') {
          console.log(`${site} is unreachable, can't delete ${route}`)
          done({ msg: `${site} is unreachable` }, null)
          return
        }
        const url = `${sitePrefix[site]}/${route}`
        const useCredentials = credentialsNeeded[site] || false
        $.ajax({
          type: 'DELETE',
          url,
          xhrFields: { withCredentials: useCredentials },
          success() {
            done(null)
          },
          error(xhr, type, msg) {
            done({ xhr, type, msg })
          },
        })
        return
      }

      findAdapter(site, function (prefix) {
        if (prefix === '') {
          done({ msg: `${site} is unreachable` }, null)
        } else {
          const url = `${sitePrefix[site]}/${route}`
          const useCredentials = credentialsNeeded[site] || false
          $.ajax({
            type: 'DELETE',
            url,
            xhrFields: { withCredentials: useCredentials },
            success() {
              done(null)
            },
            error(xhr, type, msg) {
              done({ xhr, type, msg })
            },
          })
        }
      })
    },

    refresh(done) {
      sitePrefix[site] = null
      routeStore
        .removeItem(site)
        .then(() => {
          findAdapterQ.push({ site }, prefix => {
            routeStore
              .setItem(site, prefix)
              .then(() => {
                if (prefix === '') {
                  console.log(`Refreshed prefix for ${site} is undetermined...`)
                } else {
                  console.log(`Refreshed prefix for ${site} is ${prefix}`)
                  const tempFlag = tempFlags[site]
                  const realFlag = sitePrefix[site] + '/favicon.png'
                  $('img[src="' + tempFlag + '"]').attr('src', realFlag)
                  $('a[target="' + site + '"]').attr('style', 'background-image: url(' + realFlag + ')')
                }
                done()
              })
              .catch(err => {
                console.log('findAdapter setItem error: ', site, err)
                sitePrefix[site] = ''
                done()
              })
          })
        })
        .catch(err => {
          console.log('refresh error ', site, err)
          done()
        })
    },
  }
}
