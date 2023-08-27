import express, { json, urlencoded } from "express";
import type { Express, Request, Response, NextFunction } from "express";
import createError, { HttpError } from "http-errors";
import cors from "cors";

import indexRouter from "./routes/index";
import stripeRouter from "./routes/stripe";
import stripeWebhookRouter from "./routes/stripe-webhook";

import { createSharedConnectionPool } from "./utils/sql";

import { config } from "dotenv";
config();

const app: Express = express();

app.use(urlencoded({ extended: false }));
app.use(
  cors({
    origin: ["http://localhost:3000", "https://teststripe.testapisite.net"],
  })
);

app.use("/stripe-webhook", stripeWebhookRouter);

// Makes sure our API can only accept URL-encoded strings, or JSON data
app.use(json());

// Define our endpoints (routers) that are made available for our API
app.use("/", indexRouter);
app.use("/stripe", stripeRouter);

// Create a "shared" lobal connection pool for SQL Server queries
createSharedConnectionPool().then((pool) => {
  app.locals.db = pool;
});

// catch 404 and forward to error handler
app.use(function (req: Request, res: Response, next: NextFunction) {
  next(createError(404));
});

// error handler
app.use(function (
  err: HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({ error: "error" });
});

export default app;
