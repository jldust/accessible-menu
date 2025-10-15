/**
 * Simple once utility to ensure initialization happens only once per element
 * @param {string} id - Unique identifier for the initialization
 * @param {string} selector - CSS selector for elements to initialize
 * @param {HTMLElement|Document} context - Context to search within
 * @returns {HTMLElement[]} - Array of elements that haven't been initialized yet
 * TODO: Adjust keyboard arrows, feature does not work properly in nested menus
 */
function once(id, selector, context = document) {
  const elements = Array.from(context.querySelectorAll(selector))
  const dataAttribute = `data-once-${id}`

  return elements.filter(element => {
    if (element.hasAttribute(dataAttribute)) {
      return false
    }
    element.setAttribute(dataAttribute, 'true')
    return true
  })
}

/**
 * Default configuration for the accessible menu
 */
const DEFAULT_CONFIG = {
  menuSelector: '.c-menu',
  buttonClass: 'menu__link',
  linkClass: 'menu__link',
  itemClass: 'menu__item',
  mobileBreakpoint: 768,
  mobileControlId: 'nav-trigger',
  dataBreakpointAttribute: 'data-breakpoint',
  dataMobileAttribute: 'data-mobile',
  dataPluginIdAttribute: 'data-plugin-id',
}

/**
 * AccessibleMenu - A configurable accessible menu component
 *
 * @class AccessibleMenu
 */
export class AccessibleMenu {
  /**
   * Create an AccessibleMenu instance
   * @param {Object} config - Configuration options
   * @param {string} config.menuSelector - CSS selector for menu containers
   * @param {string} config.buttonClass - CSS class for menu buttons
   * @param {string} config.linkClass - CSS class for menu links
   * @param {string} config.itemClass - CSS class for menu items
   * @param {number} config.mobileBreakpoint - Mobile breakpoint in pixels
   * @param {string} config.mobileControlId - ID of the mobile menu control button
   * @param {string} config.dataBreakpointAttribute - Data attribute for custom breakpoint
   * @param {string} config.dataMobileAttribute - Data attribute for mobile control reference
   * @param {string} config.dataPluginIdAttribute - Data attribute for plugin ID
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.menuInstances = new Map()
  }

  /**
   * Initialize all menus on the page
   * @param {HTMLElement|Document} context - The context to search for menus
   */
  init(context = document) {
    this.attachAriaControls(context)
    this.attachMenuControls(context)
    this.attachMobileControls(context)
  }

  /**
   * Attach ARIA controls to menu elements
   * @param {HTMLElement|Document} context - The context to search for menus
   */
  attachAriaControls(context) {
    const menus = once('ariaControls', this.config.menuSelector, context)

    menus.forEach(menu => {
      // Set depth attributes for all menu levels
      this.setMenuDepthAttributes(menu)

      // Find top-level menu buttons
      const buttons = menu.querySelectorAll(`:scope button.${this.config.buttonClass}`)

      // Find menu spans for megamenu items
      const spans = menu.querySelectorAll(`:scope span.${this.config.linkClass}`)

      // Attach controls to buttons and spans
      this.attachControlsToElements([...buttons, ...spans])
    })
  }

  /**
   * Set depth attributes for all menu levels
   * @param {HTMLElement} menuContainer - The main menu container
   */
  setMenuDepthAttributes(menuContainer) {
    // Find the top-level menu (direct child ul of the menu container)
    const topLevelMenu = menuContainer.querySelector(':scope > .menu, :scope > ul')

    if (topLevelMenu) {
      this.setDepthRecursively(topLevelMenu, 0)
    }
  }

  /**
   * Recursively set data-depth attributes for menu levels
   * @param {HTMLElement} menuElement - The menu ul element
   * @param {number} depth - The current depth level
   */
  setDepthRecursively(menuElement, depth) {
    // Set the data-depth attribute on the current menu level
    menuElement.setAttribute('data-depth', depth.toString())

    // Find all submenu ul elements that are direct children of menu items
    const submenus = menuElement.querySelectorAll(':scope > .menu__item > .menu, :scope > .menu__item > ul')

    // Recursively set depth for each submenu
    submenus.forEach(submenu => {
      this.setDepthRecursively(submenu, depth + 1)
    })
  }

  /**
   * Attach controls to given elements
   * @param {HTMLElement[]} elements - Array of elements to attach controls to
   */
  attachControlsToElements(elements) {
    elements.forEach((element, index) => {
      let id = element.getAttribute(this.config.dataPluginIdAttribute)

      // Generate unique ID if not present for controls
      if (!id) {
        const random = Math.floor(Math.random() * 10000)
        id = `menu-${random}`
        element.setAttribute(this.config.dataPluginIdAttribute, id)
      }

      const submenu = element.nextElementSibling

      if (element.tagName === 'BUTTON') {
        element.setAttribute('aria-haspopup', 'true')
        if (submenu) {
          const submenuId = `panel-${id}`
          submenu.setAttribute('id', submenuId)
          element.setAttribute('aria-controls', submenuId)
          element.setAttribute('data-menu-controls', submenuId)
          element.setAttribute('aria-label', element.textContent.trim())
        }
      } else if (submenu) {
        const submenuId = `panel-${id}`
        submenu.setAttribute('id', submenuId)
        element.setAttribute('data-menu-controls', submenuId)

        // If nested under mega menu also apply data-menu-controls to ul
        const nestedMenu = submenu.querySelector('.menu')
        if (nestedMenu) {
          nestedMenu.setAttribute('data-menu-controls', submenuId)
        }
      }
    })
  }

  /**
   * Attach menu controls for keyboard navigation
   * @param {HTMLElement|Document} context - The context to search for menus
   */
  attachMenuControls(context) {
    const menus = once('menuControl', this.config.menuSelector, context)

    menus.forEach(menuContainer => {
      const menuInstance = new MenuController(menuContainer, this.config)
      this.menuInstances.set(menuContainer, menuInstance)
    })
  }

  /**
   * Attach mobile menu controls
   * @param {HTMLElement|Document} context - The context to search for menus
   */
  attachMobileControls(context) {
    const menus = once('mobileMenuControls', `${this.config.menuSelector}[${this.config.dataMobileAttribute}]`, context)

    menus.forEach(menuContainer => {
      new MobileMenuController(menuContainer, this.config)
    })
  }

  /**
   * Destroy a menu instance
   * @param {HTMLElement} menuContainer - The menu container to destroy
   */
  destroy(menuContainer) {
    const instance = this.menuInstances.get(menuContainer)
    if (instance) {
      instance.destroy()
      this.menuInstances.delete(menuContainer)
    }
  }

  /**
   * Destroy all menu instances
   */
  destroyAll() {
    this.menuInstances.forEach((instance, container) => {
      this.destroy(container)
    })
  }
}

/**
 * Menu Controller for keyboard navigation
 */
class MenuController {
  constructor(menuContainer, config) {
    this.menuContainer = menuContainer
    this.config = config
    this.mobileBreakpoint = this.getMobileBreakpoint()
    this.mobileMediaQuery = window.matchMedia(`(max-width: ${this.mobileBreakpoint}px)`)

    this.initializeMenus()
  }

  getMobileBreakpoint() {
    if (this.menuContainer.hasAttribute(this.config.dataBreakpointAttribute)) {
      return parseInt(this.menuContainer.getAttribute(this.config.dataBreakpointAttribute).replace('#', ''))
    }
    return this.config.mobileBreakpoint
  }

  initializeMenus() {
    // Initialize MenuButton for each button in the menuContainer
    this.menuContainer.querySelectorAll(`button.${this.config.buttonClass}`).forEach(button => {
      new MenuButton(button, this.config, this.mobileMediaQuery)
    })

    // Initialize main menu list
    this.menuContainer
      .querySelectorAll(
        `.${this.config.itemClass}:not(.${this.config.itemClass}--expanded:has(> span.${this.config.linkClass}))`,
      )
      .forEach(item => {
        const link = item.querySelector(`.${this.config.linkClass}`)
        if (link && link.tagName !== 'BUTTON') {
          new MenuLinks(link, this.config)
        }
      })
  }
}

/**
 * Mobile Menu Controller
 */
class MobileMenuController {
  constructor(menuContainer, config) {
    this.menuContainer = menuContainer
    this.config = config
    this.init()
  }

  init() {
    const mobileNavButtonId = this.menuContainer.getAttribute(this.config.dataMobileAttribute).replace('#', '')

    this.mobileNavButton = document.getElementById(mobileNavButtonId)

    if (!this.mobileNavButton) {
      console.warn(`Mobile menu button with ID "${mobileNavButtonId}" not found`)
      return
    }

    this.mobileBreakpoint =
      this.menuContainer.getAttribute(this.config.dataBreakpointAttribute)?.replace('#', '') ||
      this.config.mobileBreakpoint

    this.mobileMediaQuery = window.matchMedia(`(max-width: ${this.mobileBreakpoint}px)`)

    this.setupEventListeners()
  }

  setupEventListeners() {
    this.mobileNavButton?.addEventListener('click', this.mobileControl.bind(this))
    window.addEventListener('keydown', this.handleEscape.bind(this))
  }

  closeMobile(key) {
    document.body.classList.remove('js-prevent-scroll')
    this.mobileNavButton.setAttribute('aria-expanded', 'false')

    // Close all dropdown sub-menus
    const menuButtons = this.menuContainer.querySelectorAll(`button.${this.config.buttonClass}`)
    menuButtons.forEach(button => {
      button.setAttribute('aria-expanded', 'false')
    })

    // If escape key, set focus
    if (key === 'Esc' || key === 'Escape') {
      this.mobileNavButton.focus()
    }

    // Remove window listener
    window.removeEventListener('click', this.onWindowClick.bind(this))
  }

  mobileControl(event) {
    const isMenuClosed = this.mobileNavButton.getAttribute('aria-expanded') === 'false'

    if (isMenuClosed) {
      document.body.classList.add('js-prevent-scroll')
      this.mobileNavButton.setAttribute('aria-expanded', 'true')
      event.stopPropagation()
      window.addEventListener('click', this.onWindowClick.bind(this))
    } else {
      this.closeMobile()
    }
  }

  handleEscape(e) {
    if (
      this.mobileNavButton &&
      this.mobileNavButton.getAttribute('aria-expanded') === 'true' &&
      (e.key === 'Esc' || e.key === 'Escape')
    ) {
      this.closeMobile('Esc')
    }
  }

  onWindowClick(event) {
    if (this.mobileMediaQuery.matches && !this.menuContainer.contains(event.target)) {
      this.closeMobile()
    }
  }
}

/**
 * MenuLinks class for basic menu link functionality
 */
class MenuLinks {
  constructor(domNode, config) {
    this.domNode = domNode
    this.config = config

    // Find parent ul element
    const parentMenu = domNode.closest('ul')

    if (parentMenu) {
      this.menuitemNodes = Array.from(parentMenu.querySelectorAll(`.${config.linkClass}`))
    } else {
      this.menuitemNodes = Array.from(domNode.querySelectorAll(`.${config.linkClass}`))
    }

    // @TODO: Replace with a more dynamic solution
    // Check for mega menu
    const megaMenuWrapper = domNode.closest('.c-mega-menu__wrapper')
    if (megaMenuWrapper) {
      const megaMenuLinks = Array.from(megaMenuWrapper.querySelectorAll(`.${config.linkClass}`))
      this.menuitemNodes = [...this.menuitemNodes, ...megaMenuLinks]
    }

    if (domNode && domNode.nodeName === 'BUTTON') {
      this.menuitemNodes = this.menuitemNodes.filter(item => item !== domNode)
    } else {
      this.domNode.addEventListener('keydown', this.onMenuitemKeydown.bind(this))
    }

    this.firstMenuitem = this.menuitemNodes[0]
    this.lastMenuitem = this.menuitemNodes[this.menuitemNodes.length - 1]
  }

  onMenuitemKeydown(event) {
    let flag = false

    switch (event.key) {
      case 'Up':
      case 'ArrowUp':
        this.handleUpArrow(event.target)
        flag = true
        break

      case 'Down':
      case 'ArrowDown':
        this.handleDownArrow(event.target)
        flag = true
        break

      case 'Left':
      case 'ArrowLeft':
        this.handleLeftArrow()
        break

      case 'Right':
      case 'ArrowRight':
        this.handleRightArrow()
        break

      case 'Tab':
        this.handleTab(event)
        break

      case 'Escape':
      case 'Esc':
        this.handleEscape()
        if (!this.mobileMediaQuery || !this.mobileMediaQuery.matches) {
          flag = true
          event.stopPropagation()
        }
        break

      default:
        break
    }

    if (flag) {
      event.preventDefault()
    }
  }

  // Implement navigation methods (simplified versions of the original)
  handleUpArrow(target) {
    const currentIndex = this.menuitemNodes.indexOf(target)
    const prevItem = this.getPreviousItem(this.menuitemNodes, currentIndex)
    if (prevItem) {
      prevItem.focus()
    }
  }

  handleDownArrow(target) {
    const currentIndex = this.menuitemNodes.indexOf(target)
    const nextItem = this.getNextItem(this.menuitemNodes, currentIndex)
    if (nextItem) {
      nextItem.focus()
    }
  }

  handleLeftArrow() {
    // Find parent ul element to check depth
    const parentMenu = this.domNode.closest('ul')

    if (parentMenu && parentMenu.dataset.depth && parentMenu.dataset.depth > 0) {
      // Nested menu - navigate to parent or previous top-level item
      this.handleNestedMenuLeft()
    } else {
      // Top-level menu - navigate to previous sibling
      this.handleNonNestedMenu('left')
    }
  }

  handleRightArrow() {
    // Find parent ul element to check depth
    const parentMenu = this.domNode.closest('ul')

    if (parentMenu && parentMenu.dataset.depth && parentMenu.dataset.depth > 0) {
      // Nested menu - navigate to next top-level item
      this.handleNestedMenuRight()
    } else {
      // Top-level menu - navigate to next sibling
      this.handleNonNestedMenu('right')
    }
  }

  handleTab(event) {
    // TODO
  }

  handleEscape() {
    // Find controlling button and close menu
    const menuNode = this.domNode.closest('ul')
    if (menuNode && menuNode.id) {
      const controllingButton = document.querySelector(`[data-menu-controls="${menuNode.id}"]`)
      if (controllingButton) {
        controllingButton.setAttribute('aria-expanded', 'false')
        controllingButton.focus()
      }
    }
  }

  handleNestedMenuLeft() {
    // Find the closest menu container to get access to proper navigation
    const menuContainer = this.domNode.closest(this.config.menuSelector)

    // Find parent ul element
    const parentMenu = this.domNode.closest('ul')

    // Find the menu controller for this nested menu
    const menuController = this.findMenuController(parentMenu, menuContainer)

    if (menuController) {
      const parentMenuItem = menuController.closest(`.${this.config.itemClass}`)
      const parentUl = parentMenuItem?.closest('ul[data-depth]')

      // If parent menu item is in the menubar (data-depth="0")
      if (parentUl && parentUl.dataset.depth === '0') {
        this.navigateToTopLevelItem(parentMenuItem, 'previous', menuContainer)
        return
      } else {
        // Close submenu and focus parent
        // this.closeSubmenuAndFocusParent(menuController)

        // if (this.menuController?.tagName === 'BUTTON') {
        //   this.menuController.setAttribute('aria-expanded', 'false')
        // }
        // menuController.focus()
        return
      }
    }
  }

  handleNestedMenuRight() {
    // Find the closest menu container to get access to proper navigation
    const menuContainer = this.domNode.closest(this.config.menuSelector)

    // Find the top-level controller item for this nested menu
    const controllerItem = this.findControllerItem(menuContainer)

    if (controllerItem) {
      this.navigateToTopLevelItem(controllerItem, 'next', menuContainer)
    }
  }

  findMenuController(menuNode, menuContainer) {
    return menuContainer.querySelector(`[data-menu-controls="${menuNode.id}"]`)
  }

  findControllerItem(menuContainer) {
    // Traverse up from current element to find top-level menu item
    let currentElement = this.domNode

    while (currentElement) {
      // Look for a menu item that is a direct child of data-depth="0" menu
      const parentUl = currentElement.closest('ul[data-depth="0"]')
      if (parentUl) {
        // Check if this element is a direct child of the top-level menu
        const menuItem = currentElement.closest(`.${this.config.itemClass}`)
        if (menuItem && menuItem.parentElement === parentUl) {
          return menuItem
        }
      }
      // Move up to parent menu item
      currentElement = currentElement
        .closest(`.${this.config.itemClass}`)
        ?.parentElement?.closest(`.${this.config.itemClass}`)
      if (!currentElement) break
    }

    return null
  }

  navigateToTopLevelItem(currentItem, direction, menuContainer) {
    const topLevelItems = this.getTopLevelMenuItems(menuContainer)
    const currentIndex = topLevelItems.indexOf(currentItem)

    let targetIndex
    if (direction === 'next') {
      targetIndex = currentIndex + 1 < topLevelItems.length ? currentIndex + 1 : 0
    } else {
      targetIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : topLevelItems.length - 1
    }

    const targetMenuItem = topLevelItems[targetIndex]
    let targetMenuLink = targetMenuItem.querySelector(`.${this.config.linkClass}`)

    // Close open buttons if not on mobile
    this.closeAllButtons(menuContainer)

    // Focus on the target menu item
    targetMenuLink.focus()

    // If target has a submenu, open it but keep focus on parent
    if (targetMenuLink.tagName === 'BUTTON' && targetMenuLink.getAttribute('aria-expanded') === 'false') {
      targetMenuLink.click()
    }
  }

  getTopLevelMenuItems(menuContainer) {
    // Find top level menu with data-depth="0"
    let topMenu = menuContainer.querySelector('[data-depth="0"]')

    if (!topMenu) {
      // Fallback: find the first ul in the menu container
      topMenu = menuContainer.querySelector('ul')
    }

    // Get all top level menu items
    return Array.from(topMenu.querySelectorAll(`.${this.config.itemClass}`)).filter(item => {
      // Only include direct top-level items
      const parentUl = item.closest('ul[data-depth]')
      return parentUl && parentUl.dataset.depth === '0'
    })
  }

  handleNonNestedMenu(direction) {
    // Find parent ul element
    const parentMenu = this.domNode.closest('ul')
    const menuItems = Array.from(parentMenu.children)

    // Find the index of the current menu item
    const currentMenuItem = this.domNode.closest(`.${this.config.itemClass}`)
    let targetIndex = menuItems.indexOf(currentMenuItem)

    // Get the appropriate sibling
    let siblingToFocus
    if (direction === 'right') {
      siblingToFocus = this.getNextItem(menuItems, targetIndex)
    } else {
      siblingToFocus = this.getPreviousItem(menuItems, targetIndex)
    }

    // For top-level menu items, close any open submenus when navigating away
    if (parentMenu.dataset.depth === '0') {
      const menuContainer = this.domNode.closest(this.config.menuSelector)
      this.closeAllButtons(menuContainer)
    }

    // Focus on the link within the target menu item
    const linkToFocus = siblingToFocus.querySelector(`.${this.config.linkClass}`)
    linkToFocus.focus()
  }

  closeSubmenuAndFocusParent(menuController) {
    console.log('Closing submenu and focusing parent')
    if (menuController?.tagName === 'BUTTON') {
      menuController.setAttribute('aria-expanded', 'false')
    }
    menuController.focus()
  }

  closeAllButtons(menuContainer) {
    // Close all expanded buttons
    const allButtons = menuContainer.querySelectorAll(`button.${this.config.buttonClass}[aria-expanded="true"]`)

    allButtons.forEach(button => {
      if (button !== this.domNode) {
        button.setAttribute('aria-expanded', 'false')
      }
    })
  }

  getNextItem(menuItems, targetIndex) {
    return this.isLastItem(menuItems, targetIndex) ? menuItems[0] : menuItems[targetIndex + 1]
  }

  getPreviousItem(menuItems, targetIndex) {
    return targetIndex === 0 ? menuItems[menuItems.length - 1] : menuItems[targetIndex - 1]
  }

  isLastItem(menuItems, targetIndex) {
    return targetIndex === menuItems.length - 1
  }
}

/**
 * MenuButton class for menu buttons with submenu functionality
 */
class MenuButton extends MenuLinks {
  constructor(buttonNode, config, mobileMediaQuery) {
    const menuContainer = buttonNode.closest(config.menuSelector)
    super(buttonNode, config)

    this.buttonNode = buttonNode
    this.config = config
    this.mobileMediaQuery = mobileMediaQuery

    // Find the related menu
    const controlsId = buttonNode.getAttribute('data-menu-controls')
    this.menuNode = controlsId ? document.getElementById(controlsId) : null

    if (this.menuNode) {
      this.menuitemNodes = Array.from(this.menuNode.querySelectorAll(`.${config.linkClass}`))
      this.firstMenuitem = this.menuitemNodes[0]
      this.lastMenuitem = this.menuitemNodes[this.menuitemNodes.length - 1]
    }

    // Set initial state
    this.buttonNode.setAttribute('aria-expanded', 'false')

    // Add event listeners
    this.buttonNode.addEventListener('keydown', this.onButtonKeydown.bind(this))
    this.buttonNode.addEventListener('click', this.onButtonClick.bind(this))

    if (this.menuNode) {
      this.menuitemNodes.forEach(item => {
        item.addEventListener('keydown', this.onMenuitemKeydown.bind(this))
      })
    }

    // Add background click listener
    document.addEventListener('mousedown', this.onBackgroundMousedown.bind(this))
  }

  onButtonKeydown(event) {
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return
    }

    let flag = false

    switch (event.key) {
      case 'Up':
      case 'ArrowUp':
        this.handleUpArrow(this.buttonNode)
        break

      case 'Down':
      case 'ArrowDown':
        if (this.buttonNode.nextElementSibling?.dataset.depth === '1') {
          this.openPopup()
          this.focusFirstItem(this.buttonNode)
          flag = true
        } else {
          this.handleDownArrow(this.buttonNode)
          flag = true
        }
        break

      case 'Left':
      case 'ArrowLeft':
        if (this.buttonNode.nextElementSibling?.dataset.depth === '1') {
          // Top-level button with submenu - navigate to previous top-level item
          const menuContainer = this.buttonNode.closest(this.config.menuSelector)
          const currentMenuItem = this.buttonNode.closest(`.${this.config.itemClass}`)
          this.navigateToTopLevelItem(currentMenuItem, 'previous', menuContainer)
        } else {
          // Close popup and stay on button for nested menus
          this.closePopup()
          this.buttonNode.focus()
        }
        break

      case 'Right':
      case 'ArrowRight':
        if (this.buttonNode.nextElementSibling?.dataset.depth === '1') {
          // Top-level button with submenu - navigate to next top-level item
          const menuContainer = this.buttonNode.closest(this.config.menuSelector)
          const currentMenuItem = this.buttonNode.closest(`.${this.config.itemClass}`)
          this.navigateToTopLevelItem(currentMenuItem, 'next', menuContainer)
        } else {
          // Open popup for nested menus
          this.openPopup()
          this.focusFirstItem(this.buttonNode)
        }
        break

      case 'Esc':
      case 'Escape':
        this.closePopup()
        flag = true
        break

      default:
        break
    }

    if (flag) {
      event.preventDefault()
    }
  }

  onButtonClick(event) {
    if (this.isOpen()) {
      this.closePopup()
    } else {
      this.openPopup()
    }

    event.stopPropagation()
    event.preventDefault()
  }

  focusFirstItem(element) {
    const controlsId = element.getAttribute('data-menu-controls')
    const nestedList = controlsId ? document.getElementById(controlsId) : null

    if (nestedList) {
      const firstItem = nestedList.querySelector(`.${this.config.linkClass}`)
      if (firstItem) {
        if (firstItem.tagName !== 'BUTTON' && firstItem.tagName !== 'A') {
          this.focusFirstItem(firstItem)
        } else {
          firstItem.focus()
        }
      }
    }
  }

  isOpen() {
    return this.buttonNode.getAttribute('aria-expanded') === 'true'
  }

  openPopup() {
    this.closeAll()
    this.buttonNode.setAttribute('aria-expanded', 'true')
  }

  closePopup() {
    this.buttonNode.setAttribute('aria-expanded', 'false')
  }

  closeAll() {
    // Close all other expanded buttons at the same level
    const menuContainer = this.buttonNode.closest(this.config.menuSelector)
    const allButtons = menuContainer.querySelectorAll(`button.${this.config.buttonClass}[aria-expanded="true"]`)

    allButtons.forEach(button => {
      if (button !== this.buttonNode) {
        button.setAttribute('aria-expanded', 'false')
      }
    })
  }

  onBackgroundMousedown(event) {
    const menuContainer = this.buttonNode.closest(this.config.menuSelector)

    if (
      !menuContainer.contains(event.target) &&
      this.isOpen() &&
      (!this.mobileMediaQuery || !this.mobileMediaQuery.matches)
    ) {
      this.buttonNode.focus()
      this.closePopup()
    }
  }
}

// Export default instance for easy usage
export default AccessibleMenu
