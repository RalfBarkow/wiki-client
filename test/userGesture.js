const expect = require('expect.js')
const userGesture = require('../lib/userGesture')

describe('userGesture', function () {
  const originalWindow = global.window

  afterEach(function () {
    userGesture.resetUserGestureForTests()
    global.window = originalWindow
  })

  it('returns fallback before any user gesture', function () {
    const listeners = {}
    global.window = {
      addEventListener(type, handler) {
        listeners[type] = handler
      },
    }

    const result = userGesture.safeCanvasExtract(() => {
      throw new Error('should not extract before gesture')
    }, 'fallback')

    expect(result).to.be('fallback')
    expect(typeof listeners.pointerdown).to.be('function')
    expect(typeof listeners.keydown).to.be('function')
  })

  it('extracts after a user gesture has been seen', function () {
    global.window = {
      addEventListener() {},
    }

    userGesture.ensureUserGestureLatch()
    userGesture.markUserGesture()

    const result = userGesture.safeCanvasExtract(() => 'canvas-data', 'fallback')
    expect(result).to.be('canvas-data')
  })
})
