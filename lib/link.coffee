lineup = require './lineup'
active = require './active'
refresh = require './refresh'
asSlug = require('./page').asSlug

createPage = (name, loc) ->
  site = loc if loc and loc isnt 'view'
  $page = $ """
    <div class="page" id="#{name}">
      <div class="twins"> <p> </p> </div>
      <div class="header">
        <h1> <img class="favicon" src="#{ if site then "//#{site}" else "" }/favicon.png" height="32px"> #{name} </h1>
      </div>
    </div>
  """
  $page.data('site', site) if site
  $page

showPage = (name, loc) ->
  createPage(name, loc).appendTo('.main').each refresh.cycle

doInternalLink = (name, page, site=null) ->
  name = asSlug(name)
  $(page).nextAll().remove() if page?
  lineup.removeAllAfterKey $(page).data('key') if page?
  showPage(name,site)
  active.set($('.page').last())

showResult = (resultPage) ->
  $resultPage = createPage(resultPage.getSlug()).addClass('ghost')
  $resultPage.appendTo($('.main'))
  refresh.buildPage( resultPage, $resultPage )
  active.set($('.page').last())


module.exports = {createPage, doInternalLink, showResult}