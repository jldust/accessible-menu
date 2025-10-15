// @ts-nocheck
import once from "@drupal/once";

export const menuControl = {
  attach(context) {
    const menus = once("menuControl", ".c-menu", context);

    menus.forEach((menuContainer) => {
      /**
       * Accessible Menu
       * This file is based on content that is licensed according to the W3C Software License at
       * https://www.w3.org/copyright/software-license/
       *
       * - 01 - Constants
       * - 02 - MenuLink Class (Base)
       * - 03 - MenuButton Class (Extends MenuLink)
       * - 04 - Initialize Menus
       */

      /*----------------------------------------------*\
            - 01 - Constants
            Select DOM constants for mobile menu
        \*----------------------------------------------*/
      let mobileBreakpoint = 768;

      if (menuContainer.hasAttribute("data-breakpoint")) {
        mobileBreakpoint = menuContainer
          .getAttribute("data-breakpoint")
          .replace("#", "");
      }

      // Mobile Media Query
      let mobileMediaQuery = window.matchMedia(
        "(max-width: " + mobileBreakpoint + "px)"
      );

      /*------------------------------------------------------------------------*\
            - 02 - MenuLink Class (Base)
            The base class for attaching functions to menu links.
        \*------------------------------------------------------------------------*/

      /**
       * `MenuLinks` is a class that manages the behavior of menu links in a navigation menu.
       * It provides methods to handle keyboard navigation within the menu, including arrow keys, tab, and escape.
       *
       * @class
       * @param {HTMLElement} domNode - The root node of the menu, typically a `<nav>` or `<ul>` element that contains menu items.
       *
       * @property {HTMLElement} domNode - The root node of the menu.
       * @property {Array} menuitemNodes - An array of all menu item nodes in the menu.
       * @property {HTMLElement} firstMenuitem - The first menu item node in the menu.
       * @property {HTMLElement} lastMenuitem - The last menu item node in the menu.
       *
       * @method onMenuitemKeydown - Handles keydown events on menu items.
       * @method handleNestedMenuLeft - Handles left arrow navigation in nested menus.
       * @method handleNestedMenuRight - Handles right arrow navigation in nested menus.
       * @method getNextItem - Finds the next menu__item.
       * @method getPreviousItem - Finds the previous menu__item.
       * @method handleNonNestedMenu - Handles navigation in non-nested menus.
       * @method handleUpArrow - Handles the up arrow key.
       * @method handleDownArrow - Handles the down arrow key.
       * @method handleLeftArrow - Handles the left arrow key.
       * @method handleRightArrow - Handles the right arrow key.
       * @method handleTab - Handles the tab key.
       * @method handleEscape - Handles the escape key.
       */
      class MenuLinks {
        constructor(domNode) {
          this.domNode = domNode;

          //Find parent ul element
          const parentMenu = domNode.closest("ul");

          if (parentMenu) {
            this.menuNode = parentMenu;
            this.menuNodeChildren = Array.from(parentMenu.children);
          } else {
            console.warn("Relative menu not found for element");
          }

          this.menuitemNodes = Array.from(
            domNode.querySelectorAll(".menu__link")
          );

          // If this is a mega menu find all links within c-mega-menu__wrapper and add them to menuitemNodes
          const megaMenuWrapper = domNode.closest(".c-mega-menu__wrapper");
          if (megaMenuWrapper) {
            this.menuitemNodes = Array.from(
              megaMenuWrapper.querySelectorAll(".menu__link")
            );
          }

          if (domNode && domNode.nodeName === "BUTTON") {
            // If it is a button, do nothing
          } else if (this.menuitemNodes.length > 0) {
            this.firstMenuitem = this.menuitemNodes[0];
            this.lastMenuitem =
              this.menuitemNodes[this.menuitemNodes.length - 1];

            this.menuitemNodes.forEach((item) => {
              // Attach keydown event to each menu item
              // Check if listener already exists to prevent duplicates
              if (!item.hasAttribute("data-link")) {
                item.addEventListener(
                  "keydown",
                  this.onMenuitemKeydown.bind(this)
                );
                item.setAttribute("data-link", "true");
              }
            });
          } else {
            console.warn("No menu items found");
          }
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
          const key = event.key;
          if (event.ctrlKey || event.altKey || event.metaKey) {
            return;
          }

          switch (key) {
            case "Up":
            case "ArrowUp":
              this.handleUpArrow(event.target);
              event.preventDefault();
              break;

            case "Down":
            case "ArrowDown":
              this.handleDownArrow(event.target);
              event.preventDefault();
              break;

            case "Left":
            case "ArrowLeft":
              this.handleLeftArrow();
              break;

            case "Right":
            case "ArrowRight":
              this.handleRightArrow();
              break;

            case "Tab":
              this.handleTab(event);
              break;

            case "Escape":
            case "Esc":
              this.handleEscape();

              // Stop propagation and prevent default for submenus
              if (this.menuNode.dataset.depth != 0) {
                event.stopPropagation();
                event.preventDefault();
              }
              break;

            default:
              break;
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
          let menuNode = this.menuNode;

          // Find the immediate parent menu controller
          const menuController = this.findMenuController(menuNode);

          if (menuController) {
            const parentMenuItem = menuController.closest(".menu__item");
            const parentUl = parentMenuItem?.closest("ul[data-depth]");

            // If parent menu item is in the menubar (data-depth="0")
            if (parentUl && parentUl.dataset.depth === "0") {
              this.navigateToTopLevelItem(parentMenuItem, "previous");
              return;
            } else {
              // Parent is not in menubar, just close submenu and focus parent
              this.closeSubmenuAndFocusParent(menuController);
              return;
            }
          }
        }

        /**
         * Handles right arrow navigation in nested menus.
         * Navigates to next top-level menu item with submenu handling.
         */
        handleNestedMenuRight() {
          let menuNode = this.menuNode;

          // Find the top-level controller item for this nested menu
          const controllerItem = this.findControllerItem(menuNode);

          if (controllerItem) {
            this.navigateToTopLevelItem(controllerItem, "next");
          }
        }

        /**
         * Finds the menu controller for a given menu node.
         *
         * @param {HTMLElement} menuNode - The menu node to find controller for
         * @returns {HTMLElement|null} - The menu controller element or null
         */
        findMenuController(menuNode) {
          const nestedControls = menuNode.getAttribute("data-menu-controls");
          let menuController = menuContainer.querySelector(
            `[data-menu-controls="${menuNode.id}"]`
          );

          // If can't find related controller, check for nestedControls
          if (!menuController) {
            menuController = menuContainer.querySelector(
              `[data-menu-controls="${nestedControls}"]`
            );
          }

          return menuController;
        }

        /**
         * Finds the top-level controller item for a nested menu structure.
         *
         * @param {HTMLElement} menuNode - The current menu node
         * @returns {HTMLElement|null} - The top-level controller item or null
         */
        findControllerItem(menuNode) {
          let controllerItem = null;

          // Traverse up from current element to find top-level menu item
          let currentElement = this.domNode;
          while (currentElement) {
            // Look for a menu item that is a direct child of data-depth="0" menu
            const parentUl = currentElement.closest('ul[data-depth="0"]');
            if (parentUl) {
              // Check if this element is a direct child of the top-level menu
              const menuItem = currentElement.closest(".menu__item");
              if (menuItem && menuItem.parentElement === parentUl) {
                controllerItem = menuItem;
                break;
              }
            }
            // Move up to parent menu item
            currentElement = currentElement
              .closest(".menu__item")
              ?.parentElement?.closest(".menu__item");
            if (!currentElement) break;
          }

          // If we couldn't find the controller item using the above method,
          // fall back to the original logic
          if (!controllerItem) {
            controllerItem = this.findControllerFallback(menuNode);
          }

          return controllerItem;
        }

        /**
         * Fallback method to find controller item using original logic.
         *
         * @param {HTMLElement} menuNode - The current menu node
         * @returns {HTMLElement|null} - The controller item or null
         */
        findControllerFallback(menuNode) {
          const nestedControls = menuNode.getAttribute("data-menu-controls");
          let menuController = menuContainer.querySelector(
            `[data-menu-controls="${menuNode.id}"]`
          );

          // If can't find related controller, check for nestedControls
          if (!menuController) {
            menuController = menuContainer.querySelector(
              `[data-menu-controls="${nestedControls}"]`
            );
          }

          // Find first nested menu
          while (menuNode && menuNode.dataset.depth !== "1") {
            menuNode = menuNode.parentElement;
          }

          // Knowing nested menu, set updated controller item
          if (!menuController) {
            menuController = menuContainer.querySelector(
              `[data-menu-controls="${nestedControls}"]`
            );

            // If nested mega menu, find related controller
            if (menuController && menuController?.tagName === "BUTTON") {
              return menuController;
            }
          }

          if (menuController) {
            let controllerItem = menuController.closest(".menu__item");

            // If this is still not a top-level item, traverse up further
            while (controllerItem) {
              const parentUl = controllerItem.closest("ul[data-depth]");
              if (parentUl && parentUl.dataset.depth === "0") {
                break; // Found the top-level item
              }
              // Move up to find the parent menu item
              controllerItem =
                controllerItem.parentElement?.closest(".menu__item");
            }

            return controllerItem;
          }

          return null;
        }

        /**
         * Navigates to a top-level menu item in the specified direction.
         *
         * @param {HTMLElement} currentItem - The current top-level menu item
         * @param {string} direction - Either "next" or "previous"
         */
        navigateToTopLevelItem(currentItem, direction) {
          const topLevelItems = this.getTopLevelMenuItems();
          const currentIndex = topLevelItems.indexOf(currentItem);

          let targetIndex;
          if (direction === "next") {
            // Move to next item with circular navigation (wrap to first if at end)
            targetIndex =
              currentIndex + 1 < topLevelItems.length ? currentIndex + 1 : 0;
          } else {
            // Move to previous item with circular navigation (wrap to last if at beginning)
            targetIndex =
              currentIndex - 1 >= 0
                ? currentIndex - 1
                : topLevelItems.length - 1;
          }

          const targetMenuItem = topLevelItems[targetIndex];
          let targetMenuLink = null;

          // Account for mega menu items, if next item has a parent of .c-mega-menu__wrapper set focus to related controller
          if (topLevelItems[targetIndex].closest(".c-mega-menu__wrapper")) {
            const megaMenuController = topLevelItems[targetIndex].closest(
              ".c-mega-menu__wrapper"
            );
            const megaMenuId = megaMenuController.getAttribute("id");
            const menuController = menuContainer.querySelector(
              `[data-menu-controls="${megaMenuId}"]`
            );
            if (menuController) {
              targetMenuLink = menuController;
            }
          } else {
            targetMenuLink = targetMenuItem.querySelector(".menu__link");
          }

          if (!mobileMediaQuery.matches) {
            // Close open buttons
            this.closeAllButtons();
          }

          // Focus on the target menu item
          targetMenuLink.focus();

          // If target has a submenu, open it but keep focus on parent
          if (
            targetMenuLink.tagName === "BUTTON" &&
            targetMenuLink.getAttribute("aria-expanded") === "false"
          ) {
            targetMenuLink.click();
          }
        }

        /**
         * Gets all top-level menu items.
         *
         * @returns {HTMLElement[]} - Array of top-level menu items
         */
        getTopLevelMenuItems() {
          // Find top level menu - look for the menu container with data-depth="0"
          let topMenu = menuContainer.querySelector('[data-depth="0"]');

          // If we can't find it by data-depth, traverse up from current menu
          if (!topMenu) {
            topMenu = this.menuNode;
            while (topMenu && topMenu.dataset.depth !== "0") {
              topMenu = topMenu.parentElement;
            }
          }

          // Get all top level menu items - look for all .menu__item descendants of the top menu
          // This handles cases where there might be unknown divs between the top menu and items
          return Array.from(topMenu.querySelectorAll(".menu__item")).filter(
            (item) => {
              // Only include direct top-level items (those whose closest ul parent has data-depth="0")
              const parentUl = item.closest("ul[data-depth]");
              return parentUl && parentUl.dataset.depth === "0";
            }
          );
        }

        /**
         * Closes submenu and focuses on the parent controller.
         *
         * @param {HTMLElement} menuController - The menu controller element
         */
        closeSubmenuAndFocusParent(menuController) {
          if (menuController?.tagName === "BUTTON") {
            menuController.click(); // Close submenu
          }
          menuController.focus();
        }
        /**
         * Checks if the current item is the last item in the menu.
         *
         * @param {HTMLElement[]} menuItems - An array of menu items.
         * @param {number} targetIndex - The index of the current item in the menuItems array.
         * @returns {boolean} - Returns true if the current item is the last item in the menu, otherwise false.
         */
        isLastItem(menuItems, targetIndex) {
          return targetIndex + 1 >= menuItems.length;
        }

        /**
         * Retrieves all focusable elements within a menu.
         *
         * @param {HTMLElement} menu - The menu ul element.
         *
         * @returns {HTMLElement[]} - An array of focusable elements within the menu.
         */
        getFocusableElements(menu) {
          return Array.from(
            menu.querySelectorAll(".menu__link:is(a[href], button)")
          ).filter((element) =>
            element.checkVisibility({
              opacityProperty: true,
              visibilityProperty: true,
            })
          );
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
          return targetIndex + 1 < menuItems.length
            ? menuItems[targetIndex + 1]
            : menuItems[0];
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
          if (targetIndex - 1 >= 0) {
            // If there is a previous item, return it
            return menuItems[targetIndex - 1];
          } else {
            // If targetIndex is 0, return the last item of the array
            return menuItems[menuItems.length - 1];
          }
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
          let menuItems = this.menuNodeChildren;
          let targetIndex = 0;

          // Mega menu items should count in the same menu as their related ul
          const megaMenu = this.domNode.closest(".c-mega-menu__wrapper");

          // If mega menu find controller data-plugin-id and set that as targetIndex
          if (megaMenu) {
            const megaMenuId = megaMenu.getAttribute("id");

            const menuController = menuContainer.querySelector(
              `[data-menu-controls="${megaMenu.getAttribute("id")}"]`
            );

            if (menuController) {
              targetIndex = menuItems.indexOf(
                menuController.closest(".menu__item")
              );
            }
          } else {
            // Find the index of the target in this.menuNodeChildren
            targetIndex = menuItems.indexOf(
              this.domNode.closest(".menu__item")
            );
          }

          const leftSibling = this.getPreviousItem(menuItems, targetIndex);
          const rightSibling = this.getNextItem(menuItems, targetIndex);

          // Determine which sibling to focus based on direction
          let siblingToFocus =
            direction === "right" ? rightSibling : leftSibling;

          // For top-level menu items, close any open submenus when navigating away
          if (
            this.menuNode.dataset.depth === "0" &&
            !mobileMediaQuery.matches
          ) {
            this.closeAllButtons();
          }

          // Select actual focus element
          siblingToFocus = siblingToFocus.querySelector(".menu__link");
          siblingToFocus.focus();
        }

        /**
         * Sets focus to the first `.menu__link` within the next sibling `ul` element.
         * If no next sibling `ul` element is found, sets focus to the first `.menu__link` within the parent menu.
         *
         * @param {HTMLElement} menuNode - The current menu node.
         * @param {HTMLElement} parentMenu - The parent menu element.
         */
        nextExpandedMenu(menuNode, parentMenu) {
          const menuParent = menuNode.parentElement;
          const nextParent = menuParent.nextElementSibling;

          if (nextParent) {
            const nextLink = nextParent.querySelector(
              ".menu__link:is(a[href], button)"
            );
            if (nextLink) {
              nextLink.focus();
            }
          } else {
            const firstLink = parentMenu.querySelector(
              ".menu__link:is(a[href], button)"
            );
            firstLink.focus();
          }
        }

        /**
         * Sets focus to the last `.menu__link` within the previous sibling `ul` element.
         * If no previous sibling `ul` element is found, sets focus to the last `.menu__link` within the parent menu.
         *
         * @param {HTMLElement} menuNode - The current menu node.
         * @param {HTMLElement} parentMenu - The parent menu element.
         */
        previousExpandedMenu(menuNode, parentMenu) {
          const menuParent = menuNode.parentElement;
          const previousParent = menuParent.previousElementSibling;

          if (previousParent) {
            // Find the last link in the previous menu.
            const menuLinks = previousParent.querySelectorAll(
              ".menu__link:is(a[href], button)"
            );
            menuLinks[menuLinks.length - 1].focus();
          } else {
            const menuItems = parentMenu.querySelectorAll(".menu__item");

            // Find last menu link within last menuItems.
            const menuLinks = menuItems[menuItems.length - 1].querySelectorAll(
              ".menu__link:is(a[href], button)"
            );
            // Set focus to last index of menuLinks.
            menuLinks[menuLinks.length - 1].focus();
          }
        }

        /*------------------------------------*\
              Keydown functions for MenuLinks
        \*------------------------------------*/

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
          let menuDepth = this.menuNode.dataset.depth;

          //If its a mega menu find the related controller use its data depth instead
          const megaMenu = target.closest(".c-mega-menu__wrapper");
          if (megaMenu) {
            const megaMenuId = megaMenu.getAttribute("data-depth");

            if (megaMenuId) {
              menuDepth = megaMenuId;
            }
          }

          // If top level menu, do nothing.
          if (menuDepth == 0) return;

          const rootMenu = target.closest(
            'button.menu__link[aria-expanded="true"] + .c-menu__list'
          );
          const focusableElements = this.getFocusableElements(rootMenu);

          if (
            focusableElements.length > 0 &&
            focusableElements.indexOf(target) >= 0
          ) {
            const index = focusableElements.indexOf(target);
            const prev =
              index === 0
                ? focusableElements[focusableElements.length - 1]
                : focusableElements[index - 1];

            prev.focus();
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
          let menuDepth = this.menuNode.dataset.depth;

          //If its a mega menu find the related controller use its data depth instead
          const megaMenu = target.closest(".c-mega-menu__wrapper");
          if (megaMenu) {
            const megaMenuId = megaMenu.getAttribute("data-depth");

            if (megaMenuId) {
              menuDepth = megaMenuId;
            }
          }

          // If we are at the top level and the target is a link, do nothing.
          if (menuDepth == 0 && target?.tagName === "A") return;

          const rootMenu = target.closest(
            'button.menu__link[aria-expanded="true"] + .c-menu__list'
          );

          // Focusable elements are links or buttons that are visible.
          const focusableElements = this.getFocusableElements(rootMenu);

          if (
            focusableElements.length > 0 &&
            focusableElements.indexOf(target) >= 0
          ) {
            const index = focusableElements.indexOf(target);
            const next =
              index + 1 < focusableElements.length
                ? focusableElements[index + 1]
                : focusableElements[0];

            next.focus();
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
          const parentMenu = this.menuNode;
          // Check if the parent menu is a nested menu with data-depth > 0
          if (parentMenu.dataset.depth && parentMenu.dataset.depth > 0) {
            this.handleNestedMenuLeft();
          } else {
            this.handleNonNestedMenu("left");
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
          const parentMenu = this.menuNode;
          // Check if the parent menu is a nested menu with data-depth > 0
          if (parentMenu.dataset.depth && parentMenu.dataset.depth > 0) {
            this.handleNestedMenuRight();
          } else {
            this.handleNonNestedMenu("right");
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
          // Find the parent menuNode with dataset.depth === '1' for nested menus
          let menuNode = this.menuNode;
          while (menuNode && menuNode.dataset.depth !== "1") {
            menuNode = menuNode.parentElement;
          }

          // If within a nested menu and tabbing only
          if (menuNode && !event.shiftKey) {
            // Directly select direct .menu__item children
            const menuLinkNodes = menuNode.querySelectorAll(
              ":scope > .menu__item"
            );
            const allMenuLinks = menuNode.querySelectorAll(".menu__item");

            const lastItem = menuLinkNodes[menuLinkNodes.length - 1];
            const lastNestedItem = allMenuLinks[allMenuLinks.length - 1];

            // Check if the last item is the target's parent and close the menu if true
            if (
              (lastItem === this.domNode.closest(".menu__item") ||
                lastNestedItem === this.domNode.closest(".menu__item")) &&
              !mobileMediaQuery.matches
            ) {
              this.closeAllButtons();
            }
          }

          // If user shift+tabs into first item, close menu
          if (event.shiftKey && this.menuNode.dataset.depth > 0) {
            const menuController = menuContainer.querySelector(
              `[data-menu-controls="${this.menuNode.getAttribute("id")}"]`
            );

            const firstItem =
              this.menuNodeChildren[0] === this.domNode.closest(".menu__item");

            if (firstItem && menuController?.tagName === "BUTTON") {
              menuController.click();
            }
          }
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
          const menuDepth = this.menuNode.dataset.depth;
          let currentMenu = this.menuNode;

          // Check if the current menu is expanded.
          let menuController = menuContainer.querySelector(
            `[data-menu-controls="${currentMenu.getAttribute(
              "id"
            )}"][aria-expanded="true"]`
          );

          // If nested mega menu, find related controller
          if (menuController == null) {
            const nestedControls =
              currentMenu.getAttribute("data-menu-controls");

            menuController = menuContainer.querySelector(
              `[data-menu-controls="${nestedControls}"]`
            );
          }

          // Otherwise find the closest expanded menu.
          if (!menuController && menuDepth > 1) {
            while (currentMenu && currentMenu.dataset.depth !== "1") {
              currentMenu = currentMenu.parentElement;
            }

            // Find controller button for menuNode with aria-control id
            menuController = menuContainer.querySelector(
              `[data-menu-controls="${currentMenu.getAttribute("id")}"]`
            );
          }

          if (menuController) {
            menuController.setAttribute("aria-expanded", "false");
            menuController.focus();
          }
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
        closeAllButtons() {
          const topButtons = Array.from(
            menuContainer.querySelectorAll(
              '[data-depth="0"] > li > button[aria-expanded="true"]'
            )
          );

          const menuNodeButtons = Array.from(
            menuContainer.querySelectorAll(
              'button.menu__link[aria-expanded="true"]'
            )
          );

          topButtons
            .filter((button) => button !== this.domNode)
            .forEach((button) => {
              button.setAttribute("aria-expanded", "false");
            });

          // Close all buttons in submenus
          menuNodeButtons
            .filter((button) => button !== this.domNode)
            .forEach((button) => {
              button.setAttribute("aria-expanded", "false");
            });
        }
      }

      /*---------------------------------------------------------------*\
            - 03 - MenuButton Class (Extends MenuLink)
            The base class for attaching functions to menu controls.
        \*----------------------------------------------------------------*/
      /**
       * `MenuButton` is a class that extends `MenuLinks` to handle the functionality of menu controls.
       *
       * @extends MenuLinks
       *
       * @property {HTMLElement} buttonNode - The button element in the menu.
       * @property {HTMLElement} menuNode - The related ul menu for the button.
       * @property {Array} menuitemNodes - The menu items in the menu.
       * @property {HTMLElement} firstMenuitem - The first menu item in the menu.
       * @property {HTMLElement} lastMenuitem - The last menu item in the menu.
       *
       * The constructor initializes the base `MenuLinks` class with the main menu, sets the `aria-expanded` attribute of the button to 'false',
       * and attaches event listeners to the main menu button, each menu item, and the window.
       *
       * The class includes methods to handle button and menu item keydown events, button click events, and background mousedown events,
       * as well as methods to open and close the menu, check if the menu is open, and focus on the first menu item.
       */
      class MenuButton extends MenuLinks {
        constructor(menuContainer) {
          // Initialize the base MenuLinks class with the main menu
          super(menuContainer);

          this.buttonNode = menuContainer;
          this.buttonNode.setAttribute("aria-expanded", "false");

          // Check if listeners are already attached to prevent duplicates
          if (!this.buttonNode.hasAttribute("data-menu")) {
            // Remove any existing listeners first
            this.buttonNode.removeEventListener(
              "keydown",
              this.onButtonKeydown.bind(this)
            );
            this.buttonNode.removeEventListener(
              "click",
              this.onButtonClick.bind(this)
            );

            // Attach event listeners to the main menu button
            this.buttonNode.addEventListener(
              "keydown",
              this.onButtonKeydown.bind(this)
            );
            this.buttonNode.addEventListener(
              "click",
              this.onButtonClick.bind(this)
            );
            this.buttonNode.setAttribute("data-menu", "true");
          }

          window.addEventListener(
            "mousedown",
            this.onBackgroundMousedown.bind(this),
            true
          );
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
          const nestedList = document.getElementById(
            element.getAttribute("data-menu-controls")
          );

          if (nestedList) {
            const firstItem = nestedList.querySelector(".menu__link");
            // If the first item is not a button, it is a default menu so move to the first menu item within.
            if (firstItem.tagName !== "BUTTON" && firstItem.tagName !== "A") {
              this.focusFirstItem(firstItem);
            } else {
              firstItem.focus();
            }
          }

          //If it is a heading in the menu item, focus on the link within
          if (element.tagName === "H2") {
            const firstItem = element.querySelector(".menu__link");
            firstItem.focus();
          }
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
          const key = event.key;
          if (event.ctrlKey || event.altKey || event.metaKey) {
            return;
          }

          const relatedMenu = document.getElementById(
            this.buttonNode.getAttribute("data-menu-controls")
          );

          switch (key) {
            case "Tab":
              this.handleTab(event);
              break;

            case "Up":
            case "ArrowUp":
              this.handleUpArrow(event.target);
              break;

            case "Down":
            case "ArrowDown":
              // Second level menu opens with down arrow
              if (relatedMenu.dataset.depth == "1") {
                // Only close other buttons if not on mobile
                if (!mobileMediaQuery.matches) {
                  this.closeAll();
                }
                this.openPopup();
                this.focusFirstItem(event.target);
                event.preventDefault();
              } else {
                this.handleDownArrow(event.target);
                event.preventDefault();
              }
              break;

            case "Left":
            case "ArrowLeft":
              this.handleLeftArrow();

              break;

            case "Right":
            case "ArrowRight":
              // Deeply nested menus open with right arrow
              if (relatedMenu.dataset.depth !== "1") {
                this.openPopup();
                this.focusFirstItem(event.target);
              } else {
                this.handleRightArrow();
              }
              break;

            case "Esc":
            case "Escape":
              //If already closed, close and find parent menu
              if (!this.isOpen()) {
                const parentMenu = this.buttonNode.closest(
                  'ul[data-depth]:not([data-depth="0"])'
                );
                if (parentMenu) {
                  const parentController = menuContainer.querySelector(
                    `[data-menu-controls="${parentMenu.getAttribute("id")}"]`
                  );
                  if (parentController?.tagName === "BUTTON") {
                    parentController.setAttribute("aria-expanded", "false");
                    parentController.focus();
                  }
                }
              } else {
                this.closePopup();
              }
              event.preventDefault();

              break;
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
            this.closePopup();
          } else {
            this.openPopup();
            // Only close other buttons if not on mobile
            if (!mobileMediaQuery.matches) {
              this.closeAll();
            }
          }

          event.stopPropagation();
          event.preventDefault();
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
          return this.buttonNode.getAttribute("aria-expanded") === "true";
        }

        /**
         * Opens the popup menu.
         *
         * This method sets the 'aria-expanded' attribute of the button node to 'true',
         * indicating that the associated popup menu is open.
         */
        openPopup() {
          this.buttonNode.setAttribute("aria-expanded", "true");
        }

        /**
         * Closes the popup menu.
         *
         * This method sets the 'aria-expanded' attribute of the button node to 'false',
         * indicating that the associated popup menu is closed.
         */
        closePopup() {
          this.buttonNode.setAttribute("aria-expanded", "false");
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
          if (!menuContainer.contains(event.target)) {
            if (this.isOpen() && !mobileMediaQuery.matches) {
              this.buttonNode.focus();
              this.closePopup();
            }
          }
        }

        /**
         * Closes all expanded buttons within the menu, with specific behavior based on the menu's depth.
         * - If the menu is at the top level (depth 0), it closes all top-level buttons except for `this.buttonNode`.
         * - For menus not at the top level, it ensures that only one button can be open at a time by closing all other buttons except for `this.buttonNode`.
         * This method is part of the menu management functionality, allowing for better accessibility and user experience by managing the expanded state of menu buttons.
         */
        closeAll() {
          const topButtons = menuContainer.querySelectorAll(
            '[data-depth="0"] > li > button[aria-expanded="true"]'
          );

          switch (this.menuNode.dataset.depth) {
            // Close all buttons if top-level
            case "0":
              topButtons.forEach((button) => {
                if (button !== this.buttonNode) {
                  // Close the top-level button
                  button.setAttribute("aria-expanded", "false");
                }
              });
              // Find and close all nested buttons within this top-level button
              Array.from(
                this.menuNode.querySelectorAll('button[aria-expanded="true"]')
              )
                .filter((button) => button !== this.buttonNode)
                .forEach((button) => {
                  button.setAttribute("aria-expanded", "false");
                });
              break;
            default:
              //  Only allow one button to be open at a time inside a menu
              Array.from(
                this.menuNode.querySelectorAll('button[aria-expanded="true"]')
              )
                .filter((button) => button !== this.buttonNode)
                .forEach((button) => {
                  button.setAttribute("aria-expanded", "false");
                });

              break;
          }
        }
      }

      /*--------------------------------------------*\
            - 04 - Initialize Menus
            Initialize Menus for keyboard navigation
        \*--------------------------------------------*/

      /**
       * Initializes the menus within a given container.
       *
       * @param {HTMLElement} menuContainer - The container within which to initialize menus.
       *
       * This function selects all button elements within the menuContainer and initializes a new MenuButton instance for each.
       * It then selects all elements with the class 'menu__item' within the menuContainer.
       * For each 'menu__item' that does not contain a button, it initializes a new MenuLinks instance.
       */
      function initializeMenus(menuContainer) {
        // Initialize MenuButton for each button in the menuContainer.
        menuContainer
          .querySelectorAll("button.menu__link")
          .forEach((button) => {
            new MenuButton(button);
          });

        // Initialize main menu list
        menuContainer
          .querySelectorAll(
            ".menu__item:not(.menu__item--expanded:has(> span.menu__link))"
          )
          .forEach((item) => {
            if (item.querySelector("button") === null) {
              new MenuLinks(item);
            }
          });
      }

      // Call the function with the menuContainer as argument
      initializeMenus(menuContainer);
    });
  },
};
