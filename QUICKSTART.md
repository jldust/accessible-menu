# Quick Start Guide

## Installation

```bash
npm install @jldust/accessible-menu
```

## Basic Setup

### 1. HTML Structure

```html
<!-- Mobile toggle button -->
<button id="mobile-menu-btn" aria-expanded="false">Menu</button>

<!-- Menu structure -->
<nav class="c-menu" data-breakpoint="768">
  <ul class="menu">
    <li class="menu__item">
      <a href="#" class="menu__link">Home</a>
    </li>
    <li class="menu__item menu__item--expanded">
      <button class="menu__link" data-plugin-id="about">About</button>
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
```

### 2. JavaScript Initialization

```javascript
import { AccessibleMenu } from '@jldust/accessible-menu'

// Basic initialization
const menu = new AccessibleMenu()
menu.init()

// Or with custom configuration
const menu = new AccessibleMenu({
  menuSelector: '.my-menu',
  buttonClass: 'my-button',
  linkClass: 'my-link',
  mobileBreakpoint: 1024,
})
menu.init()
```

### 3. Custom Configuration Example

```javascript
const customMenu = new AccessibleMenu({
  menuSelector: '.navigation', // Your menu container class
  buttonClass: 'nav-button', // Your button class
  linkClass: 'nav-link', // Your link class
  itemClass: 'nav-item', // Your menu item class
  mobileBreakpoint: 1024, // Custom breakpoint
  mobileControlId: 'hamburger-btn', // Mobile toggle button ID
})

customMenu.init()
```

## Required HTML Attributes

These are controlled by the library and attached when the releative variables exist.

- `data-plugin-id` - Unique ID for menu buttons with submenus
- `data-depth` - Depth level for nested menus (1, 2, 3, etc.)
- `data-breakpoint` - Custom mobile breakpoint (optional)
- `data-mobile` - Reference to mobile toggle button ID (optional)

That's it! Your accessible menu is now ready with full keyboard navigation, mobile support, and ARIA compliance.
