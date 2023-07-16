import { QueryResultRow } from "pg";
import { Response, Request, NextFunction } from "express";
import { Post, PostNotFoundError, Vote, Media } from "../models/index.js";
import { uploadMedia } from "../lib/services/azureStorage.js";
import { ExtendedRequest } from "../middlewares/index.js";

interface VoteBody {
  postId: number;
  type: "UPVOTE" | "DOWNVOTE";
}

export class PostController {
  static async createNewPost(
    req: ExtendedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tieThreadWithPostId = req.body.thread;
      const { content } = req.body;
      const username = req.username;

      const fileUploadPromises = [];
      for (const fileKey of Object.keys(req.files)) {
        const file = req.files[fileKey];
        fileUploadPromises.push(uploadMedia(file));
      }
      const blobs = await Promise.all(fileUploadPromises);
      if (tieThreadWithPostId) {
        const result: QueryResultRow = await Post.checkIfPostIsAlreadyThreaded(
          tieThreadWithPostId
        );
        if (result.thread !== null) {
          return res
            .status(501)
            .send("Error: Threads can only be created with original post");
        }
        await Post.updatePostThreadState(tieThreadWithPostId);
      }
      const post: QueryResultRow = await Post.addPost(
        tieThreadWithPostId,
        content,
        username
      );
      if (!post) {
        return res.status(404).send("Failed to create the post");
      }
      const saveUrlPromises = [];
      for (const blob of blobs) {
        saveUrlPromises.push(Media.insertPost(blob.name, post.id, blob.url));
      }
      await Promise.all(saveUrlPromises);
      const newPost: QueryResultRow = await Post.getFullPostById(post.id);
      res.status(201).send(newPost);
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

  static async handleVoting(
    req: ExtendedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { postId, type }: VoteBody = req.body;
      const { username } = req;
      if (
        username === undefined ||
        postId === undefined ||
        type === undefined
      ) {
        res.status(500).send("postId, type or username not found");
      }
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

  static async checkVoteState(
    req: ExtendedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { username } = req;
      if (username === undefined) {
        res.status(500).send("No username found");
      }
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

  static async getThreadsById(
    req: ExtendedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const threadId = parseInt(req.params.threadId);
      const thread: QueryResultRow = await Post.getFullPostById(threadId);
      res.status(200).send(thread);
    } catch (error) {
      console.error(`Failed to fetch the thread:`, error);
      next(error);
    }
  }

  static async getThreadIds(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = parseInt(req.params.postId);
      const ids = await Post.getThreadIdsByPost(postId);
      res.status(200).send(ids);
    } catch (error) {
      console.error("Failed to retreive thread ids:", error);
      next(error);
    }
  }
}
