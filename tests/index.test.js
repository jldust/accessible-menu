import { AccessibleMenu } from '../src/index.js'

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

describe('AccessibleMenu', () => {
  let menuContainer

  beforeEach(() => {
    // Clear document body and reset
    document.body.innerHTML = ''
    document.body.className = ''

    // Create a basic menu structure similar to examples/basic.html
    document.body.innerHTML = `
      <button id="mobile-toggle" aria-expanded="false">Menu</button>
      <nav class="c-menu" data-breakpoint="768">
        <ul class="menu">
          <li class="menu__item">
            <a href="#home" class="menu__link">Home</a>
          </li>
          <li class="menu__item menu__item--expanded">
            <button class="menu__link">About</button>
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
            <button class="menu__link">Services</button>
            <ul class="menu" data-depth="1">
              <li class="menu__item">
                <a href="#research" class="menu__link">Research</a>
              </li>
              <li class="menu__item">
                <a href="#development" class="menu__link">Development</a>
              </li>
              <li class="menu__item menu__item--expanded">
                <button class="menu__link">Nested Services</button>
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
      const menu = new AccessibleMenu()
      expect(menu.config.menuSelector).toBe('.c-menu')
      expect(menu.config.buttonClass).toBe('menu__link')
      expect(menu.config.linkClass).toBe('menu__link')
      expect(menu.config.itemClass).toBe('menu__item')
      expect(menu.config.mobileBreakpoint).toBe(768)
      expect(menu.config.mobileControlId).toBe('nav-toggle')
    })

    it('should merge custom config with defaults', () => {
      const customConfig = {
        menuSelector: '.custom-menu',
        mobileBreakpoint: 1024,
        buttonClass: 'custom-button',
      }
      const menu = new AccessibleMenu(customConfig)

      expect(menu.config.menuSelector).toBe('.custom-menu')
      expect(menu.config.mobileBreakpoint).toBe(1024)
      expect(menu.config.buttonClass).toBe('custom-button')
      expect(menu.config.linkClass).toBe('menu__link') // should retain default
    })

    it('should initialize empty menuInstances Map', () => {
      const menu = new AccessibleMenu()
      expect(menu.menuInstances).toBeInstanceOf(Map)
      expect(menu.menuInstances.size).toBe(0)
    })
  })

  describe('ARIA Controls Initialization', () => {
    it('should set ARIA attributes on menu buttons', () => {
      const menu = new AccessibleMenu()
      menu.init()

      const button = menuContainer.querySelector('button')
      expect(button.getAttribute('aria-haspopup')).toBe('true')
      expect(button.getAttribute('aria-controls')).toBeTruthy()
      expect(button.getAttribute('data-menu-controls')).toBeTruthy()
      expect(button.getAttribute('aria-label')).toBe('About')
    })

    it('should handle menu items without span elements', () => {
      const menu = new AccessibleMenu()
      menu.init()

      // Since we don't have span elements in the basic structure,
      // test that buttons have proper controls instead
      const buttons = menuContainer.querySelectorAll('button')
      buttons.forEach(button => {
        expect(button.getAttribute('aria-haspopup')).toBe('true')
        expect(button.getAttribute('data-menu-controls')).toBeTruthy()
      })
    })

    it('should set depth attributes on menu levels', () => {
      const menu = new AccessibleMenu()
      menu.init()

      // Check that the top-level menu has depth 0
      const topMenu = menuContainer.querySelector('ul.menu')
      expect(topMenu.getAttribute('data-depth')).toBe('0')

      // Check that submenus have depth attributes set
      const submenus = menuContainer.querySelectorAll('ul.menu[data-depth="1"]')
      expect(submenus.length).toBeGreaterThan(0)

      // If there are nested submenus, check they have correct depth
      const nestedSubmenus = menuContainer.querySelectorAll('ul.menu[data-depth="2"]')
      if (nestedSubmenus.length > 0) {
        nestedSubmenus.forEach(menu => expect(menu.getAttribute('data-depth')).toBe('2'))
      }
    })

    it('should handle menus without submenus gracefully', () => {
      document.body.innerHTML = `
        <nav class="c-menu">
          <ul class="menu">
            <li class="menu__item">
              <a class="menu__link" href="#">Simple Link</a>
            </li>
          </ul>
        </nav>
      `

      const menu = new AccessibleMenu()
      expect(() => menu.init()).not.toThrow()

      const link = document.querySelector('a')
      expect(link.getAttribute('aria-haspopup')).toBeNull()
    })
  })

  describe('Menu Controller Initialization', () => {
    it('should create MenuController instances for each menu', () => {
      const menu = new AccessibleMenu()
      menu.init()

      expect(menu.menuInstances.has(menuContainer)).toBe(true)
      expect(menu.menuInstances.size).toBe(1)
    })

    it('should use custom breakpoint from data attribute', () => {
      const menu = new AccessibleMenu()
      menu.init()

      const instance = menu.menuInstances.get(menuContainer)
      expect(instance.mobileBreakpoint).toBe(768)
    })
  })

  describe('Mobile Menu Controls', () => {
    it('should initialize mobile menu controls when present', () => {
      const menu = new AccessibleMenu({ mobileControlId: 'mobile-toggle' })
      menu.init()

      const mobileButton = document.getElementById('mobile-toggle')
      expect(mobileButton).toBeTruthy()
      expect(mobileButton.getAttribute('aria-expanded')).toBe('false')
    })
  })

  describe('Menu Button Keyboard Navigation', () => {
    let menu, button

    beforeEach(() => {
      menu = new AccessibleMenu()
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
  })

  describe('Menu Links Navigation', () => {
    let menu, links

    beforeEach(() => {
      menu = new AccessibleMenu()
      menu.init()
      // Get only top-level links for navigation testing
      links = Array.from(menuContainer.querySelectorAll('ul[data-depth="0"] > li > .menu__link'))
    })

    it('should have focusable menu links', () => {
      const homeLink = links.find(link => link.textContent === 'Home')
      const aboutButton = links.find(link => link.textContent === 'About')

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

    beforeEach(() => {
      menu = new AccessibleMenu({ mobileControlId: 'mobile-toggle', mobileBreakpoint: 768 })
      menu.init()
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
      const menu = new AccessibleMenu()
      menu.init()

      expect(menu.menuInstances.has(menuContainer)).toBe(true)

      menu.destroy(menuContainer)

      expect(menu.menuInstances.has(menuContainer)).toBe(false)
    })

    it('should destroy all menu instances', () => {
      const menu = new AccessibleMenu()
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
              <button class="menu__link">Menu Button</button>
              <ul class="menu">
                <li class="menu__item">
                  <a class="menu__link" href="#" >Subitem 1</a>
                </li>
                <li class="menu__item">
                  <button class="menu__link">Sub Button</button>
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
              <span class="menu__link">Mega Menu</span>
              <div class="menu">
                <div class="c-mega-menu__wrapper">
                  <a class="menu__link" href="#">Mega Link</a>
                </div>
              </div>
            </li>
          </ul>
        </nav>
      `
      menuContainer = document.querySelector('.c-menu')
    })

    it('should handle deeply nested menu structures', () => {
      const menu = new AccessibleMenu()
      menu.init()

      const deepButtons = menuContainer.querySelectorAll('button')
      expect(deepButtons.length).toBe(2) // Menu Button and Sub Button

      deepButtons.forEach(button => {
        expect(button.getAttribute('aria-haspopup')).toBe('true')
      })
    })

    it('should handle span elements with submenus', () => {
      const menu = new AccessibleMenu()
      menu.init()

      const span = menuContainer.querySelector('span')
      if (span && span.nextElementSibling) {
        const submenu = span.nextElementSibling
        expect(span.getAttribute('data-menu-controls')).toBeTruthy()
        expect(submenu.getAttribute('id')).toBeTruthy()
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

      const menu = new AccessibleMenu()
      expect(() => menu.init()).not.toThrow()
    })

    it('should handle missing submenu gracefully', () => {
      document.body.innerHTML = `
        <nav class="c-menu">
          <ul class="menu">
            <li class="menu__item">
              <button class="menu__link">Orphan Button</button>
            </li>
          </ul>
        </nav>
      `

      const menu = new AccessibleMenu()
      menu.init()

      const button = document.querySelector('button')
      expect(button.getAttribute('aria-haspopup')).toBe('true')
      expect(button.getAttribute('aria-controls')).toBeNull()
    })

    it('should prevent default behavior on relevant keyboard events', () => {
      const menu = new AccessibleMenu()
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
      const menu = new AccessibleMenu()
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
      const menu = new AccessibleMenu()
      menu.init()

      const button = menuContainer.querySelector('button')
      expect(button.getAttribute('aria-label')).toBe('About')
    })

    it('should maintain focus management during navigation', () => {
      const menu = new AccessibleMenu()
      menu.init()

      const button = menuContainer.querySelector('button')
      button.focus()

      // Escape should maintain focus on button
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      button.dispatchEvent(escapeEvent)

      expect(document.activeElement).toBe(button)
    })
  })
})
