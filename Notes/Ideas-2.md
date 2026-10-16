## Expense log updates

### Noticing duplicate expenses

- Sometimes I enter the same expense twice, or I enter it once but it gets entered again later. We should have a way to identify duplicate expenses.
- A duplicate expense is one that has *almost* the same amount, and date.
  - The amount should be similar, but not identical (e.g. $100.00 and $100.50)
  - The date should be within a certain range (e.g. within 4 days of each other)
- The system should be able to identify a potential duplicate and prompt the user whether it should be saved or not.
- There can be several potential duplicates, so the system should show all of them on a separate page.
- This is for entry only, not for editing or deleting expenses.
- This is also only for human entry, not for recurring expenses. Those should just go through.

### Displaying the last successful entry after it's been saved

- After an expense is successfully saved, the app should display the last successful entry in a prominent way, so that the user can see what they just entered.
- It should be displayed between the form and the list of expenses, with a clear visual distinction (daisyui alert style):
  ```html
  <div role="alert" class="alert alert-info alert-outline">
    <!-- last update info here -->
  </div>
  ```
- On the next operation (search, filter, or clear), this element should be removed. There's no automatic dismissal.

### Switching to a drop-down list for main pages

- There are the links at the top of the page in the nav bar that allow the user to switch between the main pages (Expenses, Categories, Tags, Summary, Recurring).
- When viewed on a mobile browser, these should be replaced with a drop-down list that allows the user to select the page they want to go to.
- When on a desktop browser, these should remain as links.
- When on mobile, the drop down should be a button with the name of the current page as the button text. When clicked, it should open the drop-down list.
- The drop-down list should have a down-arrow next to the page name.
