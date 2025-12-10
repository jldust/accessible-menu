/**
 * Configuration options for the Menubar
 * @interface MenuConfig
 */
export interface MenuConfig {
  /** CSS selector for menu containers */
  menuSelector?: string
  /** CSS class for menu buttons */
  buttonClass?: string
  /** CSS class for menu links */
  linkClass?: string
  /** CSS class for menu items */
  itemClass?: string
  /** CSS class for mega menu wrapper */
  megaMenuClass?: string
  /** Array of HTML tag names that can act as menu controllers */
  controllerTags?: string[]
  /** CSS class added to controller elements */
  controllerClass?: string
  /** Mobile breakpoint in pixels */
  mobileBreakpoint?: number
  /** ID of the mobile menu control button */
  mobileControlId?: string | null
  /** Boolean for if mobile menus should be initialized */
  hasMobile?: boolean
  /** Data attribute for plugin ID */
  dataPluginIdAttribute?: string
}

/**
 * Menubar - A configurable accessible menu component
 * Provides full keyboard navigation, mobile controls, and ARIA support
 *
 * @example
 * ```typescript
 * const menu = new Menubar({
 *   menuSelector: '.c-menu',
 *   buttonClass: 'menu__link',
 *   linkClass: 'menu__link',
 * });
 * await menu.init();
 * ```
 */
export declare class Menubar {
  /**
   * Creates a new Menubar instance
   * @param config - Optional configuration object. Uses sensible defaults if not provided.
   */
  constructor(config?: MenuConfig)

  /**
   * Initialize all menus on the page
   * Attaches ARIA controls, menu controls, and optionally mobile controls
   *
   * @param context - The context to search for menus. Defaults to document.
   * @returns Promise that resolves when initialization is complete
   */
  init(context?: HTMLElement | Document): Promise<void>

  /**
   * Attach ARIA controls to menu elements
   * Sets depth attributes and aria-haspopup, aria-controls, and aria-label attributes
   *
   * @param context - The context to search for menus. Defaults to document.
   */
  attachAriaControls(context: HTMLElement | Document): void

  /**
   * Attach controls to given elements
   * Sets aria and data attributes necessary for menu functionality
   *
   * @param elements - Array of elements to attach controls to
   */
  attachControlsToElements(elements: HTMLElement[]): void

  /**
   * Attach menu controls for keyboard navigation
   * Initializes MenuController and keyboard navigation for menu items
   *
   * @param context - The context to search for menus. Defaults to document.
   */
  attachMenuControls(context: HTMLElement | Document): void

  /**
   * Attach mobile menu controls
   * Initializes MobileMenuController for responsive menu behavior
   *
   * @param context - The context to search for menus. Defaults to document.
   * @returns Promise that resolves when mobile controls are initialized
   */
  attachMobileControls(context: HTMLElement | Document): Promise<void>

  /**
   * Destroy a menu instance
   * Cleans up event listeners and resources for a specific menu container
   *
   * @param menuContainer - The menu container to destroy
   */
  destroy(menuContainer: HTMLElement): void

  /**
   * Destroy all menu instances
   * Cleans up event listeners and resources for all initialized menus
   */
  destroyAll(): void
}

export default Menubar
