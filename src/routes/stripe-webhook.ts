import express, { Router } from "express";
import { webhook } from "../controllers/stripe";

const router: Router = express.Router();

// Define the routes and methods available for each route
router
  .route("/webhook")
  .post(webhook, express.raw({ type: "application/json" }));

export default router;
