# @jldust/accessible-menu

A highly configurable, accessible menu component that supports keyboard navigation, mobile controls, and ARIA attributes.

## Current Support

This library currently implements the **[Menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)** from the WAI-ARIA Authoring Practices Guide.

### Future Plans

We have plans to support additional menu patterns, including:

- Tree menu pattern
- And more to come

## Features

- **Keyboard Navigation**: Full arrow key support, tab navigation, and escape key handling
- **Mobile-First**: Responsive design with configurable breakpoints
- **ARIA Compliant**: Proper ARIA attributes for screen readers
- **Configurable**: Customize CSS classes, breakpoints, and behavior
- **Framework Agnostic**: Works with any framework or vanilla JavaScript
- **TypeScript Support**: Full type definitions included

## Installation

```bash
npm install @jldust/accessible-menu
```

## Basic Usage

### ES6 Modules

```javascript
import { Menubar } from '@jldust/accessible-menu'

// Initialize with default settings
const menu = new Menubar()
await menu.init()
```

### With CSS Styles

```html
<!-- Include the CSS for menu styling -->
<link rel="stylesheet" href="node_modules/@jldust/accessible-menu/dist/menu-styles.css" />

<!-- Or import in your CSS/SCSS -->
@import '~@jldust/accessible-menu/dist/menu-styles.css';
```

```javascript
import { Menubar } from '@jldust/accessible-menu'

const menu = new Menubar()
await menu.init()
```

### CommonJS

```javascript
const { Menubar } = require('@jldust/accessible-menu')

const menu = new Menubar()
await menu.init()
```

### UMD (Browser)

```html
<script src="node_modules/@jldust/accessible-menu/dist/index.umd.min.js"></script>
<script>
  const menu = new AccessibleMenu.Menubar()
  await menu.init()
</script>
```

## Configuration

### Custom Configuration

```javascript
import { Menubar } from '@jldust/accessible-menu'

const menu = new Menubar({
  menuSelector: '.my-menu',
  buttonClass: 'my-menu__button',
  linkClass: 'my-menu__link',
  itemClass: 'my-menu__item',
  mobileBreakpoint: 1024,
  mobileControlId: 'mobile-menu-toggle',
})

await menu.init()
```

### Configuration Options

| Option             | Type             | Default        | Description                          |
| ------------------ | ---------------- | -------------- | ------------------------------------ |
| `menuSelector`     | `string`         | `'.c-menu'`    | CSS selector for menu containers     |
| `buttonClass`      | `string`         | `'menu__link'` | CSS class for menu buttons           |
| `linkClass`        | `string`         | `'menu__link'` | CSS class for menu links             |
| `itemClass`        | `string`         | `'menu__item'` | CSS class for menu items             |
| `mobileBreakpoint` | `number`         | `768`          | Mobile breakpoint in pixels          |
| `mobileControlId`  | `string \| null` | `'nav-toggle'` | ID of the mobile menu control button |

## HTML Structure

### Basic Menu Structure

```html
<nav class="c-menu" data-breakpoint="768">
  <ul class="menu">
    <li class="menu__item">
      <a href="#" class="menu__link">Home</a>
    </li>
    <li class="menu__item menu__item--expanded">
      <button class="menu__link">About</button>
      <ul class="menu" data-depth="1">
        <li class="menu__item">
          <a href="#" class="menu__link">Our Story</a>
        </li>
        <li class="menu__item">
          <a href="#" class="menu__link">Team</a>
        </li>
      </ul>
    </li>
  </ul>
</nav>

<!-- Mobile toggle button -->
<button id="mobile-toggle" aria-expanded="false">Menu</button>
```

### Mega Menu Structure (Work In Progress)

```html
<nav class="c-menu">
  <ul class="menu">
    <li class="menu__item menu__item--expanded">
      <span class="menu__link">Services</span>
      <div class="c-mega-menu__wrapper">
        <ul class="menu" data-depth="1">
          <li class="menu__item">
            <a href="#" class="menu__link">Web Design</a>
          </li>
          <li class="menu__item">
            <a href="#" class="menu__link">Development</a>
          </li>
        </ul>
      </div>
    </li>
  </ul>
</nav>
```

## Keyboard Navigation

| Key                       | Action                                               |
| ------------------------- | ---------------------------------------------------- |
| `Arrow Down` / `Arrow Up` | Navigate between menu items vertically               |
| `Arrow Right`             | Open submenu or navigate to next top-level item      |
| `Arrow Left`              | Close submenu or navigate to previous top-level item |
| `Tab`                     | Navigate to next focusable element                   |
| `Escape`                  | Close current submenu and return focus to parent     |
| `Enter` / `Space`         | Activate menu button or follow link                  |

## Mobile Behavior

- Menu collapses below the configured breakpoint
- Mobile toggle button controls menu visibility
- Clicking outside the menu closes it on mobile
- Escape key closes the mobile menu
- Body scroll is prevented when mobile menu is open

## API Methods

### `init(context)`

Initialize menus within the specified context.

```javascript
// Initialize all menus on the page
menu.init()

// Initialize menus within a specific container
menu.init(document.querySelector('.header'))
```

### `destroy(menuContainer)`

Destroy a specific menu instance.

```javascript
const menuElement = document.querySelector('.c-menu')
menu.destroy(menuElement)
```

### `destroyAll()`

Destroy all menu instances.

```javascript
menu.destroyAll()
```

## CSS Styles

The package includes pre-built CSS styles that handle menu open/close animations and basic layout:

### Including CSS Styles

```html
<!-- Include the CSS file -->
<link rel="stylesheet" href="node_modules/@jldust/accessible-menu/dist/menu-styles.css" />
```

```css
/* Or import in your CSS/SCSS */
@import '~@jldust/accessible-menu/dist/menu-styles.css';
```

### Key CSS Features

- **Smooth animations** for menu open/close with opacity and transform transitions
- **Mobile-responsive** layout with hamburger menu behavior
- **Focus indicators** for keyboard navigation
- **ARIA-based styling** that responds to `aria-expanded` attributes
- **Customizable** - override styles as needed for your design system

### Critical CSS Selectors

The CSS relies on these key selectors for functionality:

```css
/* Hidden state */
.controller[aria-expanded='false'] + *:not([data-depth='0']) {
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
}

/* Visible state */
.controller[aria-expanded='true'] + *:not([data-depth='0']) {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
```

## Dependencies

No external dependencies! The package is completely self-contained.

## Development

### Building the Package

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Running Tests

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Accessibility

To the best of our ability this library follows WCAG 2.2 AA guidelines and implements WAI-ARIA best practices for navigation menus. It has been tested with macOS VoiceOver and keyboard-only navigation.

## Changelog

### 1.0.0

- Initial release
- Full keyboard navigation support
- Mobile menu controls
- ARIA compliance
- TypeScript definitions
