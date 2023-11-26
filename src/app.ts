import dotenv from "dotenv";
dotenv.config();
import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import http from "http";
import { router } from "./routes/routes.js";
import client from "./config/db.js";
import { PoolClient } from "pg";
import { Tables } from "./controllers/createTables.js";
import morgan from "morgan";
import { errorMiddleware } from "./middlewares/index.js";
import { WebSocketServer } from "ws";
import path from 'path'
import fs from 'fs'

const app: Express = express();
const port: string | number = process.env.PORT || 8080;

const cert = fs.readFileSync(path.join(process.cwd(), '/ssl-certificate/certificate.crt'));
const key = fs.readFileSync(path.join(process.cwd(), '/ssl-certificate/private.key'));

const server = http.createServer({
  key,
  cert
}, app);

/* Middlewares */
app.use(morgan("dev"));
app.use(express.json());
app.use((req: Request, res: Response, next) => {
  if (req.method === "POST" || req.method === "PUT") {
    app.use(express.urlencoded({ extended: true }));
  }
  next();
});

app.use(
  cors({
    origin: "*",
    optionsSuccessStatus: 204,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Access-Control-Allow-Origin",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(errorMiddleware);

// Error handling middleware with four parameters
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled Error:", error);
  res.status(500).send("An unhandled error occurred.");
  next();
});

let retryCount: number = 5;
while (retryCount) {
  try {
    const db: PoolClient = await client.connect();
    if (db) {
      console.log("Database Connected");
      await Tables.createTables();
      startServer();
    }
    break;
  } catch (error) {
    console.log(error);
    console.log(`Retrying to connect with database... ${retryCount}`);
    retryCount--;
    await new Promise((res) => setTimeout(res, 5000));
  }
}

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.sendStatus(200);
});

app.get("/.well-known/pki-validation/47E8B96E3540D13321A8BB214CC85EAE.txt", (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), '/.well-known/pki-validation/47E8B96E3540D13321A8BB214CC85EAE.txt'))
})

app.use("/v1", router);

function startServer() {
  server.listen(port, () => {
    let url: string = `http://localhost:${port}`;
    if (process.env.NODE_ENV === "production") {
      url = "https://xserver.onrender.com";
    }
    console.log(`Server is running at ${url}\n`);
  });
}

export const ws = new WebSocketServer({ server });
