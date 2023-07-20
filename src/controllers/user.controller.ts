import { Request, Response } from "express";
import { User } from "../models/user.model.js";
import dotenv from "dotenv";
import path from "path";
import jwt, { Secret, JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { faker } from "@faker-js/faker";
import { QueryResultRow } from "pg";

dotenv.config({
  path: path.join(process.cwd(), ".env"),
});
const JWT_SECRET_KEY: Secret = process.env.JWT_SECRET_KEY;
if (JWT_SECRET_KEY === undefined) {
  throw new Error("JWT_SECRET NOT FOUND");
}

/*
 * UserController Class for all user related operations
 */
export class UserController {
  static async registerNewUser(req: Request, res: Response) {
    if (!req.body.fullname || !req.body.email || !req.body.password) {
      res.status(404).send("Fill all required fields");
      return;
    }
    const { fullname, email, password } = req.body;
    const hashedPassword: string = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    const existingUser: boolean = await User.doesEmailAlreadyExists(email);
    if (existingUser) {
      res.status(409).send("Email Already Exists");
      return;
    }
    const username: string = faker.internet.userName().toLowerCase();
    const registeredUser = await User.addNewUserToDB(
      fullname,
      username,
      email,
      hashedPassword
    );
    if (registeredUser === null) {
      res.status(500).send("Adding user to DB was unsuccessful!");
      return;
    }
    const payload: JwtPayload = {
      userid: registeredUser.id,
      fullname: registeredUser.full_name,
      email: registeredUser.email,
      username: registeredUser.username,
    };
    console.log(payload);
    const token = jwt.sign(payload, JWT_SECRET_KEY);
    res.status(201).send(token);
  }

  static async login(req: Request, res: Response) {
    if (!req.body.email_or_username || !req.body.password) {
      res.status(404).send("Fill all required fields");
      return;
    }
    const { email_or_username, password } = req.body;
    const hashedPassword: string = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    const existingUser: QueryResultRow = await User.doesUserAlreadyExists(
      email_or_username
    );
    if (!existingUser) {
      res.status(404).send("User does not exists");
      return;
    }
    if (existingUser.password !== hashedPassword) {
      res.status(404).send("username or passowrd is incorrect");
      return;
    }
    const payload: JwtPayload = {
      userid: existingUser.id,
      fullname: existingUser.full_name,
      email: existingUser.email,
      username: existingUser.username,
    };
    const token: string = jwt.sign(payload, JWT_SECRET_KEY);
    res.status(201).send(token);
  }
}
