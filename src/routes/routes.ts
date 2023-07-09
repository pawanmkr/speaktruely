import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { UserController, PostController } from "../controllers/index.js";
import { authorization } from "../middlewares/index.js";
// import { AuthenticatedRequest } from "../middlewares/index.js";

export const router: Router = Router();

router.post("/user/register", UserController.registerNewUser);
router.post("/user/login", UserController.login);

// post creation route
router.post(
  "/post",
  authorization,
  (req: Request, res: Response, next: NextFunction) => {
    body("content")
      .notEmpty()
      .isLength({ max: 500 })
      .withMessage("Content is required.");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    PostController.createNewPost(req, res, next);
  }
);

// Get All posts
router.get("/post", PostController.getPosts);
