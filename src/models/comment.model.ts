import client from "../config/db.js";

export class Comment {
  static async createCommentTable() {
    const query = `
      CREATE TABLE 
        IF NOT EXISTS comment (
          id SERIAL PRIMARY KEY,
          _comment VARCHAR(255),
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW(),

          CONSTRAINT fk_creator FOREIGN KEY (created_by) REFERENCES users (username) ON DELETE CASCADE
        );
    `;
    try {
      await client.query(query);
    } catch (error) {
      console.error("Error creating Comment table:", error);
    }
  }
}
