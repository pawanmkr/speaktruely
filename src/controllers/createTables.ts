import { Comment, Post, User, Vote, Media } from "../models/index.js";

export class Tables {
  static async createTables() {
    try {
      await User.createUserTable();
      await Post.createPostTable();
      await Vote.createVoteTable();
      await Comment.createCommentTable();
      await Media.createMediaTable();
    } catch (error) {
      console.log(error);
      throw new Error("Failed to create tables");
    }
  }
}
