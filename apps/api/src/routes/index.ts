import { Router } from "express";

const router = Router();

router.get("/", (_, res) => {
  res.json({
    message: "Project Aegis API is running.",
  });
});

export default router;