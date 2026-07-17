# src/renderer.tsx

Hono JSX renderer that wraps all page content in a standard HTML5 document shell.

## Behavior

Uses `hono/jsx-renderer` with `docType: true` to produce:

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/style-20250722184943.css" type="text/css" />
    <title>Expense Log</title>
  </head>
  <body class="min-h-screen bg-base-200">
    <!-- page content -->
  </body>
</html>
```

The CSS file is a build-time generated Tailwind/DaisyUI stylesheet with a timestamped filename for cache busting.

## Usage

Registered as middleware via `app.use(renderer)` in `src/index.ts`. Route handlers call `c.render()` which injects page JSX as `children`.
