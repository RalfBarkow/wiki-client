const expect = require('expect.js')

const secureContext = require('../lib/secureContext')

describe('secureContext', function () {
  it('classifies http://localhost as secure when browser marks it secure', function () {
    const result = secureContext.explainSecureContext({
      protocol: 'http:',
      hostname: 'localhost',
      isSecureContext: true,
    })
    expect(result.secure).to.be(true)
    expect(result.reason).to.contain('Secure context: true')
  })

  it('classifies http://wiki.localhost as secure when browser marks it secure', function () {
    const result = secureContext.explainSecureContext({
      protocol: 'http:',
      hostname: 'wiki.localhost',
      isSecureContext: true,
    })
    expect(result.secure).to.be(true)
  })

  it('classifies http://127.0.0.1 as secure when browser marks it secure', function () {
    const result = secureContext.explainSecureContext({
      protocol: 'http:',
      hostname: '127.0.0.1',
      isSecureContext: true,
    })
    expect(result.secure).to.be(true)
  })

  it('classifies http://[::1] as secure when browser marks it secure', function () {
    const result = secureContext.explainSecureContext({
      protocol: 'http:',
      hostname: '::1',
      isSecureContext: true,
    })
    expect(result.secure).to.be(true)
  })

  it('classifies http://wiki.local as insecure with HTTPS guidance', function () {
    const result = secureContext.explainSecureContext({
      protocol: 'http:',
      hostname: 'wiki.local',
      isSecureContext: false,
    })
    expect(result.secure).to.be(false)
    expect(result.reason).to.contain('custom hostname over HTTP')
    expect(result.recommendation).to.contain('Use HTTPS')
  })
})
