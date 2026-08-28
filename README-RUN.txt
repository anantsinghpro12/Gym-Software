GymOS must be opened over http://localhost — NOT by double-clicking login.html
(which opens file://...). Browsers block real folder/file storage on file://
pages, which is the exact error you hit.

Pick ONE of these, run it from inside the gymos folder, then open the printed
localhost URL in Chrome or Edge:

1) Python (already on most systems)
   cd gymos
   python -m http.server 8000
   -> open http://localhost:8000/login.html

2) Node.js
   cd gymos
   npx serve -l 8000
   -> open http://localhost:8000/login.html

3) VS Code
   Install the "Live Server" extension, right-click login.html -> "Open with Live Server"

No backend framework, database server, or build step is used — these commands
only serve the existing static files over HTTP instead of file://.

Once GymOS loads via http://localhost, click "Connect Data Folder" and choose
(or create) a folder — e.g. gymos/data — GymOS will create:
  data/_system/tenants.txt        (all gyms — Super Admin only)
  data/_system/users.txt          (all logins — Super Admin only)
  data/<gymId>_<gym-name>/*.txt   (one folder per gym, compact pipe/CSV-style
                                    files: members.txt, payments.txt, etc.)

Default logins after first run:
  Super Admin  ->  sapower-jio.html   admin@gymos.local / superadmin123
  Demo Gym Owner -> login.html        owner@demogym.com / password123
