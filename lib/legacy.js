// The legacy module is what is left of the single javascript
// file that once was Smallest Federated Wiki. Execution still
// starts here and many event dispatchers are set up before
// the user takes control.

const pageHandler = require('./pageHandler')
const state = require('./state')
const active = require('./active')
const refresh = require('./refresh')
const lineup = require('./lineup')
const drop = require('./drop')
const dialog = require('./dialog')
const link = require('./link')
const target = require('./target')
const license = require('./license')
const plugin = require('./plugin')
const util = require('./util')
const dom = require('./dom')

const { asSlug } = require('./page')
const { newPage } = require('./page')

const preLoadEditors = catalog =>
  catalog
    .filter(entry => entry.editor)
    .forEach(function (entry) {
      console.log(`${entry.name} Plugin declares an editor, so pre-loading the plugin`)
      wiki.getPlugin(entry.name.toLowerCase(), function (plugin) {
        if (!plugin.editor || typeof plugin.editor !== 'function') {
          console.log(`${entry.name} Plugin ERROR.
Cannot find \`editor\` function in plugin. Set \`"editor": false\` in factory.json or
Correct the plugin to include all three of \`{emit, bind, editor}\`\
`)
        }
      })
    })

wiki.origin.get('system/factories.json', function (error, data) {
  if (Array.isArray(data)) {
    window.catalog = data
    preLoadEditors(data)
  }
})

dom.ready(function () {
  // FUNCTIONS used by plugins and elsewhere

  const LEFTARROW = 37
  const RIGHTARROW = 39

  dom.on(document, 'keydown', function (event) {
    const direction = event.which == LEFTARROW ? -1 : event.which == RIGHTARROW ? 1 : null
    if (direction && !dom.isInput(event.target)) {
      const pages = dom.qsa('.page')
      const activePage = dom.qs('.active')
      const newIndex = pages.indexOf(activePage) + direction
      if (0 <= newIndex && newIndex < pages.length) {
        active.set(pages[newIndex])
      }
    }
    if ((event.ctrlKey || event.metaKey) && event.which === 83) {
      //ctrl-s for search
      event.preventDefault()
      dom.qs('input.search')?.focus()
    }
  })

  // HANDLERS for jQuery events

  //STATE -- reconfigure state based on url
  dom.on(window, 'popstate', state.show)

  dom.onAjaxError(function (event, request, settings) {
    if (request.status === 0 || request.status === 404) {
      return
    }
    console.log('ajax error', event, request, settings)
  })

  const commas = number => `${number}`.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,')

  const readFile = function (file) {
    if (file?.type === 'application/json') {
      const reader = new FileReader()
      reader.onload = function (e) {
        const { result } = e.target
        let pages = JSON.parse(result)
        const resultPage = newPage()
        resultPage.setTitle(`Import from ${file.name}`)
        if (pages.title && pages.story && pages.journal) {
          const slug = asSlug(pages.title)
          const page = pages
          pages = {}
          pages[slug] = page
          resultPage.addParagraph(`\
Import of one page
(${commas(file.size)} bytes)
from a page-json file dated ${file.lastModifiedDate}.\
`)
        } else {
          resultPage.addParagraph(`\
Import of ${Object.keys(pages).length} pages
(${commas(file.size)} bytes)
from an export file dated ${file.lastModifiedDate}.\
`)
        }
        resultPage.addItem({ type: 'importer', pages })
        link.showResult(resultPage)
      }
      reader.readAsText(file)
    }
  }

  const deletePage = (
    pageObject,
    pageEl, // console.log 'fork to delete'
  ) =>
    pageHandler.delete(pageObject, dom.jq(pageEl), function (err) {
      if (err) {
        return
      }
      // console.log 'server delete successful'
      if (pageObject.isRecycler()) {
        // make recycler page into a ghost
        dom.addClass(pageEl, 'ghost')
      } else {
        const futurePage = refresh.newFuturePage(pageObject.getTitle(), pageObject.getCreate())
        pageObject.become(futurePage)
        dom.attr(pageEl, 'id', futurePage.getSlug())
        refresh.rebuildPage(pageObject, dom.jq(pageEl))
        dom.addClass(pageEl, 'ghost')
      }
    })

  const getTemplate = function (slug, done) {
    if (!slug) {
      return done(null)
    }
    console.log('getTemplate', slug)
    pageHandler.get({
      whenGotten(pageObject) {
        done(pageObject)
      },
      whenNotGotten() {
        done(null)
      },
      pageInformation: { slug },
    })
  }

  const finishClick = function (e, name) {
    let page
    e.preventDefault()
    if (!e.shiftKey) {
      page = dom.closest(e.target, '.page')
    }
    link.doInternalLink(name, page, dom.data(e.target, 'site'))
    return false
  }

  let originalPageIndex = null
  const mainEl = dom.qs('.main')
  dom.sortable(mainEl, { handle: '.page-handle', cursor: 'grabbing' })

  dom.onJq(mainEl, 'sortstart', function (evt, ui) {
    const itemEl = ui?.item?.[0]
    if (!itemEl || !dom.hasClass(itemEl, 'page')) {
      return
    }
    const noScroll = true
    active.set(itemEl, noScroll)
    originalPageIndex = dom.qsa('.page').indexOf(itemEl)
  })

  dom.onJq(mainEl, 'sort', function (evt, ui) {
    const itemEl = ui?.item?.[0]
    if (!itemEl || !dom.hasClass(itemEl, 'page')) {
      return
    }
    // Only mark for removal if there's more than one page (+placeholder) left
    if (evt.pageY < 0 && dom.qsa('.page').length > 2) {
      dom.addClass(itemEl, 'pending-remove')
    } else {
      dom.removeClass(itemEl, 'pending-remove')
    }
  })

  dom.onJq(mainEl, 'sortstop', function (evt, ui) {
    const itemEl = ui?.item?.[0]
    if (!itemEl || !dom.hasClass(itemEl, 'page')) {
      return
    }
    const pages = dom.qsa('.page')
    let index = pages.indexOf(dom.qs('.active'))
    const firstItem = dom.find(itemEl, '.item')[0]
    let firstItemIndex = dom.qsa('.item').indexOf(firstItem)
    if (dom.hasClass(itemEl, 'pending-remove')) {
      if (pages.length === 1) {
        return
      }
      lineup.removeKey(dom.data(itemEl, 'key'))
      dom.remove(itemEl)
      active.set(pages[index])
    } else {
      lineup.changePageIndex(dom.data(itemEl, 'key'), index)
      active.set(dom.qs('.active'))
      if (originalPageIndex < index) {
        index = originalPageIndex
        const pageAtIndex = dom.qsa('.page')[index]
        const firstItemInPage = dom.find(pageAtIndex, '.item')[0]
        firstItemIndex = dom.qsa('.item').indexOf(firstItemInPage)
      }
    }
    plugin.renderFrom(firstItemIndex)
    state.setUrl()
    if (window.debug) {
      state.debugStates()
    }
  })

  dom.onDelegate(mainEl, 'click', '.show-page-license', function (e) {
    e.preventDefault()
    const pageEl = dom.closest(this, '.page')
    const title = dom.qs('h1', pageEl)?.textContent.trim() || ''
    dialog.open(`License for ${title}`, license.info(dom.jq(pageEl)))
  })

  dom.onDelegate(mainEl, 'click', '.show-page-source', function (e) {
    e.preventDefault()
    const pageEl = dom.closest(this, '.page')
    const page = lineup.atKey(dom.data(pageEl, 'key')).getRawPage()
    const pre = document.createElement('pre')
    pre.textContent = JSON.stringify(page, null, 2)
    dialog.open(`JSON for ${page.title}`, [pre])
  })

  dom.onDelegate(mainEl, 'click', '.page', function (e) {
    if (e.target?.closest('a')) {
      return
    }
    return active.set(this)
  })

  dom.onDelegate(mainEl, 'click', '.internal', function (e) {
    const titleNode = this
    let title = dom.text(titleNode) || dom.data(titleNode, 'pageName')
    // ensure that name is a string (using string interpolation)
    title = `${title}`
    const titleAttr = dom.attr(titleNode, 'title')
    pageHandler.context = titleAttr ? titleAttr.split(' => ') : ['view']
    return finishClick(e, title)
  })

  dom.onDelegate(mainEl, 'click', 'img.remote', function (e) {
    // expand to handle click on temporary flag
    const src = dom.attr(this, 'src') || ''
    if (src.startsWith('data:image/png')) {
      e.preventDefault()
      const site = dom.data(this, 'site')
      wiki.site(site).refresh(function () {})
      // empty function...
    } else {
      const name = dom.data(this, 'slug')
      pageHandler.context = [dom.data(this, 'site')]
      return finishClick(e, name)
    }
  })

  dom.onDelegate(mainEl, 'dblclick', '.revision', function (e) {
    e.preventDefault()
    const pageEl = dom.closest(this, '.page')
    const page = lineup.atKey(dom.data(pageEl, 'key')).getRawPage()
    const rev = page.journal.length - 1
    const action = page.journal[rev]
    const json = JSON.stringify(action, null, 2)
    const pre = document.createElement('pre')
    pre.textContent = json
    dialog.open(`Revision ${rev}, ${action.type} action`, [pre])
  })

  dom.onDelegate(mainEl, 'click', '.action', function (e) {
    e.preventDefault()
    const actionEl = this
    let name = dom.data(actionEl, 'slug')
    if (dom.hasClass(actionEl, 'fork') && name) {
      pageHandler.context = [dom.data(actionEl, 'site')]
      return finishClick(e, name.split('_')[0])
    } else {
      const pageEl = dom.closest(actionEl, '.page')
      const key = dom.data(pageEl, 'key')
      const slug = lineup.atKey(key).getSlug()
      const actionParent = actionEl.parentElement
      const actionNodes = Array.from(actionParent.children).filter(el => !dom.hasClass(el, 'separator'))
      const rev = actionNodes.indexOf(actionEl)
      if (rev < 0) {
        return
      }
      if (!e.shiftKey) {
        dom.nextAll(pageEl).forEach(dom.remove)
      }
      if (!e.shiftKey) {
        lineup.removeAllAfterKey(key)
      }
      link
        .createPage(`${slug}_rev${rev}`, dom.data(pageEl, 'site'))
        .appendTo('.main')
        .each((_i, el) => refresh.cycle(dom.jq(el)))
      active.set(dom.qsa('.page').slice(-1)[0])
    }
  })

  dom.onDelegate(mainEl, 'mouseenter', '.action', function () {
    const actionEl = this
    const actionData = dom.data(actionEl, 'action')
    dom.attr(actionEl, 'title', util.formatActionTitle(actionData))
  })

  dom.onDelegate(mainEl, 'click', '.fork-page', function () {
    const pageEl = dom.closest(this, '.page')
    if (dom.find(pageEl, '.future').length) {
      return
    }
    const pageObject = lineup.atKey(dom.data(pageEl, 'key'))
    const pageId = dom.attr(pageEl, 'id') || ''
    if (pageId.match(/_rev0$/)) {
      deletePage(pageObject, pageEl)
    } else {
      const action = { type: 'fork' }
      if (dom.hasClass(pageEl, 'local')) {
        if (pageHandler.useLocalStorage()) {
          return
        }
        dom.removeClass(pageEl, 'local')
      } else if (pageObject.isRecycler()) {
        dom.removeClass(pageEl, 'recycler')
      } else if (pageObject.isRemote()) {
        action.site = pageObject.getRemoteSite()
      }
      if (dom.data(pageEl, 'rev') != null) {
        dom.find(pageEl, '.revision').forEach(dom.remove)
      }
      if (dom.hasClass(pageEl, 'ghost')) {
        const titleEl = dom.qs('h1', pageEl)
        const newtitle = (titleEl?.textContent || '').trim().replaceAll(/\s+/g, ' ')
        if (newtitle != pageObject.getTitle()) {
          dom.attr(pageEl, 'id', asSlug(newtitle))
          pageObject.setCreateTitle(newtitle)
          const titleSpan = dom.qs('h1 .title', pageEl)
          titleSpan?.removeAttribute('contenteditable')
        }
      }
      dom.removeClass(pageEl, 'ghost')
      dom.attr(pageEl, 'id', (dom.attr(pageEl, 'id') || '').replace(/_rev\d+$/, ''))
      state.setUrl()
      const pages = dom.qsa('.page')
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i]
        const needle = dom.data(p, 'site')
        if (
          dom.data(p, 'key') !== dom.data(pageEl, 'key') &&
          dom.attr(p, 'id') === dom.attr(pageEl, 'id') &&
          [undefined, null, 'view', 'origin', 'local', 'recycler', location.host].includes(needle)
        ) {
          dom.addClass(p, 'ghost')
        }
      }
      pageHandler.put(dom.jq(pageEl), action)
    }
  })

  dom.onDelegate(mainEl, 'click', 'button.create', function (e) {
    const slug = dom.data(e.target, 'slug')
    getTemplate(slug, function (template) {
      const pageEl = dom.closest(e.target, '.page')
      dom.removeClass(pageEl, 'ghost')
      const pageObject = lineup.atKey(dom.data(pageEl, 'key'))
      pageObject.become(template)
      const page = pageObject.getRawPage()
      const $page = dom.jq(pageEl)
      refresh.rebuildPage(pageObject, $page.empty())
      pageHandler.put($page, { type: 'create', id: page.id, item: { title: page.title, story: page.story } })
    })
  })

  dom.onDelegate(mainEl, 'mouseenter mouseleave', '.score', function (e) {
    console.log('in .score...')
    dom.trigger(mainEl, 'thumb', dom.data(e.target, 'thumb'))
  })

  dom.onDelegate(mainEl, 'click', 'a.search', function (e) {
    const pageEl = dom.closest(e.target, '.page')
    const key = dom.data(pageEl, 'key')
    const pageObject = lineup.atKey(key)
    const resultPage = newPage()
    resultPage.setTitle(`Search from '${pageObject.getTitle()}'`)
    resultPage.addParagraph(
      `Search for pages related to '${pageObject.getTitle()}'.
Each search on this page will find pages related in a different way.
Choose the search of interest. Be patient.`,
    )
    resultPage.addParagraph('Find pages with links to this title.')
    resultPage.addItem({
      type: 'search',
      text: `SEARCH LINKS ${pageObject.getSlug()}`,
    })
    resultPage.addParagraph('Find pages with titles similar to this title.')
    resultPage.addItem({
      type: 'search',
      text: `SEARCH SLUGS ${pageObject.getSlug()}`,
    })
    resultPage.addParagraph('Find pages neighboring  this site.')
    resultPage.addItem({
      type: 'search',
      text: `SEARCH SITES ${pageObject.getRemoteSite(location.host)}`,
    })
    resultPage.addParagraph('Find pages sharing any of these items.')
    resultPage.addItem({
      type: 'search',
      text: `SEARCH ANY ITEMS ${pageObject
        .getRawPage()
        .story.map(item => item.id)
        .join(' ')}`,
    })
    if (!e.shiftKey) {
      dom.nextAll(pageEl).forEach(dom.remove)
    }
    if (!e.shiftKey) {
      lineup.removeAllAfterKey(key)
    }
    link.showResult(resultPage)
  })

  dom.on(mainEl, 'dragenter', evt => evt.preventDefault())
  dom.on(mainEl, 'dragover', evt => evt.preventDefault())
  dom.on(
    mainEl,
    'drop',
    drop.dispatch({
      page: item => {
        link.doInternalLink(item.slug, null, item.site)
      },
      file: file => {
        readFile(file)
      },
    }),
  )

  dom.onDelegate(dom.qs('.provider'), 'click', 'input', function () {
    const firstInput = dom.qs('footer input')
    dom.val(firstInput, dom.attr(this, 'data-provider'))
    dom.qs('footer form')?.submit()
  })

  dom.on(document.body, 'new-neighbor-done', () => {
    dom.qsa('.page').forEach(element => refresh.emitTwins(dom.jq(element)))
  })
  // refresh backlinks??

  const getPluginReference = title =>
    new Promise(function (resolve) {
      const slug = asSlug(title)
      wiki.origin.get(`${slug}.json`, (error, data) =>
        resolve({
          title,
          slug,
          type: 'reference',
          text: (error ? error.msg : data?.story[0].text) || '',
        }),
      )
    })

  const menuSpan = document.createElement('span')
  menuSpan.innerHTML = '&nbsp; ☰ '
  dom.css(menuSpan, { cursor: 'pointer' })
  dom.appendTo(menuSpan, dom.qs('footer'))
  dom.on(menuSpan, 'click', function () {
    const resultPage = newPage()
    resultPage.setTitle('Selected Plugin Pages')
    resultPage.addParagraph(`\
Installed plugins offer these utility pages:\
`)
    if (!window.catalog) {
      return
    }

    const titles = []
    for (var info of window.catalog) {
      if (info.pages) {
        for (var title of info.pages) {
          titles.push(title)
        }
      }
    }

    Promise.all(titles.map(getPluginReference)).then(function (items) {
      items.forEach(item => resultPage.addItem(item))
      link.showResult(resultPage)
    })
  })

  // $('.editEnable').is(':visible')
  const editSpan = document.createElement('span')
  editSpan.innerHTML = '&nbsp; wiki <span class=editEnable>✔︎</span> &nbsp; '
  dom.css(editSpan, { cursor: 'pointer' })
  dom.appendTo(editSpan, dom.qs('footer'))
  dom.on(editSpan, 'click', function () {
    dom.qsa('.editEnable').forEach(el => dom.toggleDisplay(el))
    dom.qsa('.page').forEach(function (pageEl) {
      const $page = dom.jq(pageEl)
      const pageObject = lineup.atKey(dom.data(pageEl, 'key'))
      refresh.rebuildPage(pageObject, $page.empty())
    })
  })
  /*global isAuthenticated */ // isAuthenticated global is set while loading the page.
  if (!isAuthenticated) {
    dom.qsa('.editEnable').forEach(el => dom.toggleDisplay(el))
  }

  target.bind()

  dom.ready(function () {
    state.first()
    const pages = dom.qsa('.page')
    // Render pages in order
    // Emits and "bind creations" for the previous page must be complete before we start
    // rendering the next page or plugin bind ordering will not work
    var renderNextPage = function (pages) {
      if (pages.length === 0) {
        active.set(dom.qsa('.page').slice(-1)[0])
        return
      }
      const pageEl = pages.shift()
      refresh.cycle(dom.jq(pageEl)).then(() => renderNextPage(pages))
    }
    renderNextPage(pages)
  })
})
