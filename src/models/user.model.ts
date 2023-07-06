import client from "../config/db.js";

export class User {
  static async createUserTable() {
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
}
