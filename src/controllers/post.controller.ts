import { QueryResultRow } from "pg";
import { Response, Request, NextFunction } from "express";
import { Post, PostNotFoundError, Vote, Media } from "../models/index.js";
import { uploadMedia } from "../lib/services/azureStorage.js";
import { ExtendedRequest } from "../middlewares/index.js";

interface VoteBody {
  postId: number;
  username: string;
  type: "UPVOTE" | "DOWNVOTE";
}

export class PostController {
  static async createNewPost(
    req: ExtendedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { content } = req.body;
      const username = req.username;
      const fileUploadPromises = [];
      for (const fileKey of Object.keys(req.files)) {
        const file = req.files[fileKey];
        fileUploadPromises.push(uploadMedia(file));
      }
      const blobs = await Promise.all(fileUploadPromises);
      const post: QueryResultRow = await Post.addPost(content, username);
      if (!post) {
        res.status(500).send("Failed to create the post");
        return;
      }
      const saveUrlPromises = [];
      for (const blob of blobs) {
        saveUrlPromises.push(Media.insertPost(blob.name, post.id, blob.url));
      }
      const response = await Promise.all(saveUrlPromises);
      if (response) {
        const newPost: QueryResultRow = await Post.getFullPostById(post.id);
        if (newPost) {
          res.status(201).send(newPost);
        }
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
      // const { username } = req.body;
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

  static async handleVoting(req: Request, res: Response, next: NextFunction) {
    try {
      const { postId, username, type }: VoteBody = req.body;
      const vote = await Vote.insertVote(postId, username, type);
      if (!vote) {
        res.status(404);
        return;
      }
      res.status(201).send(vote);
    } catch (error) {
      console.error("Failed to vote:", error);
      next(error);
    }
  }

  static async checkVoteState(req: Request, res: Response, next: NextFunction) {
    try {
      const { username }: VoteBody = req.body;
      const postId = parseInt(req.query.postId as string);
      const vote = await Vote.getVote(postId, username);
      if (!vote) {
        res.status(200).json({ type: "NEUTRAL" });
        return;
      }
      res.status(200).json({ type: vote.type });
    } catch (error) {
      console.error("Failed to find State:", error);
      next(error);
    }
  }
}
