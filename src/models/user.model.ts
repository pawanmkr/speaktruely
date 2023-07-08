import client from "../config/db.js";
import { QueryResultRow } from "pg";

export class User {
  static async createUserTable(): Promise<void> {
    const query = `
      CREATE TABLE 
        IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          full_name VARCHAR(255),
          username VARCHAR(255) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
    `;
    try {
      await client.query(query);
    } catch (error) {
      console.error("Error creating users table:", error);
    }
  }

  static async doesEmailAlreadyExists(email: string): Promise<boolean> {
    const existingEmail = await client.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    return existingEmail.rowCount > 0 ? true : false;
  }

  static async doesUserAlreadyExists(
    username: string
  ): Promise<QueryResultRow> {
    const existingUser = await client.query(
      `SELECT * FROM users WHERE username = $1`,
      [username]
    );
    return existingUser.rows[0];
  }

  static async addNewUserToDB(
    fullName: string,
    username: string,
    email: string,
    password: string
  ): Promise<QueryResultRow | null> {
    const user = await client.query(
      `
      INSERT INTO users (full_name, username, email, password) 
        VALUES ($1, $2, $3, $4) RETURNING *
      `,
      [fullName, username, email, password]
    );
    return user ? user.rows[0] : null;
  }
}
