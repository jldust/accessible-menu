import { Disclosure } from '../src/index.js'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
})

const keydown = (element, key, options = {}) => {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options }))
}

describe('Disclosure', () => {
  let disclosure
  let root

  beforeEach(() => {
    window.matchMedia.mockImplementation(query => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }))

    document.body.innerHTML = `
      <nav class="c-menu">
        <ul>
          <li>
            <button class="menu__button">Products</button>
            <ul id="products-panel">
              <li><a class="menu__link" href="#one" aria-current="page">One</a></li>
              <li><a class="menu__link" href="#two">Two</a></li>
              <li>
                <button class="menu__button">More</button>
                <ul>
                  <li><a class="menu__link" href="#three">Three</a></li>
                </ul>
              </li>
            </ul>
          </li>
          <li>
            <button class="menu__button">Company</button>
            <ul>
              <li><a class="menu__link" href="#about">About</a></li>
              <li><a class="menu__link" href="#contact">Contact</a></li>
            </ul>
          </li>
        </ul>
      </nav>
      <button id="outside">Outside</button>
    `
    root = document.querySelector('.c-menu')
    disclosure = new Disclosure()
    disclosure.init()
  })

  afterEach(() => {
    disclosure?.destroyAll()
    document.body.innerHTML = ''
  })

  it('initializes buttons and panels with collapsed ARIA state', () => {
    const buttons = root.querySelectorAll('.menu__button')

    expect(buttons[0].getAttribute('aria-controls')).toBe('products-panel')
    expect(buttons[0].getAttribute('aria-expanded')).toBe('false')
    expect(buttons[0].classList.contains('controller')).toBe(true)
    expect(buttons[1].getAttribute('aria-controls')).toMatch(/^disclosure-panel-/)
    expect(document.getElementById(buttons[1].getAttribute('aria-controls'))).toBe(buttons[1].nextElementSibling)
  })

  it('toggles buttons and closes open peers at the same level', () => {
    const [products, more, company] = root.querySelectorAll('.menu__button')

    products.click()
    expect(products.getAttribute('aria-expanded')).toBe('true')

    company.click()
    expect(products.getAttribute('aria-expanded')).toBe('false')
    expect(company.getAttribute('aria-expanded')).toBe('true')

    company.click()
    expect(company.getAttribute('aria-expanded')).toBe('false')
    expect(more.getAttribute('aria-expanded')).toBe('false')
  })

  it('keeps peer disclosures open on mobile', () => {
    disclosure.destroyAll()
    window.matchMedia.mockImplementation(query => ({
      matches: true,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }))

    disclosure = new Disclosure()
    disclosure.init()

    const [products, , company] = root.querySelectorAll('.menu__button')
    products.click()
    company.click()

    expect(products.getAttribute('aria-expanded')).toBe('true')
    expect(company.getAttribute('aria-expanded')).toBe('true')
  })

  it('preserves ancestors when opening nested disclosures and closes descendants with a parent', () => {
    const [products, more] = root.querySelectorAll('.menu__button')

    products.click()
    more.click()
    expect(products.getAttribute('aria-expanded')).toBe('true')
    expect(more.getAttribute('aria-expanded')).toBe('true')

    products.click()
    expect(products.getAttribute('aria-expanded')).toBe('false')
    expect(more.getAttribute('aria-expanded')).toBe('false')
  })

  it('moves among top-level buttons and into an expanded dropdown without wrapping', () => {
    const [products, , company] = root.querySelectorAll('.menu__button')
    const firstLink = root.querySelector('a[href="#one"]')

    products.focus()
    keydown(products, 'ArrowRight')
    expect(document.activeElement).toBe(company)

    keydown(company, 'ArrowRight')
    expect(document.activeElement).toBe(company)

    keydown(company, 'Home')
    expect(document.activeElement).toBe(products)

    products.click()
    keydown(products, 'ArrowDown')
    expect(document.activeElement).toBe(firstLink)

    products.focus()
    keydown(products, 'End')
    expect(document.activeElement).toBe(company)
    keydown(company, 'ArrowLeft')
    expect(document.activeElement).toBe(products)
  })

  it('moves through top-level links and disclosure buttons in DOM order', () => {
    disclosure.destroyAll()
    document.body.innerHTML = `
      <nav class="c-menu">
        <ul>
          <li><a class="menu__link" href="#home">Home</a></li>
          <li>
            <button class="menu__button">Products</button>
            <ul><li><a class="menu__link" href="#product">Product</a></li></ul>
          </li>
          <li><a class="menu__link" href="#contact">Contact</a></li>
        </ul>
      </nav>
    `
    root = document.querySelector('.c-menu')
    disclosure = new Disclosure()
    disclosure.init()

    const home = root.querySelector('a[href="#home"]')
    const products = root.querySelector('.menu__button')
    const contact = root.querySelector('a[href="#contact"]')

    home.focus()
    keydown(home, 'ArrowRight')
    expect(document.activeElement).toBe(products)

    keydown(products, 'ArrowRight')
    expect(document.activeElement).toBe(contact)

    keydown(contact, 'ArrowLeft')
    expect(document.activeElement).toBe(products)

    keydown(products, 'Home')
    expect(document.activeElement).toBe(home)

    keydown(home, 'End')
    expect(document.activeElement).toBe(contact)
  })

  it('moves among links in the nearest panel without wrapping', () => {
    const [first, second] = root.querySelectorAll('a[href="#one"], a[href="#two"]')

    first.focus()
    keydown(first, 'ArrowDown')
    expect(document.activeElement).toBe(second)

    keydown(second, 'ArrowRight')
    expect(document.activeElement).toBe(second)

    keydown(second, 'Home')
    expect(document.activeElement).toBe(first)

    keydown(first, 'End')
    expect(document.activeElement).toBe(second)
    keydown(second, 'ArrowUp')
    expect(document.activeElement).toBe(first)
  })

  it('closes the nearest open dropdown on Escape and restores controller focus', () => {
    const [products, more] = root.querySelectorAll('.menu__button')
    const nestedLink = root.querySelector('a[href="#three"]')

    products.click()
    more.click()
    nestedLink.focus()
    keydown(nestedLink, 'Escape')

    expect(more.getAttribute('aria-expanded')).toBe('false')
    expect(products.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(more)
  })

  it('closes an expanded nested button before its ancestor on Escape', () => {
    const [products, more] = root.querySelectorAll('.menu__button')

    products.click()
    more.click()
    more.focus()
    keydown(more, 'Escape')

    expect(more.getAttribute('aria-expanded')).toBe('false')
    expect(products.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(more)
  })

  it('updates aria-current and activates a link with Space', () => {
    const previous = root.querySelector('a[href="#one"]')
    const target = root.querySelector('a[href="#two"]')
    const clickHandler = jest.fn(event => event.preventDefault())
    target.addEventListener('click', clickHandler)

    target.focus()
    keydown(target, ' ')

    expect(previous.hasAttribute('aria-current')).toBe(false)
    expect(target.getAttribute('aria-current')).toBe('page')
    expect(clickHandler).toHaveBeenCalledTimes(1)
  })

  it('updates aria-current on Enter while leaving activation native', () => {
    const previous = root.querySelector('a[href="#one"]')
    const target = root.querySelector('a[href="#two"]')

    keydown(target, 'Enter')

    expect(previous.hasAttribute('aria-current')).toBe(false)
    expect(target.getAttribute('aria-current')).toBe('page')
  })

  it('closes disclosures when focus leaves or a pointer starts outside', () => {
    const products = root.querySelector('.menu__button')
    const outside = document.getElementById('outside')

    products.click()
    products.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }))
    expect(products.getAttribute('aria-expanded')).toBe('false')

    products.click()
    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(products.getAttribute('aria-expanded')).toBe('false')
  })

  it('keeps separate Disclosure instances isolated and prevents duplicate root listeners', () => {
    disclosure.destroyAll()
    document.body.innerHTML = `
      <nav class="c-menu" id="primary-menu">
        <button class="menu__button">Primary</button>
        <ul><li><a class="menu__link" href="#primary">Primary link</a></li></ul>
      </nav>
      <nav class="c-menu" id="secondary-menu">
        <button class="menu__button">Secondary</button>
        <ul><li><a class="menu__link" href="#secondary">Secondary link</a></li></ul>
      </nav>
    `

    const primaryRoot = document.getElementById('primary-menu')
    const secondaryRoot = document.getElementById('secondary-menu')
    const primary = new Disclosure(primaryRoot)
    const secondary = new Disclosure(secondaryRoot)
    const duplicate = new Disclosure(primaryRoot)

    primary.init()
    secondary.init()
    duplicate.init()

    const primaryButton = primaryRoot.querySelector('.menu__button')
    const secondaryButton = secondaryRoot.querySelector('.menu__button')

    primaryButton.click()
    secondaryButton.click()

    expect(primaryButton.getAttribute('aria-expanded')).toBe('true')
    expect(secondaryButton.getAttribute('aria-expanded')).toBe('true')

    primaryButton.click()
    expect(primaryButton.getAttribute('aria-expanded')).toBe('false')
    expect(secondaryButton.getAttribute('aria-expanded')).toBe('true')

    primary.destroyAll()
    secondary.destroyAll()
    duplicate.destroyAll()
  })

  it('is idempotent and removes listeners on destroy', () => {
    const products = root.querySelector('.menu__button')

    disclosure.init()
    products.click()
    expect(products.getAttribute('aria-expanded')).toBe('true')

    disclosure.destroy(root)
    products.click()
    expect(products.getAttribute('aria-expanded')).toBe('true')

    disclosure.init()
    expect(products.getAttribute('aria-expanded')).toBe('false')
    products.click()
    expect(products.getAttribute('aria-expanded')).toBe('true')
  })

  it('supports a root context and custom classes', () => {
    disclosure.destroyAll()
    document.body.innerHTML = `
      <nav class="custom-root">
        <button class="custom-button">Open</button>
        <div><a class="custom-link" href="#custom">Custom</a></div>
      </nav>
    `
    root = document.querySelector('.custom-root')
    disclosure = new Disclosure(root, {
      menuSelector: 'custom-root',
      buttonClass: 'custom-button',
      linkClass: 'custom-link',
      controllerClass: 'custom-controller',
    })

    disclosure.init()

    expect(root.querySelector('.custom-button').classList.contains('custom-controller')).toBe(true)
    expect(disclosure.menuInstances.has(root)).toBe(true)
  })

  it('supports a mobile toggle and an authored mobile breakpoint', async () => {
    disclosure.destroyAll()
    document.body.innerHTML = `
      <button id="mobile-toggle" aria-expanded="false">Menu</button>
      <nav class="c-menu" data-breakpoint="640">
        <ul data-depth="0">
          <li>
            <button class="menu__button">Products</button>
            <ul><li><a class="menu__link" href="#product">Product</a></li></ul>
          </li>
        </ul>
      </nav>
    `
    root = document.querySelector('.c-menu')
    disclosure = new Disclosure(document, { mobileControlId: 'mobile-toggle', mobileBreakpoint: 720 })

    await disclosure.init()

    const mobileToggle = document.getElementById('mobile-toggle')
    const disclosureButton = root.querySelector('.menu__button')
    const mobileController = disclosure.menuInstances.get(root).mobileController

    expect(root.classList.contains('c-menu-mobile')).toBe(true)
    expect(mobileToggle.classList.contains('js-mobile-toggle')).toBe(true)
    expect(mobileController.mobileBreakpoint).toBe('640')
    expect(window.matchMedia).toHaveBeenLastCalledWith('(max-width: 640px)')

    mobileToggle.click()
    expect(mobileToggle.getAttribute('aria-expanded')).toBe('true')

    disclosureButton.click()
    expect(disclosureButton.getAttribute('aria-expanded')).toBe('true')

    mobileToggle.click()
    expect(mobileToggle.getAttribute('aria-expanded')).toBe('false')
    expect(disclosureButton.getAttribute('aria-expanded')).toBe('false')
  })

  it('closes the mobile menu on Escape and removes mobile listeners on destroy', async () => {
    disclosure.destroyAll()
    document.body.innerHTML = `
      <button id="mobile-toggle" aria-expanded="false">Menu</button>
      <nav class="c-menu">
        <ul data-depth="0">
          <li><a class="menu__link" href="#home">Home</a></li>
        </ul>
      </nav>
    `
    root = document.querySelector('.c-menu')
    disclosure = new Disclosure(document, { mobileControlId: 'mobile-toggle', mobileBreakpoint: 720 })
    await disclosure.init()

    const mobileToggle = document.getElementById('mobile-toggle')
    const home = root.querySelector('.menu__link')

    mobileToggle.click()
    home.focus()
    keydown(home, 'Escape')
    expect(mobileToggle.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(mobileToggle)

    disclosure.destroy(root)
    mobileToggle.click()
    expect(mobileToggle.getAttribute('aria-expanded')).toBe('false')
  })
})
