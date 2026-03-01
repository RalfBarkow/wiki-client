let userGestureSeen = false
let userGestureLatchInstalled = false

const markUserGesture = () => {
  userGestureSeen = true
}

const addGestureListener = type => {
  if (!window || typeof window.addEventListener !== 'function') {
    return
  }
  window.addEventListener(type, markUserGesture, { capture: true, once: true })
}

const ensureUserGestureLatch = () => {
  if (userGestureLatchInstalled) {
    return
  }
  userGestureLatchInstalled = true
  addGestureListener('pointerdown')
  addGestureListener('keydown')
}

const hasUserGesture = () => userGestureSeen

const safeCanvasExtract = (extractor, fallback = null) => {
  ensureUserGestureLatch()
  if (!hasUserGesture()) {
    return fallback
  }
  try {
    return extractor()
  } catch (err) {
    console.warn('Canvas extraction blocked; continuing without it.', err)
    return fallback
  }
}

const resetUserGestureForTests = () => {
  userGestureSeen = false
  userGestureLatchInstalled = false
}

module.exports = {
  ensureUserGestureLatch,
  hasUserGesture,
  markUserGesture,
  resetUserGestureForTests,
  safeCanvasExtract,
}
