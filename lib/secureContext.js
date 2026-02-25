const networkSecurity = require('./networkSecurity')

const explainSecureContext = ({ protocol, hostname, isSecureContext }) => {
  const loopbackHost = networkSecurity.isLoopbackHost(hostname)

  if (isSecureContext) {
    if (protocol === 'https:') {
      return {
        secure: true,
        reason: 'Secure context: true (HTTPS origin).',
        recommendation: null,
      }
    }

    if (loopbackHost) {
      return {
        secure: true,
        reason: 'Secure context: true (loopback hosts are treated as trustworthy origins).',
        recommendation: 'Use HTTPS when testing custom hostnames or cross-device access.',
      }
    }

    return {
      secure: true,
      reason: 'Secure context: true.',
      recommendation: null,
    }
  }

  if (protocol !== 'https:' && !loopbackHost) {
    return {
      secure: false,
      reason: 'Secure context: false (custom hostname over HTTP is not a secure context).',
      recommendation: 'Use HTTPS for this hostname, or use localhost/.localhost for local-only development.',
    }
  }

  if (protocol === 'https:') {
    return {
      secure: false,
      reason: 'Secure context: false (origin was not considered trustworthy by the browser).',
      recommendation: 'Use a trusted certificate and verify the final loaded origin is trusted.',
    }
  }

  return {
    secure: false,
    reason: 'Secure context: false.',
    recommendation: 'Use HTTPS for custom hostnames, or localhost/.localhost for local-only development.',
  }
}

module.exports = { explainSecureContext }
