# Separate profiles from auth users

`Perfil` is represented by a product-owned `profiles` table instead of adding
product ownership fields to Auth.js `users`. Auth.js tables remain provider and
session infrastructure, while profiles own app preferences and future product
resources such as watchlists, alert rules, and generated alerts.
