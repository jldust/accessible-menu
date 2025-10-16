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

    // Create a comprehensive test menu structure
    document.body.innerHTML = `
      <button id="nav-trigger" aria-expanded="false">Mobile Menu</button>
      <nav class="c-menu" data-mobile="#nav-trigger" data-breakpoint="768">
        <ul class="menu">
          <li class="menu__item">
            <a class="menu__link" href="#" data-plugin-id="link1">Simple Link</a>
          </li>
          <li class="menu__item">
            <button class="menu__link" data-plugin-id="btn1">Menu Button</button>
            <ul class="menu">
              <li class="menu__item">
                <a class="menu__link" href="#" data-plugin-id="sub1">Subitem 1</a>
              </li>
              <li class="menu__item">
                <button class="menu__link" data-plugin-id="btn2">Sub Button</button>
                <ul class="menu">
                  <li class="menu__item">
                    <a class="menu__link" href="#" data-plugin-id="deep1">Deep Item</a>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li class="menu__item menu__item--expanded">
            <span class="menu__link" data-plugin-id="span1">Mega Menu</span>
            <div class="menu">
              <div class="c-mega-menu__wrapper">
                <a class="menu__link" href="#" data-plugin-id="mega1">Mega Link</a>
              </div>
            </div>
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
      expect(menu.config.mobileControlId).toBe(null)
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

      const button = menuContainer.querySelector('button[data-plugin-id="btn1"]')
      expect(button.getAttribute('aria-haspopup')).toBe('true')
      expect(button.getAttribute('aria-controls')).toBe('panel-btn1')
      expect(button.getAttribute('data-menu-controls')).toBe('panel-btn1')
      expect(button.getAttribute('aria-label')).toBe('Menu Button')
    })

    it('should set ARIA attributes on span elements with submenus', () => {
      const menu = new AccessibleMenu()
      menu.init()

      const span = menuContainer.querySelector('span[data-plugin-id="span1"]')
      const submenu = span.nextElementSibling

      expect(span.getAttribute('data-menu-controls')).toBe('panel-span1')
      expect(submenu.getAttribute('id')).toBe('panel-span1')
    })

    it('should set depth attributes recursively on all menu levels', () => {
      const menu = new AccessibleMenu()
      menu.init()

      const topLevelMenu = menuContainer.querySelector('ul.menu')
      const secondLevelMenu = topLevelMenu.querySelector('ul.menu')
      const thirdLevelMenu = secondLevelMenu.querySelector('ul.menu')

      expect(topLevelMenu.getAttribute('data-depth')).toBe('0')
      expect(secondLevelMenu.getAttribute('data-depth')).toBe('1')
      expect(thirdLevelMenu.getAttribute('data-depth')).toBe('2')
    })

    it('should handle menus without submenus gracefully', () => {
      document.body.innerHTML = `
        <nav class="c-menu">
          <ul class="menu">
            <li class="menu__item">
              <a class="menu__link" href="#" data-plugin-id="simple">Simple Link</a>
            </li>
          </ul>
        </nav>
      `

      const menu = new AccessibleMenu()
      expect(() => menu.init()).not.toThrow()

      const link = document.querySelector('a[data-plugin-id="simple"]')
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
    it('should initialize mobile menu controls when data-mobile attribute present', () => {
      const menu = new AccessibleMenu()
      menu.init()

      const mobileButton = document.getElementById('nav-trigger')
      expect(mobileButton).toBeTruthy()
      expect(mobileButton.getAttribute('aria-expanded')).toBe('false')
    })
  })

  describe('Menu Button Keyboard Navigation', () => {
    let menu, button

    beforeEach(() => {
      menu = new AccessibleMenu()
      menu.init()
      button = menuContainer.querySelector('button[data-plugin-id="btn1"]')
    })

    it('should open menu on down arrow key', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      button.dispatchEvent(event)

      expect(button.getAttribute('aria-expanded')).toBe('true')
    })

    it('should open menu on right arrow key', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      button.dispatchEvent(event)

      expect(button.getAttribute('aria-expanded')).toBe('true')
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
      links = Array.from(menuContainer.querySelectorAll('a.menu__link'))
    })

    it('should focus next item on down arrow', () => {
      const firstLink = links[0]
      const secondLink = links[1]

      firstLink.focus()
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      firstLink.dispatchEvent(event)

      expect(document.activeElement).toBe(secondLink)
    })

    it('should focus previous item on up arrow', () => {
      const firstLink = links[0]
      const secondLink = links[1]

      secondLink.focus()
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      secondLink.dispatchEvent(event)

      expect(document.activeElement).toBe(firstLink)
    })

    it('should wrap to last item when going up from first item', () => {
      const firstLink = links[0]
      const lastLink = links[links.length - 1]

      firstLink.focus()
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      firstLink.dispatchEvent(event)

      expect(document.activeElement).toBe(lastLink)
    })

    it('should wrap to first item when going down from last item', () => {
      const firstLink = links[0]
      const lastLink = links[links.length - 1]

      lastLink.focus()
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      lastLink.dispatchEvent(event)

      expect(document.activeElement).toBe(firstLink)
    })
  })

  describe('Mobile Menu Functionality', () => {
    let menu, mobileButton

    beforeEach(() => {
      menu = new AccessibleMenu({ mobileControlId: 'nav-trigger' })
      menu.init()
      mobileButton = document.getElementById('nav-trigger')
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

    it('should close mobile menu on escape key', () => {
      mobileButton.click() // Open menu

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      window.dispatchEvent(event)

      expect(mobileButton.getAttribute('aria-expanded')).toBe('false')
    })

    it('should close all submenu buttons when closing mobile menu', () => {
      const subButton = menuContainer.querySelector('button[data-plugin-id="btn2"]')
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

    it('should handle buttons without data-plugin-id', () => {
      document.body.innerHTML = `
        <nav class="c-menu">
          <ul class="menu">
            <li class="menu__item">
              <button class="menu__link">No ID Button</button>
            </li>
          </ul>
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
              <button class="menu__link" data-plugin-id="orphan">Orphan Button</button>
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

      const button = menuContainer.querySelector('button[data-plugin-id="btn1"]')
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

      const button = menuContainer.querySelector('button[data-plugin-id="btn1"]')

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

      const button = menuContainer.querySelector('button[data-plugin-id="btn1"]')
      expect(button.getAttribute('aria-label')).toBe('Menu Button')
    })

    it('should maintain focus management during navigation', () => {
      const menu = new AccessibleMenu()
      menu.init()

      const button = menuContainer.querySelector('button[data-plugin-id="btn1"]')
      button.focus()

      // Escape should maintain focus on button
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      button.dispatchEvent(escapeEvent)

      expect(document.activeElement).toBe(button)
    })
  })
})
