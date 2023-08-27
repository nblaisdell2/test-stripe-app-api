import express, { Router } from "express";
import {
  getAPIStatus,
  getUser,
  saveCount,
  saveCountError,
} from "../controllers/index";

const router: Router = express.Router();

// Define the routes and methods available for each route
router.route("/status").get(getAPIStatus);
router.route("/user").get(getUser);
router.route("/save-count").post(saveCount);
router.route("/save-count-error").post(saveCountError);

export default router;
