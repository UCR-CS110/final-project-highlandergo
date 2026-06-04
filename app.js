require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default || require("connect-mongo");
const path = require("path");
const connectDB = require("./db");
const authRoutes = require("./routes/auth");
const mapRoutes = require("./routes/map");
const commentRoutes = require("./routes/comments");
const spotRoutes = require("./routes/spots");
const searchRoutes = require("./routes/search");
const profileRoutes = require('./routes/profile');
const uploadRoutes = require("./routes/upload");
const cookieParser = require("cookie-parser");
const { mongoSanitize, helmet } = require("./middleware/sanitize");
const { doubleCsrf } = require("csrf-csrf");
const adminRoutes = require('./routes/admin');

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET || "fallback-secret",
  getSessionIdentifier: (req) => req.session.id || req.ip,
  cookieName: "csrf-token",
  size: 64,
  cookieOptions: {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  },
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "unpkg.com",
          "cdn.jsdelivr.net",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "unpkg.com",
          "cdn.jsdelivr.net",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "lh3.googleusercontent.com",
          "https:",
          "https://*.tile.openstreetmap.org",
          "https://*.openstreetmap.org",
          "res.cloudinary.com",
        ],
        connectSrc: [
          "'self'",
          "https://*.tile.openstreetmap.org",
          "https://*.openstreetmap.org",
        ],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use((req, res, next) => {
  if (req.body) req.body = mongoSanitize(req.body);
  if (req.params) req.params = mongoSanitize(req.params);
  next();
});
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.ATLAS_URI,
      ttl: 7 * 24 * 60 * 60,
      autoRemove: "native",
      touchAfter: 24 * 3600,
    }),
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
    },
  }),
);

// Routes
app.use("/api/spots", spotRoutes);
app.use("/api/spots", commentRoutes);
app.use("/auth", authRoutes);
app.use("/map", mapRoutes);
app.use("/api/search", searchRoutes);
app.use("/api", profileRoutes);
app.use("/api/upload", uploadRoutes);
app.use('/api/admin', adminRoutes);

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'admin.html'));
});

app.get("/api/csrf-token", (req, res) => {
  res.json({ token: generateCsrfToken(req, res) });
});

app.use(doubleCsrfProtection);

app.get("/api/me", (req, res) => {
  res.json({ userId: req.session.userId || null });
});

function isLoggedIn(req, res, next) {
  if (req.session.userId) return next();
  res.redirect("/auth/login");
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});
app.get("/map", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "map.html"));
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
