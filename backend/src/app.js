require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { sequelize } = require("./models/index");
const authRoutes = require("./routes/authRoutes");
const usersRoutes = require("./routes/usersRoutes");
const organizationsRoutes = require("./routes/organizationsRoutes");
const formsRoutes = require("./routes/formsRoutes");
const clientsRoutes = require("./routes/clientsRoutes");
const amortizacijaRoutes = require("./routes/amortizacijaRoutes");
const documentsRoutes = require("./routes/documentsRoutes");
const subscriptionsRoutes = require("./routes/subscriptionsRoutes");
const contactRoutes = require("./routes/contactRoutes");

const app = express();

const port = Number(process.env.PORT) || 4000;

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
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
app.use("/api/documents", documentsRoutes);
app.use("/api/users", subscriptionsRoutes);
app.use("/api/contact", contactRoutes);

// Sync database tables and start server
sequelize
  .sync({ alter: false })
  .then(() => {
    console.log("Database synced successfully");
    app.listen(port, () => {
      console.log(`Backend listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to sync database:", err);
    process.exit(1);
  });
