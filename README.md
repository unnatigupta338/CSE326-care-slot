# CareSlot

CareSlot is a CSE326 class project for booking and managing health screening appointments. The public landing page takes inspiration from Wix's Doctor (Modern) template.

## Run locally

Open index.html for a quick preview. For a consistent browser storage origin, run `python -m http.server 8000` in this folder and visit http://localhost:8000. No installation or build step is required.

## Demo walkthrough

1. Choose a screening from the home page, select an available time and register with fictional details.
2. Select Staff demo sign-in to open the dashboard. The initial data includes eight screening programs and examples of each appointment status.
3. In Programs & slots, create a program, add a future appointment time or edit slot capacity.
4. In Appointments, filter by status, record attendance or open a reminder draft in your email client.
5. In Dashboard, inspect totals and download the summary CSV.

The demo stores records in the current browser. The staff switch demonstrates role-based views. Shared records and enforceable access controls require a backend with authentication. Reminders use email drafts that staff can send manually. Use fictional participant details.

