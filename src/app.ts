import dotenv from "dotenv";
dotenv.config();
import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import { router } from "./routes/routes.js";
import client from "./config/db.js";
import { PoolClient } from "pg";
import { Tables } from "./controllers/createTables.js";
import morgan from "morgan";
import { errorMiddleware } from "./middlewares/index.js";

const app: Express = express();
const port: string | number = process.env.PORT || 8080;

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
    optionsSuccessStatus: 200,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(errorMiddleware);

// Error handling middleware with four parameters
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled Error:", error);
  res.status(500).send("An unhandled error occurred.");
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
app.get("/health", (req: Request, res: Response, next) => {
  res.sendStatus(200);
});

app.use("/v1", router);

function startServer() {
  app.listen(port, () => {
    let url: string = `http://localhost:${port}`;
    if (process.env.NODE_ENV === "production") {
      url = "https://xserver.onrender.com";
    }
    console.log(`Server is running at ${url}\n`);
  });
}
