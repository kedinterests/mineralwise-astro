# UnoCSS Setup - Astro Base Theme

UnoCSS has been successfully installed and configured following the **Astro Base** theme pattern.

## What's Installed

- ✅ UnoCSS with Wind4 preset (Tailwind-like utilities)
- ✅ Iconify integration for Heroicons
- ✅ Typography preset for prose styling
- ✅ CSS reset enabled

## How to Use

### Utility Classes

You can now use UnoCSS utility classes throughout your components. Examples:

```astro
<!-- Spacing -->
<div class="p-4 m-2">Padding and margin</div>

<!-- Flexbox -->
<div class="flex items-center justify-between">Flex container</div>

<!-- Colors -->
<p class="text-blue-500 bg-gray-100">Colored text and background</p>

<!-- Typography -->
<h1 class="text-3xl font-bold">Large bold heading</h1>

<!-- Responsive -->
<div class="w-full md:w-1/2 lg:w-1/3">Responsive width</div>
```

### Icons (Heroicons)

```astro
<div class="i-heroicons-home w-6 h-6"></div>
<div class="i-heroicons-user w-8 h-8 text-blue-500"></div>
```

### Existing CSS

Your existing custom CSS (`starwind.css`) will continue to work alongside UnoCSS. You can:

1. **Keep using custom CSS** - Everything still works
2. **Gradually migrate** - Replace custom CSS with UnoCSS classes over time
3. **Use both** - Mix custom CSS and UnoCSS utilities as needed

## Documentation

- [UnoCSS Documentation](https://unocss.dev/)
- [UnoCSS Interactive](https://unocss.dev/interactive) - Try classes in real-time
- [Heroicons](https://heroicons.com/) - Browse available icons

## Example Migration

**Before (Custom CSS):**
```astro
<div class="content-wrapper">
  <h1 class="title">Heading</h1>
</div>
```

**After (UnoCSS):**
```astro
<div class="max-w-6xl mx-auto px-4">
  <h1 class="text-4xl font-bold mb-4">Heading</h1>
</div>
```

## Configuration

UnoCSS is configured in `uno.config.ts`. You can customize:
- Presets (Wind4, Icons, Typography)
- Theme colors
- Breakpoints
- Custom utilities

See [UnoCSS Config](https://unocss.dev/config/) for more options.
