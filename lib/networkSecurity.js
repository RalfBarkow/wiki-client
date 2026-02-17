const stripPort = host => {
  if (!host) return ''
  const normalized = String(host).trim().toLowerCase()
  const bracketedIpv6 = normalized.match(/^\[([^\]]+)\](?::\d+)?$/)
  if (bracketedIpv6) return bracketedIpv6[1]
  const colonCount = (normalized.match(/:/g) || []).length
  if (colonCount <= 1) {
    return normalized.replace(/:\d+$/, '')
  }
  return normalized
}

const isLoopbackHost = host => {
  const normalized = stripPort(host)
  if (!normalized) return false
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true
  const ipv4Parts = normalized.split('.')
  if (ipv4Parts.length === 4 && ipv4Parts.every(part => /^\d+$/.test(part))) {
    const nums = ipv4Parts.map(Number)
    const validRange = nums.every(n => n >= 0 && n <= 255)
    if (validRange && nums[0] === 127) return true
  }
  return false
}

const isLoopbackOrigin = () => {
  if (typeof window === 'undefined' || !window.location) return false
  return isLoopbackHost(window.location.hostname)
}

const shouldBlockLoopbackTarget = targetHost => isLoopbackHost(targetHost) && !isLoopbackOrigin()

const shouldStripLoopbackProvenance = site => isLoopbackHost(site) && !isLoopbackOrigin()

module.exports = {
  stripPort,
  isLoopbackHost,
  isLoopbackOrigin,
  shouldBlockLoopbackTarget,
  shouldStripLoopbackProvenance,
}
