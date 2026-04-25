## Web Behavior

- use the 'value' attribute for form inputs in edit forms (or wherever a default value is needed), not 'defaultValue'
- For styling, use DaisyUI and TailwindCSS.
- You can use the following files as references:
    - 'renderer.tsx' - an example of the root styling
    - 'build-layout.tsx' - an example of a layout component
- When writing a request handler, always use the `redirectWithMessage` or `redirectWithError` functions from `src/lib/redirects.tsx` to redirect with a message or error cookie. NEVER return just text.
- Always generate proper accessibility: ARIA roles, semantic HTML, and keyboard navigation.
