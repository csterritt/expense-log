---
trigger: always_on
---

## Miscellany

- When asked to write a plan, make a file named "plan.md" and put it in the Notes directory. go ahead and write the plan to the file, even before and questions or concerns are addressed.

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

## server and test running

- run the server with one of the following commands, you cannot just run 'npm run dev':
  - npm run dev-open-sign-up
  - npm run dev-no-sign-up
  - npm run dev-gated-sign-up
  - npm run dev-interest-sign-up
- by default, run the server with open sign-up
- run the tests with the following command:
  - npx playwright test
  - you can add specific tests by naming them after the 'npx playwright test' command
  - you can have it stop at the first failure by adding the '-x' argument
- when running the tests, just run until the first test fails, and fix that problem.
  - if that fix applies to other tests, apply that fix to the other tests, then continue fixing one failure at a time
- when writing tests, make sure to look in the @e2e-tests/support folder for test helpers
