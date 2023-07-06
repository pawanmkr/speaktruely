import client from "../config/db.js";

export class Topic {
  static async createTopicTable() {
    const query = `
      CREATE TABLE 
        IF NOT EXISTS topic (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255),
          created_by VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),

          CONSTRAINT fk_creator FOREIGN KEY (created_by) REFERENCES users (username) ON DELETE CASCADE
        );
    `;
    try {
      await client.query(query);
    } catch (error) {
      console.error("Error creating Topic table:", error);
    }
  }
}
