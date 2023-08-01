import { Request, Response, NextFunction } from "express";

import { config } from "dotenv";
config();

import sql from "mssql";
const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  database: process.env.DB_NAME,
  server: process.env.DB_HOST as string,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false, // for azure
    trustServerCertificate: true, // change to true for local dev / self-signed certs
  },
};

export const getAPIStatus = async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.status(200).json({ msg: "API is up and running" });
};

export const getUser = async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log("Email passed in:", req.query.UserEmail);

  // if (req.query.UserEmail == undefined) {
  //   res.status(500).json({ error: "No email provided." });
  // }
  let pool = await sql.connect(sqlConfig);
  let result2 = await pool
    .request()
    .input("UserEmail", sql.VarChar(255), req.query.UserEmail)
    .execute("sp_GetUser");

  res.status(200).json({ user: (result2 as any).recordsets[0][0] });
};

export const saveCount = async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log("ID passed in:", req.body.UserID);
  console.log("NewCount passed in:", req.body.NewCount);

  let pool = await sql.connect(sqlConfig);
  let result2 = await pool
    .request()
    .input("UserID", sql.UniqueIdentifier, req.body.UserID)
    .input("NewCount", sql.Int, req.body.NewCount)
    .execute("sp_UpdateCount");

  res.status(200).json({ updatedCount: req.body.NewCount });
};
