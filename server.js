require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();

// ============================================================
// 1. SECURITY HEADERS â€” Block clickjacking, XSS, MIME sniffing
// ============================================================
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// 2. BLOCK DIRECT ACCESS TO admin.html (serve through auth check)
// ============================================================
app.get('/admin.html', (req, res) => {
    // Serve admin page but with security headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static('public', {
    // Don't let search engines cache admin page
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('admin.html')) {
            res.setHeader('Cache-Control', 'no-store');
        }
    }
}));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ============================================================
// 3. FILE UPLOAD CONFIG (Local Disk Storage)
// ============================================================
// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        // Use crypto for unpredictable filenames
        const uniqueId = crypto.randomBytes(8).toString('hex');
        cb(null, `ad-${uniqueId}${path.extname(file.originalname)}`);
    }
});

// Only allow image and video files
const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG, GIF, WEBP, MP4, WEBM allowed.'), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter
});

// ============================================================
// 4. PERSISTENT AD STORAGE (JSON file â€” survives server restart)
// ============================================================
const ADS_FILE = path.join(__dirname, 'data', 'ads.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

function loadAds() {
    try {
        if (fs.existsSync(ADS_FILE)) {
            const data = fs.readFileSync(ADS_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('âš ï¸ Error loading ads:', err.message);
    }
    return { ads: [], counter: 1 };
}

function saveAds(data) {
    try {
        fs.writeFileSync(ADS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('âš ï¸ Error saving ads:', err.message);
    }
}

let adStore = loadAds();

// ============================================================
// 5. GMAIL EMAIL SETUP (Nodemailer â€” Direct to Gmail)
// ============================================================
let emailTransporter = null;

function setupEmail() {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (gmailUser && gmailPass && !gmailPass.includes('your_')) {
        emailTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailUser,
                pass: gmailPass
            }
        });

        // Verify connection
        emailTransporter.verify((err) => {
            if (err) {
                console.error('âš ï¸ Gmail connection failed:', err.message);
                console.log('ðŸ“§ Check your GMAIL_USER and GMAIL_APP_PASSWORD in .env');
                emailTransporter = null;
            } else {
                console.log('âœ… Gmail email connected â€” leads will be emailed automatically');
            }
        });
    } else {
        console.log('ðŸ“§ Gmail not configured â€” leads will only be logged to terminal');
        console.log('   To enable: Set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
    }
}

setupEmail();

async function sendLeadEmail(name, phone, category, service) {
    if (!emailTransporter) return false;

    const toEmail = process.env.TO_EMAIL || process.env.GMAIL_USER;
    const cleanPhone = phone.replace(/\D/g, '');

    const mailOptions = {
        from: `"Navya Fintech Leads" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: `ðŸ”” New Lead: ${name} â€” ${category} â†’ ${service}`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
                <div style="background: linear-gradient(135deg, #00f2fe, #4facfe); padding: 28px; text-align: center;">
                    <h1 style="color: #000; margin: 0; font-size: 24px; font-weight: 700;">ðŸ“‹ New Client Application</h1>
                    <p style="color: rgba(0,0,0,0.6); margin: 6px 0 0; font-size: 14px;">Navya Fintech Lead Management</p>
                </div>
                <div style="padding: 32px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; width: 140px;">Full Name</td>
                            <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 16px; font-weight: 600;">${name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Phone</td>
                            <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 16px;">
                                <a href="tel:${phone}" style="color: #4facfe; text-decoration: none; font-weight: 600;">${phone}</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Department</td>
                            <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 16px;">${category}</td>
                        </tr>
                        <tr>
                            <td style="padding: 14px 0; font-weight: 600; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Service</td>
                            <td style="padding: 14px 0; color: #0f172a; font-size: 16px; font-weight: 700;">${service}</td>
                        </tr>
                    </table>
                    <div style="margin-top: 28px; display: flex; gap: 12px;">
                        <a href="https://wa.me/91${cleanPhone}" target="_blank" style="display: inline-block; background: #25D366; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">ðŸ’¬ WhatsApp Client</a>
                        <a href="tel:${phone}" style="display: inline-block; background: #4facfe; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">ðŸ“ž Call Now</a>
                    </div>
                </div>
                <div style="background: #0f172a; padding: 18px; text-align: center;">
                    <p style="color: #64748b; margin: 0; font-size: 12px;">Navya Fintech â€¢ Visnagar, Gujarat â€¢ Automated Lead System</p>
                </div>
            </div>
        `
    };

    try {
        await emailTransporter.sendMail(mailOptions);
        console.log(`âœ… Email sent to ${toEmail}`);
        return true;
    } catch (err) {
        console.error('âš ï¸ Email failed:', err.message);
        return false;
    }
}

// ============================================================
// 6. PUBLIC API ROUTES
// ============================================================

// Client Application Submission
app.post('/api/apply', async (req, res) => {
    const { name, phone, category, service } = req.body;

    if (!name || !phone || !category || !service) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // Always log to terminal
    console.log(`\n--- NEW LEAD RECEIVED ---`);
    console.log(`Name: ${name} | Phone: ${phone}`);
    console.log(`Interest: ${category} -> ${service}`);
    console.log(`Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`-------------------------\n`);

    // Send email directly to Gmail
    await sendLeadEmail(name, phone, category, service);

    res.status(200).json({ message: 'Application submitted successfully!' });
});

// Fetch Ads (Public)
app.get('/api/ads', (req, res) => {
    res.status(200).json([...adStore.ads].reverse());
});

// ============================================================
// 7. SECURE ADMIN SYSTEM
// ============================================================

// --- Session storage with expiry ---
const activeSessions = new Map(); // token -> { createdAt, ip }
const SESSION_TTL = 2 * 60 * 60 * 1000; // 2 hours

// Clean expired sessions every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [token, session] of activeSessions) {
        if (now - session.createdAt > SESSION_TTL) {
            activeSessions.delete(token);
        }
    }
}, 10 * 60 * 1000);

// --- Brute force protection ---
const loginAttempts = new Map(); // ip -> { count, lastAttempt, lockedUntil }
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000; // Reset counter after 15 minutes of no attempts

function getClientIP(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return forwarded.split(',')[0].trim();
    // Express 5 compatibility
    if (req.ip) return req.ip;
    if (req.socket && req.socket.remoteAddress) return req.socket.remoteAddress;
    if (req.connection && req.connection.remoteAddress) return req.connection.remoteAddress;
    return 'unknown';
}

function checkRateLimit(ip) {
    const record = loginAttempts.get(ip);
    if (!record) return { allowed: true };

    const now = Date.now();

    // If locked out, check if lockout expired
    if (record.lockedUntil && now < record.lockedUntil) {
        const remaining = Math.ceil((record.lockedUntil - now) / 60000);
        return { allowed: false, remaining };
    }

    // Reset if attempt window expired
    if (now - record.lastAttempt > ATTEMPT_WINDOW) {
        loginAttempts.delete(ip);
        return { allowed: true };
    }

    if (record.count >= MAX_ATTEMPTS) {
        record.lockedUntil = now + LOCKOUT_TIME;
        loginAttempts.set(ip, record);
        return { allowed: false, remaining: Math.ceil(LOCKOUT_TIME / 60000) };
    }

    return { allowed: true };
}

function recordFailedAttempt(ip) {
    const record = loginAttempts.get(ip) || { count: 0, lastAttempt: 0, lockedUntil: null };
    record.count++;
    record.lastAttempt = Date.now();
    loginAttempts.set(ip, record);
}

function clearAttempts(ip) {
    loginAttempts.delete(ip);
}

// --- Admin Login ---
app.post('/api/admin/login', async (req, res) => {
    // In Express 5, req.ip can be a Promise
    let ip;
    try {
        const rawIp = req.ip;
        ip = (rawIp && typeof rawIp.then === 'function') ? await rawIp : rawIp;
    } catch {
        ip = null;
    }
    if (!ip) {
        ip = (req.socket && req.socket.remoteAddress) || (req.connection && req.connection.remoteAddress) || 'unknown';
    }
    // Normalize IPv6 localhost
    if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';
    console.error(`[LOGIN] IP resolved: "${ip}"`);

    // Check rate limit
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
        console.log(`ðŸš« Blocked login attempt from ${ip} (locked for ${rateCheck.remaining} min)`);
        return res.status(429).json({
            success: false,
            error: `Too many failed attempts. Try again in ${rateCheck.remaining} minutes.`
        });
    }

    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password required.' });
    }

    const envUser = process.env.ADMIN_USERNAME;
    const envPass = process.env.ADMIN_PASSWORD;

    // Only accept credentials from .env â€” NO hardcoded fallback
    if (envUser && envPass && username === envUser && password === envPass) {
        clearAttempts(ip);

        // Generate cryptographically secure token
        const token = crypto.randomBytes(32).toString('hex');
        activeSessions.set(token, { createdAt: Date.now(), ip });

        console.log(`âœ… Admin login successful from ${ip}`);
        return res.status(200).json({ success: true, token });
    }

    // Failed attempt
    recordFailedAttempt(ip);
    const record = loginAttempts.get(ip);
    const attemptsLeft = MAX_ATTEMPTS - record.count;

    console.log(`âŒ Failed login attempt from ${ip} (${attemptsLeft} attempts remaining)`);

    if (attemptsLeft <= 0) {
        return res.status(429).json({
            success: false,
            error: `Account locked for 15 minutes due to too many failed attempts.`
        });
    }

    res.status(401).json({
        success: false,
        error: `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`
    });
});

// --- Auth Middleware ---
const requireAdmin = (req, res, next) => {
    const token = req.headers['x-admin-token'];

    if (!token || !activeSessions.has(token)) {
        return res.status(403).json({ error: 'Session expired or invalid. Please login again.' });
    }

    // Check if session has expired
    const session = activeSessions.get(token);
    if (Date.now() - session.createdAt > SESSION_TTL) {
        activeSessions.delete(token);
        return res.status(403).json({ error: 'Session expired. Please login again.' });
    }

    next();
};

// --- Admin Logout ---
app.post('/api/admin/logout', (req, res) => {
    const token = req.headers['x-admin-token'];
    if (token) activeSessions.delete(token);
    res.status(200).json({ message: 'Logged out.' });
});

// --- Ad Upload ---
app.post('/api/admin/ads', requireAdmin, upload.single('media'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No media uploaded.' });

    const { title } = req.body;
    if (!title || !title.trim()) {
        // Delete the uploaded file since title is missing
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'Advertisement title is required.' });
    }

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const mediaType = ['mp4', 'webm', 'mov'].includes(ext) ? 'video' : 'image';
    const mediaUrl = `/uploads/${req.file.filename}`;

    const newAd = {
        _id: adStore.counter.toString(),
        title: title.trim(),
        mediaUrl,
        mediaType,
        createdAt: new Date().toISOString()
    };

    adStore.ads.push(newAd);
    adStore.counter++;
    saveAds(adStore);

    console.log(`ðŸ“¢ New ad published: "${title}" (${mediaType})`);
    res.status(200).json({ message: 'Advertisement published!', ad: newAd });
});

// --- Ad Delete ---
app.delete('/api/admin/ads/:id', requireAdmin, (req, res) => {
    const ad = adStore.ads.find(a => a._id === req.params.id);
    if (!ad) {
        return res.status(404).json({ error: 'Advertisement not found.' });
    }

    // Delete file from disk
    if (ad.mediaUrl) {
        const filePath = path.join(__dirname, 'public', ad.mediaUrl);
        fs.unlink(filePath, (err) => {
            if (err && err.code !== 'ENOENT') {
                console.error(`Failed to delete file: ${filePath}`, err.message);
            }
        });
    }

    adStore.ads = adStore.ads.filter(a => a._id !== req.params.id);
    saveAds(adStore);

    console.log(`ðŸ—‘ï¸ Ad deleted: "${ad.title}"`);
    res.status(200).json({ message: 'Advertisement removed.' });
});

// ============================================================
// 8. ERROR HANDLING
// ============================================================
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({ error: err.message });
    }
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
});

// ============================================================
// 9. START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Navya Fintech Server running on port ${PORT}`);
        console.log(`Website: http://localhost:${PORT}`);
    });
}

module.exports = app;
