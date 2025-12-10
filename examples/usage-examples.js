import { Menubar } from '@jldust/accessible-menu'

// Example 1: Using with custom CSS classes and mobile breakpoint
const customMenu = new Menubar({
  menuSelector: '.my-navigation',
  buttonClass: 'nav-button',
  linkClass: 'nav-link',
  itemClass: 'nav-item',
  mobileBreakpoint: 1024,
  mobileControlId: 'hamburger-menu',
})

await customMenu.init()

// Example 2: Initialize only a specific menu container
const specificContainer = document.querySelector('.header-menu')
await customMenu.init(specificContainer)

// Example 3: Using with different configurations for different menus
const mainMenu = new Menubar({
  menuSelector: '.main-menu',
  buttonClass: 'main-menu__button',
  linkClass: 'main-menu__link',
  mobileBreakpoint: 768,
})

const footerMenu = new Menubar({
  menuSelector: '.footer-menu',
  buttonClass: 'footer-menu__button',
  linkClass: 'footer-menu__link',
  mobileBreakpoint: 480,
})

// Initialize both menus
await mainMenu.init()
await footerMenu.init()

// Example 4: Dynamic menu creation and initialization
function createDynamicMenu() {
  const menuHTML = `
    <nav class="dynamic-menu" data-breakpoint="768">
      <ul class="menu">
        <li class="menu__item">
          <a href="#" class="menu__link">Home</a>
        </li>
        <li class="menu__item menu__item--expanded">
          <button class="menu__link">Products</button>
          <ul class="menu" data-depth="1">
            <li class="menu__item">
              <a href="#" class="menu__link">Software</a>
            </li>
            <li class="menu__item">
              <a href="#" class="menu__link">Hardware</a>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  `

  document.body.insertAdjacentHTML('beforeend', menuHTML)

  const dynamicMenuConfig = new AccessibleMenu({
    menuSelector: '.dynamic-menu',
    buttonClass: 'menu__link',
    linkClass: 'menu__link',
  })

  dynamicMenuConfig.init()
}

// Example 5: Cleanup when removing menus
function removeMenu() {
  const menuElement = document.querySelector('.dynamic-menu')
  if (menuElement) {
    customMenu.destroy(menuElement)
    menuElement.remove()
  }
}

export { customMenu, mainMenu, footerMenu, createDynamicMenu, removeMenu }
