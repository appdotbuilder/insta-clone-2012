import { db } from '../db';
import { postsTable, followsTable } from '../db/schema';
import { type GetFeedInput, type Post } from '../schema';
import { eq, desc, inArray } from 'drizzle-orm';

export const getFeed = async (input: GetFeedInput): Promise<Post[]> => {
  try {
    const { user_id, limit = 10, offset = 0 } = input;

    // First, get all users that the current user is following
    const followedUsers = await db.select({ following_id: followsTable.following_id })
      .from(followsTable)
      .where(eq(followsTable.follower_id, user_id))
      .execute();

    // Extract the user IDs from the follows query
    const followedUserIds = followedUsers.map(f => f.following_id);

    // Include the current user's own posts by adding their ID
    const relevantUserIds = [user_id, ...followedUserIds];

    // Get posts from followed users and the current user
    // Build query in a single chain to avoid TypeScript issues
    const results = await db.select()
      .from(postsTable)
      .where(inArray(postsTable.user_id, relevantUserIds))
      .orderBy(desc(postsTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    return results.map(post => ({
      ...post
    }));
  } catch (error) {
    console.error('Feed retrieval failed:', error);
    throw error;
  }
};