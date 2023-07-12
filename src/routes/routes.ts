import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { UserController, PostController } from "../controllers/index.js";
import { authorization } from "../middlewares/index.js";

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

// create new post
router.post(
  "/post",
  authorization,
  body("content")
    .notEmpty()
    .withMessage("Content is required.")
    .isLength({ max: 500 })
    .withMessage("MAX 500 characters only!"),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    PostController.createNewPost(req, res, next);
  }
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
