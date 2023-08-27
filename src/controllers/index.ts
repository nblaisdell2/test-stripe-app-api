import { Request, Response, NextFunction } from "express";
import { execute, query } from "../utils/sql";

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
  const userEmail = req?.query?.UserEmail;

  console.log("Email passed in:", userEmail);

  if (!userEmail) {
    return res.status(500).json({
      error: "There was an error with the email passed in: '" + userEmail + "'",
    });
  }

  const queryRes = await query(req, "sp_GetUser", [
    { name: "UserEmail", value: userEmail },
  ]);

  res.status(200).json({
    user: queryRes.resultData,
  });
};

export const saveCount = async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log("ID passed in:", req.body.UserID);
  console.log("NewCount passed in:", req.body.NewCount);

  await execute(req, "sp_UpdateCount", [
    {
      name: "UserID",
      value: req.body.UserID,
    },
    {
      name: "NewCount",
      value: req.body.NewCount,
    },
  ]);

  res.status(200).json(req.body.NewCount);
};

export const saveCountError = async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log("ID passed in:", req.body.UserID);
  console.log("NewCount passed in:", req.body.NewCount);

  return res.status(500).json({ error: "Test Error" });
};
