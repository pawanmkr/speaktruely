import client from "../config/db.js";

export class Follow {
  static async createFollowsTable(): Promise<void> {
    const query = `
      CREATE TABLE 
        IF NOT EXISTS follows (
          id SERIAL PRIMARY KEY,
          follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW()
        );
    `;
    try {
      await client.query(query);
    } catch (error) {
      console.error("Error creating follows table:", error);
    }
  }

  static async followUser(
    followerId: number,
    followingId: number
  ): Promise<void> {
    const query = `
      INSERT INTO follows (follower_id, following_id)
      VALUES ($1, $2);
    `;
    await client.query(query, [followerId, followingId]);
  }

  static async unfollowUser(
    followerId: number,
    followingId: number
  ): Promise<void> {
    const query = `
      DELETE FROM follows
      WHERE follower_id = $1 AND following_id = $2;
    `;
    await client.query(query, [followerId, followingId]);
  }
}
