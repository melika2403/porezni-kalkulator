require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const prisma = require("./prisma");
const authRoutes = require("./routes/authRoutes");
const usersRoutes = require("./routes/usersRoutes");

const app = express();

const port = Number(process.env.PORT) || 4000;
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.use("/api/users", usersRoutes);

app.get("/api/health", (_req, res) => {
  res
    .status(200)
    .json({ ok: true, service: "backend", time: new Date().toISOString() });
});

app.get("/api/db/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res
      .status(200)
      .json({ ok: true, db: "mysql", time: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({
      ok: false,
      db: "mysql",
      error: error instanceof Error ? error.message : String(error),
      time: new Date().toISOString(),
    });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
