const expect = require('expect.js')

describe('siteAdapter', function () {
  const originalWindow = global.window
  const originalLocation = global.location
  const originalDocument = global.document
  const originalLocalStorage = global.localStorage
  const originalDollar = global.$
  const originalImage = global.Image
  const localForagePath = require.resolve('localforage')
  const userGesturePath = require.resolve('../lib/userGesture')
  const originalLocalForage = require.cache[localForagePath]

  const loadSiteAdapter = function ({ ajaxImpl = function () {}, imageImpl } = {}) {
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
    global.Image =
      imageImpl ||
      class {
        set src(_value) {
          setImmediate(() => {
            if (typeof this.onload === 'function') this.onload()
          })
        }
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
        each() {},
      }
    }
    dollar.ajax = ajaxImpl
    global.$ = dollar
    return require('../lib/siteAdapter')
  }

  afterEach(function () {
    delete require.cache[require.resolve('../lib/siteAdapter')]
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
    global.Image = originalImage
  })

  it('caches a missing site-index after the first 404', function () {
    let siteIndexRequests = 0
    const siteAdapter = loadSiteAdapter({
      imageImpl: class {
        set src(value) {
          if (value === '') return
          if (value.startsWith('//fed.wiki.org/favicon.png')) {
            setImmediate(() => this.onerror && this.onerror())
            return
          }
          if (value.startsWith('/proxy/fed.wiki.org/favicon.png')) {
            setImmediate(() => this.onload && this.onload())
            return
          }
          throw new Error(`Unexpected image url: ${value}`)
        }
      },
      ajaxImpl(options) {
        if (options.url === '/proxy/fed.wiki.org/system/site-index.json') {
          siteIndexRequests += 1
          options.error({ status: 404 }, 'error', 'Not Found')
          return
        }
        throw new Error(`Unexpected ajax url: ${options.url}`)
      },
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
    const imageRequests = []
    let ajaxCalls = 0
    const siteAdapter = loadSiteAdapter({
      imageImpl: class {
        set src(value) {
          if (value === '') return
          imageRequests.push(value)
          if (value.startsWith('//example.org/favicon.png')) {
            setImmediate(() => this.onerror && this.onerror())
            return
          }
          if (value.startsWith('/proxy/example.org/favicon.png')) {
            setImmediate(() => this.onload && this.onload())
            return
          }
          throw new Error(`Unexpected image url: ${value}`)
        }
      },
      ajaxImpl() {
        ajaxCalls += 1
      },
    })

    const flag = siteAdapter.site('example.org').flag()
    expect(flag.startsWith('data:image/svg+xml,')).to.be(true)
    expect(ajaxCalls).to.be(0)
    return new Promise(resolve => {
      setImmediate(() => {
        expect(imageRequests[0].startsWith('//example.org/favicon.png?cb=')).to.be(true)
        resolve()
      })
    })
  })

  it('probes favicons with Image loads instead of ajax', function () {
    const imageRequests = []
    let ajaxCalls = 0
    const siteAdapter = loadSiteAdapter({
      imageImpl: class {
        set src(value) {
          if (value === '') return
          imageRequests.push(value)
          if (value.startsWith('//direct.example/favicon.png')) {
            setImmediate(() => this.onload && this.onload())
            return
          }
          throw new Error(`Unexpected image url: ${value}`)
        }
      },
      ajaxImpl() {
        ajaxCalls += 1
      },
    })

    siteAdapter.site('direct.example').flag()
    expect(ajaxCalls).to.be(0)
    return new Promise(resolve => {
      setImmediate(() => {
        expect(imageRequests[0].startsWith('//direct.example/favicon.png?cb=')).to.be(true)
        resolve()
      })
    })
  })
})
