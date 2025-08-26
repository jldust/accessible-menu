export interface MenuConfig {
  /** CSS selector for menu containers */
  menuSelector?: string;
  /** CSS class for menu buttons */
  buttonClass?: string;
  /** CSS class for menu links */
  linkClass?: string;
  /** CSS class for menu items */
  itemClass?: string;
  /** Mobile breakpoint in pixels */
  mobileBreakpoint?: number;
  /** ID of the mobile menu control button */
  mobileControlId?: string | null;
  /** Data attribute for custom breakpoint */
  dataBreakpointAttribute?: string;
  /** Data attribute for mobile control reference */
  dataMobileAttribute?: string;
  /** Data attribute for plugin ID */
  dataPluginIdAttribute?: string;
}

export declare class AccessibleMenu {
  constructor(config?: MenuConfig);
  
  /**
   * Initialize all menus on the page
   * @param context - The context to search for menus
   */
  init(context?: HTMLElement | Document): void;
  
  /**
   * Attach ARIA controls to menu elements
   * @param context - The context to search for menus
   */
  attachAriaControls(context: HTMLElement | Document): void;
  
  /**
   * Attach controls to given elements
   * @param elements - Array of elements to attach controls to
   */
  attachControlsToElements(elements: HTMLElement[]): void;
  
  /**
   * Attach menu controls for keyboard navigation
   * @param context - The context to search for menus
   */
  attachMenuControls(context: HTMLElement | Document): void;
  
  /**
   * Attach mobile menu controls
   * @param context - The context to search for menus
   */
  attachMobileControls(context: HTMLElement | Document): void;
  
  /**
   * Destroy a menu instance
   * @param menuContainer - The menu container to destroy
   */
  destroy(menuContainer: HTMLElement): void;
  
  /**
   * Destroy all menu instances
   */
  destroyAll(): void;
}

export default AccessibleMenu;
