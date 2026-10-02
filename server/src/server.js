require("dotenv").config();

const express = require("express");
const connectDatabase = require("./config/db");

const app = express();

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
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
