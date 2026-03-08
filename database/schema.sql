-- EventFlow Pro Database Schema
-- Run this SQL to create the database and tables

-- Create database
CREATE DATABASE IF NOT EXISTS eventflow_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE eventflow_db;

-- ============================================
-- USERS TABLE (Regular Users - Gmail/Login)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_email (email),
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ORGANIZER TOKENS TABLE (Token-based Auth)
-- ============================================
CREATE TABLE IF NOT EXISTS organizer_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    description VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    expires_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP NULL,
    INDEX idx_token_hash (token_hash),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    venue_name VARCHAR(200),
    venue_address VARCHAR(500),
    is_online BOOLEAN DEFAULT FALSE,
    online_link VARCHAR(500),
    capacity INT DEFAULT 100,
    cover_image VARCHAR(500),
    organizer_id INT,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_organizer (organizer_id),
    INDEX idx_status (status),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TICKETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    sold_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_event (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- REGISTRATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS registrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    event_id INT NOT NULL,
    ticket_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'registered',
    qr_code VARCHAR(255),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    INDEX idx_user (user_id),
    INDEX idx_event (event_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SPONSORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sponsors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    package_type VARCHAR(50),
    logo_url VARCHAR(500),
    website_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_event (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SPEAKERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS speakers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(100),
    bio TEXT,
    photo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_event (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DEFAULT ORGANIZER TOKEN (Change this!)
-- ============================================
-- Token: EVENTFLOW_ORG_2026_SECRET_TOKEN
-- Hash this token and insert into organizer_tokens
INSERT IGNORE INTO organizer_tokens (token_hash, description, is_active) 
VALUES ('$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Main Organizer Account', TRUE);

-- ============================================
-- SAMPLE USER (Demo)
-- ============================================
-- Username: user@eventflow.com
-- Password: user123
INSERT IGNORE INTO users (username, email, password_hash, full_name) 
VALUES ('john_doe', 'user@eventflow.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'John Doe');

-- Insert sample events
INSERT IGNORE INTO events (title, description, category, start_date, end_date, venue_name, venue_address, capacity, status) VALUES
('Tech Summit 2026', 'The premier technology conference bringing together innovators from around the world.', 'Technology', '2026-03-15 09:00:00', '2026-03-15 18:00:00', 'Moscone Center', 'San Francisco, CA', 500, 'published'),
('Summer Music Festival', 'Three days of amazing live music performances.', 'Music', '2026-07-20 12:00:00', '2026-07-22 23:00:00', 'Central Park', 'New York, NY', 2000, 'published'),
('CEO Leadership Summit', 'Exclusive summit for top executives and business leaders.', 'Business', '2026-04-08 09:00:00', '2026-04-09 17:00:00', 'Hilton Chicago', 'Chicago, IL', 150, 'published'),
('Digital Art Exhibition', 'Exploring the intersection of technology and creativity.', 'Arts', '2026-05-22 10:00:00', '2026-05-25 20:00:00', 'LACMA', 'Los Angeles, CA', 300, 'published'),
('DevOps Workshop', 'Hands-on workshop for DevOps professionals.', 'Education', '2026-06-10 09:00:00', '2026-06-10 17:00:00', 'Online', 'Virtual Event', 50, 'published'),
('Marathon 2026', 'Annual city marathon event.', 'Sports', '2026-08-05 06:00:00', '2026-08-05 14:00:00', 'Boston Common', 'Boston, MA', 1000, 'published');

-- Insert sample tickets
INSERT IGNORE INTO tickets (event_id, name, description, price, quantity, sold_count) VALUES
(1, 'General Admission', 'Basic access to the event', 49.00, 300, 255),
(1, 'VIP Pass', 'Priority seating + exclusive meet & greet', 149.00, 150, 100),
(1, 'Student', 'Valid student ID required', 29.00, 50, 45),
(2, 'General Admission', 'Standard festival entry', 89.00, 1500, 680),
(2, 'VIP Experience', 'Backstage access + premium viewing', 249.00, 500, 320),
(3, 'Executive Pass', 'Full summit access', 599.00, 150, 125);

-- Insert sample registrations
INSERT IGNORE INTO registrations (user_id, event_id, ticket_id, status, qr_code) VALUES
(1, 1, 2, 'registered', 'QR_EVT1_USR1_2026'),
(1, 2, 4, 'registered', 'QR_EVT2_USR1_2026');

-- Insert sample speakers
INSERT IGNORE INTO speakers (event_id, name, title, bio) VALUES
(1, 'Dr. Sarah Chen', 'AI Research Lead', 'Leading researcher in artificial intelligence with 15+ years of experience.'),
(1, 'Michael Johnson', 'CTO, TechCorp', 'Chief Technology Officer with expertise in cloud architecture.'),
(1, 'Emily Williams', 'Security Expert', 'Cybersecurity specialist and ethical hacker.'),
(1, 'Robert Kim', 'Cloud Architect', 'AWS certified architect with multiple certifications.');

-- Insert sample sponsors
INSERT IGNORE INTO sponsors (event_id, name, package_type, website_url) VALUES
(1, 'TechCorp', 'Platinum', 'https://techcorp.example.com'),
(1, 'CloudBase', 'Gold', 'https://cloudbase.example.com'),
(1, 'DevTools Inc', 'Silver', 'https://devtools.example.com'),
(2, 'MusicMax', 'Platinum', 'https://musicmax.example.com'),
(2, 'AudioTech', 'Gold', 'https://audiotech.example.com');

-- ============================================
-- CHECKLISTS TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS checklists (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS checklist_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    checklist_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS checklist_tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (category_id) REFERENCES checklist_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TIMELINES TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS timelines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS timeline_tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    timeline_id INT NOT NULL,
    time VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================
-- MANAGEMENT TABLES (Decorators, Vendors, Staff, Venues, Budgets, Reports)
-- ============================================
CREATE TABLE IF NOT EXISTS decorators (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(200),
    rating DECIMAL(2,1) DEFAULT 0.0,
    priceRange VARCHAR(100),
    availability VARCHAR(50) DEFAULT 'Available',
    contact VARCHAR(100),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vendors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    serviceType VARCHAR(100),
    rating DECIMAL(2,1) DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'Available',
    contact VARCHAR(100),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(100),
    department VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Available',
    contact VARCHAR(100),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS venues (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    capacity INT,
    location VARCHAR(200),
    price DECIMAL(10,2),
    features TEXT,
    contact VARCHAR(100),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS budgets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    eventName VARCHAR(200) NOT NULL,
    allocated DECIMAL(10,2) DEFAULT 0.0,
    spent DECIMAL(10,2) DEFAULT 0.0,
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Planning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    eventName VARCHAR(200),
    type VARCHAR(100),
    generated_date DATE,
    status VARCHAR(50) DEFAULT 'Processing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Get user by email or username
DROP PROCEDURE IF EXISTS sp_get_user_by_identifier;
CREATE PROCEDURE sp_get_user_by_identifier(IN user_identifier VARCHAR(100))
BEGIN
    SELECT * FROM users 
    WHERE (email = user_identifier OR username = user_identifier) 
    AND is_active = TRUE;
END;

-- Verify organizer token
DROP PROCEDURE IF EXISTS sp_verify_organizer_token;
CREATE PROCEDURE sp_verify_organizer_token(IN p_token_hash VARCHAR(255))
BEGIN
    SELECT * FROM organizer_tokens 
    WHERE token_hash = p_token_hash 
    AND is_active = TRUE 
    AND (expires_at IS NULL OR expires_at > NOW());
END;

-- Get user events (registered)
DROP PROCEDURE IF EXISTS sp_get_user_events;
CREATE PROCEDURE sp_get_user_events(IN p_user_id INT)
BEGIN
    SELECT e.*, t.name as ticket_type, r.status as registration_status, r.qr_code, r.registered_at
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    JOIN tickets t ON r.ticket_id = t.id
    WHERE r.user_id = p_user_id
    ORDER BY e.start_date DESC;
END;

-- Get event attendees
DROP PROCEDURE IF EXISTS sp_get_event_attendees;
CREATE PROCEDURE sp_get_event_attendees(IN p_event_id INT)
BEGIN
    SELECT u.username, u.email, u.full_name, t.name as ticket_type, r.status, r.registered_at
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    JOIN tickets t ON r.ticket_id = t.id
    WHERE r.event_id = p_event_id
    ORDER BY r.registered_at DESC;
END;
