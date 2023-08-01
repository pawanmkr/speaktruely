import { QueryResultRow } from "pg";
import { Response, Request, NextFunction } from "express";
import {
  Post,
  PostNotFoundError,
  Vote,
  Media,
  Comment,
} from "../models/index.js";
import { uploadMedia } from "../lib/services/azureStorage.js";
import { ExtendedRequest } from "../middlewares/index.js";

export class PostController {
  static async createNewPost(
    req: ExtendedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tieThreadWithPostId = req.body.thread;
      const { content } = req.body;
      const userId = req.userid;

      if (!userId) {
        return res.status(404).send("userId not found");
      }
      console.log(content, userId, tieThreadWithPostId);

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
      }
      const post: QueryResultRow = await Post.addPost(
        content,
        userId,
        tieThreadWithPostId
      );
      if (!post) {
        return res.status(404).send("Failed to create the post");
      }
      const saveUrlPromises = [];
      for (const blob of blobs) {
        saveUrlPromises.push(
          Media.insertPost(blob.name, post.id, blob.url, blob.mimetype)
        );
      }
      await Promise.all(saveUrlPromises);
      const newPost: QueryResultRow = await Post.getFullPostById(post.id);
      res.status(201).send(newPost);
    } catch (error) {
      console.error("Error creating new post:", error);
      next(error);
    }
  }

  static async deletePost(
    req: ExtendedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const postId = parseInt(req.query.post_id as string);
      if (isNaN(postId)) {
        return res.status(400).send("Invalid post ID.");
      }
      const userId = req.userid;
      const post: QueryResultRow = await Post.getPostById(postId);
      if (post && post.user_id === userId) {
        await Post.removePost(postId);
        return res.sendStatus(200);
      }
      res.status(204).end();
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

  static async getProfilePosts(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "created_at",
        sortDir = "desc",
      } = req.query;
      const userId = parseInt(req.query.user_id as string);
      const posts = await Post.getPostsByUserId(
        userId,
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
      const { postId, type } = req.body;
      const { userid } = req;
      if (userid === undefined || postId === undefined || type === undefined) {
        res.status(500).send("postId, type or userid not found");
      }
      const vote = await Vote.insertVote(postId, userid, type);
      if (!vote) {
        return res.status(404);
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
      const { userid } = req;
      if (userid === undefined) {
        res.status(500).send("No userid found");
      }
      const postId = parseInt(req.query.post_id as string);
      const vote = await Vote.getVote(postId, userid);
      if (vote === null) {
        return res.status(204).json({ type: 0 });
      }
      res.status(200).json({ type: vote.vote_type });
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

  static async getThreadsForPost(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { sortBy = "reputation", sortDir = "asc" } = req.query;
      const postId = parseInt(req.query.post_id as string);
      const threads = await Post.getThreadsByPostId(
        postId,
        sortBy.toString(),
        sortDir.toString()
      );
      res.status(200).send(threads);
    } catch (error) {
      console.error("Failed to retreive thread ids:", error);
      next(error);
    }
  }

  static async addCommentInPost(
    req: ExtendedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { comment, post_id } = req.body;
      const userId: number = req.userid;
      const result: QueryResultRow = await Comment.addComment(
        comment,
        post_id,
        userId
      );
      res.status(201).send(result);
    } catch (error) {
      console.error("Failed to post comment:", error);
      next(error);
    }
  }

  static async getCommentsForPost(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const postId = parseInt(req.query.post_id as string);
      const comments: QueryResultRow = await Comment.getAllCommentsForPost(
        postId
      );
      res.status(200).send(comments);
    } catch (error) {
      console.error("Failed to retreive comments: ", error);
      next(error);
    }
  }
}
