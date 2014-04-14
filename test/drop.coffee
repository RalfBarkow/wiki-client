drop = require '../lib/drop'
expect = require 'expect.js'

# construct mock event objects

signal = (mock, handler) ->
  handler mock

mockDrop = (dataTransfer) ->
  preventDefault: ->
  originalEvent:
    dataTransfer: dataTransfer

mockUrl = (type, url) ->
  mockDrop
    types: [type]
    getData: (spec) -> url

# test the handling of mock events

describe 'drop', ->

  it 'should handle remote pages', ->
    event = mockUrl 'text/uri-list', 'http://localhost:3000/fed.wiki.org/welcome-visitors'
    signal event, drop.dispatch
      page: (page) -> expect(page).to.eql({slug: 'welcome-visitors', site: 'fed.wiki.org'})

  it 'should handle local pages', ->
    event = mockUrl 'text/uri-list', 'http://fed.wiki.org/view/welcome-visitors'
    signal event, drop.dispatch
      page: (page) -> expect(page).to.eql({slug: 'welcome-visitors', site: 'fed.wiki.org'})

  it 'should handle list of pages', ->
    event = mockUrl 'text/uri-list', 'http://sfw.c2.com/view/welcome-visitors/view/pattern-language'
    signal event, drop.dispatch
      page: (page) -> expect(page).to.eql({slug: 'pattern-language', site: 'sfw.c2.com'})
