const expect = require('expect.js')

const networkSecurity = require('../lib/networkSecurity')

describe('networkSecurity', function () {
  const originalWindow = globalThis.window

  afterEach(function () {
    globalThis.window = originalWindow
  })

  describe('isLoopbackHost', function () {
    it('matches localhost with and without port', function () {
      expect(networkSecurity.isLoopbackHost('localhost')).to.be(true)
      expect(networkSecurity.isLoopbackHost('localhost:3000')).to.be(true)
      expect(networkSecurity.isLoopbackHost('wiki.localhost')).to.be(true)
      expect(networkSecurity.isLoopbackHost('wiki.localhost:3000')).to.be(true)
    })

    it('matches loopback ipv4 and ipv6', function () {
      expect(networkSecurity.isLoopbackHost('127.0.0.1')).to.be(true)
      expect(networkSecurity.isLoopbackHost('127.0.0.1:8080')).to.be(true)
      expect(networkSecurity.isLoopbackHost('127.1.2.3')).to.be(true)
      expect(networkSecurity.isLoopbackHost('127.255.255.254')).to.be(true)
      expect(networkSecurity.isLoopbackHost('::1')).to.be(true)
      expect(networkSecurity.isLoopbackHost('[::1]:3000')).to.be(true)
    })

    it('does not match non-loopback hosts', function () {
      expect(networkSecurity.isLoopbackHost('wiki.local')).to.be(false)
      expect(networkSecurity.isLoopbackHost('hyperdoc.dreyeck.ch')).to.be(false)
    })
  })

  describe('origin-scoped blocking', function () {
    it('blocks loopback targets for non-loopback origins', function () {
      globalThis.window = { location: { hostname: 'hyperdoc.dreyeck.ch' } }
      expect(networkSecurity.shouldBlockLoopbackTarget('localhost')).to.be(true)
      expect(networkSecurity.shouldBlockLoopbackTarget('wiki.localhost')).to.be(true)
      expect(networkSecurity.shouldBlockLoopbackTarget('127.0.0.1')).to.be(true)
      expect(networkSecurity.shouldBlockLoopbackTarget('127.1.2.3')).to.be(true)
    })

    it('allows loopback targets for loopback origins', function () {
      globalThis.window = { location: { hostname: 'localhost' } }
      expect(networkSecurity.shouldBlockLoopbackTarget('localhost')).to.be(false)
      expect(networkSecurity.shouldBlockLoopbackTarget('127.0.0.1')).to.be(false)
      globalThis.window = { location: { hostname: 'wiki.localhost' } }
      expect(networkSecurity.shouldBlockLoopbackTarget('localhost')).to.be(false)
    })

    it('only strips loopback provenance on non-loopback origins', function () {
      globalThis.window = { location: { hostname: 'hyperdoc.dreyeck.ch' } }
      expect(networkSecurity.shouldStripLoopbackProvenance('localhost')).to.be(true)
      expect(networkSecurity.shouldStripLoopbackProvenance('example.org')).to.be(false)
      globalThis.window = { location: { hostname: '127.0.0.1' } }
      expect(networkSecurity.shouldStripLoopbackProvenance('localhost')).to.be(false)
    })
  })
})
