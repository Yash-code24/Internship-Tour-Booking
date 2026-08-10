from flask import Flask, jsonify, request, send_from_directory, session
from werkzeug.security import generate_password_hash, check_password_hash
import pymysql
import os
from functools import wraps

# Load .env when python-dotenv is installed.
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'change-this-secret-key')

DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'user': os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASSWORD', ''),
    'database': os.environ.get('DB_NAME', 'voyagio'),
    'cursorclass': pymysql.cursors.DictCursor,
    'autocommit': True,
}


def get_db():
    return pymysql.connect(**DB_CONFIG)


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get('admin_id'):
            return jsonify({'success': False, 'message': 'Admin login required.'}), 401
        return fn(*args, **kwargs)
    return wrapper


def make_booking_code():
    with get_db() as db:
        with db.cursor() as cur:
            cur.execute(
                "SELECT booking_code FROM bookings ORDER BY id DESC LIMIT 1"
            )
            row = cur.fetchone()
    if not row:
        return 'VG-1001'
    try:
        number = int(str(row['booking_code']).split('-')[-1]) + 1
    except (ValueError, AttributeError):
        number = 1001
    return f'VG-{number}'


@app.get('/')
def home():
    return send_from_directory(BASE_DIR, 'index.html')


@app.get('/<path:path>')
def static_pages(path):
    file_path = os.path.join(BASE_DIR, path)
    if os.path.isfile(file_path):
        return send_from_directory(BASE_DIR, path)
    return jsonify({'error': 'Page not found'}), 404


# ---------------- User APIs ----------------

@app.post('/api/register')
def register():
    data = request.get_json(silent=True) or {}
    full_name = data.get('fullName', '').strip()
    email = data.get('email', '').strip().lower()
    mobile = data.get('mobile', '').strip()
    password = data.get('password', '')
    confirm = data.get('confirmPassword', '')

    if not all([full_name, email, mobile, password]):
        return jsonify({'success': False, 'message': 'All fields are required.'}), 400
    if password != confirm:
        return jsonify({'success': False, 'message': 'Passwords do not match.'}), 400
    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters.'}), 400

    try:
        with get_db() as db:
            with db.cursor() as cur:
                cur.execute('SELECT id FROM users WHERE email=%s OR mobile=%s', (email, mobile))
                if cur.fetchone():
                    return jsonify({'success': False, 'message': 'Email or mobile number is already registered.'}), 409
                cur.execute(
                    'INSERT INTO users (full_name, email, mobile, password_hash) VALUES (%s,%s,%s,%s)',
                    (full_name, email, mobile, generate_password_hash(password))
                )
        return jsonify({'success': True, 'message': 'Account created successfully.'})
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500


@app.post('/api/login')
def login():
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    try:
        with get_db() as db:
            with db.cursor() as cur:
                cur.execute('SELECT id, full_name, email, password_hash FROM users WHERE email=%s', (email,))
                user = cur.fetchone()
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'success': False, 'message': 'Invalid email or password.'}), 401
        session['user_id'] = user['id']
        session['user_name'] = user['full_name']
        return jsonify({'success': True, 'message': f"Welcome, {user['full_name']}!", 'redirect': '/index.html'})
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500


@app.post('/api/admin/login')
def admin_login():
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    try:
        with get_db() as db:
            with db.cursor() as cur:
                cur.execute('SELECT id, name, email, password_hash FROM admins WHERE email=%s', (email,))
                admin = cur.fetchone()
        if not admin or not check_password_hash(admin['password_hash'], password):
            return jsonify({'success': False, 'message': 'Invalid admin credentials.'}), 401
        session.clear()
        session['admin_id'] = admin['id']
        session['admin_name'] = admin['name']
        return jsonify({
            'success': True,
            'message': 'Admin login successful.',
            'redirect': '/pages/admin/dashboard.html'
        })
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500


@app.post('/api/admin/logout')
def admin_logout():
    session.pop('admin_id', None)
    session.pop('admin_name', None)
    return jsonify({'success': True, 'message': 'Logged out successfully.'})


@app.get('/api/admin/me')
@admin_required
def admin_me():
    return jsonify({
        'success': True,
        'admin': {'id': session['admin_id'], 'name': session.get('admin_name', 'Admin')}
    })



@app.get('/api/packages')
def public_packages():
    """Return only active tour packages for the public website."""
    try:
        with get_db() as db:
            with db.cursor() as cur:
                cur.execute("""
                    SELECT id, package_code, name, destination, duration, category,
                           price, image, description, status
                    FROM tour_packages
                    WHERE status='active'
                    ORDER BY id DESC
                """)
                packages = cur.fetchall()
        for row in packages:
            row['price'] = float(row['price'])
        return jsonify({'success': True, 'packages': packages})
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500


@app.get('/api/packages/<int:package_id>')
def public_package(package_id):
    """Return one active package for the public package-details page."""
    try:
        with get_db() as db:
            with db.cursor() as cur:
                cur.execute("""
                    SELECT id, package_code, name, destination, duration, category,
                           price, image, description, status
                    FROM tour_packages
                    WHERE id=%s AND status='active'
                """, (package_id,))
                package = cur.fetchone()
        if not package:
            return jsonify({'success': False, 'message': 'Package not found or inactive.'}), 404
        package['price'] = float(package['price'])
        return jsonify({'success': True, 'package': package})
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500


@app.post('/api/bookings')
def create_booking():
    data = request.get_json(silent=True) or {}
    full_name = str(data.get('fullName', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    mobile = str(data.get('mobile', '')).strip()
    start_date = str(data.get('startDate', '')).strip()
    try:
        adults = max(1, int(data.get('adults', 1)))
        children = max(0, int(data.get('children', 0)))
        rooms = max(1, int(data.get('rooms', 1)))
    except (TypeError, ValueError):
        return jsonify({'success': False, 'message': 'Traveller and room counts must be valid numbers.'}), 400
    requests_text = str(data.get('requests', '')).strip()
    package_id = data.get('packageId') or None

    if not all([full_name, email, mobile, start_date]):
        return jsonify({'success': False, 'message': 'Name, email, mobile and start date are required.'}), 400

    try:
        with get_db() as db:
            with db.cursor() as cur:
                if package_id:
                    cur.execute("SELECT id FROM tour_packages WHERE id=%s AND status='active'", (package_id,))
                    if not cur.fetchone():
                        package_id = None
                code = make_booking_code()
                cur.execute("""
                    INSERT INTO bookings
                    (booking_code, user_id, package_id, full_name, email, mobile, start_date,
                     adults, children, rooms, special_requests)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    code, session.get('user_id'), package_id, full_name, email, mobile,
                    start_date, adults, children, rooms, requests_text
                ))
        return jsonify({'success': True, 'message': f'Booking submitted successfully. Your booking ID is {code}.'})
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500


@app.post('/api/contact')
def create_contact_message():
    data = request.get_json(silent=True) or {}
    name = str(data.get('fullName', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    mobile = str(data.get('mobile', '')).strip()
    subject = str(data.get('subject', '')).strip() or None
    message = str(data.get('message', '')).strip()

    if not name or not email or not message:
        return jsonify({'success': False, 'message': 'Name, email and message are required.'}), 400
    if len(message) < 10:
        return jsonify({'success': False, 'message': 'Message must be at least 10 characters.'}), 400

    try:
        with get_db() as db:
            with db.cursor() as cur:
                try:
                    cur.execute("""
                        INSERT INTO contact_messages (name, email, subject, message, mobile)
                        VALUES (%s,%s,%s,%s,%s)
                    """, (name, email, subject, message, mobile or None))
                except pymysql.MySQLError as exc:
                    # Older databases may not have the mobile column yet.
                    # Add it automatically, then retry so new contact messages
                    # keep the visitor's mobile number.
                    if 'unknown column' in str(exc).lower() and 'mobile' in str(exc).lower():
                        cur.execute("ALTER TABLE contact_messages ADD COLUMN mobile VARCHAR(30) DEFAULT NULL AFTER email")
                        cur.execute("""
                            INSERT INTO contact_messages (name, email, subject, message, mobile)
                            VALUES (%s,%s,%s,%s,%s)
                        """, (name, email, subject, message, mobile or None))
                    else:
                        raise
        return jsonify({'success': True, 'message': 'Message sent successfully. We will contact you soon.'})
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500

# ---------------- Admin dashboard ----------------

@app.get('/api/admin/stats')
@admin_required
def admin_stats():
    try:
        with get_db() as db:
            with db.cursor() as cur:
                cur.execute('SELECT COUNT(*) AS total FROM users')
                users = cur.fetchone()['total']
                cur.execute('SELECT COUNT(*) AS total FROM tour_packages')
                packages = cur.fetchone()['total']
                cur.execute('SELECT COUNT(*) AS total FROM bookings')
                bookings = cur.fetchone()['total']
                cur.execute("SELECT COUNT(*) AS total FROM contact_messages WHERE status='unread'")
                unread_messages = cur.fetchone()['total']
                cur.execute("""
                    SELECT b.booking_code, b.full_name, b.start_date, b.status,
                           COALESCE(p.name, 'Package removed') AS package_name
                    FROM bookings b
                    LEFT JOIN tour_packages p ON p.id = b.package_id
                    ORDER BY b.created_at DESC
                    LIMIT 5
                """)
                recent = cur.fetchall()
        for row in recent:
            row['start_date'] = row['start_date'].isoformat() if row['start_date'] else None
        return jsonify({
            'success': True,
            'stats': {
                'users': users,
                'packages': packages,
                'bookings': bookings,
                'messages': unread_messages
            },
            'recentBookings': recent
        })
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500


# ---------------- Admin packages ----------------

@app.get('/api/admin/packages')
@admin_required
def admin_packages():
    try:
        with get_db() as db:
            with db.cursor() as cur:
                cur.execute("""
                    SELECT id, package_code, name, destination, duration, category,
                           price, image, description, status, created_at
                    FROM tour_packages
                    ORDER BY id DESC
                """)
                packages = cur.fetchall()
        for row in packages:
            row['price'] = float(row['price'])
            row['created_at'] = row['created_at'].isoformat() if row['created_at'] else None
        return jsonify({'success': True, 'packages': packages})
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500


@app.post('/api/admin/packages')
@admin_required
def create_package():
    data = request.get_json(silent=True) or {}
    name = str(data.get('name', '')).strip()
    destination = str(data.get('destination', '')).strip()
    duration = str(data.get('duration', '')).strip()
    category = str(data.get('category', '')).strip()
    description = str(data.get('description', '')).strip()
    image = str(data.get('image', '')).strip() or None
    status = data.get('status', 'active')
    package_code = str(data.get('packageCode', '')).strip()

    try:
        price = float(data.get('price', 0))
    except (TypeError, ValueError):
        return jsonify({'success': False, 'message': 'Price must be a valid number.'}), 400

    if not all([name, destination, duration, category]):
        return jsonify({'success': False, 'message': 'Name, destination, duration and category are required.'}), 400
    if price < 0:
        return jsonify({'success': False, 'message': 'Price cannot be negative.'}), 400
    if status not in ('active', 'inactive'):
        status = 'active'

    try:
        with get_db() as db:
            with db.cursor() as cur:
                if not package_code:
                    cur.execute("SELECT package_code FROM tour_packages ORDER BY id DESC LIMIT 1")
                    last = cur.fetchone()
                    try:
                        next_no = int(last['package_code'][1:]) + 1 if last else 1
                    except (ValueError, TypeError, KeyError):
                        next_no = 1
                    package_code = f'P{next_no:03d}'
                cur.execute("""
                    INSERT INTO tour_packages
                    (package_code, name, destination, duration, category, price, image, description, status)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (package_code, name, destination, duration, category, price, image, description, status))
        return jsonify({'success': True, 'message': 'Package added successfully.'})
    except pymysql.IntegrityError:
        return jsonify({'success': False, 'message': 'Package code already exists. Use a different code.'}), 409
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500


@app.put('/api/admin/packages/<int:package_id>')
@admin_required
def update_package(package_id):
    data = request.get_json(silent=True) or {}
    name = str(data.get('name', '')).strip()
    destination = str(data.get('destination', '')).strip()
    duration = str(data.get('duration', '')).strip()
    category = str(data.get('category', '')).strip()
    description = str(data.get('description', '')).strip()
    image = str(data.get('image', '')).strip() or None
    package_code = str(data.get('packageCode', '')).strip()
    status = data.get('status', 'active')

    try:
        price = float(data.get('price', 0))
    except (TypeError, ValueError):
        return jsonify({'success': False, 'message': 'Price must be a valid number.'}), 400

    if not all([name, destination, duration, category]):
        return jsonify({'success': False, 'message': 'Name, destination, duration and category are required.'}), 400
    if price < 0:
        return jsonify({'success': False, 'message': 'Price cannot be negative.'}), 400
    if status not in ('active', 'inactive'):
        status = 'active'

    try:
        with get_db() as db:
            with db.cursor() as cur:
                cur.execute("""
                    UPDATE tour_packages
                    SET package_code=%s, name=%s, destination=%s, duration=%s,
                        category=%s, price=%s, image=%s, description=%s, status=%s
                    WHERE id=%s
                """, (package_code, name, destination, duration, category, price, image, description, status, package_id))
                if cur.rowcount == 0:
                    return jsonify({'success': False, 'message': 'Package not found.'}), 404
        return jsonify({'success': True, 'message': 'Package updated successfully.'})
    except pymysql.IntegrityError:
        return jsonify({'success': False, 'message': 'Package code already exists.'}), 409
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500


@app.delete('/api/admin/packages/<int:package_id>')
@admin_required
def delete_package(package_id):
    try:
        with get_db() as db:
            with db.cursor() as cur:
                cur.execute('DELETE FROM tour_packages WHERE id=%s', (package_id,))
                if cur.rowcount == 0:
                    return jsonify({'success': False, 'message': 'Package not found.'}), 404
        return jsonify({'success': True, 'message': 'Package deleted successfully.'})
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500


# ---------------- Admin bookings ----------------

@app.get('/api/admin/bookings')
@admin_required
def admin_bookings():
    try:
        with get_db() as db:
            with db.cursor() as cur:
                cur.execute("""
                    SELECT b.id, b.booking_code, b.full_name, b.email, b.mobile,
                           b.start_date, b.adults, b.children, b.rooms, b.special_requests,
                           b.status, b.created_at, b.package_id,
                           COALESCE(p.name, 'Package removed') AS package_name
                    FROM bookings b
                    LEFT JOIN tour_packages p ON p.id = b.package_id
                    ORDER BY b.created_at DESC
                """)
                bookings = cur.fetchall()
        for row in bookings:
            for key in ('start_date', 'created_at'):
                if row[key]:
                    row[key] = row[key].isoformat()
        return jsonify({'success': True, 'bookings': bookings})
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500


@app.patch('/api/admin/bookings/<int:booking_id>/status')
@admin_required
def update_booking_status(booking_id):
    data = request.get_json(silent=True) or {}
    status = data.get('status')
    if status not in ('pending', 'confirmed', 'cancelled'):
        return jsonify({'success': False, 'message': 'Invalid booking status.'}), 400

    try:
        with get_db() as db:
            with db.cursor() as cur:
                cur.execute('UPDATE bookings SET status=%s WHERE id=%s', (status, booking_id))
                if cur.rowcount == 0:
                    return jsonify({'success': False, 'message': 'Booking not found.'}), 404
        return jsonify({'success': True, 'message': f'Booking marked {status}.'})
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500


# ---------------- Admin contact messages ----------------

@app.get('/api/admin/messages')
@admin_required
def admin_messages():
    try:
        with get_db() as db:
            with db.cursor() as cur:
                try:
                    cur.execute("""
                        SELECT id, name, email, mobile, subject, message, status, created_at
                        FROM contact_messages
                        ORDER BY created_at DESC
                    """)
                except pymysql.MySQLError as exc:
                    # If an older DB is missing mobile, create the column.
                    if 'unknown column' in str(exc).lower() and 'mobile' in str(exc).lower():
                        cur.execute("ALTER TABLE contact_messages ADD COLUMN mobile VARCHAR(30) DEFAULT NULL AFTER email")
                        cur.execute("""
                            SELECT id, name, email, mobile, subject, message, status, created_at
                            FROM contact_messages
                            ORDER BY created_at DESC
                        """)
                    else:
                        raise
                messages = cur.fetchall()
        for row in messages:
            row['created_at'] = row['created_at'].isoformat() if row['created_at'] else None
        return jsonify({'success': True, 'messages': messages})
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500


@app.patch('/api/admin/messages/<int:message_id>/status')
@admin_required
def update_message_status(message_id):
    data = request.get_json(silent=True) or {}
    status = data.get('status')
    if status not in ('unread', 'read'):
        return jsonify({'success': False, 'message': 'Invalid message status.'}), 400
    try:
        with get_db() as db:
            with db.cursor() as cur:
                cur.execute('UPDATE contact_messages SET status=%s WHERE id=%s', (status, message_id))
                if cur.rowcount == 0:
                    return jsonify({'success': False, 'message': 'Message not found.'}), 404
        return jsonify({'success': True, 'message': f'Message marked {status}.'})
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500


@app.delete('/api/admin/messages/<int:message_id>')
@admin_required
def delete_message(message_id):
    try:
        with get_db() as db:
            with db.cursor() as cur:
                cur.execute('DELETE FROM contact_messages WHERE id=%s', (message_id,))
                if cur.rowcount == 0:
                    return jsonify({'success': False, 'message': 'Message not found.'}), 404
        return jsonify({'success': True, 'message': 'Message deleted successfully.'})
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'message': f'Database error: {exc}'}), 500


# ---------------- Health ----------------

@app.get('/api/health')
def health():
    try:
        with get_db() as db:
            with db.cursor() as cur:
                cur.execute('SELECT 1 AS ok')
                cur.fetchone()
        return jsonify({'success': True, 'database': 'connected'})
    except pymysql.MySQLError as exc:
        return jsonify({'success': False, 'database': 'not connected', 'message': str(exc)}), 500


if __name__ == '__main__':
    app.run(debug=True)
