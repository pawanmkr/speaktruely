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
    email_or_username: string
  ): Promise<QueryResultRow> {
    let query: string;
    if (email_or_username.includes("@")) {
      query = `SELECT * FROM users WHERE email = $1`;
    } else {
      query = `SELECT * FROM users WHERE username = $1`;
    }
    const existingUser = await client.query(query, [email_or_username]);
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

  static async getFullName(username: string): Promise<string | null> {
    try {
      const result = await client.query(
        `SELECT full_name FROM users WHERE username = $1`,
        [username]
      );

      if (result.rowCount > 0) {
        return result.rows[0].full_name;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error retrieving user fullname:", error);
      return null;
    }
  }

  static async getUsersForSuggestion(
    userId: number
  ): Promise<QueryResultRow[] | undefined> {
    const query = `
      SELECT id, full_name, username
      FROM users 
      WHERE id NOT IN ($1) AND id NOT IN (
        SELECT following_id FROM follows WHERE follower_id = $1
      )
      LIMIT 5;
    `;
    const res = await client.query(query, [userId]);
    return res.rows;
  }

  static async getUserByUsername(username: string): Promise<QueryResultRow[]> {
    const query = `
        SELECT 
            u.id,
            u.full_name,
            u.username,
            COALESCE(f.followers_count, 0) AS followers_count,
            COALESCE(f2.following_count, 0) AS following_count
        FROM users u
        LEFT JOIN (
            SELECT following_id, COUNT(follower_id) AS followers_count
            FROM follows
            GROUP BY following_id
        ) f ON u.id = f.following_id
        LEFT JOIN (
            SELECT follower_id, COUNT(following_id) AS following_count
            FROM follows
            GROUP BY follower_id
        ) f2 ON u.id = f2.follower_id
        WHERE u.username = $1;
    `;
    const res = await client.query(query, [username]);
    return res.rows[0];
  }

  static async checkIfFollowingTargetUser(
    targetId: number,
    userId: number
  ): Promise<boolean> {
    const query = `
      SELECT * FROM follows
      WHERE following_id = $1 AND follower_id = $2;
    `;
    const { rows } = await client.query(query, [targetId, userId]);
    return rows.length > 0 ? true : false;
  }
}
