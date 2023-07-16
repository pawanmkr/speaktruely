import { QueryResultRow } from "pg";
import client from "../config/db.js";

export class PostNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostNotFoundError";
  }
}

export class Post {
  static async createPostTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS post (
        id SERIAL PRIMARY KEY,
        thread INTEGER DEFAULT NULL,
        content VARCHAR(500),
        created_by VARCHAR(255),
        has_threads BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users (username) ON DELETE CASCADE
      );
    `;
    try {
      await client.query(query);
    } catch (error) {
      console.error("Error creating Post table:", error);
    }
  }

  static async addPost(
    thread: number,
    content: string,
    created_by: string
  ): Promise<QueryResultRow | undefined> {
    try {
      if (!content || !created_by) {
        throw new Error("Content and created_by fields are required.");
      }
      const post = await Post.insertPost(thread, content, created_by);
      return post;
    } catch (error) {
      console.error("Error adding post:", error);
      return;
    }
  }

  static async deletePost(postId: number): Promise<void> {
    try {
      if (!postId) {
        throw new Error("Post ID is required.");
      }

      await Post.getPostById(postId);
      await Post.removePost(postId);
      console.log(`Post with ID ${postId} deleted successfully.`);
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  }

  static async insertPost(
    thread: number,
    content: string,
    created_by: string
  ): Promise<QueryResultRow> {
    const query = `
      INSERT INTO post (thread, content, created_by)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const values = [thread, content, created_by];

    const { rows } = await client.query(query, values);
    return rows[0];
  }

  static async removePost(postId: number): Promise<void> {
    const query = `
      DELETE FROM post
      WHERE id = $1;
    `;
    const values = [postId];

    await client.query(query, values);
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
        SELECT
            post.id,
            post.thread,
            post.content,
            users.full_name,
            users.username,
            post.has_threads,
            post.created_at,
            vote_reputation.reputation,
            media_names.media,
            thread_ids.threads
        FROM post
        LEFT JOIN users ON post.created_by = users.username
        LEFT JOIN (
            SELECT
                post,
                COUNT(CASE WHEN type = 'UPVOTE' THEN 1 END) - COUNT(CASE WHEN type = 'DOWNVOTE' THEN 1 END) AS reputation
            FROM vote
            GROUP BY post
        ) AS vote_reputation ON post.id = vote_reputation.post
        LEFT JOIN (
            SELECT
                post.id,
                array_agg(DISTINCT name) AS media
            FROM media
            JOIN post ON post.id = media.post
            GROUP BY post.id
        ) AS media_names ON post.id = media_names.id
        LEFT JOIN (
            SELECT
                thread,
                array_agg(id) AS threads
            FROM post
            GROUP BY thread
        ) AS thread_ids ON post.id = thread_ids.thread
        LEFT JOIN vote ON post.id = vote.post AND post.created_by = vote._user
        ORDER BY ${sortBy} ${sortDir}
        LIMIT $1
        OFFSET $2;
    `;
    const values = [limit, offset];

    const { rows } = await client.query(query, values);
    return rows;
  }

  static async getFullPostById(postId: number): Promise<QueryResultRow> {
    const query = `
      SELECT
        post.id, post.thread, post.content, (
          SELECT (
              SELECT
                COUNT(
                  CASE
                    WHEN type = 'UPVOTE' THEN 1
                  END
                ) - COUNT(
                  CASE
                    WHEN type = 'DOWNVOTE' THEN 1
                  END
                )
            ) AS reputation
          FROM vote
          WHERE post = post.id
        ), (
          SELECT array_agg(DISTINCT name)
          FROM media
          WHERE post.id = media.post
        ) AS media,
        users.full_name, users.username, post.created_at
      FROM post
        LEFT JOIN users ON post.created_by = users.username
        LEFT JOIN vote ON post.id = vote.post AND post.created_by = vote._user
      WHERE post.id=$1
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

  static async updatePostThreadState(tieThreadWithPostId: number) {
    const query = `
      UPDATE post SET has_threads = TRUE WHERE id=$1;
    `;
    await client.query(query, [tieThreadWithPostId]);
  }
}
