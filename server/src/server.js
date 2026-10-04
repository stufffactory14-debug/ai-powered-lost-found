require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const connectDatabase = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
}));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Image must be 5 MB or smaller."
      : "Invalid image upload.";

    return res.status(400).json({ success: false, message });
  }

  if (error.code === "UNSUPPORTED_FILE_TYPE") {
    return res.status(400).json({
      success: false,
      message: "Only image files are allowed.",
    });
  }

  console.error("Request failed:", error.message);
  return res.status(500).json({
    success: false,
    message: "Unable to process the request.",
  });
});

async function startServer() {
  try {
    await connectDatabase();

    const port = Number(process.env.PORT) || 5000;
    const server = app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });

    server.on("error", (error) => {
      console.error("Express server startup failed:", error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error(`Server startup aborted: ${error.message}`);
    process.exit(1);
  }
}

startServer();
