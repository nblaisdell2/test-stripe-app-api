import express, { Router } from "express";
import {
  createCheckoutSession,
  createPortalSession,
  getSubscriptions,
} from "../controllers/stripe";

const router: Router = express.Router();

// Define the routes and methods available for each route
router.route("/get-product-details").get(getSubscriptions);
router.route("/create-checkout-session").post(createCheckoutSession);
router.route("/create-portal-session").post(createPortalSession);

export default router;
