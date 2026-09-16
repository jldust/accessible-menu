/**
 * Default configuration for SimpleMenu navigation
 */
const DEFAULT_CONFIG = {
  menuSelector: 'c-menu',
  menuContainer: null,
  buttonClass: 'menu__button',
  linkClass: 'menu__link',
  controllerClass: 'controller',
  mobileBreakpoint: 768,
  mobileControlId: null,
  dataBreakpointAttribute: 'data-breakpoint',
}

let _menuIdCounter = 0
const menuOwners = new WeakMap()
const menuContainers = new Set()
const menuControllers = new Set()
let disclosureListener = false

function onDocumentPointerDown(event) {
  if (Array.from(menuContainers).some(menuContainer => menuContainer.contains(event.target))) return

  menuControllers.forEach(controller => controller.closeAll())
}

function getMenus(context, selector) {
  return context.matches?.(selector) ? [context] : Array.from(context.querySelectorAll(selector))
}

/**
 * SimpleMenu - A configurable accessible navigation component
 *
 * @class SimpleMenu
 */
export class SimpleMenu {
  /**
   * Create a SimpleMenu instance
   *
   * @param {HTMLElement|Document} context - The root element or document to scope this instance to
   * @param {Object} config - Configuration options
   */
  constructor(context = document, config = {}) {
    if (context !== null && typeof context === 'object' && !(context instanceof Node)) {
      config = context
      context = document
    }

    this.context = context
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.menuInstances = new Map()
  }

  /**
   * Initialize all SimpleMenu roots in the configured context
   */
  async init() {
    this.attachAriaControls(this.context)
    this.attachMenuControls(this.context)

    // Only attach mobile controls if a mobileControlId is provided
    if (this.config.mobileControlId) {
      await this.attachMobileControls()
    }
  }

  /**
   * Attach ARIA controls to SimpleMenu buttons
   *
   * @param {HTMLElement|Document} context - The context to search for menus
   */
  attachAriaControls(context) {
    const selector = `.${this.config.menuSelector}`

    getMenus(context, selector).forEach(menu => {
      if (menuOwners.has(menu)) return

      if (!menu.hasAttribute(this.config.dataBreakpointAttribute)) {
        menu.setAttribute(this.config.dataBreakpointAttribute, this.config.mobileBreakpoint)
      }

      menu.querySelectorAll(`button.${this.config.buttonClass}`).forEach(button => {
        const submenu = button.nextElementSibling
        if (!submenu) return

        if (!submenu.id) {
          submenu.id = `disclosure-panel-${++_menuIdCounter}`
        }

        button.setAttribute('aria-controls', submenu.id)
        button.setAttribute('aria-expanded', 'false')
        button.classList.add(this.config.controllerClass)
      })
    })
  }

  /**
   * Attach SimpleMenu controls to keyboard
   *
   * @param {HTMLElement|Document} context - The context to search for menus
   */
  attachMenuControls(context) {
    const selector = `.${this.config.menuSelector}`

    getMenus(context, selector).forEach(menuContainer => {
      if (menuOwners.has(menuContainer)) return

      const menuInstance = new MenuController(menuContainer, this.config)
      this.menuInstances.set(menuContainer, menuInstance)
      menuOwners.set(menuContainer, menuInstance)
      menuContainers.add(menuContainer)
      menuControllers.add(menuInstance)
    })

    if (this.menuInstances.size > 0 && !disclosureListener) {
      document.addEventListener('pointerdown', onDocumentPointerDown)
      disclosureListener = true
    }
  }

  /**
   * Attach mobile menu controls
   *
   * @returns {Promise<void>} Resolves when mobile controls are initialized
   */
  async attachMobileControls() {
    const menus = [...this.menuInstances.entries()].filter(([, instance]) => !instance.mobileController)
    const { MobileMenuController } = await import('../mobile-menu-controller.js')

    menus.forEach(([menu, instance]) => {
      instance.mobileController = new MobileMenuController(menu, this.config)
    })
  }

  /**
   * Destroy a SimpleMenu instance
   *
   * @param {HTMLElement} menuContainer - The SimpleMenu root to destroy
   */
  destroy(menuContainer) {
    const instance = this.menuInstances.get(menuContainer)
    if (!instance) return

    instance.destroy()
    this.menuInstances.delete(menuContainer)
    menuOwners.delete(menuContainer)
    menuContainers.delete(menuContainer)
    menuControllers.delete(instance)

    if (menuControllers.size === 0 && disclosureListener) {
      document.removeEventListener('pointerdown', onDocumentPointerDown)
      disclosureListener = false
    }
  }

  /**
   * Destroy all SimpleMenu instances
   */
  destroyAll() {
    Array.from(this.menuInstances.keys()).forEach(menuContainer => this.destroy(menuContainer))
  }
}

/**
 * MenuController coordinates buttons and links within one SimpleMenu root
 *
 * @class MenuController
 */
class MenuController {
  /**
   * Create a MenuController
   *
   * @param {HTMLElement} menuContainer - The SimpleMenu root element
   * @param {Object} config - Configuration options
   */
  constructor(menuContainer, config) {
    this.menuContainer = menuContainer
    this.config = config
    this.mobileController = null
    const mobileBreakpoint =
      this.menuContainer.getAttribute(this.config.dataBreakpointAttribute) || this.config.mobileBreakpoint
    this.mobileMediaQuery = window.matchMedia(`(max-width: ${mobileBreakpoint}px)`)
    this.menuButtons = []
    this.menuLinks = []

    this.initializeMenus()
  }

  /**
   * Initialize SimpleMenu buttons and links within the root
   */
  initializeMenus() {
    this.menuContainer.querySelectorAll(`button.${this.config.buttonClass}[aria-controls]`).forEach(button => {
      this.menuButtons.push(new MenuButton(button, this.config, this))
    })

    this.menuContainer.querySelectorAll(`a.${this.config.linkClass}`).forEach(link => {
      this.menuLinks.push(new MenuLinks(link, this.config, this))
    })

    this.boundOnFocusout = this.onFocusout.bind(this)
    this.menuContainer.addEventListener('focusout', this.boundOnFocusout)
  }

  /**
   * Close all SimpleMenus when focus leaves the root
   *
   * @param {FocusEvent} event - The focus event
   */
  onFocusout(event) {
    if (!this.menuContainer.contains(event.relatedTarget)) this.closeAll()
  }

  /**
   * Close every SimpleMenu panel in the root
   */
  closeAll() {
    this.menuButtons.forEach(button => button.domNode.setAttribute('aria-expanded', 'false'))
  }

  /**
   * Destroy the SimpleMenu controller and clean up listeners
   */
  destroy() {
    this.menuButtons?.forEach(button => button.destroy())
    this.menuLinks?.forEach(link => link.destroy())
    this.menuContainer.removeEventListener('focusout', this.boundOnFocusout)
    this.mobileController?.destroy()
    this.menuButtons = []
    this.menuLinks = []
  }

  /**
   * Get the submenu controlled by a button
   *
   * @param {HTMLElement} button - The SimpleMenu button
   * @returns {HTMLElement|null} The controlled submenu, if found
   */
  getPanel(button) {
    const submenuId = button.getAttribute('aria-controls')
    return submenuId ? document.getElementById(submenuId) : null
  }

  /**
   * Find the button that controls a submenu
   *
   * @param {HTMLElement} submenu - The SimpleMenu submenu
   * @returns {HTMLElement|undefined} The controlling button, if found
   */
  getController(submenu) {
    return this.menuButtons.find(button => this.getPanel(button.domNode) === submenu)?.domNode
  }

  /**
   * Find the parent menu for an element
   *
   * @param {HTMLElement} element - The element to inspect
   * @returns {HTMLElement|null} The parent submenu, if found
   */
  getParentMenu(element) {
    let parent = element.parentElement
    while (parent && parent !== this.menuContainer) {
      if (this.getController(parent)) return parent
      parent = parent.parentElement
    }
    return null
  }

  /**
   * Get buttons at the same nesting level
   *
   * @param {HTMLElement|null} parentMenu - The parent submenu
   * @returns {HTMLElement[]} Buttons at the requested level
   */
  getButtonsAtLevel(parentMenu) {
    return this.menuButtons.map(button => button.domNode).filter(button => this.getParentMenu(button) === parentMenu)
  }

  /**
   * Get top-level links and buttons in document order
   *
   * @returns {HTMLElement[]} Top-level navigation items
   */
  getTopLevelItems() {
    return [
      ...this.menuContainer.querySelectorAll(
        `a.${this.config.linkClass}, button.${this.config.buttonClass}[aria-controls]`,
      ),
    ].filter(item => !this.getParentMenu(item))
  }

  /**
   * Get links directly belonging to a submenu
   *
   * @param {HTMLElement|null} submenu - The SimpleMenu submenu
   * @returns {HTMLAnchorElement[]} Links belonging to the submenu
   */
  getLinks(submenu) {
    if (!submenu) return []
    return [...submenu.querySelectorAll(`a.${this.config.linkClass}`)].filter(
      link => this.getParentMenu(link) === submenu,
    )
  }

  /**
   * Close a SimpleMenu panel and its descendant panels
   *
   * @param {HTMLElement} button - The SimpleMenu button
   */
  close(button) {
    button.setAttribute('aria-expanded', 'false')
    const submenu = this.getPanel(button)
    if (!submenu) return

    this.menuButtons.forEach(disclosureButton => {
      if (submenu.contains(disclosureButton.domNode)) disclosureButton.domNode.setAttribute('aria-expanded', 'false')
    })
  }

  /**
   * Close the nearest open SimpleMenu panel and restore controller focus
   *
   * @param {HTMLElement} element - The focused SimpleMenu element
   * @returns {boolean} Whether an open SimpleMenu panel was closed
   */
  closeNearestDisclosure(element) {
    const submenu = this.getParentMenu(element)
    const focusedButton = element.closest(`button.${this.config.buttonClass}`)
    const button =
      focusedButton?.getAttribute('aria-expanded') === 'true' ? focusedButton : submenu && this.getController(submenu)
    if (!button || button.getAttribute('aria-expanded') !== 'true') return false

    this.close(button)
    button.focus()
    return true
  }

  /**
   * Set the active page link within the root
   *
   * @param {HTMLAnchorElement} link - The current page link
   */
  setCurrentLink(link) {
    this.menuContainer.querySelectorAll('a[aria-current]').forEach(current => current.removeAttribute('aria-current'))
    link.setAttribute('aria-current', 'page')
  }
}

/**
 * MenuButton handles SimpleMenu button interaction and keyboard navigation
 *
 * @class MenuButton
 */
class MenuButton {
  /**
   * Create a MenuButton
   *
   * @param {HTMLElement} domNode - The SimpleMenu button
   * @param {Object} config - Configuration options
   * @param {MenuController} controller - The owning controller
   */
  constructor(domNode, config, controller) {
    this.domNode = domNode
    this.config = config
    this.controller = controller
    this.boundOnClick = this.onClick.bind(this)
    this.boundOnKeydown = this.onKeydown.bind(this)

    this.domNode.addEventListener('click', this.boundOnClick)
    this.domNode.addEventListener('keydown', this.boundOnKeydown)
  }

  /**
   * Toggle the SimpleMenu button
   */
  onClick() {
    if (this.domNode.getAttribute('aria-expanded') === 'true') {
      this.controller.close(this.domNode)
      return
    }

    const parentMenu = this.controller.getParentMenu(this.domNode)
    if (!this.controller.mobileMediaQuery.matches) {
      this.controller.getButtonsAtLevel(parentMenu).forEach(peer => {
        if (peer !== this.domNode) this.controller.close(peer)
      })
    }
    this.domNode.setAttribute('aria-expanded', 'true')
  }

  /**
   * Handle keyboard input on the SimpleMenu button
   *
   * @param {KeyboardEvent} event - The keyboard event
   */
  onKeydown(event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      if (this.controller.closeNearestDisclosure(this.domNode)) event.preventDefault()
      return
    }

    if (this.controller.getParentMenu(this.domNode)) return

    if (
      this.domNode.getAttribute('aria-expanded') === 'true' &&
      ['ArrowDown', 'ArrowRight', 'Down', 'Right'].includes(event.key)
    ) {
      event.preventDefault()
      this.controller.getLinks(this.controller.getPanel(this.domNode))[0]?.focus()
      return
    }

    navigateItems(event, this.domNode, this.controller.getTopLevelItems())
  }

  /**
   * Destroy the SimpleMenu button and clean up listeners
   */
  destroy() {
    this.domNode.removeEventListener('click', this.boundOnClick)
    this.domNode.removeEventListener('keydown', this.boundOnKeydown)
  }
}

/**
 * MenuLinks handles SimpleMenu link interaction and keyboard navigation
 *
 * @class MenuLinks
 */
class MenuLinks {
  /**
   * Create a MenuLinks instance
   *
   * @param {HTMLAnchorElement} domNode - The SimpleMenu link
   * @param {Object} config - Configuration options
   * @param {MenuController} controller - The owning controller
   */
  constructor(domNode, config, controller) {
    this.domNode = domNode
    this.config = config
    this.controller = controller
    this.boundOnKeydown = this.onKeydown.bind(this)

    this.domNode.addEventListener('keydown', this.boundOnKeydown)
  }

  /**
   * Handle keyboard input on the SimpleMenu link
   *
   * @param {KeyboardEvent} event - The keyboard event
   */
  onKeydown(event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      if (this.controller.closeNearestDisclosure(this.domNode)) event.preventDefault()
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      this.controller.setCurrentLink(this.domNode)
      if (event.key === ' ') {
        event.preventDefault()
        this.domNode.click()
      }
      return
    }

    const submenu = this.controller.getParentMenu(this.domNode)
    const items = submenu ? this.controller.getLinks(submenu) : this.controller.getTopLevelItems()
    navigateItems(event, this.domNode, items)
  }

  /**
   * Destroy the SimpleMenu link and clean up listeners
   */
  destroy() {
    this.domNode.removeEventListener('keydown', this.boundOnKeydown)
  }
}

function navigateItems(event, currentItem, items) {
  const index = items.indexOf(currentItem)
  if (index < 0) return

  let target = null
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
    case 'Down':
    case 'Right':
      if (index < items.length - 1) target = items[index + 1]
      break
    case 'ArrowUp':
    case 'ArrowLeft':
    case 'Up':
    case 'Left':
      if (index > 0) target = items[index - 1]
      break
    case 'Home':
      if (index > 0) target = items[0]
      break
    case 'End':
      if (index < items.length - 1) target = items[items.length - 1]
      break
    default:
      return
  }

  event.preventDefault()
  target?.focus()
}

export default SimpleMenu
