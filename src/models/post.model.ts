import { QueryResultRow } from "pg";
import client from "../config/db.js";

export class PostNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostNotFoundError";
  }
}

const completePostQuery = `
    SELECT
    post.id,
    post.thread,
    post.content,
    users.id AS user_id,
    users.full_name,
    users.username,
    post.created_at,
    vote_reputation.reputation,
    media.media,
    thread_ids.threads
    FROM post
    LEFT JOIN users ON post.user_id = users.id
    LEFT JOIN (
    SELECT
        post,
        COUNT(CASE WHEN vote_type = 1 THEN 1 END) - COUNT(CASE WHEN vote_type = -1 THEN 1 END) AS reputation
    FROM vote
    GROUP BY post
    ) AS vote_reputation ON post.id = vote_reputation.post
    LEFT JOIN (
    SELECT
        post.id,
        json_agg(jsonb_build_object('name', media.name, 'mimetype', media.mimetype)) AS media
    FROM media
    JOIN post ON post.id = media.post
    GROUP BY post.id
    ) AS media ON post.id = media.id
    LEFT JOIN (
    SELECT
        thread,
        COUNT(id) AS threads
    FROM post
    GROUP BY thread
    ) AS thread_ids ON post.id = thread_ids.thread
    LEFT JOIN vote ON post.id = vote.post AND post.user_id = vote.user_id
`;

export class Post {
  static async createPostTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS post (
        id SERIAL PRIMARY KEY,
        thread INTEGER DEFAULT NULL,
        content VARCHAR(500),
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `;
    try {
      await client.query(query);
    } catch (error) {
      console.error("Error creating Post table:", error);
    }
  }

  static async addPost(
    content: string,
    userId: number,
    thread?: number
  ): Promise<QueryResultRow | undefined> {
    try {
      if (!content || !userId) {
        throw new Error("Content and userId fields are required.");
      }
      const post = await Post.insertPost(content, userId, thread);
      return post;
    } catch (error) {
      console.error("Error adding post:", error);
      return;
    }
  }

  static async insertPost(
    content: string,
    userId: number,
    thread?: number
  ): Promise<QueryResultRow> {
    let query: string, values: (string | number)[];
    if (thread) {
      query = `
        INSERT INTO post (user_id, thread, content)
        VALUES ($1, $2, $3)
        RETURNING *;
      `;
      values = [userId, thread, content];
    } else {
      query = `
        INSERT INTO post (user_id, content)
        VALUES ($1, $2)
        RETURNING *;
      `;
      values = [userId, content];
    }

    const { rows } = await client.query(query, values);
    return rows[0];
  }

  static async removePost(postId: number): Promise<QueryResultRow> {
    const query = `
      DELETE FROM post
      WHERE id = $1 RETURNING *;
    `;
    const res = await client.query(query, [postId]);
    return res.rows[0];
  }

  static async getPostById(postId: number): Promise<QueryResultRow> {
    const query = `
      SELECT * FROM post
      WHERE id = $1;
    `;
    const values = [postId];

    const { rows } = await client.query(query, values);
    if (rows.length === 0) {
      throw new PostNotFoundError(`Post with ID ${postId} not found.`);
    }
    return rows[0];
  }

  static async getPosts(
    page: number,
    limit: number,
    sortBy: string,
    sortDir: string
  ): Promise<QueryResultRow[]> {
    const offset = (page - 1) * limit;
    const query = `
        ${completePostQuery}
        ORDER BY ${sortBy} ${sortDir}
        LIMIT $1
        OFFSET $2;
    `;
    const values = [limit, offset];

    const { rows } = await client.query(query, values);
    return rows;
  }

  static async getPostsByUserId(
    userId: number,
    page: number,
    limit: number,
    sortBy: string,
    sortDir: string
  ): Promise<QueryResultRow[]> {
    const offset = (page - 1) * limit;
    const query = `
    ${completePostQuery}
        WHERE users.id = $1
        ORDER BY ${sortBy} ${sortDir}
        LIMIT $2
        OFFSET $3;
    `;
    const values = [userId, limit, offset];

    const { rows } = await client.query(query, values);
    return rows;
  }

  static async getFullPostById(postId: number): Promise<QueryResultRow> {
    const query = `
      ${completePostQuery}
      WHERE post.id = $1;
    `;
    const values = [postId];
    const { rows } = await client.query(query, values);
    return rows[0];
  }

  static async checkIfPostIsAlreadyThreaded(tieThreadWithPostId: number) {
    const query = `
      SELECT * FROM post WHERE id=$1;
    `;
    const { rows } = await client.query(query, [tieThreadWithPostId]);
    return rows[0];
  }

  static async getThreadsByPostId(
    postId: number,
    sortBy: string,
    sortDir: string
  ) {
    const query = `
    ${completePostQuery}
      WHERE post.thread = $1
      ORDER BY ${sortBy} ${sortDir};
    `;
    const { rows } = await client.query(query, [postId]);
    return rows;
  }
}
