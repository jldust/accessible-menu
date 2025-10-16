/**
 * MobileMenuController - Handles mobile menu functionality
 *
 * This class provides mobile menu controls for menus with data-mobile attributes.
 * It manages menu opening/closing, keyboard navigation, focus management, and
 * outside click handling for mobile breakpoints.
 */
export class MobileMenuController {
  /**
   * Create a MobileMenuController instance
   * @param {HTMLElement} menuContainer - The menu container element
   * @param {Object} config - Configuration options
   */
  constructor(menuContainer, config) {
    this.menuContainer = menuContainer
    this.config = config
    this.mobileNavButton = null
    this.mobileBreakpoint = null
    this.mobileMediaQuery = null

    // Bind methods to maintain context
    this.handleEscape = this.handleEscape.bind(this)
    this.onWindowClick = this.onWindowClick.bind(this)
    this.mobileControl = this.mobileControl.bind(this)

    this.init()
  }

  /**
   * Initialize the mobile menu controller
   */
  init() {
    if (!this.menuContainer) {
      console.warn('Mobile menu controller: No menu container provided')
      return
    }

    const mobileNavButtonId = this.menuContainer.getAttribute(this.config.dataMobileAttribute)?.replace('#', '')

    if (!mobileNavButtonId) {
      console.warn('Mobile menu controller: No data-mobile attribute found on menu container')
      return
    }

    this.mobileNavButton = document.getElementById(mobileNavButtonId)

    if (!this.mobileNavButton) {
      console.warn(`Mobile menu button with ID "${mobileNavButtonId}" not found`)
      return
    }

    // Get mobile breakpoint from data attribute or config
    this.mobileBreakpoint =
      this.menuContainer.getAttribute(this.config.dataBreakpointAttribute)?.replace('#', '') ||
      this.config.mobileBreakpoint

    this.mobileMediaQuery = window.matchMedia(`(max-width: ${this.mobileBreakpoint}px)`)

    this.setupEventListeners()
  }

  /**
   * Set up event listeners for mobile menu functionality
   */
  setupEventListeners() {
    if (this.mobileNavButton) {
      this.mobileNavButton.addEventListener('click', this.mobileControl)
    }
    window.addEventListener('keydown', this.handleEscape)
  }

  /**
   * Remove event listeners (for cleanup)
   */
  destroy() {
    if (this.mobileNavButton) {
      this.mobileNavButton.removeEventListener('click', this.mobileControl)
    }
    window.removeEventListener('keydown', this.handleEscape)
    window.removeEventListener('click', this.onWindowClick)
  }

  /**
   * Close the mobile menu and clean up
   * @param {string} [key] - The key that triggered the close (for focus management)
   */
  closeMobile(key = '') {
    if (!this.mobileNavButton) return

    this.mobileNavButton.setAttribute('aria-expanded', 'false')

    // Close all dropdown sub-menus within the menu container
    const menuButtons = this.menuContainer.querySelectorAll('button.menu__link')
    menuButtons.forEach(button => {
      button.setAttribute('aria-expanded', 'false')
    })

    // If escape key was pressed, set focus back to mobile nav button
    if (key === 'Esc' || key === 'Escape') {
      this.mobileNavButton.focus()
    }

    // Remove window click listener
    window.removeEventListener('click', this.onWindowClick)
  }

  /**
   * Handle mobile menu toggle button clicks
   * @param {Event} event - The click event
   */
  mobileControl(event) {
    if (!this.mobileNavButton) return

    const isMenuClosed = this.mobileNavButton.getAttribute('aria-expanded') === 'false'

    if (isMenuClosed) {
      // Open menu
      this.mobileNavButton.setAttribute('aria-expanded', 'true')

      // Prevent window click event from immediately closing menu
      event.stopPropagation()

      // Add window click listener to close menu when clicking outside
      window.addEventListener('click', this.onWindowClick)
    } else {
      // Close menu
      this.closeMobile()
    }
  }

  /**
   * Handle escape key presses to close mobile menu
   * @param {KeyboardEvent} e - The keyboard event
   */
  handleEscape(e) {
    // Only handle escape key
    if (e.key !== 'Esc' && e.key !== 'Escape') {
      return
    }

    // Check if mobile menu is open
    if (!this.mobileNavButton || this.mobileNavButton.getAttribute('aria-expanded') !== 'true') {
      return
    }

    // Find all top-level menu__link buttons inside menuContainer
    const topLevelMenuLinks = this.menuContainer.querySelectorAll('[data-depth="0"] > li > .menu__link')

    // Check if the current target is part of top-level menu links
    const isTargetTopLevelLink = Array.from(topLevelMenuLinks).includes(e.target)

    // Only close if the escape was pressed on a top-level menu link
    if (isTargetTopLevelLink) {
      this.closeMobile('Esc')
    }
  }

  /**
   * Handle clicks outside the menu to close mobile menu
   * @param {Event} event - The click event
   */
  onWindowClick(event) {
    // Only close if we're in mobile viewport and click is outside menu container
    if (this.mobileMediaQuery && this.mobileMediaQuery.matches && !this.menuContainer.contains(event.target)) {
      this.closeMobile()
    }
  }

  /**
   * Check if the mobile menu is currently open
   * @returns {boolean} - True if menu is open
   */
  isOpen() {
    return this.mobileNavButton && this.mobileNavButton.getAttribute('aria-expanded') === 'true'
  }

  /**
   * Get the mobile breakpoint for this menu instance
   * @returns {string|number} - The mobile breakpoint value
   */
  getMobileBreakpoint() {
    return this.mobileBreakpoint
  }
}
