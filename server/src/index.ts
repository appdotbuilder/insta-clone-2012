import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import all schemas
import {
  registerUserInputSchema,
  loginUserInputSchema,
  getUserByIdInputSchema,
  updateUserProfileInputSchema,
  searchUsersInputSchema,
  createPostInputSchema,
  updatePostInputSchema,
  getPostsByUserIdInputSchema,
  getFeedInputSchema,
  likePostInputSchema,
  createCommentInputSchema,
  getCommentsInputSchema,
  followUserInputSchema
} from './schema';

// Import all handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { getUserById } from './handlers/get_user_by_id';
import { updateUserProfile } from './handlers/update_user_profile';
import { searchUsers } from './handlers/search_users';
import { createPost } from './handlers/create_post';
import { updatePost } from './handlers/update_post';
import { getPostsByUserId } from './handlers/get_posts_by_user_id';
import { getFeed } from './handlers/get_feed';
import { likePost } from './handlers/like_post';
import { unlikePost } from './handlers/unlike_post';
import { createComment } from './handlers/create_comment';
import { getComments } from './handlers/get_comments';
import { followUser } from './handlers/follow_user';
import { unfollowUser } from './handlers/unfollow_user';
import { getFollowers } from './handlers/get_followers';
import { getFollowing } from './handlers/get_following';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User authentication and profile routes
  registerUser: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  loginUser: publicProcedure
    .input(loginUserInputSchema)
    .mutation(({ input }) => loginUser(input)),

  getUserById: publicProcedure
    .input(getUserByIdInputSchema)
    .query(({ input }) => getUserById(input)),

  updateUserProfile: publicProcedure
    .input(updateUserProfileInputSchema)
    .mutation(({ input }) => updateUserProfile(input)),

  searchUsers: publicProcedure
    .input(searchUsersInputSchema)
    .query(({ input }) => searchUsers(input)),

  // Post routes
  createPost: publicProcedure
    .input(createPostInputSchema)
    .mutation(({ input }) => createPost(input)),

  updatePost: publicProcedure
    .input(updatePostInputSchema)
    .mutation(({ input }) => updatePost(input)),

  getPostsByUserId: publicProcedure
    .input(getPostsByUserIdInputSchema)
    .query(({ input }) => getPostsByUserId(input)),

  getFeed: publicProcedure
    .input(getFeedInputSchema)
    .query(({ input }) => getFeed(input)),

  // Like routes
  likePost: publicProcedure
    .input(likePostInputSchema)
    .mutation(({ input }) => likePost(input)),

  unlikePost: publicProcedure
    .input(likePostInputSchema)
    .mutation(({ input }) => unlikePost(input)),

  // Comment routes
  createComment: publicProcedure
    .input(createCommentInputSchema)
    .mutation(({ input }) => createComment(input)),

  getComments: publicProcedure
    .input(getCommentsInputSchema)
    .query(({ input }) => getComments(input)),

  // Follow routes
  followUser: publicProcedure
    .input(followUserInputSchema)
    .mutation(({ input }) => followUser(input)),

  unfollowUser: publicProcedure
    .input(followUserInputSchema)
    .mutation(({ input }) => unfollowUser(input)),

  getFollowers: publicProcedure
    .input(getUserByIdInputSchema)
    .query(({ input }) => getFollowers(input)),

  getFollowing: publicProcedure
    .input(getUserByIdInputSchema)
    .query(({ input }) => getFollowing(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Instagram-like Social Media TRPC server listening at port: ${port}`);
}

start();