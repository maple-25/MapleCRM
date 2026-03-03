import { Request, Response, NextFunction } from "express";

/**
 * Middleware to authenticate bot requests using API key
 * Checks for X-Bot-Key header and validates against environment variable
 */
export function authenticateBotRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Get the API key from request headers
  const botKey = req.headers["x-bot-key"] as string;

  // Check if API key was provided
  if (!botKey) {
    return res.status(401).json({
      success: false,
      message: "Bot API key is required. Please provide X-Bot-Key header.",
    });
  }

  // Check if API key matches the one in environment variables
  if (botKey !== process.env.BOT_SECRET_KEY) {
    return res.status(401).json({
      success: false,
      message: "Invalid bot API key.",
    });
  }

  // API key is valid, allow the request to proceed
  next();
}

/**
 * Helper function to generate a random API key
 * You can run this once to generate your secret key
 */
export function generateBotApiKey(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "bot_";
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}