import { QueryResultRow } from "pg";
import client from "../config/db.js";
import { PostNotFoundError } from "./post.model.js";

export class Vote {
  static async createVoteTable() {
    const query = `
      CREATE TABLE 
        IF NOT EXISTS vote (
          id SERIAL UNIQUE,
          post INTEGER NOT NULL,
          _user VARCHAR(255) NOT NULL,
          type VARCHAR(8) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT fk_post FOREIGN KEY (post) REFERENCES post (id) ON DELETE CASCADE,
          CONSTRAINT fk_user FOREIGN KEY (_user) REFERENCES users (username) ON DELETE CASCADE,
          PRIMARY KEY (id)
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
    username: string,
    type: string
  ): Promise<QueryResultRow> {
    const existingVote = await this.getVote(postId, username);

    if (existingVote) {
      if (existingVote.type === type) {
        const row = await this.removeVote(postId, username);
        return row;
      } else {
        const query = `
          UPDATE vote SET type=$1 WHERE post=$2 AND _user=$3 RETURNING *;
        `;
        const values = [type, postId, username];
        const { rows } = await client.query(query, values);
        return rows[0];
      }
    } else {
      const query = `
        INSERT INTO vote (post, _user, type) VALUES($1, $2, $3) RETURNING *;
      `;
      const values = [postId, username, type];
      const { rows } = await client.query(query, values);
      if (rows.length === 0) {
        throw new PostNotFoundError(`Post with ID ${postId} not found.`);
      }
      return rows[0];
    }
  }

  static async removeVote(
    postId: number,
    username: string
  ): Promise<QueryResultRow> {
    const query = `
      DELETE FROM vote WHERE post=$1 AND _user=$2 RETURNING *;
    `;
    const values = [postId, username];
    const { rows } = await client.query(query, values);
    if (rows.length === 0) {
      throw new PostNotFoundError(`Post with ID ${postId} not found.`);
    }
    return rows[0];
  }

  static async getVote(
    postId: number,
    username: string
  ): Promise<QueryResultRow | null> {
    const query = `
      SELECT * FROM vote WHERE post=$1 AND _user=$2;
    `;
    const values = [postId, username];
    const { rows } = await client.query(query, values);
    if (rows.length === 0) {
      return null;
    }
    return rows[0];
  }
}
