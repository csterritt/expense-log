## Typescript

- use types where possible
- use arrow functions, not function declarations
- ALWAYS put braces around the body of an 'if' or 'while', even there is only a single line in the body
- use functional programming where possible, and do not use classes
- implement client-side form validation via HTML attributes

## form submission

- use the 'value' attribute for form inputs in edit forms (or wherever a default value is needed), not 'defaultValue'
- if there is a length limit on a form input element:
  - use a constant defined in that file for the length limit, with PRODUCTION comments, e.g.:
    // const nameMax = 20 // PRODUCTION:UNCOMMENT
    const nameMax = 22
  - use the not-commented-out value for testing, which should be at least two more than the length limit, so browsers won't auto-truncate

## data-testid

- use data-testid attributes to identify elements for testing
- use kebab-case for data-testid attributes
- ALWAYS name data-testid for either links, buttons, or form submit with 'name-action', not 'name-link', 'name-button', or 'name-submit'
