[< Back](../README.md)

# Workflow

This is the workflow document for the food ordering and tracking app.

- [x] Home Page
    - [x] A button to enter settings page
    - [x] A button to enter menu page

- [x] Navigation Bar (on all pages, except the home page)
    - [x] Top bar
        - [x] Display the restaurant name/image
        - [x] Display the table no
        - [x] A button to enter settings page
    - [x] Bottom Tab Bar
      - [x] Including the navigation button to different page (menu, cart, record)

- [x] Menu Page
    - [x] Menu items
        - [x] Redirect to product page on click
    - [x] A button to call the saff

- [x] Product page
    - [x] A button to go back
    - [x] Product details (image, title, description, price)
    - [x] Customization
    - [x] A set of buttons to select quantity
    - [x] Add to cart button

- [x] Cart Page
    - [x] Summary of cart items (items details, price per item, total price)
    - [x] A button to place order

- [x] Record Page
    - [x] A summary of all the orders placed by the user (including the status of the order)

- [x] Settings Page (implemented as sidebar component in cart.ejs)
    - [x] A button to change language
        - [x] Show all languages directly or build a dropdown menu for it.
        - [x] Change language on click
    - [x] A button to go back (close button)

- [x] Admin Page
    - [ ] Require authentication before entering this page (To Do)
    - [x] A button to enter QR code generation page
    - [x] List of all active sessions 

- [x] (Admin) QR Code Generation Page
    - [x] A input to enter the table no
    - [x] A button to generate qr code for the session
    - [x] A button to go back

- [ ] (Admin) Session Page (session detail page exists, but some functionality missing)
    - [ ] A button to change the status of an order (To Do)
    - [ ] A button to end the session (To Do)
    - [x] A button to go back
