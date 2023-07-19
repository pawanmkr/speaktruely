import { QueryResultRow } from "pg";
import client from "../config/db.js";
import { PostNotFoundError } from "./post.model.js";

export class Vote {
  static async createVoteTable() {
    const query = `
      CREATE TABLE 
        IF NOT EXISTS vote (
          id SERIAL PRIMARY KEY,
          post INTEGER,
          user_id INTEGER,
          vote_type INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT fk_post FOREIGN KEY (post) REFERENCES post (id) ON DELETE CASCADE,
          CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
    `;
    try {
      await client.query(query);
    } catch (error) {
      console.error("Error creating Vote table:", error);
    }
  }

  static async insertVote(
    postId: number,
    userId: number,
    type: number
  ): Promise<QueryResultRow> {
    const existingVote = await this.getVote(postId, userId);

    if (existingVote) {
      if (existingVote.vote_type === type) {
        const row = await this.removeVote(postId, userId);
        return row;
      } else {
        const query = `
          UPDATE vote SET vote_type=$1 WHERE post=$2 AND user_id=$3 RETURNING *;
        `;
        const values = [type, postId, userId];
        const { rows } = await client.query(query, values);
        return rows[0];
      }
    } else {
      const query = `
        INSERT INTO vote (post, user_id, vote_type) VALUES($1, $2, $3) RETURNING *;
      `;
      const values = [postId, userId, type];
      const { rows } = await client.query(query, values);
      if (rows.length === 0) {
        throw new PostNotFoundError(`Post with ID ${postId} not found.`);
      }
      return rows[0];
    }
  }

  static async removeVote(
    postId: number,
    userId: number
  ): Promise<QueryResultRow> {
    const query = `
      DELETE FROM vote WHERE post=$1 AND user_id=$2 RETURNING *;
    `;
    const values = [postId, userId];
    const { rows } = await client.query(query, values);
    if (rows.length === 0) {
      throw new PostNotFoundError(`Post with ID ${postId} not found.`);
    }
    return rows[0];
  }

  static async getVote(
    postId: number,
    userId: number
  ): Promise<QueryResultRow | null> {
    const query = `
      SELECT * FROM vote WHERE post=$1 AND user_id=$2;
    `;
    const values = [postId, userId];
    const { rows } = await client.query(query, values);
    if (rows.length === 0) {
      return null;
    }
    return rows[0];
  }
}
