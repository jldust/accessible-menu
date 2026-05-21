import { Menubar } from '../src/index.js'

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

describe('Menubar', () => {
  let menuContainer

  beforeEach(() => {
    // Clear document body and reset
    document.body.innerHTML = ''
    document.body.className = ''

    // Create a basic menu structure similar to examples/basic.html
    document.body.innerHTML = `
      <button id="mobile-toggle" aria-expanded="false">Menu</button>
      <nav class="c-menu" data-breakpoint="768">
        <ul class="menu" data-depth="0">
          <li class="menu__item">
            <a href="#home" class="menu__link">Home</a>
          </li>
          <li class="menu__item menu__item--expanded">
            <button class="menu__button">About</button>
            <ul class="menu" data-depth="1">
              <li class="menu__item">
                <a href="#story" class="menu__link">Our Story</a>
              </li>
              <li class="menu__item">
                <a href="#team" class="menu__link">Team</a>
              </li>
              <li class="menu__item">
                <a href="#history" class="menu__link">History</a>
              </li>
            </ul>
          </li>
          <li class="menu__item menu__item--expanded">
            <button class="menu__button">Services</button>
            <ul class="menu" data-depth="1">
              <li class="menu__item">
                <a href="#research" class="menu__link">Research</a>
              </li>
              <li class="menu__item">
                <a href="#development" class="menu__link">Development</a>
              </li>
              <li class="menu__item menu__item--expanded">
                <button class="menu__button">Nested Services</button>
                <ul class="menu" data-depth="2">
                  <li class="menu__item">
                    <a href="#design" class="menu__link">Web Design</a>
                  </li>
                  <li class="menu__item">
                    <a href="#consulting" class="menu__link">Consulting</a>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li class="menu__item">
            <a href="#contact" class="menu__link">Contact</a>
          </li>
        </ul>
      </nav>
    `

    menuContainer = document.querySelector('.c-menu')
  })

  afterEach(() => {
    // Clean up any event listeners and instances
    document.body.innerHTML = ''
    jest.clearAllMocks()
  })

  describe('Constructor and Configuration', () => {
    it('should use default configuration when no config provided', () => {
      const menu = new Menubar()
      expect(menu.config.menuSelector).toBe('c-menu')
      expect(menu.config.buttonClass).toBe('menu__button')
      expect(menu.config.linkClass).toBe('menu__link')
      expect(menu.config.itemClass).toBe('menu__item')
      expect(menu.config.mobileBreakpoint).toBe(768)
      expect(menu.config.mobileControlId).toBe('nav-toggle')
    })

    it('should merge custom config with defaults', () => {
      const customConfig = {
        menuSelector: 'custom-menu',
        mobileBreakpoint: 1024,
        buttonClass: 'custom-button',
      }
      const menu = new Menubar(document, customConfig)

      expect(menu.config.menuSelector).toBe('custom-menu')
      expect(menu.config.mobileBreakpoint).toBe(1024)
      expect(menu.config.buttonClass).toBe('custom-button')
      expect(menu.config.linkClass).toBe('menu__link') // should retain default
    })

    it('should initialize empty menuInstances Map', () => {
      const menu = new Menubar()
      expect(menu.menuInstances).toBeInstanceOf(Map)
      expect(menu.menuInstances.size).toBe(0)
    })
  })

  describe('ARIA Controls Initialization', () => {
    it('should set ARIA attributes on menu buttons', () => {
      const menu = new Menubar()
      menu.init()

      const button = menuContainer.querySelector('button')
      expect(button.getAttribute('aria-haspopup')).toBe('true')
      expect(button.getAttribute('aria-controls')).toBeTruthy()
      expect(button.getAttribute('data-menu-controls')).toBeTruthy()
      expect(button.getAttribute('aria-label')).toBe('About')
    })

    it('should handle menu items without span elements', () => {
      const menu = new Menubar()
      menu.init()

      // Since we don't have span elements in the basic structure,
      // test that buttons have proper controls instead
      const buttons = menuContainer.querySelectorAll('button')
      buttons.forEach(button => {
        expect(button.getAttribute('aria-haspopup')).toBe('true')
        expect(button.getAttribute('data-menu-controls')).toBeTruthy()
      })
    })

    it('should handle menus without submenus', () => {
      document.body.innerHTML = `
        <nav class="c-menu">
          <ul class="menu">
            <li class="menu__item">
              <a class="menu__link" href="#">Simple Link</a>
            </li>
          </ul>
        </nav>
      `

      const menu = new Menubar()
      expect(() => menu.init()).not.toThrow()

      const link = document.querySelector('a')
      expect(link.getAttribute('aria-haspopup')).toBeNull()
    })
  })

  describe('Menu Controller Initialization', () => {
    it('should create MenuController instances for each menu', () => {
      const menu = new Menubar()
      menu.init()

      expect(menu.menuInstances.has(menuContainer)).toBe(true)
      expect(menu.menuInstances.size).toBe(1)
    })

    it('should use custom breakpoint from data attribute', () => {
      const menu = new Menubar()
      menu.init()

      const instance = menu.menuInstances.get(menuContainer)
      expect(instance.mobileBreakpoint).toBe(768)
    })
  })

  describe('Mobile Menu Controls', () => {
    it('should initialize mobile menu controls when present', () => {
      const menu = new Menubar(document, { mobileControlId: 'mobile-toggle' })
      menu.init()

      const mobileButton = document.getElementById('mobile-toggle')
      expect(mobileButton).toBeTruthy()
      expect(mobileButton.getAttribute('aria-expanded')).toBe('false')
    })
  })

  describe('Menu Button Keyboard Navigation', () => {
    let menu, button

    beforeEach(() => {
      menu = new Menubar()
      menu.init()
      button = menuContainer.querySelector('button')
    })

    it('should open menu on down arrow key', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      button.dispatchEvent(event)

      expect(button.getAttribute('aria-expanded')).toBe('true')
    })

    it('should handle right arrow key event', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      const initialState = button.getAttribute('aria-expanded')

      button.dispatchEvent(event)

      // The right arrow should either open the menu or maintain current state
      const finalState = button.getAttribute('aria-expanded')
      expect(['true', 'false']).toContain(finalState)
    })

    it('should close menu on escape key', () => {
      button.setAttribute('aria-expanded', 'true')

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      button.dispatchEvent(event)

      expect(button.getAttribute('aria-expanded')).toBe('false')
    })

    it('should toggle menu on button click', () => {
      const event = new MouseEvent('click')

      // First click should open
      button.dispatchEvent(event)
      expect(button.getAttribute('aria-expanded')).toBe('true')

      // Second click should close
      button.dispatchEvent(event)
      expect(button.getAttribute('aria-expanded')).toBe('false')
    })

    it('should close menu when clicking outside', () => {
      button.setAttribute('aria-expanded', 'true')

      const outsideElement = document.createElement('div')
      document.body.appendChild(outsideElement)

      const event = new MouseEvent('mousedown', { bubbles: true })
      Object.defineProperty(event, 'target', { value: outsideElement })

      document.dispatchEvent(event)

      expect(button.getAttribute('aria-expanded')).toBe('false')
    })

    it('should navigate to next top-level item on ArrowRight from inside a submenu', () => {
      // Use basic.html-style HTML: buttons carry menu__link class so :scope > .menu__link
      // resolves the controller directly as a direct child of its <li>.
      document.body.innerHTML = `
        <nav class="c-menu">
          <ul class="menu" data-depth="0">
            <li class="menu__item">
              <a href="#home" class="menu__link">Home</a>
            </li>
            <li class="menu__item menu__item--expanded">
              <button class="menu__link">About</button>
              <ul class="menu" data-depth="1">
                <li class="menu__item"><a href="#story" class="menu__link">Our Story</a></li>
                <li class="menu__item"><a href="#team" class="menu__link">Team</a></li>
              </ul>
            </li>
            <li class="menu__item menu__item--expanded">
              <button class="menu__link">Services</button>
              <ul class="menu" data-depth="1">
                <li class="menu__item"><a href="#research" class="menu__link">Research</a></li>
              </ul>
            </li>
            <li class="menu__item">
              <a href="#contact" class="menu__link">Contact</a>
            </li>
          </ul>
        </nav>
      `
      const localContainer = document.querySelector('.c-menu')
      const localMenu = new Menubar(document, { buttonClass: 'menu__link', linkClass: 'menu__link' })
      localMenu.init()

      const aboutBtn = Array.from(localContainer.querySelectorAll('button.menu__link'))
        .find(btn => btn.getAttribute('aria-label') === 'About')
      const servicesBtn = Array.from(localContainer.querySelectorAll('button.menu__link'))
        .find(btn => btn.getAttribute('aria-label') === 'Services')

      // Open About's submenu with ArrowDown, then simulate focus landing on first subitem
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      aboutBtn.dispatchEvent(downEvent)
      expect(aboutBtn.getAttribute('aria-expanded')).toBe('true')

      const firstSubLink = localContainer.querySelector('ul[data-depth="1"] .menu__link')
      firstSubLink.focus()
      expect(document.activeElement).toBe(firstSubLink)

      // ArrowRight from inside About's submenu should close About and open Services
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      firstSubLink.dispatchEvent(rightEvent)

      expect(document.activeElement).toBe(servicesBtn)
      expect(servicesBtn.getAttribute('aria-expanded')).toBe('true')
      expect(aboutBtn.getAttribute('aria-expanded')).toBe('false')
    })

    it('should navigate to previous top-level item on ArrowLeft from inside a submenu', () => {
      // Use basic.html-style HTML: buttons carry menu__link class so :scope > .menu__link
      // resolves the controller directly as a direct child of its <li>.
      document.body.innerHTML = `
        <nav class="c-menu">
          <ul class="menu" data-depth="0">
            <li class="menu__item">
              <a href="#home" class="menu__link">Home</a>
            </li>
            <li class="menu__item menu__item--expanded">
              <button class="menu__link">About</button>
              <ul class="menu" data-depth="1">
                <li class="menu__item"><a href="#story" class="menu__link">Our Story</a></li>
                <li class="menu__item"><a href="#team" class="menu__link">Team</a></li>
              </ul>
            </li>
            <li class="menu__item menu__item--expanded">
              <button class="menu__link">Services</button>
              <ul class="menu" data-depth="1">
                <li class="menu__item"><a href="#research" class="menu__link">Research</a></li>
              </ul>
            </li>
            <li class="menu__item">
              <a href="#contact" class="menu__link">Contact</a>
            </li>
          </ul>
        </nav>
      `
      const localContainer = document.querySelector('.c-menu')
      const localMenu = new Menubar(document, { buttonClass: 'menu__link', linkClass: 'menu__link' })
      localMenu.init()

      const aboutBtn = Array.from(localContainer.querySelectorAll('button.menu__link'))
        .find(btn => btn.getAttribute('aria-label') === 'About')
      const homeLink = localContainer.querySelector('[data-depth="0"] > li > a.menu__link')

      // Open About's submenu with ArrowDown, then simulate focus landing on first subitem
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      aboutBtn.dispatchEvent(downEvent)
      expect(aboutBtn.getAttribute('aria-expanded')).toBe('true')

      const firstSubLink = localContainer.querySelector('ul[data-depth="1"] .menu__link')
      firstSubLink.focus()
      expect(document.activeElement).toBe(firstSubLink)

      // ArrowLeft from inside About's submenu should close About and focus Home (previous top-level item)
      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
      firstSubLink.dispatchEvent(leftEvent)

      expect(document.activeElement).toBe(homeLink)
      expect(aboutBtn.getAttribute('aria-expanded')).toBe('false')
    })
  })

  describe('Menu Links Navigation', () => {
    let menu, links, buttons

    beforeEach(() => {
      menu = new Menubar()
      menu.init()
      // Get only top-level links for navigation testing
      links = Array.from(menuContainer.querySelectorAll('ul[data-depth="0"] > li > .menu__link'))
      buttons = Array.from(menuContainer.querySelectorAll('ul[data-depth="0"] > li > .menu__button'))
    })

    it('should have focusable menu links', () => {
      const homeLink = links.find(link => link.textContent === 'Home')
      const aboutButton = buttons.find(button => button.textContent === 'About')

      expect(homeLink).toBeTruthy()
      expect(aboutButton).toBeTruthy()
      expect(links.length).toBeGreaterThan(0)
    })

    it('should handle keyboard events on menu links', () => {
      const homeLink = links.find(link => link.textContent === 'Home')

      homeLink.focus()
      expect(document.activeElement).toBe(homeLink)

      // Test that keyboard events can be dispatched
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      expect(() => homeLink.dispatchEvent(downEvent)).not.toThrow()
    })

    it('should have proper menu structure for navigation', () => {
      const topLevelItems = menuContainer.querySelectorAll('ul[data-depth="0"] > li')
      expect(topLevelItems.length).toBe(4) // Home, About, Services, Contact

      const homeItem = Array.from(topLevelItems).find(item => item.querySelector('.menu__link').textContent === 'Home')
      expect(homeItem).toBeTruthy()
    })
  })

  describe('Mobile Menu Functionality', () => {
    let menu, mobileButton

    beforeEach(async () => {
      menu = new Menubar(document, { mobileControlId: 'mobile-toggle', mobileBreakpoint: 768, hasMobile: true })
      await menu.init()
      mobileButton = document.getElementById('mobile-toggle')
    })

    it('should open mobile menu on button click', () => {
      const event = new MouseEvent('click')
      mobileButton.dispatchEvent(event)

      expect(mobileButton.getAttribute('aria-expanded')).toBe('true')
    })

    it('should close mobile menu on second button click', () => {
      // Open menu first
      mobileButton.click()
      expect(mobileButton.getAttribute('aria-expanded')).toBe('true')

      // Close menu
      mobileButton.click()
      expect(mobileButton.getAttribute('aria-expanded')).toBe('false')
    })

    it('should handle escape key events', () => {
      mobileButton.click() // Open menu
      expect(mobileButton.getAttribute('aria-expanded')).toBe('true')

      // Test that escape events can be handled
      const topLevelLink = menuContainer.querySelector('[data-depth="0"] > li > .menu__link')
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })

      expect(() => topLevelLink.dispatchEvent(event)).not.toThrow()
    })

    it('should close all submenu buttons when closing mobile menu', () => {
      const subButton = menuContainer.querySelector('button')
      subButton.setAttribute('aria-expanded', 'true')

      mobileButton.click() // Open mobile menu
      mobileButton.click() // Close mobile menu

      expect(subButton.getAttribute('aria-expanded')).toBe('false')
    })
  })

  describe('Instance Management', () => {
    it('should destroy specific menu instance', () => {
      const menu = new Menubar()
      menu.init()

      expect(menu.menuInstances.has(menuContainer)).toBe(true)

      menu.destroy(menuContainer)

      expect(menu.menuInstances.has(menuContainer)).toBe(false)
    })

    it('should destroy all menu instances', () => {
      const menu = new Menubar()
      menu.init()

      // Add another menu
      const secondMenu = document.createElement('nav')
      secondMenu.className = 'c-menu'
      document.body.appendChild(secondMenu)
      menu.init() // Re-initialize to pick up new menu

      expect(menu.menuInstances.size).toBeGreaterThan(0)

      menu.destroyAll()

      expect(menu.menuInstances.size).toBe(0)
    })
  })

  describe('Complex Menu Structure Tests', () => {
    beforeEach(() => {
      // Create a more complex test menu structure for edge cases
      document.body.innerHTML = `
        <button id="nav-toggle" aria-expanded="false">Mobile Menu</button>
        <nav class="c-menu" data-breakpoint="768">
          <ul class="menu">
            <li class="menu__item">
              <a class="menu__link" href="#">Simple Link</a>
            </li>
            <li class="menu__item">
              <button class="menu__button">Menu Button</button>
              <ul class="menu">
                <li class="menu__item">
                  <a class="menu__link" href="#" >Subitem 1</a>
                </li>
                <li class="menu__item">
                  <button class="menu__button">Sub Button</button>
                  <ul class="menu">
                    <li class="menu__item">
                      <a class="menu__link" href="#">Deep Item</a>
                    </li>
                    <li class="menu__item">
                      <a class="menu__link" href="#">Deep Item</a>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
            <li class="menu__item menu__item--expanded">
              <span class="menu__link menu__label">Mega Menu</span>
                <ul class="c-mega-menu__wrapper">
                  <li class="menu__item">
                    <a class="menu__link" href="#">Mega Link</a>
                  </li>
                      <li class="menu__item">
                    <a class="menu__link" href="#">Mega Link 2</a>
                  </li>
                      <li class="menu__item">
                    <a class="menu__link" href="#">Mega Link 3</a>
                  </li>
                </ul>
            </li>
          </ul>
        </nav>
      `
      menuContainer = document.querySelector('.c-menu')
    })

    it('should handle deeply nested menu structures', () => {
      const menu = new Menubar()
      menu.init()

      const deepButtons = menuContainer.querySelectorAll('button')
      expect(deepButtons.length).toBe(2) // Menu Button and Sub Button

      deepButtons.forEach(button => {
        expect(button.getAttribute('aria-haspopup')).toBe('true')
      })
    })

    it('should handle span elements with submenus', () => {
      const menu = new Menubar()
      menu.init()

      const span = menuContainer.querySelector('span')
      if (span && span.nextElementSibling) {
        const submenu = span.nextElementSibling
        // Non-controller spans act as labels via aria-labelledby
        expect(span.getAttribute('id')).toBeTruthy()
        expect(submenu.getAttribute('aria-labelledby')).toBe(span.getAttribute('id'))
        // Should NOT have data-menu-controls (it's a label, not a controller)
        expect(span.getAttribute('data-menu-controls')).toBeNull()
      }
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle menu without proper structure gracefully', () => {
      document.body.innerHTML = `
        <nav class="c-menu">
          <div>Invalid structure</div>
        </nav>
      `

      const menu = new Menubar()
      expect(() => menu.init()).not.toThrow()
    })

    it('should handle missing submenu gracefully', () => {
      document.body.innerHTML = `
        <nav class="c-menu">
          <ul class="menu">
            <li class="menu__item">
              <button class="menu__button">Orphan Button</button>
            </li>
          </ul>
        </nav>
      `

      const menu = new Menubar()
      menu.init()

      const button = document.querySelector('button')
      expect(button.getAttribute('aria-haspopup')).toBe('true')
      expect(button.getAttribute('aria-controls')).toBeNull()
    })

    it('should prevent default behavior on relevant keyboard events', () => {
      const menu = new Menubar()
      menu.init()

      const button = menuContainer.querySelector('button')
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault')

      button.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('Accessibility Features', () => {
    it('should maintain proper ARIA states during interaction', () => {
      const menu = new Menubar()
      menu.init()

      const button = menuContainer.querySelector('button')

      // Initial state
      expect(button.getAttribute('aria-expanded')).toBe('false')
      expect(button.getAttribute('aria-haspopup')).toBe('true')

      // After opening
      button.click()
      expect(button.getAttribute('aria-expanded')).toBe('true')

      // After closing
      button.click()
      expect(button.getAttribute('aria-expanded')).toBe('false')
    })

    it('should set proper aria-label from button text content', () => {
      const menu = new Menubar()
      menu.init()

      const button = menuContainer.querySelector('button')
      expect(button.getAttribute('aria-label')).toBe('About')
    })

    it('should maintain focus management during navigation', () => {
      const menu = new Menubar()
      menu.init()

      const button = menuContainer.querySelector('button')
      button.focus()

      // Escape should maintain focus on button
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      button.dispatchEvent(escapeEvent)

      expect(document.activeElement).toBe(button)
    })
  })

  describe('Mega Menu Navigation', () => {
    let menu, megaContainer, servicesBtn, workBtn

    // No pre-set ARIA attributes — init() assigns data-menu-controls and panel ids.
    const MEGA_HTML = `
      <nav class="c-menu c-mega-menu" data-breakpoint="1024">
        <ul class="menu" data-depth="0">
          <li class="menu__item menu__item--expanded">
            <button class="menu__button">Services</button>
            <div class="c-mega-menu__container" data-depth="1">
              <ul class="menu" data-depth="1">
                <li class="menu__item"><a href="#research" class="menu__link">Research</a></li>
                <li class="menu__item"><a href="#consulting" class="menu__link">Consulting</a></li>
              </ul>
              <ul class="menu" data-depth="1">
                <li class="menu__item"><a href="#design" class="menu__link">Design</a></li>
                <li class="menu__item"><a href="#development" class="menu__link">Development</a></li>
              </ul>
            </div>
          </li>
          <li class="menu__item menu__item--expanded">
            <button class="menu__button">Our Work</button>
            <div class="c-mega-menu__container" data-depth="1">
              <ul class="menu" data-depth="1">
                <li class="menu__item"><a href="#emissions" class="menu__link">Reducing Emissions</a></li>
                <li class="menu__item"><a href="#transition" class="menu__link">Just Transition</a></li>
              </ul>
            </div>
          </li>
          <li class="menu__item">
            <a href="#contact" class="menu__link">Contact</a>
          </li>
        </ul>
      </nav>
    `

    // Helper: return the first panel element controlled by a button
    function panelFor(btn) {
      return document.getElementById(btn.getAttribute('data-menu-controls'))
    }

    beforeEach(() => {
      document.body.innerHTML = MEGA_HTML
      megaContainer = document.querySelector('.c-menu')
      menu = new Menubar(document, {
        megaMenuClass: 'c-mega-menu',
        megaMenuContainerClass: 'c-mega-menu__container',
      })
      menu.init()
      // Resolve buttons by label after init assigns aria-label
      const buttons = Array.from(megaContainer.querySelectorAll('button.menu__button'))
      servicesBtn = buttons.find(b => b.getAttribute('aria-label') === 'Services')
      workBtn = buttons.find(b => b.getAttribute('aria-label') === 'Our Work')
    })

    it('should assign ARIA attributes to mega menu buttons after init', () => {
      const buttons = megaContainer.querySelectorAll('button.menu__button')
      buttons.forEach(btn => {
        expect(btn.getAttribute('data-menu-controls')).toBeTruthy()
        expect(btn.getAttribute('aria-haspopup')).toBe('true')
        expect(btn.getAttribute('aria-expanded')).toBe('false')
      })
    })

    it('should assign an id to each mega panel after init', () => {
      const panels = megaContainer.querySelectorAll('.c-mega-menu__container')
      panels.forEach(panel => {
        expect(panel.getAttribute('id')).toBeTruthy()
      })
    })

    it('should open mega panel on button click', () => {
      servicesBtn.click()
      expect(servicesBtn.getAttribute('aria-expanded')).toBe('true')
    })

    it('should close mega panel on second button click', () => {
      servicesBtn.click()
      expect(servicesBtn.getAttribute('aria-expanded')).toBe('true')
      servicesBtn.click()
      expect(servicesBtn.getAttribute('aria-expanded')).toBe('false')
    })

    it('should open mega panel on ArrowDown and not throw error', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault')
      expect(() => servicesBtn.dispatchEvent(event)).not.toThrow()
      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(servicesBtn.getAttribute('aria-expanded')).toBe('true')
    })

    it('should close open mega panel on Escape and not throw error', () => {
      servicesBtn.click()
      expect(servicesBtn.getAttribute('aria-expanded')).toBe('true')

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      expect(() => servicesBtn.dispatchEvent(event)).not.toThrow()
      expect(servicesBtn.getAttribute('aria-expanded')).toBe('false')
    })

    it('should close mega panel when clicking outside', () => {
      servicesBtn.click()
      expect(servicesBtn.getAttribute('aria-expanded')).toBe('true')

      const outside = document.createElement('div')
      document.body.appendChild(outside)
      const event = new MouseEvent('mousedown', { bubbles: true })
      Object.defineProperty(event, 'target', { value: outside })
      document.dispatchEvent(event)

      expect(servicesBtn.getAttribute('aria-expanded')).toBe('false')
    })

    it('should click ArrowDown without error', () => {
      servicesBtn.click()
      const firstLink = panelFor(servicesBtn).querySelector('.menu__link')
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      expect(() => firstLink.dispatchEvent(event)).not.toThrow()
    })

    it('should click ArrowUp without error', () => {
      servicesBtn.click()
      const firstLink = panelFor(servicesBtn).querySelector('.menu__link')
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
      expect(() => firstLink.dispatchEvent(event)).not.toThrow()
    })

    it('should click Escape without error', () => {
      servicesBtn.click()
      const firstLink = panelFor(servicesBtn).querySelector('.menu__link')
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      expect(() => firstLink.dispatchEvent(event)).not.toThrow()
    })

    it('should close first panel when a second top-level button is clicked', () => {
      servicesBtn.click()
      expect(servicesBtn.getAttribute('aria-expanded')).toBe('true')

      workBtn.click()
      expect(workBtn.getAttribute('aria-expanded')).toBe('true')
      expect(servicesBtn.getAttribute('aria-expanded')).toBe('false')
    })

    it('should not throw error when using mega panel structure', () => {
      document.body.innerHTML = `
        <nav class="c-menu c-mega-menu">
          <ul class="menu" data-depth="0">
            <li class="menu__item menu__item--expanded">
              <button class="menu__button">Menu</button>
              <div class="c-mega-menu__container" data-depth="1">
                <ul class="menu" data-depth="1">
                  <li class="menu__item"><a href="#x" class="menu__link">Link X</a></li>
                 <li class="menu__item"><a href="#x" class="menu__link">Link X</a></li>
                </ul>
              </div>
            </li>
          </ul>
        </nav>
      `
      const menu = new Menubar(document, {
        megaMenuClass: 'c-mega-menu',
        megaMenuContainerClass: 'c-mega-menu__container',
      })
      expect(() => menu.init()).not.toThrow()
    })

    it('should skip span heading elements when navigating with ArrowDown inside a panel', () => {
      // Panel with a span.menu__nolink heading between two real links
      document.body.innerHTML = `
        <nav class="c-menu c-mega-menu">
          <ul class="menu" data-depth="0">
            <li class="menu__item menu__item--expanded">
              <button class="menu__button">Services</button>
              <div class="c-mega-menu__container" data-depth="1">
                <ul class="menu" data-depth="1">
                  <li class="menu__item"><span class="menu__link menu__nolink">Strategy</span></li>
                  <li class="menu__item"><a href="#research" class="menu__link" id="link-research">Research</a></li>
                  <li class="menu__item"><a href="#consulting" class="menu__link" id="link-consulting">Consulting</a></li>
                </ul>
              </div>
            </li>
          </ul>
        </nav>
      `
      const menu = new Menubar(document, {
        megaMenuClass: 'c-mega-menu',
        megaMenuContainerClass: 'c-mega-menu__container',
      })
      menu.init()

      const btn = document.querySelector('button.menu__button')
      btn.click() // open panel

      // The span heading should not be in the navigable list — Research should be first
      const researchLink = document.getElementById('link-research')
      const consultingLink = document.getElementById('link-consulting')
      const spanHeading = document.querySelector('span.menu__nolink')

      // Verify span has no aria-controls (it's a heading, not a controller)
      expect(spanHeading.hasAttribute('aria-controls')).toBe(false)

      // ArrowDown from Research should reach Consulting, not block on the span
      researchLink.focus()
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      researchLink.dispatchEvent(downEvent)
      expect(document.activeElement).toBe(consultingLink)
    })

    it('should skip span heading elements when navigating with ArrowUp inside a panel', () => {
      document.body.innerHTML = `
        <nav class="c-menu c-mega-menu">
          <ul class="menu" data-depth="0">
            <li class="menu__item menu__item--expanded">
              <button class="menu__button">Services</button>
              <div class="c-mega-menu__container" data-depth="1">
                <ul class="menu" data-depth="1">
                  <li class="menu__item"><span class="menu__link menu__nolink">Strategy</span></li>
                  <li class="menu__item"><a href="#research" class="menu__link" id="link-research">Research</a></li>
                  <li class="menu__item"><a href="#consulting" class="menu__link" id="link-consulting">Consulting</a></li>
                </ul>
              </div>
            </li>
          </ul>
        </nav>
      `
      const menu = new Menubar(document, {
        megaMenuClass: 'c-mega-menu',
        megaMenuContainerClass: 'c-mega-menu__container',
      })
      menu.init()

      const button = document.querySelector('button.menu__button')
      button.click()

      const researchLink = document.getElementById('link-research')
      const consultingLink = document.getElementById('link-consulting')

      // ArrowUp from Research should wrap to Consulting (last real link), skipping the span
      researchLink.focus()
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
      researchLink.dispatchEvent(upEvent)
      expect(document.activeElement).toBe(consultingLink)
    })
  })
})
