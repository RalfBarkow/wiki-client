describe('target', function () {
  // Minimal copy of target.bind behavior for test purposes.
  let targeting = false
  let $item = null
  let item = null

  const bindTarget = function () {
    $(document)
      .on('keydown.testtarget', function (e) {
        if (e.keyCode === 16) targeting = e.shiftKey
      })
      .on('keyup.testtarget', function (e) {
        if (e.keyCode === 16) targeting = e.shiftKey
      })
    $('.main').on('mouseenter.testtarget', '.item', enterItem).on('align-item.testtarget', '.page', alignItem)
  }

  const enterItem = function () {
    item = ($item = $(this)).attr('data-id')
    if (targeting) {
      const key = $(this).parents('.page:first').data('key')
      const place = $item.offset().top
      $('.page').trigger('align-item', { key, id: item, place })
    }
  }

  const alignItem = function (e, align) {
    const $page = $(this)
    if ($page.data('key') === align.key) return
    $item = $page.find(`.item[data-id=${align.id}]`)
    if (!$item.length) return
    const place = align.place || $page.height() / 2
    const offset = $item.offset().top + $page.scrollTop() - place
    $page.stop().animate({ scrollTop: offset }, 'slow')
  }

  const setupDom = id => {
    const $main = $('<div class="main"></div>').appendTo(document.body)

    const $page1 = $('<div class="page"></div>').attr('data-key', 'p1').css({ height: '120px', overflow: 'auto' })
    const $story1 = $('<div class="story"></div>').appendTo($page1)
    $('<div class="item"></div>').attr('data-id', id).text('item one').appendTo($story1)

    const $page2 = $('<div class="page"></div>').attr('data-key', 'p2').css({ height: '120px', overflow: 'auto' })
    const $story2 = $('<div class="story"></div>').appendTo($page2)
    $('<div style="height:200px"></div>').appendTo($story2)
    $('<div class="item"></div>').attr('data-id', id).text('item two').appendTo($story2)

    $main.append($page1, $page2)
    return { $main, $page1, $page2 }
  }

  it('Shift-hover aligns by shared id across pages', function (done) {
    const id = 'deadbeefdeadbeef'
    const { $main, $page1, $page2 } = setupDom(id)
    bindTarget()

    let saw = false
    $page2.on('align-item.testtarget', function (_e, align) {
      if (align && align.id === id && align.key === 'p1') saw = true
    })

    $(document).trigger($.Event('keydown', { keyCode: 16, shiftKey: true }))
    $page1.find(`.item[data-id=${id}]`).trigger('mouseenter')

    setTimeout(() => {
      expect(saw).to.be(true)
      $(document).off('.testtarget')
      $page1.off('.testtarget')
      $page2.off('.testtarget')
      $main.remove()
      done()
    }, 10)
  })
})
