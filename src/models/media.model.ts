import { QueryResultRow } from "pg";
import client from "../config/db.js";

export class Media {
  static async createMediaTable() {
    const query = `
      CREATE TABLE 
        IF NOT EXISTS media (
          id SERIAL PRIMARY KEY,
          name TEXT,
          post INTEGER NOT NULL,
          url TEXT,
          mimetype TEXT,

          CONSTRAINT fk_post FOREIGN KEY (post) REFERENCES post (id) ON DELETE CASCADE
        );
    `;
    try {
      await client.query(query);
    } catch (error) {
      console.error("Error creating Media table:", error);
    }
  }

  static async insertPost(
    name: string,
    postId: number,
    url: string,
    mimetype: string
  ): Promise<QueryResultRow> {
    try {
      const { rows } = await client.query(
        `
        INSERT INTO media (name, post, url, mimetype) VALUES($1, $2, $3, $4) RETURNING *;
      `,
        [name, postId, url, mimetype]
      );
      return rows[0];
    } catch (error) {
      console.error("Error inserting post into Media table:", error);
    }
  }
}
