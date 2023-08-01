import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { UserController, PostController } from "../controllers/index.js";
import { authorization, upload } from "../middlewares/index.js";

export const router: Router = Router();

const VoteType = [0, 1, -1];

router.post("/user/register", UserController.registerNewUser);
router.post("/user/login", UserController.login);

router.post("/user/follow", authorization, UserController.followUser);
router.post("/user/unfollow", authorization, UserController.unfollowUser);

const createNewPostValidationChain = [
  body("content")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("MAX 500 characters only!"),
  body("thread")
    .optional()
    .isString()
    .withMessage("Thread: Expected String got Number"),
];

// create new post
router.post(
  "/post",
  authorization,
  createNewPostValidationChain,
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  upload.array("files", 10),
  PostController.createNewPost
);

// get all posts for home feed
router.get("/post", PostController.getPosts);

// get all posts for user profile
router.get("/profile/post", PostController.getProfilePosts);

const votingBodyValidationChain = [
  body("postId").notEmpty().withMessage("postId is Required!"),
  body("type")
    .notEmpty()
    .withMessage("type cannot be empty!")
    .isInt()
    .isIn(VoteType)
    .withMessage(`INVALID_TYPE, Accepted: 1, 0 or -1`),
];

function validateResult(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// voting
router.post(
  "/post/vote",
  authorization,
  votingBodyValidationChain,
  validateResult,
  PostController.handleVoting
);

// get vote state
router.get("/post/vote/state", authorization, PostController.checkVoteState);

// add comment to post
router.post("/post/comment", authorization, PostController.addCommentInPost);

// get comments for particular post
router.get("/post/comments", PostController.getCommentsForPost);

// get all threads for specific post
router.get("/post/threads", PostController.getThreadsForPost);

// get thread by id
router.get("/post/:threadId", PostController.getThreadsById);

// delete post by id
router.delete("/post", authorization, PostController.deletePost);

// get suggestions to follow
router.get("/suggestions/follow", authorization, UserController.getSuggestions);

// fetch profile details
router.get("/profile", UserController.getProfileByUsername);

// check if following the user
router.get(
  "/user/follow/state",
  authorization,
  UserController.checkIfFollowingTheUser
);
