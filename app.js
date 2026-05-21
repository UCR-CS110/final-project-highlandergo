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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

app.use("/api/spots", spotRoutes);
app.use("/api/spots", commentRoutes);
app.use("/auth", authRoutes);
app.use("/map", mapRoutes);

app.get("/", (req, res) => {
  res.send("Highlander GO! is running on localhost:3000");
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
