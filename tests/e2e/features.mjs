// Feature checks: drives the built app through every look against mock Jellyfin servers, and checks both what it shows and what it
// sends. Run with `npm run test:e2e`. Narrow or move a run with environment variables:
//   AREAS=nav,browse,details,home,search,settings,collapse,profiles,player,robust,touch,compat   LOOKS=netflix,hulu,hbo,disney
//   TAG=name (log and screenshot prefix)   BASE=8096 and CDP=9333 (ports; change both to run two at once)   WATCH=560 (seconds)
import {
  BASE, J, check, click, clickText, count, ev, exists, finish, goto, hasClip, hash, logMark, logSince, logText, mock, mockPost, ok,
  fail, heal, pollLog, pollState, reset, send, setSelect, settle, shot, skip, sleep, start, state, textOf, texts, typeInto, waitFor
} from './lib/rig.mjs'
import { NAV, PLAYER, SETTINGS_CLASS, clickNav, home, patchSettings, setLook, signInTo } from './lib/app.mjs'

// =====================================================================================
async function testNav(look) {
  const N = NAV[look]
  await setLook(look); await reset(); await home()
  const links = await texts('.nav-links > a')
  check(`${look}/nav: links are the service's own`, J(links) === J(N.links), J(links))
  check(`${look}/nav: overflow menu is "${N.more}"`, (await textOf('.nav-more span')) === N.more)
  await click('.nav-more'); await sleep(150)
  const more = await texts('.menu a')
  check(`${look}/nav: ${N.more} menu lists ${N.moreLinks.join(', ')}`, J(more) === J(N.moreLinks), J(more))
  await click('.nav-more'); await sleep(100)
  check(`${look}/nav: icons only where the look has them`, ((await count('.nav-links > a svg')) > 0) === (look === 'disney'))
  await shot(`${look}-home`)

  // every page the nav leads to
  await clickNav(N.shows)
  check(`${look}/nav: ${N.shows} shows all 14 series`, await ok(`document.querySelectorAll('.browse .grid .card').length === 14`) && (await textOf('.page-title')) === N.shows)
  await settle()
  await clickNav(N.movies)
  check(`${look}/nav: ${N.movies} loads the first page of 100`, await ok(`document.querySelectorAll('.browse .grid .card').length === 48`) && (await textOf('.page-title')) === N.movies)
  await settle(); await shot(`${look}-movies`)
  await clickNav(N.libs)
  check(`${look}/nav: ${N.libs} shows the 3 video libraries (music hidden)`, await ok(`document.querySelectorAll('.tiles.libs .tile').length === 3`) && (await textOf('.page-title')) === N.libs, J(await texts('.tiles.libs .tile')))
  check(`${look}/nav: ${N.libs} also lists collections`, await ok(`document.querySelector('.libraries .row')`))
  await settle(); await shot(`${look}-libraries`)
  await clickNav(N.list)
  check(`${look}/nav: ${N.list} starts empty`, await ok(`document.querySelector('.browse .empty')`) && (await textOf('.page-title')) === N.list)
  await clickNav('Genres')
  check(`${look}/nav: Genres shows 8 tiles`, await ok(`document.querySelectorAll('.tiles.genres .tile').length === 8`))
  await settle(); await shot(`${look}-genres`)
  await clickNav('Collections')
  check(`${look}/nav: Collections shows 3 box sets`, await ok(`document.querySelectorAll('.browse .grid .card').length === 3`))
  await clickNav(N.fresh)
  check(`${look}/nav: ${N.fresh} has 4 rows`, await ok(`document.querySelectorAll('.new-page .row').length === 4`))
  await settle(); await shot(`${look}-new`)
  if (look === 'disney') { await clickNav('Search'); check(`${look}/nav: Search link opens the search page`, await ok(`document.querySelector('.search-input input')`)) }

  // the profile menu
  await click('.avatar'); await sleep(150)
  const items = await texts('.menu a, .menu button')
  check(`${look}/nav: profile menu offers ${N.settings}`, items.includes(N.settings), J(items))
  await clickText('.menu a', N.settings)
  check(`${look}/nav: ${N.settings} page opens`, await ok(`document.querySelector('.settings')`) && (await textOf('.page-title')) === N.settings)
  // narrow window: links fold into a menu button
  await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 800, deviceScaleFactor: 1, mobile: false })
  await sleep(300)
  check(`${look}/nav: links fold into a menu button on a narrow window`, !(await ev(`!!document.querySelector('.nav-links')?.offsetParent`)) && (await ev(`!!document.querySelector('.nav-burger')?.offsetParent`)))
  await click('.nav-burger'); await sleep(150)
  check(`${look}/nav: that menu lists every page`, (await count('.burger-panel a')) >= N.links.length + 3)
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await sleep(200)
}

// =====================================================================================
async function testBrowse(look) {
  const N = NAV[look]
  await setLook(look); await reset()
  await goto('#/library/lib-movies', `document.querySelectorAll('.browse .grid .card').length === 48`)
  check(`${look}/browse: a library loads its first page`, (await count('.browse .grid .card')) === 48 && (await textOf('.page-title')) === 'Movies')
  await ev('window.scrollTo(0, document.body.scrollHeight)')
  check(`${look}/browse: scrolling loads the second page`, await ok(`document.querySelectorAll('.browse .grid .card').length === 96`))
  await ev('window.scrollTo(0, document.body.scrollHeight)')
  check(`${look}/browse: and the last, with the right total`, (await ok(`document.querySelectorAll('.browse .grid .card').length === 100`)) && (await ok(`document.querySelector('.count[data-count="100"]')`)), (await textOf('.count')) ?? '')
  await ev('window.scrollTo(0, 0)')

  const firstTitle = () => ev(`document.querySelector('.browse .grid .card')?.getAttribute('title')`)
  const q = 'Recursive=true&IncludeItemTypes=Movie&ParentId=lib-movies&Limit=1'
  await setSelect('select[aria-label="Sort"]', 'name-desc')
  const nameDesc = (await mock(`/Items?${q}&SortBy=SortName&SortOrder=Descending`)).Items[0].Name
  check(`${look}/browse: sort Z–A starts with the right title`, await ok(`document.querySelector('.browse .grid .card')?.getAttribute('title') === ${J(nameDesc)}`), `${await firstTitle()} vs ${nameDesc}`)
  check(`${look}/browse: the sort is kept in the address`, (await hash()).includes('sort=name-desc'))
  await setSelect('select[aria-label="Sort"]', 'added')
  const added = (await mock(`/Items?${q}&SortBy=DateCreated&SortOrder=Descending`)).Items[0].Name
  check(`${look}/browse: "Recently added" starts with the newest`, await ok(`document.querySelector('.browse .grid .card')?.getAttribute('title') === ${J(added)}`), `${await firstTitle()} vs ${added}`)
  await setSelect('select[aria-label="Sort"]', 'rating')
  const rated = (await mock(`/Items?${q}&SortBy=CommunityRating&SortOrder=Descending`)).Items[0].Name
  check(`${look}/browse: rating sort starts with the best`, await ok(`document.querySelector('.browse .grid .card')?.getAttribute('title') === ${J(rated)}`))

  const sci = (await mock(`/Items?Recursive=true&IncludeItemTypes=Movie&ParentId=lib-movies&Genres=Sci-Fi&Limit=1`)).TotalRecordCount
  await setSelect(`select[aria-label="Genres"]`, 'Sci-Fi')
  check(`${look}/browse: the genre filter narrows to ${sci} titles`, await ok(`document.querySelector('.count[data-count="${sci}"]')`), (await textOf('.count')) ?? '')
  check(`${look}/browse: the genre menu lists the library's genres`, (await count('select[aria-label="Genres"] option')) === 9)
  await setSelect(`select[aria-label="Genres"]`, '')
  await setSelect(`select[aria-label="Show"]`, 'unplayed')
  check(`${look}/browse: "Unwatched" keeps all 100 (nothing watched yet)`, await ok(`document.querySelector('.count[data-count="100"]')`))
  await setSelect(`select[aria-label="Show"]`, 'played')
  check(`${look}/browse: "Watched" is empty`, await ok(`document.querySelector('.browse .empty')`))
  await setSelect(`select[aria-label="Show"]`, 'all')

  // the choices survive a reload
  await send('Page.reload'); await waitFor(`document.querySelector('.browse .grid .card')`, 30000)
  check(`${look}/browse: sort is still "Rating" after a reload`, (await ev(`document.querySelector('select[aria-label="Sort"]').value`)) === 'rating')

  // a genre page, with its Movies / Shows switch
  await goto('#/genre/Sci-Fi', `document.querySelector('.browse .grid .card')`)
  const both = (await mock(`/Items?Recursive=true&IncludeItemTypes=Movie,Series&Genres=Sci-Fi&Limit=1`)).TotalRecordCount
  check(`${look}/browse: a genre page lists movies and shows (${both})`, await ok(`document.querySelector('.count[data-count="${both}"]')`) && (await textOf('.page-title')) === 'Sci-Fi')
  await click('.seg [data-type="shows"]')
  const showsOnly = (await mock(`/Items?Recursive=true&IncludeItemTypes=Series&Genres=Sci-Fi&Limit=1`)).TotalRecordCount
  check(`${look}/browse: the Shows switch narrows it to ${showsOnly}`, await ok(`document.querySelector('.count[data-count="${showsOnly}"]')`))
  // a genre tile leads here
  await goto('#/genres', `document.querySelectorAll('.tiles.genres .tile').length === 8`)
  await click('.tile.genre[data-genre="Comedy"]')
  check(`${look}/browse: a genre tile opens that genre`, await ok(`document.querySelector('.page-title')?.textContent === 'Comedy'`))
  // a library tile leads to the library
  await goto('#/libraries', `document.querySelectorAll('.tiles.libs .tile').length === 3`)
  await click('.tile.lib[data-lib="lib-shows"]')
  check(`${look}/browse: a library tile opens that library`, await ok(`document.querySelector('.page-title')?.textContent === 'Shows' && document.querySelectorAll('.browse .grid .card').length === 14`))
  // a collection leads to its titles
  await goto('#/collections', `document.querySelectorAll('.browse .grid .card').length === 3`)
  await click('.browse .grid .card .card-link')
  check(`${look}/browse: a collection opens its own titles`, await ok(`document.querySelector('.hero.details') && document.querySelectorAll('.details-body .grid .card').length >= 3`), `${await count('.details-body .grid .card')}`)
  await settle(); await shot(`${look}-collection`)

  // ----- My List -----
  await goto('#/movies', `document.querySelectorAll('.browse .grid .card').length === 48`)
  const id1 = await ev(`document.querySelector('.browse .grid .card').dataset.id`)
  await click('.browse .grid .card [data-act="list"]')
  check(`${look}/mylist: the + button on a card saves it (${id1})`, await ok(`document.querySelector('.browse .grid .card [data-act="list"]').getAttribute('aria-pressed') === 'true'`) && (await pollState(id1, s => s.IsFavorite === true)))
  await clickNav(N.list)
  check(`${look}/mylist: it shows up in ${N.list}`, await ok(`document.querySelector('.browse .grid .card')?.dataset.id === ${J(id1)}`))
  await click('.browse .grid .card [data-act="list"]')
  check(`${look}/mylist: taking it off removes it straight away`, await ok(`document.querySelectorAll('.browse .grid .card').length === 0 && document.querySelector('.browse .empty')`) && (await pollState(id1, s => s.IsFavorite === false)))
  // fill the list for the screenshots, then look for it on Home
  for (const id of ['m5', 'm12', 'm33', 's2', 'b1']) await mockPost(`/UserFavoriteItems/${id}?userId=u1`)
  await send('Page.reload'); await waitFor(`document.querySelector('.nav')`, 30000)
  await goto('#/mylist', `document.querySelectorAll('.browse .grid .card').length === 5`)
  check(`${look}/mylist: ${N.list} lists the 5 saved titles (movies, a show, a box set)`, (await count('.browse .grid .card')) === 5)
  await settle(); await shot(`${look}-mylist`)
  await home()
  check(`${look}/mylist: Home has a "${N.list}" row`, (await texts('.row h3')).includes(N.list))
}

// =====================================================================================
async function testDetails(look) {
  const N = NAV[look]
  await setLook(look); await reset()
  await goto('#/title/m1', `document.querySelector('.hero.details h1')`)
  await settle()
  check(`${look}/title: movie page has the look's Play wording ("${N.play}")`, (await textOf('.hero.details [data-act="play"]')) === N.play)
  check(`${look}/title: it has list, watched and trailer buttons`, (await count('.hero.details [data-act="list"], .hero.details [data-act="watched"], .hero.details [data-act="trailer"]')) === 3)
  check(`${look}/title: tagline and genre links are shown`, (await exists('.hero.details .tagline')) && (await count('.hero.details .genres a')) >= 1)
  const tabbed = look !== 'netflix'
  check(`${look}/title: ${tabbed ? 'sections are tabs' : 'sections are stacked'}`, ((await count('.tabs [role="tab"]')) > 0) === tabbed, J(await texts('.tabs [role="tab"]')))
  await shot(`${look}-details-movie`)
  if (tabbed) await click('.tabs [data-tab="details"]')
  await sleep(200)
  check(`${look}/title: the cast has 4 people with photos`, (await count('.cast-member')) === 4 && (await count('.cast-member img')) === 4)
  const facts = (await textOf('.facts')) ?? ''
  check(`${look}/title: facts name the director, genres and studio`, /Crew/.test(facts) && /Director/.test(facts) && /Genres/.test(facts) && /Mock Pictures/.test(facts) && /English/.test(facts) && /Spanish/.test(facts), facts.slice(0, 120))
  if (tabbed) { await click('.tabs [data-tab="extras"]'); await sleep(200) }
  check(`${look}/title: extras lists the trailer and 2 clips`, (await count('.extra')) === 3, J(await texts('.extra-name')))
  if (tabbed) { await click('.tabs [data-tab="details"]'); await sleep(200) }
  await click('.cast-member')
  check(`${look}/title: a cast member opens their page`, await ok(`document.querySelector('.page-title')?.textContent && document.querySelector('.person-head') && document.querySelectorAll('.browse .grid .card').length > 0`))
  const pid = (await hash()).split('/').pop()
  const expected = (await mock(`/Items?Recursive=true&IncludeItemTypes=Movie,Series&PersonIds=${pid}&Limit=1`)).TotalRecordCount
  check(`${look}/title: that page lists their ${expected} titles`, await ok(`document.querySelector('.count[data-count="${expected}"]')`))
  await settle(); await shot(`${look}-person`)

  await goto('#/title/m1', `document.querySelector('.hero.details h1')`)
  await ev(`window.__opened = null; window.open = u => { window.__opened = u }`)
  await click('.hero.details [data-act="trailer"]')
  check(`${look}/title: the trailer button opens its link`, (await ev('window.__opened')) === 'https://www.youtube.com/watch?v=mock0')
  await click('.hero.details [data-act="list"]')
  check(`${look}/title: the list button saves it`, await pollState('m1', s => s.IsFavorite === true) && (await ev(`document.querySelector('.hero.details [data-act="list"]').getAttribute('aria-pressed')`)) === 'true')
  await click('.hero.details [data-act="watched"]')
  check(`${look}/title: the watched button marks it watched`, await pollState('m1', s => s.Played === true))
  await click('.hero.details [data-act="watched"]')
  check(`${look}/title: and unmarks it`, await pollState('m1', s => s.Played === false))

  // a show
  await goto('#/title/s1', `document.querySelectorAll('.episode').length > 0`)
  await settle()
  check(`${look}/title: a show lists 7 episodes with pictures`, (await count('.episode')) === 7 && (await count('.episode .ep-thumb img')) === 7)
  const playLabel = await textOf('.hero.details [data-act="play"]')
  check(`${look}/title: it says Resume (an episode is partly watched)`, /Resume/.test(playLabel ?? ''), playLabel ?? '')
  check(`${look}/title: "Start over" is offered too`, await exists('.hero.details [data-act="restart"]'))
  check(`${look}/title: watched episodes are ticked`, (await count('.episode .ep-watched.on')) === 3)
  await shot(`${look}-details-series`)
  await setSelect('select[aria-label="Season"]', '2')
  check(`${look}/title: the season menu switches season`, await ok(`document.querySelectorAll('.episode').length === 7 && document.querySelector('.episode').dataset.ep.startsWith('s1e2')`))
  await setSelect('select[aria-label="Season"]', '1')
  await ok(`document.querySelector('.episode').dataset.ep.startsWith('s1e1')`)
  await click('.episode[data-ep="s1e1x5"] .ep-watched')
  check(`${look}/title: an episode's eye button marks it watched`, await pollState('s1e1x5', s => s.Played === true))
  if (tabbed) {
    const tabNames = await texts('.tabs [role="tab"]')
    check(`${look}/title: a show has Episodes / suggestions / Details tabs`, tabNames.length === 3 && tabNames[0] === 'Episodes' && tabNames.at(-1) === 'Details', J(tabNames))
    await click('.tabs [data-tab="details"]'); await sleep(200); await settle(); await shot(`${look}-details-about`)
  }
  await goto('#/title/s1', `document.querySelector('.hero.details h1')`)
  if (tabbed) { await click('.tabs [data-tab="episodes"]'); await sleep(200) }
  await ok(`document.querySelectorAll('.episode').length > 0`)
  await click('.episode[data-ep="s1e1x2"] .ep-link')
  check(`${look}/title: clicking an episode starts it`, await ok(`location.hash === '#/play/s1e1x2'`))
  await goto('#/', `document.querySelector('.nav')`)
}

// =====================================================================================
async function testHome(look) {
  const N = NAV[look]
  await setLook(look); await reset()
  await send('Page.reload'); await waitFor(`document.querySelector('.nav')`, 30000) // Home on screen still shows the data from before the reset
  await home()
  const rows = await texts('.row h3')
  const because = (await mock('/Items/m4')).Name
  check(`${look}/home: first row is "${N.continue}"`, rows[0] === N.continue, J(rows.slice(0, 3)))
  check(`${look}/home: has a "${N.because(because)}" row`, rows.includes(N.because(because)), J(rows))
  check(`${look}/home: has director and actor recommendation rows`, rows.some(r => /^Directed by /.test(r)) && rows.some(r => /^Starring /.test(r)))
  check(`${look}/home: has the "${N.top}" row`, rows.includes(N.top))
  check(`${look}/home: has 6 genre rows by default`, (await count('.row[data-row="Action"], .row[data-row="Comedy"], .row[data-row="Crime"], .row[data-row="Drama"], .row[data-row="Family"], .row[data-row="Fantasy"]')) === 6)
  check(`${look}/home: numbered Top 10 only in Netflix`, ((await count('.ranked-row .rank-num')) === 10) === (look === 'netflix'), `${await count('.ranked-row .rank-num')}`)
  check(`${look}/home: brand tiles only in Disney+`, ((await count('[data-brands] .tile')) === 4) === (look === 'disney'), `${await count('[data-brands] .tile')}`)
  const carousel = look !== 'netflix'
  check(`${look}/home: banner is ${carousel ? 'a carousel of 5' : 'a single title'}`, (await count('.hero-dots button')) === (carousel ? 5 : 0))
  if (carousel) {
    const first = await ev(`document.querySelector('.hero').dataset.hero`)
    await click('.hero-nav.next'); await sleep(400)
    const second = await ev(`document.querySelector('.hero').dataset.hero`)
    check(`${look}/home: the carousel's next arrow changes the title`, first !== second)
    await click('.hero-dots button:nth-child(4)'); await sleep(300)
    check(`${look}/home: a dot jumps to that title`, await ev(`document.querySelector('.hero-dots button:nth-child(4)').classList.contains('on')`))
  }
  // hover buttons on a card
  const cardId = await ev(`document.querySelector('.row[data-row="Action"] .card').dataset.id`)
  await click(`.row[data-row="Action"] .card[data-id="${cardId}"] [data-act="list"]`)
  check(`${look}/home: a card's + button saves it from Home`, await pollState(cardId, s => s.IsFavorite === true))
  await click(`.row[data-row="Action"] .card[data-id="${cardId}"] [data-act="list"]`)
  await pollState(cardId, s => s.IsFavorite === false)
  // the banner's Play
  await click('.hero [data-act="play"]')
  check(`${look}/home: the banner's Play starts a title`, await ok(`location.hash.startsWith('#/play/')`, 8000), await hash())
  await ev(`location.hash = '#/'`)
  await home(); await shot(`${look}-home2`)
  // hover: the buttons that appear on a card, and the numbered row
  const rowTitle = look === 'netflix' ? N.top : N.continue
  await ev(`document.querySelector('.row[data-row=${J(rowTitle)}]').scrollIntoView({block:'center'})`); await sleep(500); await settle()
  const box = await ev(`(()=>{const r=document.querySelector('.row[data-row=${J(rowTitle)}] .card').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y }); await sleep(500)
  check(`${look}/home: hovering a card reveals its buttons`, (await ev(`getComputedStyle(document.querySelector('.row[data-row=${J(rowTitle)}] .card:hover .card-hover')).opacity`)) === '1')
  await shot(`${look}-hover`)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 })
}

// =====================================================================================
async function searchFor(look, text) {
  if (look === 'netflix') { if (!(await exists('.nav-search input'))) { await click('.nav-search button'); await sleep(200) } await typeInto('.nav-search input', text) }
  else if (look === 'hulu') await typeInto('.nav-search.bar input', text)
  else { await goto('#/search', `document.querySelector('.search-input input') && document.querySelector('.search-input input').value === ''`); await typeInto('.search-input input', text) } // wait until the page has cleared the old search
}
async function testSearch(look) {
  await setLook(look); await reset(); await home()
  await ev(`localStorage.removeItem('jellyflix.recent')`)
  await searchFor(look, 'Silent')
  const movies = (await mock('/Items?Recursive=true&IncludeItemTypes=Movie&SearchTerm=Silent&Limit=1')).TotalRecordCount
  const shows = (await mock('/Items?Recursive=true&IncludeItemTypes=Series&SearchTerm=Silent&Limit=1')).TotalRecordCount
  check(`${look}/search: "Silent" finds ${movies} movies and ${shows} shows`, await ok(`document.querySelectorAll('.search-page .grid .card').length === ${movies + shows}`), `${await count('.search-page .grid .card')}`)
  check(`${look}/search: the address carries the query`, (await hash()).includes('q=Silent'))
  await click('.seg.chips [data-type="movies"]')
  check(`${look}/search: the Movies chip leaves only movies`, await ok(`document.querySelectorAll('.search-page .grid .card').length === ${movies}`))
  await click('.seg.chips [data-type="all"]')
  await settle(); await shot(`${look}-search`)
  await searchFor(look, 'Ava')
  await click('.seg.chips [data-type="people"]')
  check(`${look}/search: people are found by name`, await ok(`document.querySelectorAll('.people .person').length === 1`))
  await click('.people .person')
  check(`${look}/search: a person result opens their page`, await ok(`location.hash.startsWith('#/person/')`) && (await ok(`document.querySelector('.person-head')`)))
  await goto('#/search', `document.querySelector('.search-page')`)
  check(`${look}/search: recent searches are remembered`, await ok(`document.querySelectorAll('.recent .chips button').length >= 1`), J(await texts('.recent .chips button')))
  check(`${look}/search: with nothing typed it suggests top titles`, await ok(`document.querySelector('.search-page .row')`))
  await typeInto(look === 'netflix' || look === 'hulu' ? '.search-page .search-input input' : '.search-input input', '')
  await searchFor(look, 'zzzz-nothing')
  check(`${look}/search: no match says so`, await ok(`document.querySelector('.search-page .empty')`))
}

// =====================================================================================
async function openSettings() {
  await click('.avatar'); await sleep(150)
  if (!(await click('.menu [data-act="settings"]'))) throw new Error(`the profile menu did not open on ${await hash()}`)
  if (!(await ok(`document.querySelector('.settings')`))) throw new Error(`the settings page did not open (at ${await hash()})`)
  await sleep(200)
}
async function testSettings(look) {
  const N = NAV[look]
  await setLook(look); await reset(); await patchSettings({}, false)
  await ev(`localStorage.removeItem('jellyflix.settings')`); await send('Page.reload'); await waitFor(`document.querySelector('.nav')`, 30000)
  await setLook(look)
  await openSettings()
  check(`${look}/settings: uses the ${SETTINGS_CLASS[look]} layout`, await exists(`.settings.${SETTINGS_CLASS[look]}`))
  check(`${look}/settings: has Playback, Appearance, Home, Account and About`, J(await texts('.set-section h2')) === J(['Playback', 'Appearance', 'Home screen', 'Account', 'About']))
  check(`${look}/settings: the section menu shows only in the sidebar layout`, (await ev(`!!document.querySelector('.set-nav')?.offsetParent`)) === (look === 'hbo'))
  const about = await textOf('[data-setting="serverInfo"] .set-value')
  check(`${look}/settings: About names the server`, /Mock/.test(about ?? '') && /10\.10/.test(about ?? ''), about ?? '')
  check(`${look}/settings: Account shows who and where`, (await textOf('[data-setting="user"] .set-value')) === 'demo' && new RegExp(`127\\.0\\.0\\.1:${BASE}`).test((await textOf('[data-setting="server"] .set-value')) ?? ''))
  await shot(`${look}-settings`)

  // poster size changes the cards
  await setSelect('select[aria-label="Poster size"]', 'large')
  await sleep(200)
  await goto('#/movies', `document.querySelectorAll('.browse .grid .card').length > 0`)
  const wide = look === 'hulu' || look === 'hbo'
  const widthOf = () => ev(`Math.round(document.querySelector('.browse .grid .card').getBoundingClientRect().width)`)
  const w = { large: wide ? 360 : 210, small: wide ? 250 : 140 }
  check(`${look}/settings: Large posters are ${w.large}px wide`, (await widthOf()) === w.large, `${await widthOf()}`)
  await openSettings()
  await setSelect('select[aria-label="Poster size"]', 'small'); await sleep(200)
  await goto('#/movies', `document.querySelectorAll('.browse .grid .card').length > 0`)
  check(`${look}/settings: Small posters are ${w.small}px wide`, (await widthOf()) === w.small, `${await widthOf()}`)
  await openSettings()
  await setSelect('select[aria-label="Poster size"]', 'medium')

  // home rows
  await click('[data-setting="row-nextUp"] input')
  await click('[data-setting="row-topRated"] input')
  await setSelect('select[aria-label="Genre rows"]', '3')
  await home()
  const rows = await texts('.row h3')
  check(`${look}/settings: turned-off rows leave Home`, !rows.includes('Next Up') && !rows.includes('Up Next') && !rows.includes(N.top), J(rows))
  check(`${look}/settings: the genre row count is respected (3)`, (await count('.row[data-row="Action"], .row[data-row="Comedy"], .row[data-row="Crime"], .row[data-row="Drama"]')) === 3)
  await openSettings()
  await click('[data-setting="showHero"] input')
  await home()
  check(`${look}/settings: the featured banner can be turned off`, !(await exists('.hero')))
  await openSettings()
  await click('[data-setting="showHero"] input')
  await click('[data-setting="reduceMotion"] input')
  await sleep(150)
  check(`${look}/settings: Reduce motion is applied to the page`, (await ev(`document.documentElement.dataset.motion`)) === 'reduced')
  await click('[data-setting="reduceMotion"] input')

  // playback preferences are saved
  await setSelect('select[aria-label="Streaming quality"]', '720')
  await setSelect('select[aria-label="Preferred audio language"]', 'spa')
  await setSelect('select[aria-label="Skip intros"]', 'auto')
  await click('[data-setting="autoplayNext"] input')
  await sleep(200)
  const saved = JSON.parse(await ev(`localStorage.getItem('jellyflix.settings')`))
  check(`${look}/settings: playback choices are saved`, saved.quality === '720' && saved.audioLang === 'spa' && saved.skipIntro === 'auto' && saved.autoplayNext === false && saved.rows.nextUp === false, J(saved))
  await send('Page.reload'); await waitFor(`document.querySelector('.settings')`, 30000)
  check(`${look}/settings: they are still set after a restart`, (await ev(`document.querySelector('select[aria-label="Streaming quality"]').value`)) === '720' && !(await ev(`document.querySelector('[data-setting="autoplayNext"] input').checked`)))
  // the Look menu inside settings
  await setSelect('select[aria-label="Look"]', look === 'netflix' ? 'hulu' : 'netflix'); await sleep(300)
  check(`${look}/settings: the Look setting restyles the app`, (await ev(`document.documentElement.dataset.theme`)) !== look)
  await setLook(look)
  // reset needs two clicks
  await click('[data-act="reset"]'); await sleep(100)
  check(`${look}/settings: Reset asks for confirmation first`, await exists('[data-act="reset-confirm"]') && (await ev(`document.querySelector('select[aria-label="Streaming quality"]').value`)) === '720')
  await click('[data-act="reset-confirm"]'); await sleep(200)
  check(`${look}/settings: and then puts everything back`, (await ev(`document.querySelector('select[aria-label="Streaming quality"]').value`)) === 'auto' && (await ev(`document.querySelector('[data-setting="autoplayNext"] input').checked`)))
}

async function testProfiles() {
  await setLook('netflix'); await openSettings()
  await click('.settings [data-act="switch"]')
  check(`profiles: switching profile returns to sign-in`, await ok(`document.querySelector('.login')`))
  check(`profiles: the server's profiles are offered ("Who's watching?")`, await ok(`document.querySelectorAll('.profile').length === 2`), J(await texts('.profile .pname')))
  await click('.profile[data-profile="guest"]')
  check(`profiles: picking one fills in the username`, (await ev(`document.querySelector('input[placeholder="Username"]').value`)) === 'guest')
  await ev(`(()=>{const el=document.querySelector('input[type=password]');const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');d.set.call(el,'guest');el.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  await click('.login form button')
  check(`profiles: and signing in as them works`, await ok(`document.querySelector('.nav')`, 15000))
  await shot('netflix-login-profiles')
}

// =====================================================================================
const video = expr => ev(`(()=>{const v=document.querySelector('.player video');return v ? (${expr}) : null})()`)
const waitPlaying = (min = 1.2) => waitFor(`document.querySelector('.player video') && document.querySelector('.player video').currentTime > ${min}`, 25000)
const key = k => ev(`window.dispatchEvent(new KeyboardEvent('keydown', { key: ${J(k)}, bubbles: true }))`)

/** One look's player: where its title, clocks and controls are, what its pop-ups hold, and a screenshot. */
async function testPlayerLook(look) {
  if (!hasClip) return skip(`${look}/player: layout`, 'ffmpeg is not installed')
  const P = PLAYER[look]
  await setLook(look); await reset(); await patchSettings({ subtitleMode: 'foreign', autoplayNext: true, skipIntro: 'button', audioLang: '', quality: 'auto', speed: 1 }, false)
  await ev(`location.hash = '#/title/s1'`); await sleep(300)
  await ev(`location.hash = '#/play/s1e1x1'`)
  await waitPlaying(1.0)
  await ev(`document.querySelector('.player video').pause()`)
  const wake = () => ev(`document.querySelector('.player').dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))`)
  await wake()

  check(`${look}/player: the title is ${P.title === 'top' ? 'at the top, by the back button' : 'in the middle of the control bar'}`,
    (await exists(P.title === 'top' ? '.pc-top .pc-title' : '.pc-mid .pc-title')) && !(await exists(P.title === 'top' ? '.pc-mid .pc-title' : '.pc-top .pc-title')))
  check(`${look}/player: ${P.clocks === 'both' ? 'the time so far and the time left' : 'only the time left'} sit at the ends of the progress line`,
    (await exists('.pc-bar .pc-scrub')) && (await exists('.pc-remaining')) && (await exists('.pc-elapsed')) === (P.clocks === 'both'))
  const acts = await ev(`[...document.querySelectorAll('.pc-bar [data-act]')].map(b => b.dataset.act)`)
  check(`${look}/player: the bar has its own controls, in its own order`, J(acts) === J(P.acts), J(acts))
  check(`${look}/player: ${P.middle ? 'the play controls sit in the middle of the bar' : 'there is no cluster in the middle of the bar'}`, (await exists('.pc-cluster [data-act="play"]')) === P.middle)

  if (P.pausePanel) {
    await sleep(3700)
    check(`${look}/player: after a few seconds of pause it says what you are watching`, await ok(`document.querySelector('.pc-paused')?.textContent.includes("You're watching") && document.querySelector('.pc-paused h2')?.textContent === 'Orbit Chronicles'`, 3000))
    await click('.pc-bar [data-act="play"]'); await sleep(300)
    check(`${look}/player: and the panel goes when it plays again`, !(await exists('.pc-paused')))
    await ev(`document.querySelector('.player video').pause()`); await wake()
  } else check(`${look}/player: no "You're watching" panel`, !(await exists('.pc-paused')))

  await click('.pc-bar [data-act="episodes"]'); await sleep(350)
  const eps = await ev(`(() => { const m = document.querySelector('.pc-menu.eps'); if (!m) return null; const r = m.getBoundingClientRect(); const row = document.querySelector('.pc-row').getBoundingClientRect(); return { left: r.left, right: r.right, bottom: r.bottom, rowTop: row.top, width: innerWidth, pics: m.querySelectorAll('.pc-ep-pic').length, rows: m.querySelectorAll('.pc-eps-list button').length } })()`)
  check(`${look}/player: the episode list opens above the controls and inside the window`, !!eps && eps.left >= 0 && eps.right <= eps.width && eps.bottom <= eps.rowTop, J(eps))
  check(`${look}/player: ${P.pictures === 'all' ? 'every episode in it has a picture' : 'only the episode playing has a picture'}`, !!eps && (P.pictures === 'all' ? eps.pics === eps.rows : eps.pics === 1), J(eps))
  await click('.pc-bar [data-act="episodes"]'); await sleep(200)

  await wake(); await click('.pc-bar [data-act="tracks"]'); await sleep(350)
  check(`${look}/player: Audio & Subtitles lists the tracks`, (await count('.pc-menu.tracks [data-audio]')) === 2 && (await count('.pc-menu.tracks [data-sub]')) === 4)
  await shot(`${look}-player`)
  await click('.pc-bar [data-act="tracks"]'); await sleep(200)

  if (P.settings) {
    await wake(); await click('.pc-bar [data-act="settings"]'); await sleep(300)
    check(`${look}/player: Settings holds quality and speed`, (await exists('.pc-menu.settings [data-quality="720"]')) && (await exists('.pc-menu.settings [data-speed="1.5"]')))
    const mark = logMark()
    await click('.pc-menu [data-quality="720"]')
    check(`${look}/player: choosing 720p there asks for a 4 Mbps stream`, await pollLog(mark, /VideoBitRate=4000000/))
    await wake(); await click('.pc-bar [data-act="settings"]'); await sleep(200)
    await click('.pc-menu [data-speed="1.5"]')
    check(`${look}/player: and 1.5× speed is applied`, await ok(`document.querySelector('.player video').playbackRate === 1.5`))
  } else {
    check(`${look}/player: speed has its own button and there is no quality picker (as on the real one)`, (await exists('.pc-bar [data-act="speed"]')) && !(await exists('.pc-bar [data-act="settings"]')))
  }
  await ev(`location.hash = '#/'`); await sleep(300)
}

async function testPlayer() {
  if (!hasClip) return skip('player: every playback check', 'ffmpeg is not installed')
  await setLook('netflix'); await reset()
  await patchSettings({ subtitleMode: 'foreign', subtitleLang: 'eng', autoplayNext: true, skipIntro: 'button', audioLang: '', quality: 'auto', speed: 1 }, false)
  await ev(`location.hash = '#/play/s1e1x1'`)
  await send('Page.reload'); await waitFor(`document.querySelector('.player')`, 30000)
  check(`player: plays and the picture is the clip's`, await ok(`document.querySelector('.player video').currentTime > 1.2`, 25000) && (await video('v.videoWidth')) === 640)
  check(`player: title shows the show and episode`, /S1:E1/.test((await textOf('.pc-title')) ?? ''), (await textOf('.pc-title')) ?? '')
  check(`player: no subtitles by default (audio is English)`, (await video('v.querySelectorAll("track").length')) === 0)

  // tracks
  await video('v.pause()')
  await click('.pc-bar [data-act="tracks"]'); await sleep(200)
  check(`player: the audio menu lists the 2 tracks`, (await count('.pc-menu.tracks [data-audio]')) === 2, J(await texts('.pc-menu.tracks [data-audio]')))
  check(`player: the subtitle menu lists Off and 3 tracks`, (await count('.pc-menu.tracks [data-sub]')) === 4, J(await texts('.pc-menu.tracks [data-sub]')))
  await click('.pc-menu.tracks [data-sub="3"]'); await sleep(300)
  check(`player: choosing an English text subtitle adds a caption track`, await ok(`document.querySelector('.player video track')?.getAttribute('src')?.includes('/Subtitles/3/0/Stream.vtt')`) && (await ok(`document.querySelector('.player video').textTracks[0]?.cues?.length === 2`, 8000)), (await video('v.querySelector("track")?.getAttribute("src")')) ?? '')
  const mark1 = logMark()
  await click('.pc-bar [data-act="tracks"]'); await click('.pc-menu.tracks [data-sub="5"]')
  check(`player: a picture-based subtitle is burned in by the server`, (await pollLog(mark1, /SubtitleStreamIndex=5&SubtitleMethod=Encode/)) && (await ok(`document.querySelector('.player video').querySelectorAll('track').length === 0`)))
  await waitPlaying(0.1)
  await video('v.pause()')
  const before = await video('v.currentTime')
  const mark2 = logMark()
  await click('.pc-bar [data-act="tracks"]'); await click('.pc-menu.tracks [data-audio="2"]')
  check(`player: choosing the Spanish audio asks for that track`, await pollLog(mark2, /AudioStreamIndex=2/))
  await waitPlaying(0.05)
  const after = await video('v.currentTime')
  check(`player: and carries on from the same moment (${before?.toFixed(1)}s → ${after?.toFixed(1)}s)`, after >= before - 0.6 && after < before + 4)
  await click('.pc-bar [data-act="speed"]'); await click('.pc-menu [data-speed="1.5"]')
  check(`player: speed 1.5× is applied`, await ok(`document.querySelector('.player video').playbackRate === 1.5`))
  await click('.pc-bar [data-act="episodes"]'); await sleep(150)
  check(`player: the episode list shows the 7 episodes of this season, the one playing marked`, (await count('.pc-menu.eps .pc-eps-list button')) === 7 && (await exists('.pc-menu.eps button.on')) && (await exists('.pc-menu.eps select[aria-label="Season"]')))
  await setSelect('.pc-menu.eps select[aria-label="Season"]', '2'); await sleep(250)
  check(`player: and its season menu shows the other season`, (await count('.pc-menu.eps .pc-eps-list button')) === 7 && !(await exists('.pc-menu.eps button.on')))
  await key('Escape'); await sleep(100)
  check(`player: Esc closes the menu first`, !(await exists('.pc-menu')) && (await hash()).includes('/play/'))

  // keyboard
  await waitPlaying(0.05)
  await key(' '); await sleep(200)
  const paused = await video('v.paused')
  await key(' '); await sleep(200)
  check(`player: Space pauses and resumes`, paused === true && (await video('v.paused')) === false)
  await key('m'); check(`player: M mutes`, await ok(`document.querySelector('.player video').muted === true`, 3000)); await key('m')
  const t0 = await video('v.currentTime'); await key('ArrowRight'); await sleep(200)
  check(`player: → jumps ahead`, (await video('v.currentTime')) >= t0 + 5)

  // skip intro
  await video('v.currentTime = 1.5'); await sleep(500)
  check(`player: "Skip Intro" appears during the intro`, (await textOf('.pc-skip')) === 'Skip Intro')
  await click('.pc-skip'); await sleep(400)
  check(`player: clicking it jumps past the intro`, (await video('v.currentTime')) >= 3.9)
  check(`player: the intro and credits are marked on the scrub bar`, (await count('.pc-scrub .mark')) === 2)

  // up next
  await video('v.currentTime = 9.3'); await sleep(800)
  check(`player: "Next episode" appears when the credits start`, /Next episode in/.test((await textOf('.pc-next small')) ?? ''), (await textOf('.pc-next small')) ?? '')
  await shot('netflix-player-next')
  check(`player: and starts the next episode by itself after the countdown`, await ok(`location.hash === '#/play/s1e1x2'`, 12000), await hash())
  check(`player: the next episode really loads`, await ok(`document.querySelector('.player video') && document.querySelector('.player video').currentTime > 0.8`, 20000) && /E2/.test((await textOf('.pc-title')) ?? ''))

  // autoplay off: the card stays, nothing starts by itself
  await patchSettings({ autoplayNext: false })
  await ev(`location.hash = '#/play/s1e1x1'`); await send('Page.reload'); await waitFor(`document.querySelector('.player')`, 30000)
  await waitPlaying(1.0)
  await video('v.currentTime = 9.3'); await sleep(800)
  check(`player: with Autoplay off the card shows no countdown`, (await exists('.pc-next')) && !/ in \d/.test((await textOf('.pc-next small')) ?? ''))
  await sleep(6500)
  check(`player: and nothing starts on its own`, (await hash()) === '#/play/s1e1x1')
  await click('.pc-next [data-act="next"]')
  check(`player: clicking the card starts the next episode`, await ok(`location.hash === '#/play/s1e1x2'`, 5000))

  // skip automatically
  await patchSettings({ autoplayNext: true, skipIntro: 'auto' })
  await ev(`location.hash = '#/play/s1e1x1'`); await send('Page.reload'); await waitFor(`document.querySelector('.player')`, 30000)
  await waitPlaying(0.3)
  await video('v.currentTime = 1.5')
  check(`player: with "Skip automatically" the intro is skipped without a click`, (await ok(`document.querySelector('.player video').currentTime >= 3.9`, 6000)) && !(await exists('.pc-skip')))

  // saved language preferences
  await patchSettings({ skipIntro: 'button', audioLang: 'spa', subtitleMode: 'foreign', subtitleLang: 'eng' })
  const mark4 = logMark()
  await ev(`location.hash = '#/play/s1e1x3'`); await send('Page.reload'); await waitFor(`document.querySelector('.player')`, 30000)
  await waitPlaying(0.3)
  check(`player: a saved Spanish preference starts on the Spanish track`, await pollLog(mark4, /x3\/master\.m3u8\?[^ ]*AudioStreamIndex=2/) || await pollLog(mark4, /s1e1x3\/master\.m3u8\?[^ ]*AudioStreamIndex=2/))
  check(`player: "foreign" subtitles turn on English subtitles for Spanish audio`, await ok(`document.querySelector('.player video track')?.getAttribute('src')?.includes('/Subtitles/3/')`, 6000))
  await patchSettings({ subtitleMode: 'always', subtitleLang: 'spa' })
  await ev(`location.hash = '#/play/s1e1x3'`); await send('Page.reload'); await waitFor(`document.querySelector('.player')`, 30000)
  check(`player: "always on" uses the chosen subtitle language`, await ok(`document.querySelector('.player video track')?.getAttribute('src')?.includes('/Subtitles/4/')`, 8000))
  await patchSettings({ audioLang: '', subtitleMode: 'foreign', subtitleLang: 'eng' }, false)

  // resume point, and what is reported when you leave
  await ev(`location.hash = '#/play/s1e1x4'`); await send('Page.reload'); await waitFor(`document.querySelector('.player')`, 30000)
  check(`player: resumes where you left off (6 s)`, await ok(`document.querySelector('.player video').currentTime >= 5.9`, 25000), `${(await video('v.currentTime'))?.toFixed(1)}s`)
  await sleep(1800)
  await ev(`location.hash = '#/'`); await sleep(800)
  const stop = (await state('s1e1x4')).stoppedAt
  check(`player: leaving reports the real position to Jellyfin (${(stop / 1e7).toFixed(1)} s)`, stop > 6.5 * 1e7, `${stop}`)
  check(`player: the "Playing" report was sent too`, new RegExp(`\\[${BASE}\\] POST /Sessions/Playing -> 204`).test(logText()))
}

// =====================================================================================
// A user who has "Group movies into collections" on: the server swaps movies for their collection in plain lists.
async function testCollapse(look) {
  const port = BASE + 3
  await signInTo(port)
  await setLook(look)
  const plain = await mock('/Items?Recursive=true&IncludeItemTypes=Movie&ParentId=lib-movies&Limit=200', port)
  check(`${look}/collections: this server groups movies into collections when asked plainly (as the real one does)`, plain.Items.some(i => i.Type === 'BoxSet') && plain.TotalRecordCount === 92, `${plain.TotalRecordCount} items`)
  const noBoxes = `[...document.querySelectorAll('.browse .grid .card')].every(c => c.dataset.id.startsWith('m'))`
  await goto('#/movies', `document.querySelectorAll('.browse .grid .card').length > 0`)
  await ok(`document.querySelector('.count[data-count]')`)
  check(`${look}/collections: the Movies page lists movies, not collection folders`, await ev(noBoxes), J(await ev(`[...document.querySelectorAll('.browse .grid .card')].map(c => c.dataset.id).filter(id => !id.startsWith('m'))`)))
  check(`${look}/collections: and counts all 100 movies`, await ok(`document.querySelector('.count[data-count="100"]')`, 5000), (await textOf('.count')) ?? '')
  await goto('#/library/lib-movies', `document.querySelectorAll('.browse .grid .card').length > 0`)
  await ok(`document.querySelector('.count[data-count]')`)
  check(`${look}/collections: the Movies library lists movies, not collection folders`, (await ev(noBoxes)) && (await ok(`document.querySelector('.count[data-count="100"]')`, 5000)))
  await ev(`window.scrollTo(0, document.body.scrollHeight)`); await ok(`document.querySelectorAll('.browse .grid .card').length === 96`)
  await ev(`window.scrollTo(0, document.body.scrollHeight)`); await ok(`document.querySelectorAll('.browse .grid .card').length === 100`)
  check(`${look}/collections: paging through it finds every movie and no collection`, (await count('.browse .grid .card')) === 100 && (await ev(noBoxes)))
  await home()
  const rowIds = t => ev(`[...document.querySelectorAll('.row[data-row=${J(t)}] .card')].map(c => c.dataset.id)`)
  const recent = await rowIds(NAV[look].continue === '' ? '' : (await texts('.row h3')).find(h => /Recently Added Movies|Just Added Movies|New Movies/.test(h)))
  check(`${look}/collections: "recently added movies" on Home are movies`, recent.length > 0 && recent.every(id => id.startsWith('m')), J(recent.filter(id => !id.startsWith('m'))))
  const topTitle = NAV[look].top
  const top = await rowIds(topTitle)
  check(`${look}/collections: the top rated row is movies and shows`, top.length > 0 && top.every(id => /^[ms]/.test(id)), J(top.filter(id => !/^[ms]/.test(id))))
  // collections are still there, in their own place
  await goto('#/collections', `document.querySelectorAll('.browse .grid .card').length === 3`)
  check(`${look}/collections: Collections still lists the 3 collections`, (await count('.browse .grid .card')) === 3 && (await ev(`[...document.querySelectorAll('.browse .grid .card')].every(c => c.dataset.id.startsWith('b'))`)))
  await signInTo(BASE)
}

// =====================================================================================
async function smoke(port, label) {
  await reset(port)
  await ev(`location.hash = '#/'`)
  await signInTo(port)
  await setLook('netflix')
  check(`${label}: Home loads`, await ok(`document.querySelectorAll('.row').length >= 8`, 25000), `${await count('.row')} rows`)
  await goto('#/libraries', `document.querySelectorAll('.tiles.libs .tile').length > 0`)
  check(`${label}: libraries load`, (await count('.tiles.libs .tile')) === 3)
  await goto('#/title/m2', `document.querySelector('.hero.details [data-act="list"]')`)
  check(`${label}: a title page loads`, (await textOf('.hero.details h1')) !== null)
  await click('.hero.details [data-act="list"]')
  check(`${label}: My List saves on the server`, await pollState('m2', s => s.IsFavorite === true, 25, port))
  await click('.hero.details [data-act="watched"]')
  check(`${label}: watched saves on the server`, await pollState('m2', s => s.Played === true, 25, port))
  await goto('#/movies', `document.querySelectorAll('.browse .grid .card').length > 0`)
  check(`${label}: browsing and paging work`, (await count('.browse .grid .card')) === 48)
  await goto('#/mylist', `document.querySelectorAll('.browse .grid .card').length >= 1`)
  check(`${label}: My List shows the saved title`, (await ev(`document.querySelector('.browse .grid .card').dataset.id`)) === 'm2')
  if (!hasClip) skip(`${label}: playback starts with the token as ApiKey`, 'ffmpeg is not installed')
  else {
  const mark = logMark()
  await ev(`location.hash = '#/play/s1e1x1'`)
  check(`${label}: playback starts with the token as ApiKey`, (await ok(`document.querySelector('.player video') && document.querySelector('.player video').currentTime > 0.8`, 25000)) && /master\.m3u8\?[^ ]*ApiKey=tok-demo[^ ]* -> 200/.test(logSince(mark)))
  }
  await ev(`location.hash = '#/'`)
}

// =====================================================================================

// =====================================================================================
/** A real key press (the page sees what it would from a keyboard, including the browser's own default action). */
const KEYS = { Tab: 9, Enter: 13, Escape: 27, ArrowRight: 39, ArrowLeft: 37 }
async function press(name) {
  const vk = KEYS[name]
  await send('Input.dispatchKeyEvent', { type: name === 'Enter' ? 'keyDown' : 'rawKeyDown', key: name, code: name, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(name === 'Enter' ? { text: '\r' } : {}) })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  await sleep(120)
}

async function testRobust() {
  await setLook('netflix'); await reset(); await ev(`localStorage.removeItem('jellyflix.settings')`)
  await home()

  // ----- the window title names the page -----
  await goto('#/movies', `document.querySelectorAll('.browse .grid .card').length > 0`)
  check('robust/title: the window title names the page', (await ev('document.title')) === 'Movies · Jellyflix', await ev('document.title'))
  await goto('#/title/m1', `document.querySelector('.hero.details')`)
  check('robust/title: and the title it shows', (await ev('document.title')) === `${await textOf('.hero.details h1')} · Jellyflix`, await ev('document.title'))
  await goto('#/nowhere', `document.querySelector('main .empty')`)
  check('robust/routes: an unknown address says so and links Home', /doesn't exist/.test((await textOf('main .empty')) ?? '') && (await exists('main .empty a')))

  // ----- Back puts a long list back as you left it -----
  await goto('#/movies', `document.querySelectorAll('.browse .grid .card').length === 48`)
  await ev(`window.scrollTo(0, document.body.scrollHeight)`)
  await ok(`document.querySelectorAll('.browse .grid .card').length === 96`)
  await sleep(300)
  await ev(`window.scrollTo(0, document.body.scrollHeight - 1200)`); await sleep(300)
  const y = await ev('Math.round(scrollY)')
  const loaded = await count('.browse .grid .card') // the next page may have been fetched while scrolling
  await click('.browse .grid .card:nth-child(60) .card-link')
  await ok(`document.querySelector('.hero.details')`)
  const markList = logMark()
  await ev('history.back()')
  check('robust/back: the list is as long as you left it', await ok(`document.querySelectorAll('.browse .grid .card').length === ${loaded}`, 5000), `${await count('.browse .grid .card')} vs ${loaded}`)
  check('robust/back: and you are where you were', await ok(`Math.abs(scrollY - ${y}) < 6`, 5000), `${await ev('Math.round(scrollY)')} vs ${y}`)
  await sleep(500)
  check('robust/back: the server was not asked for the list again', !/GET \/Items\?[^ ]*IncludeItemTypes=Movie/.test(logSince(markList)))

  // ----- Home comes back at once, then brings itself up to date -----
  await home()
  await ev(`window.scrollTo(0, 500)`); await sleep(300)
  await click('.row .card .card-link')
  await ok(`document.querySelector('.hero.details')`)
  await ev(`window.__skeleton = false; new MutationObserver(() => { if (document.querySelector('.skeleton-rows')) window.__skeleton = true }).observe(document.body, { childList: true, subtree: true })`)
  const markHome = logMark()
  await ev('history.back()')
  check('robust/back: Home is there straight away, with no placeholder', (await ok(`document.querySelectorAll('.row').length >= 6`, 3000)) && !(await ev('window.__skeleton')))
  check('robust/back: and it asks the server again in the background', await pollLog(markHome, /GET \/UserItems\/Resume/))

  // ----- menus -----
  await ev(`document.querySelector('.nav-more').focus()`)
  await click('.nav-more'); await sleep(150)
  check('robust/menu: the Browse menu opens', await exists('.menu'))
  await press('Escape')
  check('robust/menu: Esc closes it and focus goes back to its button', !(await exists('.menu')) && (await ev(`document.activeElement?.classList.contains('nav-more')`)))
  await goto('#/movies', `document.querySelectorAll('.browse .grid .card').length > 0`)
  await click('.avatar'); await sleep(150)
  await click('.menu [data-act="settings"]')
  await ok(`document.querySelector('.settings')`)
  await ev('history.back()')
  await ok(`document.querySelector('.browse')`); await sleep(250)
  check('robust/menu: a menu you used does not come back when you return to the page', !(await exists('.menu')))
  await click('.avatar'); await sleep(150)
  check('robust/menu: and the next click opens it', await exists('.menu'))
  await click('.avatar')

  // ----- the keyboard -----
  await goto('#/movies', `document.querySelectorAll('.browse .grid .card').length === 48`)
  await send('Page.reload'); await waitFor(`document.querySelectorAll('.browse .grid .card').length === 48`, 30000); await sleep(300) // a fresh start: Tab begins at the top
  await press('Tab')
  check('robust/keyboard: the first Tab stop is "Skip to content"', await ev(`document.activeElement?.classList.contains('skip-link')`))
  await press('Enter')
  check('robust/keyboard: it moves focus to the page', (await ev(`document.activeElement?.id`)) === 'main')
  const first = await ev(`document.querySelector('.browse .grid .card').dataset.id`)
  await ev(`document.querySelector('.browse .grid .card .card-link').focus()`)
  check('robust/keyboard: a focused card is outlined', await ev(`!!document.querySelector('.card:has(.card-link:focus-visible)') && getComputedStyle(document.querySelector('.card:has(.card-link:focus-visible)')).outlineStyle !== 'none'`))
  await press('Enter')
  check('robust/keyboard: Enter on a focused card opens its page', await ok(`location.hash === '#/title/${first}'`))

  // ----- errors you can recover from -----
  await fail('/Genres', 500)
  await goto('#/genres', `document.querySelector('.errorbox')`)
  check('robust/errors: a page that failed says so and offers "Try again"', /Couldn't load genres/.test((await textOf('.errorbox')) ?? '') && (await exists('.errorbox .btn')))
  await heal('/Genres')
  await click('.errorbox .btn')
  check('robust/errors: Try again loads it', await ok(`document.querySelectorAll('.tiles.genres .tile').length === 8 && !document.querySelector('.errorbox')`))

  await fail('/Items', 500)
  await goto('#/search?q=Silent', `document.querySelector('.errorbox')`)
  check('robust/errors: a failed search says so instead of "no results"', /search results/.test((await textOf('.errorbox')) ?? '') && !(await exists('.search-page .empty')))
  await heal('/Items')

  await goto('#/movies', `document.querySelectorAll('.browse .grid .card').length === 48`)
  await fail('FavoriteItems', 500)
  await click('.browse .grid .card [data-act="list"]')
  check('robust/errors: a My List change the server refuses is undone, with a message',
    (await ok(`document.querySelector('.toast')`)) && (await ev(`document.querySelector('.browse .grid .card [data-act="list"]').getAttribute('aria-pressed')`)) === 'false', J(await texts('.toast')))
  await heal('FavoriteItems')

  // ----- the system's "reduce motion" choice -----
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await ev(`localStorage.removeItem('jellyflix.settings')`); await send('Page.reload'); await waitFor(`document.querySelector('.nav')`, 30000)
  check('robust/motion: a first run follows the system\'s reduce-motion choice', (await ev(`document.documentElement.dataset.motion`)) === 'reduced')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await ev(`localStorage.removeItem('jellyflix.settings')`); await send('Page.reload'); await waitFor(`document.querySelector('.nav')`, 30000)
  check('robust/motion: and one that has no such choice stays animated', (await ev(`document.documentElement.dataset.motion`)) === 'full')
  await send('Emulation.setEmulatedMedia', { features: [] })

  // ----- a revoked token signs you out, and says why -----
  await home()
  await fail('', 401)
  await goto('#/genres', `document.querySelector('.login .notice')`)
  check('robust/session: when the server ends the session you are signed out and told why', /session/i.test((await textOf('.login .notice')) ?? ''), (await textOf('.login .notice')) ?? '')
  check('robust/session: the saved session is gone, the server address is kept', (await ev(`localStorage.getItem('jellyflix.session')`)) === null && /127\.0\.0\.1/.test((await ev(`localStorage.getItem('jellyflix.lastServer')`)) ?? ''))
  await heal('')
  await signInTo(BASE)
}

/** Keyboard seeking on the scrub bar, and a last report to Jellyfin even when the window is closed or reloaded. */
async function testPlayerRobust() {
  if (!hasClip) return skip('player: keyboard seeking and reports on reload', 'ffmpeg is not installed')
  await setLook('netflix'); await reset()
  await patchSettings({ subtitleMode: 'off', autoplayNext: false, skipIntro: 'off', audioLang: '', quality: 'auto', speed: 1 }, false)
  await ev(`location.hash = '#/play/s1e1x4'`)
  await send('Page.reload'); await waitFor(`document.querySelector('.player')`, 30000)
  await waitPlaying(1.0)
  await ev(`document.querySelector('.player video').pause()`)
  const before = await video('v.currentTime')
  await ev(`document.querySelector('.pc-scrub').focus()`)
  await press('ArrowRight')
  const after = await video('v.currentTime')
  check('robust/player: the scrub bar can be used from the keyboard (+5 s, once)', after - before > 4 && after - before < 6, `${before?.toFixed(1)} → ${after?.toFixed(1)}`)
  check('robust/player: and says where it is', /^\d+:\d\d of \d+:\d\d$/.test((await ev(`document.querySelector('.pc-scrub').getAttribute('aria-valuetext')`)) ?? ''))
  await ev(`document.querySelector('.player video').play()`)
  await sleep(1500)
  await reset()
  await send('Page.reload')
  check('robust/player: reloading the window still reports where you stopped', await pollState('s1e1x4', s => s.stoppedAt > 0, 30))
  await waitFor(`document.querySelector('.player')`, 30000)
  await ev(`location.hash = '#/'`)
}

// =====================================================================================
/** A finger on the screen, as the page sees one (touch events, then pointer events). */
const touch = async (type, ...points) => send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y]) => ({ x, y })) })
const tap = async (x, y) => { await touch('touchStart', [x, y]); await touch('touchEnd') }
const swipe = async (x1, x2, y) => { await touch('touchStart', [x1, y]); for (const f of [0.25, 0.5, 0.75, 1]) await touch('touchMove', [x1 + (x2 - x1) * f, y]); await touch('touchEnd') }
const rectOf = sel => ev(`(() => { const r = document.querySelector(${J(sel)}).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })()`)
const inputMode = () => ev(`document.documentElement.dataset.input`)

async function testTouch() {
  await setLook('netflix'); await reset(); await ev(`localStorage.removeItem('jellyflix.settings')`)
  await send('Page.reload'); await waitFor(`document.querySelector('.nav')`, 30000); await home()
  check('touch: a session with a mouse starts in mouse mode', (await inputMode()) === 'mouse')
  await tap(8, 450)
  check('touch: touching the screen switches to touch mode by itself', await ok(`document.documentElement.dataset.input === 'touch'`, 3000))
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 120, y: 330 })
  check('touch: and moving the mouse switches back', await ok(`document.documentElement.dataset.input === 'mouse'`, 3000))

  await patchSettings({ touchMode: 'on' })
  check('touch: "On" keeps touch mode even with a mouse', (await inputMode()) === 'touch')
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 200, y: 340 }); await sleep(200)
  check('touch: and stays', (await inputMode()) === 'touch')
  await home()
  check('touch: cards show their buttons without hovering', (await ev(`getComputedStyle(document.querySelector('.row .card .card-hover')).opacity`)) === '1')
  check('touch: rows are swiped, so their arrows are gone', (await ev(`getComputedStyle(document.querySelector('.row .arrow')).display`)) === 'none')
  const c = await rectOf('.row .card .card-link')
  await tap(c.x + c.w / 2, c.y + 20)
  check('touch: tapping a card opens it', await ok(`location.hash.startsWith('#/title/')`, 5000))
  check('touch: buttons are at least 44 px tall', (await ev(`[...document.querySelectorAll('.hero.details .btn')].every(b => b.getBoundingClientRect().height >= 44)`)))

  await patchSettings({ touchMode: 'off' })
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 8, y: 450 }] }); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(200)
  check('touch: "Off" stays in mouse mode even when touched', (await inputMode()) === 'mouse')

  // swiping the banner (Hulu has a carousel)
  await patchSettings({ touchMode: 'on' })
  await setLook('hulu'); await home()
  const before = await ev(`document.querySelector('.hero').dataset.hero`)
  const h = await rectOf('.hero')
  await swipe(h.x + h.w * 0.8, h.x + h.w * 0.2, h.y + h.h / 2)
  check('touch: swiping the banner moves to the next title', await ok(`document.querySelector('.hero').dataset.hero !== ${J(before)}`, 3000))

  if (!hasClip) return skip('touch: player gestures', 'ffmpeg is not installed')
  await patchSettings({ touchMode: 'on', skipIntro: 'off', autoplayNext: false }, false)
  await ev(`location.hash = '#/play/s1e1x1'`); await send('Page.reload'); await waitFor(`document.querySelector('.player')`, 30000)
  await waitPlaying(1.2)
  check('touch: no volume slider (the device has its own)', (await ev(`getComputedStyle(document.querySelector('.pc-vol')).display`)) === 'none')
  const v = await rectOf('.player video')
  await tap(v.x + v.w / 2, v.y + v.h / 2)
  check('touch: one tap on the picture hides the controls', await ok(`document.querySelector('.player').classList.contains('idle')`, 3000))
  await sleep(400)
  await tap(v.x + v.w / 2, v.y + v.h / 2)
  check('touch: and the next one shows them', await ok(`!document.querySelector('.player').classList.contains('idle')`, 3000))
  await sleep(500)
  const t0 = await video('v.currentTime')
  await tap(v.x + v.w * 0.88, v.y + v.h / 2); await tap(v.x + v.w * 0.88, v.y + v.h / 2)
  check('touch: a double tap on the right skips ahead', (await ok(`document.querySelector('.player video').currentTime > ${t0 + 8}`, 5000)) && (await exists('.pc-flash.right')), `${t0?.toFixed(1)} -> ${(await video('v.currentTime'))?.toFixed(1)}`)
  await ev(`location.hash = '#/'`)
}

// =====================================================================================
const AREAS = (process.env.AREAS ?? 'nav,browse,details,home,search,settings,collapse,profiles,player,robust,touch,compat').split(',')
const LOOKS = (process.env.LOOKS ?? 'netflix,hulu,hbo,disney').split(',')
const perLook = { nav: testNav, browse: testBrowse, details: testDetails, home: testHome, search: testSearch, settings: testSettings, collapse: testCollapse }

await start({
  tag: process.env.TAG ?? 'features',
  watchSeconds: Number(process.env.WATCH ?? 560),
  mocks: [{ port: BASE, mode: 'normal' }, { port: BASE + 1, mode: 'modern' }, { port: BASE + 2, mode: 'oldroutes' }, { port: BASE + 3, mode: 'collapse' }]
})
let forced = 0
try {
  await waitFor(`document.querySelector('.login')`, 30000)
  await signInTo(BASE)
  for (const area of AREAS) {
    console.log(`\n--- ${area} ---`)
    try {
      if (perLook[area]) {
        for (const look of LOOKS) {
          try { await perLook[area](look) } catch (e) { check(`${look}/${area}: ran to the end`, false, e.message.split('\n')[0]) }
        }
      } else if (area === 'player') {
        for (const look of LOOKS) {
          try { await testPlayerLook(look) } catch (e) { check(`${look}/player: ran to the end`, false, e.message.split('\n')[0]) }
        }
        if (LOOKS.includes('netflix')) { await testPlayer(); await testPlayerRobust() } // the rest of the player checks run in the Netflix look
      } else if (area === 'robust') {
        await testRobust()
      } else if (area === 'touch') {
        await testTouch()
      } else if (area === 'compat') {
        await smoke(BASE + 1, 'Jellyfin-12-style server')
        await smoke(BASE + 2, 'older server (old routes only)')
        await signInTo(BASE)
      } else if (area === 'profiles') {
        await testProfiles()
      } else {
        check(`${area}: is a known area`, false)
      }
    } catch (e) { check(`${area}: ran to the end`, false, e.message.split('\n')[0]) }
  }
} catch (e) { console.error('RUN ERROR:', e.message); forced = 1 }
process.exit(await finish(forced))
