import "dotenv/config";
import express from "express";
import expressSanitizer from "express-sanitizer";
import propertyController from "./modules/property/property.controller.js";
import userController from "./modules/user/user.controller.js";
import { stripeWebhook } from "./modules/user/user.service.js";
import asyncWrapper from "./middlewares/asyncWrapper.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.post(
  "/api/users/stripe-webhook",
  express.raw({ type: "application/json" }),
  asyncWrapper(stripeWebhook)
);

function sanitizeInput(value, sanitize, key = "") {
  if (key.toLowerCase().includes("password")) {
    return value;
  }

  if (typeof value === "string") {
    return sanitize(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeInput(item, sanitize, key));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sanitizeInput(item, sanitize, key),
      ])
    );
  }

  return value;
}

app.use(express.json());
app.use(expressSanitizer());
app.use((req, res, next) => {
  if (req.body) {
    req.body = sanitizeInput(req.body, req.sanitize);
  }

  if (req.query) {
    Object.defineProperty(req, "query", {
      value: sanitizeInput(req.query, req.sanitize),
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  next();
});

app.get("/health", (req, res) => {
  res.json({ success: true, message: "CompSmooth API is running." });
});

app.use("/api/users", userController);
app.use("/api", propertyController);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
