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
        content VARCHAR(500),
        reputation INTEGER DEFAULT 0,
        created_by VARCHAR(255),
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
    content: string,
    created_by: string
  ): Promise<number | undefined> {
    try {
      if (!content || !created_by) {
        throw new Error("Content and created_by fields are required.");
      }

      const postId = await Post.insertPost(content, created_by);
      console.log(`Post with ID ${postId} created successfully.`);
      return postId;
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

      const post = await Post.getPostById(postId);
      await Post.removePost(postId);
      console.log(`Post with ID ${postId} deleted successfully.`);
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  }

  static async insertPost(
    content: string,
    created_by: string
  ): Promise<number> {
    const query = `
      INSERT INTO post (content, created_by)
      VALUES ($1, $2)
      RETURNING id;
    `;
    const values = [content, created_by];

    const { rows } = await client.query(query, values);
    return rows[0].id;
  }

  static async removePost(postId: number): Promise<void> {
    const query = `
      DELETE FROM post
      WHERE id = $1;
    `;
    const values = [postId];

    await client.query(query, values);
  }

  static async getPostById(postId: number): Promise<any> {
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
  ): Promise<any[]> {
    const offset = (page - 1) * limit;
    const query = `
      SELECT post.id, users.full_name, users.username, post.content, post.reputation, post.created_at
      FROM post
      INNER JOIN users on users.username=post.created_by
      ORDER BY ${sortBy} ${sortDir}
      LIMIT $1 OFFSET $2;
    `;
    const values = [limit, offset];

    const { rows } = await client.query(query, values);
    return rows;
  }
}
