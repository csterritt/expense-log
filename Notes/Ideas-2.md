## Expense log updates

### Noticing duplicate expenses

- Sometimes I enter the same expense twice, or I enter it once but it gets entered again later. We should have a way to identify duplicate expenses.
- A duplicate expense is one that has *almost* the same description, amount, and date.
  - The description should be similar, but not identical (e.g. "Grocery store" and "Grocery store trip")
  - The amount should be similar, but not identical (e.g. $100.00 and $100.50)
  - The date should be within a certain range (e.g. within 3 days of each other)
- The system should be able to identify a potential duplicate and prompt the user whether it should:
  - Replace the existing expense with the new one
  - Keep the existing expense and discard the new one
