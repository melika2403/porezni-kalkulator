require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const port = Number(process.env.PORT) || 4000;
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: corsOrigin,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res
    .status(200)
    .json({ ok: true, service: "backend", time: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
