import { Comment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";
import { Topic } from "../models/topic.model.js";
import { User } from "../models/user.model.js";

export class Tables {
  static async createTables() {
    try {
      await User.createUserTable();
      await Topic.createTopicTable();
      await Post.createPostTable();
      await Comment.createCommentTable();
    } catch (error) {
      console.log(error);
      throw new Error("Failed to create tables");
    }
  }
}
