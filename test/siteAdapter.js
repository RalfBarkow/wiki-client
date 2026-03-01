const expect = require('expect.js')

describe('siteAdapter', function () {
  const originalWindow = global.window
  const originalLocation = global.location
  const originalDocument = global.document
  const originalLocalStorage = global.localStorage
  const originalDollar = global.$
  const localForagePath = require.resolve('localforage')
  const userGesturePath = require.resolve('../lib/userGesture')
  const originalLocalForage = require.cache[localForagePath]

  const loadSiteAdapter = function (ajaxImpl) {
    delete require.cache[require.resolve('../lib/siteAdapter')]
    delete require.cache[userGesturePath]
    require.cache[localForagePath] = {
      exports: {
        createInstance() {
          return {
            getItem() {
              return Promise.resolve(null)
            },
            setItem(_key, value) {
              return Promise.resolve(value)
            },
            removeItem() {
              return Promise.resolve()
            },
            iterate() {
              return Promise.resolve()
            },
          }
        },
      },
    }
    global.window = {
      location: { host: 'wiki.ralfbarkow.ch', protocol: 'https:' },
      addEventListener() {},
    }
    global.location = global.window.location
    global.document = {
      createElement() {
        return {
          getContext() {
            return {
              createRadialGradient() {
                return { addColorStop() {} }
              },
              fillRect() {},
              set fillStyle(_value) {},
            }
          },
          toDataURL() {
            return 'data:'
          },
        }
      },
    }
    global.localStorage = {
      getItem() {
        return null
      },
      setItem() {},
      removeItem() {},
    }
    const dollar = function () {
      return {
        attr() {},
        find() {
          return {
            removeClass() {
              return { addClass() {} }
            },
          }
        },
        trigger() {},
      }
    }
    dollar.ajax = ajaxImpl
    global.$ = dollar
    return require('../lib/siteAdapter')
  }

  afterEach(function () {
    delete require.cache[require.resolve('../lib/siteAdapter')]
    delete require.cache[userGesturePath]
    delete require.cache[userGesturePath]
    if (originalLocalForage) {
      require.cache[localForagePath] = originalLocalForage
    } else {
      delete require.cache[localForagePath]
    }
    global.window = originalWindow
    global.location = originalLocation
    global.document = originalDocument
    global.localStorage = originalLocalStorage
    global.$ = originalDollar
  })

  it('caches a missing site-index after the first 404', function () {
    let siteIndexRequests = 0
    const siteAdapter = loadSiteAdapter(function (options) {
      if (options.url === '//fed.wiki.org/favicon.png') {
        options.error({ status: 0 }, 'error', 'blocked')
        return
      }
      if (options.url === '/proxy/fed.wiki.org/favicon.png') {
        options.success()
        return
      }
      if (options.url === '/proxy/fed.wiki.org/system/site-index.json') {
        siteIndexRequests += 1
        options.error({ status: 404 }, 'error', 'Not Found')
        return
      }
      throw new Error(`Unexpected ajax url: ${options.url}`)
    })

    const remote = siteAdapter.site('fed.wiki.org')

    return new Promise((resolve, reject) => {
      remote.getIndex('system/site-index.json', function (firstErr) {
        try {
          expect(firstErr.xhr.status).to.be(404)
          expect(siteIndexRequests).to.be(1)
        } catch (error) {
          reject(error)
          return
        }

        remote.getIndex('system/site-index.json', function (secondErr) {
          try {
            expect(secondErr.xhr.status).to.be(404)
            expect(secondErr.cached).to.be(true)
            expect(siteIndexRequests).to.be(1)
            resolve()
          } catch (error) {
            reject(error)
          }
        })
      })
    })
  })
  it('uses svg fallback for temp flags before any user gesture', function () {
    const siteAdapter = loadSiteAdapter(function (options) {
      if (options.url === '//example.org/favicon.png') {
        options.error({ status: 0 }, 'error', 'blocked')
        return
      }
      if (options.url === '/proxy/example.org/favicon.png') {
        options.success()
        return
      }
      throw new Error(`Unexpected ajax url: ${options.url}`)
    })

    const flag = siteAdapter.site('example.org').flag()
    expect(flag.startsWith('data:image/svg+xml,')).to.be(true)
  })

})
