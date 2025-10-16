/**
 * Simple once utility to ensure initialization happens only once per element
 * @param {string} id - Unique identifier for the initialization
 * @param {string} selector - CSS selector for elements to initialize
 * @param {HTMLElement|Document} context - Context to search within
 * @returns {HTMLElement[]} - Array of elements that haven't been initialized yet
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
  megaMenuClass: 'c-mega-menu',
  controllerTags: ['button', 'span'],
  controllerClass: 'controller',
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
   * @param {string} config.megaMenuClass - CSS class for mega menu wrapper
   * @param {string[]} config.controllerTags - Array of HTML tag names that can act as menu controllers
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

      // Find all controller elements (buttons, spans, etc.)
      const controllerSelectors = this.config.controllerTags
        .map(tag => `:scope ${tag}.${this.config.buttonClass}`)
        .join(', ')
      const controllers = menu.querySelectorAll(controllerSelectors)

      // Attach controls to all controller elements
      this.attachControlsToElements([...controllers])
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
   * Check if an element is a valid controller based on config
   * @param {HTMLElement} element - The element to check
   * @returns {boolean} - True if element is a valid controller
   */
  isController(element) {
    return this.config.controllerTags.includes(element.tagName.toLowerCase())
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

      if (this.isController(element)) {
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
    // Create selector for controller elements
    const controllerSelectors = this.config.controllerTags.map(tag => `${tag}.${this.config.buttonClass}`).join(', ')

    // Initialize MenuButton for each controller in the menuContainer
    this.menuContainer.querySelectorAll(controllerSelectors).forEach(controller => {
      new MenuButton(controller, this.config, this.mobileMediaQuery)
    })

    // Initialize main menu list
    this.menuContainer
      .querySelectorAll(
        `.${this.config.itemClass}:not(.${this.config.itemClass}--expanded:has(> span.${this.config.linkClass}))`,
      )
      .forEach(item => {
        const link = item.querySelector(`.${this.config.linkClass}`)
        if (link && !this.config.controllerTags.includes(link.tagName.toLowerCase())) {
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

    // Check for mega menu using dynamic config
    const megaMenuWrapper = domNode.closest(`.${config.megaMenuClass}`)
    if (megaMenuWrapper) {
      const megaMenuLinks = Array.from(megaMenuWrapper.querySelectorAll(`.${config.linkClass}`))
      this.menuitemNodes = [...this.menuitemNodes, ...megaMenuLinks]
    }

    if (domNode && config.controllerTags.includes(domNode.tagName.toLowerCase())) {
      this.menuitemNodes = this.menuitemNodes.filter(item => item !== domNode)
    } else {
      this.domNode.addEventListener('keydown', this.onMenuitemKeydown.bind(this))
    }

    this.firstMenuitem = this.menuitemNodes[0]
    this.lastMenuitem = this.menuitemNodes[this.menuitemNodes.length - 1]
  }

  /**
   * Handles keydown events on menu link items.
   *
   * @param {KeyboardEvent} event - The keydown event.
   * This method checks the key pressed and performs the corresponding action:
   * - Up or ArrowUp: Calls the handleUpArrow method and prevents the default action.
   * - Down or ArrowDown: Calls the handleDownArrow method and prevents the default action.
   * - Left or ArrowLeft: Calls the handleLeftArrow method.
   * - Right or ArrowRight: Calls the handleRightArrow method.
   * - Tab: Calls the handleTab method.
   * - Escape or Esc: Calls the handleEscape method and, if not on mobile, prevents the default action and stops propagation.
   */
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

  /*----------------------------------------------*\
      Keydown functions for MenuLinks
  \*----------------------------------------------*/

  /**
   * Handles the 'Up Arrow' key event for a menu item.
   *
   * @param {HTMLElement} target - The current active menu item.
   *
   * This method finds the previous sibling menu item of the current active menu item.
   * If such a sibling menu item exists and it contains a link, it focuses on that link.
   * Otherwise, it finds the closest parent 'ul' element, gets all its direct child menu item links,
   * and focuses on the last one.
   */
  handleUpArrow(target) {
    const currentIndex = this.menuitemNodes.indexOf(target)
    const prevItem = this.getPreviousItem(this.menuitemNodes, currentIndex)
    if (prevItem) {
      prevItem.focus()
    }
  }

  /**
   * Handles the 'Down Arrow' key event for a menu item.
   *
   * @param {HTMLElement} target - The current active menu item.
   *
   * This method finds the next sibling menu item of the current active menu item.
   * If such a sibling menu item exists and it contains a link, it focuses on that link.
   * Otherwise, it finds the closest parent 'ul' element, looks for a sibling linkgets all its direct child menu item links,
   * and focuses on the last one.
   */
  handleDownArrow(target) {
    // Find parent ul element to determine menu depth
    const parentMenu = target.closest('ul[data-depth]')
    let menuDepth = parentMenu ? parseInt(parentMenu.getAttribute('data-depth')) : 0

    // If it's a mega menu, find the related controller and use its data depth instead
    const megaMenu = target.closest(`.${this.config.megaMenuClass}`)
    if (megaMenu) {
      const megaMenuDepth = megaMenu.getAttribute('data-depth')
      if (megaMenuDepth) {
        menuDepth = parseInt(megaMenuDepth)
      }
    }

    // If we are at the top level and the target is a link, do nothing.
    if (menuDepth === 0 && target?.tagName === 'A') return

    // Build selector for controller options
    const controler = this.config.controllerTags
      .map(
        tag =>
          `${tag}.${this.config.buttonClass}[aria-expanded="true"] + ul, ${tag}.${this.config.buttonClass}[aria-expanded="true"] + .menu`,
      )
      .join(', ')

    const rootMenu = target.closest(controler)

    // Focusable elements are links or buttons that are visible.
    const focusableElements = this.getFocusableElements(rootMenu)

    if (focusableElements.length > 0 && focusableElements.indexOf(target) >= 0) {
      const index = focusableElements.indexOf(target)
      const next = index + 1 < focusableElements.length ? focusableElements[index + 1] : focusableElements[0]

      next.focus()
    }
  }

  /**
   * Handles the 'Left Arrow' key event for a menu item.
   *
   * This method checks if the parent menu of the current active menu item is a nested menu with data-depth > 0.
   * If it is, it calls the `handleNestedMenuLeft` method.
   * Otherwise, it calls the `handleNonNestedMenu` method with "left" as an argument.
   */
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

  /**
   * Handles the 'Right Arrow' key event for a menu item.
   *
   * This method determines the type of the parent menu of the current active menu item based on its data-depth attribute.
   * If the parent menu is a nested menu (data-depth > 0), it delegates the handling to the `handleNestedMenuRight` method.
   * If the parent menu is not a nested menu (data-depth <= 0), it delegates the handling to the `handleNonNestedMenu` method.
   * Both `handleNestedMenuRight` and `handleNonNestedMenu` methods are called with "right" as an argument.
   */
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

  /**
   * Handles the 'Tab' key event for a menu item.
   *
   * @param {Event} event - The key event.
   *
   * Preconditions:
   * - The method is called within the context of a nested menu (depth > 0).
   * - The target menu item is the first child of its parent menu.
   *
   * Actions:
   * - If the above conditions are met, the method simulates a click on the menu controller button (if it is indeed a button), which is expected to toggle the visibility of the menu, typically closing it.
   */
  handleTab(event) {
    // TODO
  }

  /**
   * Handles the 'Escape' key event for a menu item.
   *
   * This method locates the button that controls the current menu (identified by the 'data-menu-controls' attribute matching the menu's ID).
   * If such a button is found, it performs two actions:
   * - Sets the button's 'aria-expanded' attribute to 'false', effectively closing the menu.
   * - Moves focus to the button, facilitating keyboard navigation back to the menu controller.
   *
   * Note: This method assumes the controlling button is associated with the menu via the 'data-menu-controls' attribute.
   */
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

  /*----------------------------------------------*\
      Supporting functions Keydown for MenuLinks
  \*----------------------------------------------*/

  /**
   * Handles left arrow navigation in nested menus.
   * Closes submenu and moves focus to parent menu item or navigates to previous top-level item.
   */
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
      }
      return
    }
  }

  /**
   * Handles right arrow navigation in nested menus.
   * Navigates to next top-level menu item with submenu handling.
   */
  handleNestedMenuRight() {
    // Find the closest menu container to get access to proper navigation
    const menuContainer = this.domNode.closest(this.config.menuSelector)

    // Find the top-level controller item for this nested menu
    const controllerItem = this.findControllerItem(menuContainer)

    if (controllerItem) {
      this.navigateToTopLevelItem(controllerItem, 'next', menuContainer)
    }
  }

  /**
   * Finds the menu controller for a given menu node.
   *
   * @param {HTMLElement} menuNode - The menu node to find controller for
   * @returns {HTMLElement|null} - The menu controller element or null
   */
  findMenuController(menuNode, menuContainer) {
    return menuContainer.querySelector(`[data-menu-controls="${menuNode.id}"]`)
  }

  /**
   * Finds the top-level controller item for a nested menu structure.
   *
   * @param {HTMLElement} menuNode - The current menu node
   * @returns {HTMLElement|null} - The top-level controller item or null
   */
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

  /**
   * Navigates to a top-level menu item in the specified direction.
   *
   * @param {HTMLElement} currentItem - The current top-level menu item
   * @param {string} direction - Either "next" or "previous"
   */
  navigateToTopLevelItem(currentItem, direction, menuContainer) {
    const topLevelItems = this.getTopLevelMenuItems(menuContainer)
    const currentIndex = topLevelItems.indexOf(currentItem)

    let targetIndex
    if (direction === 'next') {
      // Move to next item with circular navigation (wrap to first if at end)
      targetIndex = currentIndex + 1 < topLevelItems.length ? currentIndex + 1 : 0
    } else {
      // Move to previous item with circular navigation (wrap to last if at beginning)
      targetIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : topLevelItems.length - 1
    }

    const targetMenuItem = topLevelItems[targetIndex]
    let targetMenuLink = targetMenuItem.querySelector(`.${this.config.linkClass}`)

    this.closeAllButtons(menuContainer)

    // Focus on the target menu item
    targetMenuLink.focus()

    // If target has a submenu, open it but keep focus on parent
    if (
      this.config.controllerTags.includes(targetMenuLink.tagName.toLowerCase()) &&
      targetMenuLink.getAttribute('aria-expanded') === 'false'
    ) {
      targetMenuLink.click()
    }
  }

  /**
   * Gets all top-level menu items.
   *
   * @returns {HTMLElement[]} - Array of top-level menu items
   */
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

  /**
   * Handles the navigation for non-nested menus based on the direction of navigation.
   *
   * @param {string} direction - The direction of navigation ("right" or "left").
   *
   * This method finds the next or previous sibling menu item of the current active menu item based on the direction.
   * If such a sibling menu item exists and it contains a link, it focuses on that link.
   * Otherwise, it focuses on the first menu item link in the parent menu (or the last one if the direction is "left").
   * For top-level menu items, this also closes any open submenus when navigating away.
   */
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

  /**
   * Closes all menu buttons except for the current one.
   *
   * This method finds all buttons within the menu that have their `aria-expanded` attribute set to `true`,
   * indicating that their associated submenu is open. It then proceeds to close all these menus by setting
   * their `aria-expanded` attribute to `false`. It does this for both top-level menu buttons and buttons in
   * submenus, ensuring that all other menus are closed except for the menu associated with the current
   * `domNode` (the menu button that invoked this method).
   */
  closeAllButtons(menuContainer) {
    if (!menuContainer) return

    // If on mobile, don't close buttons
    const mobileBreakpoint = this.config.mobileBreakpoint
    const mobileMediaQuery = window.matchMedia(`(max-width: ${mobileBreakpoint}px)`)
    if (mobileMediaQuery.matches) {
      return
    }

    // Build a list of all expanded controller elements
    const controllerSelectors = this.config.controllerTags.flatMap(tag => [
      `${tag}.${this.config.buttonClass}[aria-expanded="true"]`,
      `${tag}[aria-expanded="true"]`,
    ])

    const expandedControllers = menuContainer.querySelectorAll(controllerSelectors.join(', '))

    // Close all others except the current one
    expandedControllers.forEach(controller => {
      if (controller !== this.domNode) {
        controller.setAttribute('aria-expanded', 'false')
      }
    })
  }

  /**
   * Retrieves the next item in a menu based on the current target index.
   * If the target index is the last item, it returns the first item,
   * effectively treating the menu as a circular array.
   *
   * @param {Array} menuItems - An array of menu items.
   * @param {number} targetIndex - The current index in the menu items array.
   * @returns The next item in the menu. If the target index is the last item, returns the first item in the array.
   */
  getNextItem(menuItems, targetIndex) {
    return this.isLastItem(menuItems, targetIndex) ? menuItems[0] : menuItems[targetIndex + 1]
  }

  /**
   * Retrieves the previous item in a menu based on the current target index.
   * If the target index is the first item (0), it returns the last item,
   * effectively treating the menu as a circular array.
   *
   * @param {Array} menuItems - An array of menu items.
   * @param {number} targetIndex - The current index in the menu items array.
   * @returns The previous item in the menu. If the target index is 0, returns the last item in the array.
   */
  getPreviousItem(menuItems, targetIndex) {
    return targetIndex === 0 ? menuItems[menuItems.length - 1] : menuItems[targetIndex - 1]
  }

  /**
   * Checks if the current item is the last item in the menu.
   *
   * @param {HTMLElement[]} menuItems - An array of menu items.
   * @param {number} targetIndex - The index of the current item in the menuItems array.
   * @returns {boolean} - Returns true if the current item is the last item in the menu, otherwise false.
   */
  isLastItem(menuItems, targetIndex) {
    return targetIndex === menuItems.length - 1
  }

  /**
   * Gets focusable elements within a menu.
   *
   * @param {HTMLElement} menu - The menu ul element.
   * @returns {HTMLElement[]} - An array of focusable elements within the menu.
   */
  getFocusableElements(menu) {
    if (!menu) return []

    // Build selector for controller tags and links
    const controller = this.config.controllerTags.join(', ')
    const selector = `.${this.config.linkClass}:is(a[href], ${controller})`

    return [...menu.querySelectorAll(selector)].filter(element => {
      // Use checkVisibility if available, otherwise fallback to basic visibility check
      if (typeof element.checkVisibility === 'function') {
        return element.checkVisibility({ opacityProperty: true, visibilityProperty: true })
      }
    })
  }
}

/**
 * MenuButton class for menu controllers (buttons,spans) with submenu functionality
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

    // Add controller class for styling
    this.buttonNode.classList.add(`${this.config.controllerClass}`)

    // Check if listeners are already attached to prevent duplicates
    if (!this.buttonNode.hasAttribute('data-menu')) {
      // Remove any existing listeners first
      this.buttonNode.removeEventListener('keydown', this.onButtonKeydown.bind(this))
      this.buttonNode.removeEventListener('click', this.onButtonClick.bind(this))

      // Attach event listeners to the main menu button
      this.buttonNode.addEventListener('keydown', this.onButtonKeydown.bind(this))
      this.buttonNode.addEventListener('click', this.onButtonClick.bind(this))
      this.buttonNode.setAttribute('data-menu', 'true')
    }

    // Add background click listener
    document.addEventListener('mousedown', this.onBackgroundMousedown.bind(this))
  }

  /**
   * Handles keydown events on the menu button.
   *
   * @param {Event} event - The keydown event.
   *
   * This method checks the key pressed during the event and performs actions based on the key:
   * - 'Up' or 'ArrowUp': Calls the `handleUpArrow` method with the button node.
   * - 'Down' or 'ArrowDown': If the next sibling of the button node has a 'data-depth' attribute of '1', opens the popup, focuses on the first menu item, and prevents the default action. Otherwise, calls the `handleDownArrow` method with the button node and prevents the default action.
   * - 'Left' or 'ArrowLeft': If the next sibling of the button node does not have a 'data-depth' attribute of '1', closes the popup and focuses on the button node. Otherwise, calls the `handleLeftArrow` method with the button node.
   * - 'Right' or 'ArrowRight': If the next sibling of the button node does not have a 'data-depth' attribute of '1', opens the popup and focuses on the first menu item. Otherwise, calls the `handleRightArrow` method with the button node.
   * - 'Esc' or 'Escape': Closes the popup and prevents the default action.
   *
   * If the 'ctrl', 'alt', or 'meta' key is pressed during the event, the method returns without doing anything.
   */
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
        const relatedMenuDown = this.buttonNode.nextElementSibling
        // Second level menu opens with down arrow
        if (relatedMenuDown.dataset.depth == '1') {
          if (!this.mobileMediaQuery.matches) {
            this.closeAll()
          }
          this.openPopup()
          this.focusFirstItem(event.target)
          flag = true
        } else {
          this.handleDownArrow(event.target)
          flag = true
        }
        break

      case 'Left':
      case 'ArrowLeft':
        this.handleLeftArrow()
        break

      case 'Right':
      case 'ArrowRight':
        const relatedMenu = this.buttonNode.nextElementSibling
        // Deeply nested menus open with right arrow
        if (relatedMenu && relatedMenu.dataset.depth !== '1') {
          this.openPopup()
          this.focusFirstItem(this.buttonNode)
        } else {
          this.handleRightArrow()
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

  /**
   * Handles click events on the menu button.
   *
   * @param {Event} event - The click event.
   *
   * This method checks if the menu is open:
   * - If the menu is open, it calls the `closePopup` method to close the menu.
   * - If the menu is not open, it calls the `openPopup` method to open the menu.
   *
   * After handling the menu, it stops the propagation of the event and prevents the default action.
   */
  onButtonClick(event) {
    if (this.isOpen()) {
      this.closePopup()
    } else {
      this.openPopup()
      // Only close other buttons if not on mobile
      if (!this.mobileMediaQuery.matches) {
        this.closeAll()
      }
    }

    event.stopPropagation()
    event.preventDefault()
  }

  /**
   * Focuses on the first menu item of the nested list related to the given element.
   *
   * @param {HTMLElement} element - The element related to the nested list.
   *
   * This method finds the nested list related to the given element by using the `data-menu-controls` attribute.
   * If the nested list exists, it finds the first menu item in the list and focuses on it.
   * If the first menu item is not a button or link, it recursively calls itself to focus on the first menu item within the nested menu.
   */
  focusFirstItem(element) {
    const controlsId = element.getAttribute('data-menu-controls')
    const nestedList = controlsId ? document.getElementById(controlsId) : null

    if (nestedList) {
      const firstItem = nestedList.querySelector(`.${this.config.linkClass}`)
      if (firstItem) {
        // If the first item is not a controller or link, it is a default menu so move to the first menu item within.
        if (!this.config.controllerTags.includes(firstItem.tagName.toLowerCase()) && firstItem.tagName !== 'A') {
          this.focusFirstItem(firstItem)
        } else {
          firstItem.focus()
        }
      }
    }
  }

  /**
   * Checks if the menu is open.
   *
   * @returns {boolean} - Returns true if the menu is open, false otherwise.
   *
   * This method checks the 'aria-expanded' attribute of the button node.
   * If the attribute is 'true', the method returns true, indicating that the menu is open.
   * If the attribute is not 'true', the method returns false, indicating that the menu is not open.
   */
  isOpen() {
    return this.buttonNode.getAttribute('aria-expanded') === 'true'
  }

  /**
   * Opens the popup menu.
   *
   * This method sets the 'aria-expanded' attribute of the button node to 'true',
   * indicating that the associated popup menu is open.
   */
  openPopup() {
    // Only close all other buttons if not on mobile
    if (!this.mobileMediaQuery.matches) {
      this.closeAll()
    }
    this.buttonNode.setAttribute('aria-expanded', 'true')
  }

  /**
   * Closes the popup menu.
   *
   * This method sets the 'aria-expanded' attribute of the button node to 'false',
   * indicating that the associated popup menu is closed.
   */
  closePopup() {
    this.buttonNode.setAttribute('aria-expanded', 'false')
  }

  /**
   * Closes expanded buttons within the menu, with specific behavior based on the menu's depth.
   * - If the menu is at the top level (depth 0), it closes all top-level buttons except for `this.buttonNode`.
   * - For nested menus, it closes only sibling buttons at the same level, preserving parent menu buttons that need to stay open for proper hierarchy.
   * This method is part of the menu management functionality, allowing for better accessibility and user experience by managing the expanded state of menu buttons.
   */
  closeAll() {
    const menuContainer = this.buttonNode.closest(this.config.menuSelector)

    // Find the parent menu of this button to determine depth
    const parentMenu = this.buttonNode.closest('ul[data-depth]')
    const currentDepth = parentMenu ? parseInt(parentMenu.getAttribute('data-depth')) : 0

    if (currentDepth === 0) {
      // Top-level menu: close all top-level controllers except this one
      const topLevelMenu = menuContainer.querySelector('ul[data-depth="0"]')
      if (!topLevelMenu) return

      const selector = this.config.controllerTags
        .map(tag => `${tag}.${this.config.buttonClass}[aria-expanded="true"]`)
        .join(', ')

      topLevelMenu.querySelectorAll(selector).forEach(controller => {
        if (controller !== this.buttonNode) {
          controller.setAttribute('aria-expanded', 'false')
        }
      })
    } else {
      // Nested menu: close only sibling buttons at the same level, preserve parent hierarchy
      if (parentMenu) {
        // Find sibling buttons in the same parent menu
        const siblingButtons = parentMenu.querySelectorAll(
          `:scope > .${this.config.itemClass} > button.${this.config.buttonClass}[aria-expanded="true"]`,
        )
        siblingButtons.forEach(button => {
          if (button !== this.buttonNode) {
            button.setAttribute('aria-expanded', 'false')
          }
        })

        // Also close any deeper level menus that are not in our hierarchy
        const allDeeperButtons = menuContainer.querySelectorAll(
          `ul[data-depth]:not([data-depth="${currentDepth}"]) button.${this.config.buttonClass}[aria-expanded="true"]`,
        )
        allDeeperButtons.forEach(button => {
          // Only close if it's not in our submenu hierarchy
          if (!this.menuNode) {
            button.setAttribute('aria-expanded', 'false')
          }
        })
      }
    }
  }

  /**
   * Handles the mousedown event on the background.
   *
   * @param {Event} event - The mousedown event.
   *
   * This method checks if the mousedown event occurred outside the menu container.
   * If it did and the menu is open and the device is not mobile, it sets focus to the button node and closes the popup menu.
   */
  onBackgroundMousedown(event) {
    const menuContainer = this.buttonNode.closest(this.config.menuSelector)

    // Only close on background click if not on mobile
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
