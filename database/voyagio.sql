CREATE DATABASE IF NOT EXISTS voyagio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE voyagio;

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    mobile VARCHAR(30) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admins (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tour_packages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    package_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    destination VARCHAR(150) NOT NULL,
    duration VARCHAR(60) NOT NULL,
    category VARCHAR(80) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    image VARCHAR(500) DEFAULT NULL,
    description TEXT,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_code VARCHAR(30) NOT NULL UNIQUE,
    user_id INT UNSIGNED NULL,
    package_id INT UNSIGNED NULL,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL,
    mobile VARCHAR(30) NOT NULL,
    start_date DATE NOT NULL,
    adults INT UNSIGNED NOT NULL DEFAULT 1,
    children INT UNSIGNED NOT NULL DEFAULT 0,
    rooms INT UNSIGNED NOT NULL DEFAULT 1,
    special_requests TEXT,
    status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (package_id) REFERENCES tour_packages(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL,
    mobile VARCHAR(30) DEFAULT NULL,
    subject VARCHAR(200) DEFAULT NULL,
    message TEXT NOT NULL,
    status ENUM('unread','read') NOT NULL DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Demo admin for development only.
-- Password: Admin@123
INSERT INTO admins (name, email, password_hash)
SELECT 'Admin', 'admin@voyagio.travel', 'pbkdf2:sha256:600000$voyagio-admin-salt-2026$a9c22a5cd436863ba572662926fbd35f8aba77776720f01def28fdb44d6865b0'
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE email='admin@voyagio.travel');

-- The Flask backend also auto-adds this column if an older database is missing it.
-- ALTER TABLE contact_messages ADD COLUMN mobile VARCHAR(30) DEFAULT NULL AFTER email;
