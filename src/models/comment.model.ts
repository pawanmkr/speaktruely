import { QueryResultRow } from "pg";
import client from "../config/db.js";

export class Comment {
  static async createCommentTable() {
    const query = `
      CREATE TABLE 
        IF NOT EXISTS comment (
          id SERIAL PRIMARY KEY,
          comment VARCHAR(255),
          post INTEGER,
          user_id INTEGER,
          created_at TIMESTAMP DEFAULT NOW(),

          CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          CONSTRAINT fk_post FOREIGN KEY (post) REFERENCES post (id) ON DELETE CASCADE
        );
    `;
    await client.query(query);
  }

  static async addComment(
    comment: string,
    postId: number,
    userId: number
  ): Promise<QueryResultRow | undefined> {
    const query = `
      INSERT INTO comment (comment, post, user_id)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const values = [comment, postId, userId];
    const result = await client.query(query, values);
    const commentId = result.rows[0].id;
    if (commentId) {
      const comment = await this.getCommentByCommentId(commentId);
      return comment;
    }
  }

  static async getAllCommentsForPost(
    postId: number
  ): Promise<QueryResultRow | undefined> {
    const query = `
      SELECT 
        comment.id,
        comment.comment, 
        comment.created_at AS date, 
        users.id AS userid, 
        users.username
      FROM comment
      LEFT JOIN users ON comment.user_id = users.id
      LEFT JOIN post ON comment.post = post.id
      WHERE post.id = $1;
    `;
    const result = await client.query(query, [postId]);
    return result.rows;
  }

  static async getCommentByCommentId(
    commentId: number
  ): Promise<QueryResultRow | undefined> {
    const query = `
      SELECT 
        comment.id,
        comment.comment, 
        comment.created_at AS date, 
        users.id AS userid, 
        users.username
      FROM comment
      LEFT JOIN users ON comment.user_id = users.id
      LEFT JOIN post ON comment.post = post.id
      WHERE comment.id = $1;
    `;
    const result = await client.query(query, [commentId]);
    return result.rows[0];
  }
}
