# Voyagio Tour Booking — Backend Setup

## Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Python + Flask
- Database: MySQL
- Database tool: MySQL Workbench

## 1. Install dependencies

Open PowerShell/Terminal inside the `Internship Project` folder:

```bash
pip install -r requirements.txt
```

## 2. Configure `.env`

Keep your local database values in `.env`:

```env
FLASK_SECRET_KEY=your-secret-key
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_NAME=voyagio
```

## 3. Create the database

Open MySQL Workbench and run:

`database/voyagio.sql`

If you already created the database using an older version of the SQL file, run this once if `contact_messages` does not have a `mobile` column:

```sql
ALTER TABLE contact_messages
ADD COLUMN mobile VARCHAR(30) DEFAULT NULL AFTER email;
```

## 4. Start Flask

```bash
python app.py
```

Then open:

`http://127.0.0.1:5000/`

Do not open the HTML files directly with `file://`; use Flask so that `/api/...` requests work.

## Admin Login

Demo development account:

- Email: `admin@voyagio.travel`
- Password: `Admin@123`

Change/remove this demo account before real deployment.

## Admin features completed

- Admin login with Flask session
- Protected admin API
- Dashboard statistics from MySQL
- Recent bookings
- Add tour package
- Edit tour package
- Delete tour package
- Active/inactive package status
- View booking details
- Confirm/cancel booking
- View contact messages
- Mark messages as read
- Delete contact messages
- Admin logout
- Mobile-friendly admin navigation

## Main admin APIs

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`
- `GET /api/admin/stats`
- `GET /api/admin/packages`
- `POST /api/admin/packages`
- `PUT /api/admin/packages/<id>`
- `DELETE /api/admin/packages/<id>`
- `GET /api/admin/bookings`
- `PATCH /api/admin/bookings/<id>/status`
- `GET /api/admin/messages`
- `PATCH /api/admin/messages/<id>/status`
- `DELETE /api/admin/messages/<id>`

User-side booking and contact submission endpoints are also connected:

- `POST /api/bookings`
- `POST /api/contact`
