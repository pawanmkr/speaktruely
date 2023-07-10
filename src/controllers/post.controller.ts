import { Response, Request, NextFunction } from "express";
//import { AuthenticatedRequest } from "../middlewares/auth.js";
import { Post, PostNotFoundError } from "../models/index.js";
import { log } from "console";

export class PostController {
  static async createNewPost(req: Request, res: Response, next: NextFunction) {
    try {
      const { content, username } = req.body;
      const postId = await Post.addPost(content, username);
      if (postId) {
        res.status(201).json({ postId });
      }
    } catch (error) {
      console.error("Error creating new post:", error);
      next(error);
    }
  }

  static async deletePost(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = parseInt(req.params.id, 10);
      if (isNaN(postId)) {
        return res.status(400).send("Invalid post ID.");
      }
      const { username } = req.body;
      /*
       * First, Verify that the post belongs to user
       */

      await Post.deletePost(postId);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting post:", error);
      if (error instanceof PostNotFoundError) {
        res.status(404).send(error.message);
      } else {
        next(error);
      }
    }
  }

  static async getPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 100,
        sortBy = "created_at",
        sortDir = "desc",
      } = req.query;
      const posts = await Post.getPosts(
        parseInt(page.toString(), 10),
        parseInt(limit.toString(), 10),
        sortBy.toString(),
        sortDir.toString()
      );
      res.json(posts);
    } catch (error) {
      console.error("Error getting posts:", error);
      next(error);
    }
  }
}
