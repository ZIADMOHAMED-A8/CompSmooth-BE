import "dotenv/config";
import express from "express";
import userController from "./modules/user/user.controller.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ success: true, message: "CompSmooth API is running." });
});

app.use("/api/users", userController);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
