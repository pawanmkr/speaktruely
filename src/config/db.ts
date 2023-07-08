import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.join(process.cwd(), ".env"),
});

const { DATABASE_URL, NODE_ENV } = process.env;

let client: pkg.Pool;

if (NODE_ENV === "production") {
  client = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
} else {
  client = new Pool({ connectionString: DATABASE_URL });
}

export default client;
