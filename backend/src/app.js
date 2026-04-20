require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const prisma = require("./prisma");
const authRoutes = require("./routes/authRoutes");
const usersRoutes = require("./routes/usersRoutes");
const organizationsRoutes = require("./routes/organizationsRoutes");
const formsRoutes = require("./routes/formsRoutes");
const clientsRoutes = require("./routes/clientsRoutes");
const amortizacijaRoutes = require("./routes/amortizacijaRoutes");

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
app.use("/api/organizations", organizationsRoutes);
app.use("/api/forms", formsRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/amortizacija", amortizacijaRoutes);

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
