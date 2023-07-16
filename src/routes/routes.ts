import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { UserController, PostController } from "../controllers/index.js";
import { authorization, upload } from "../middlewares/index.js";

export const router: Router = Router();

const voteTypes: string[] = ["UPVOTE", "DOWNVOTE"];

router.post("/user/register", UserController.registerNewUser);
router.post("/user/login", UserController.login);

router.post(
  "/user/fullname",
  authorization,
  (req: Request, res: Response, next: NextFunction) => {
    body("username")
      .notEmpty()
      .withMessage("username is required to get the fullName");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    PostController.getPosts(req, res, next);
  }
);

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
router.get("/post", authorization, PostController.getPosts);

const votingBodyValidationChain = [
  body("postId").notEmpty().withMessage("postId is Required!"),
  body("type")
    .notEmpty()
    .withMessage("type cannot be empty!")
    .isUppercase()
    .isString()
    .isIn(voteTypes)
    .withMessage(`INVALID_TYPE, Accepted: "UPVOTE" OR "DOWNVOTE"`),
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
