import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  password_hash: z.string(),
  profile_picture_url: z.string().nullable(),
  bio: z.string().nullable(),
  followers_count: z.number().int(),
  following_count: z.number().int(),
  posts_count: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Public user schema (without password hash)
export const publicUserSchema = userSchema.omit({ password_hash: true });
export type PublicUser = z.infer<typeof publicUserSchema>;

// Post schema
export const postSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  image_url: z.string(),
  caption: z.string().nullable(),
  likes_count: z.number().int(),
  comments_count: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Post = z.infer<typeof postSchema>;

// Like schema
export const likeSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  post_id: z.number(),
  created_at: z.coerce.date()
});

export type Like = z.infer<typeof likeSchema>;

// Comment schema
export const commentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  post_id: z.number(),
  content: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Comment = z.infer<typeof commentSchema>;

// Follow schema
export const followSchema = z.object({
  id: z.number(),
  follower_id: z.number(),
  following_id: z.number(),
  created_at: z.coerce.date()
});

export type Follow = z.infer<typeof followSchema>;

// Input schemas for creating/updating

// User registration input
export const registerUserInputSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6)
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

// User login input
export const loginUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;

// Update user profile input
export const updateUserProfileInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).max(30).optional(),
  email: z.string().email().optional(),
  profile_picture_url: z.string().nullable().optional(),
  bio: z.string().nullable().optional()
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileInputSchema>;

// Create post input
export const createPostInputSchema = z.object({
  user_id: z.number(),
  image_url: z.string(),
  caption: z.string().nullable().optional()
});

export type CreatePostInput = z.infer<typeof createPostInputSchema>;

// Update post input
export const updatePostInputSchema = z.object({
  id: z.number(),
  caption: z.string().nullable().optional()
});

export type UpdatePostInput = z.infer<typeof updatePostInputSchema>;

// Create comment input
export const createCommentInputSchema = z.object({
  user_id: z.number(),
  post_id: z.number(),
  content: z.string().min(1).max(500)
});

export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

// Like post input
export const likePostInputSchema = z.object({
  user_id: z.number(),
  post_id: z.number()
});

export type LikePostInput = z.infer<typeof likePostInputSchema>;

// Follow user input
export const followUserInputSchema = z.object({
  follower_id: z.number(),
  following_id: z.number()
});

export type FollowUserInput = z.infer<typeof followUserInputSchema>;

// Query schemas
export const getUserByIdInputSchema = z.object({
  id: z.number()
});

export type GetUserByIdInput = z.infer<typeof getUserByIdInputSchema>;

export const getPostsByUserIdInputSchema = z.object({
  user_id: z.number(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetPostsByUserIdInput = z.infer<typeof getPostsByUserIdInputSchema>;

export const getFeedInputSchema = z.object({
  user_id: z.number(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetFeedInput = z.infer<typeof getFeedInputSchema>;

export const getCommentsInputSchema = z.object({
  post_id: z.number(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetCommentsInput = z.infer<typeof getCommentsInputSchema>;

export const searchUsersInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().optional()
});

export type SearchUsersInput = z.infer<typeof searchUsersInputSchema>;