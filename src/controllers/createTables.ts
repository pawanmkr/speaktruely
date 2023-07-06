import { Topic } from "../models/topic.model.js";
import { User } from "../models/user.model.js";

export class Tables {
  static async createTables() {
    try {
      await User.createUserTable();
      await Topic.createTopicTable();
    } catch (error) {
      console.log(error);
      throw new Error("Failed to create tables");
    }
  }
}
