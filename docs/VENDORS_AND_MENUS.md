# CampusRun — Vendors & Menu System

## Vendors with Digital Menus

These vendors have menu pages accessible via `/menu/*` routes and support the `MenuPicker` component in order creation.

| Vendor | Route | Zone |
|--------|-------|------|
| Cherries Restaurant | `/menu/cherries` | Food Court |
| 11:29 (Eleven-Twentynine) | `/menu/1129` | Male Shopping Complex |
| Dot Cafe | `/menu/dotcafe` | Food Court |
| Freenys Icepops | `/menu/freenys` | Food Court |
| Jaj Plate | `/menu/jaj` | Food Court |
| Papa Rimz | `/menu/paparims` | Food Court |
| B's Chops | `/menu/bschops` | Food Court |
| Zulkys | `/menu/zulkys` | Food Court |
| W Sauce | `/menu/wsauce` | Food Court |
| Quintavi | `/menu/quintavi` | Food Court |
| Pizza 360 | `/menu/pizza360` | Food Court |
| Suya 17 | `/menu/suya17` | Food Court |
| Yammys | `/menu/yammys` | Food Court |
| Trayblazers | `/menu/trayblazers` | Food Court |

## Vendors WITHOUT Price Lists

These vendors require the courier to confirm price at pickup:
- **Bridan Stores** (Male + Female Shopping Complex)
- **Printing Press** (Male Shopping Complex)

For Printing Press orders, a file uploader is shown instead of a menu picker. Supported file types: PDF, PPT, PPTX, XLS, XLSX, DOC, DOCX.

## Menu Data Management

MenuItem entities are managed via `AdminMenuTab` in the admin portal:
- Add/edit/delete items per vendor
- Toggle item availability
- Set category + price

Price edits submitted by couriers are reviewed in the `Prices` admin tab.
Approved edits automatically update the corresponding `MenuItem` price.

## VENDOR_MENU_MAP (CreateDelivery)

Maps pickup location strings to canonical vendor names:
```javascript
"B's Chops'n'grills" → "B's Chops'n'grills"
"Zulkys Cafe"        → "Zulkys Cafe"
"Quintavi Restaurant"→ "Quintavi Restaurant"
"Cherries Restaurant"→ "Cherries Restaurant"
"11:29 (Eleven-...)" → "11:29"
"Dot Cafe"           → "Dot Cafe"
"Freenys Icepops"    → "Freeny's Icepops"
"Jaj Plate and Perks"→ "Jaj Plate and Perks"
"Papa Rimz Nile"     → "Papa Rimz Nile"
"W Sauce"            → "W Sauce"
"Suya 17"            → "Suya 17"
"Yammys"             → "Yammys"
"Pizza 360 Promax"   → "Pizza 360 Promax"
"Trayblazers..."     → "Trayblazers Foods and Drinks"
```
