import { db } from '../db';
import { usersTable, followsTable } from '../db/schema';
import { type GetUserByIdInput, type PublicUser } from '../schema';
import { eq } from 'drizzle-orm';

export const getFollowing = async (input: GetUserByIdInput): Promise<PublicUser[]> => {
  try {
    // Query follows table joined with users table to get following users
    const results = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      profile_picture_url: usersTable.profile_picture_url,
      bio: usersTable.bio,
      followers_count: usersTable.followers_count,
      following_count: usersTable.following_count,
      posts_count: usersTable.posts_count,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(followsTable)
    .innerJoin(usersTable, eq(followsTable.following_id, usersTable.id))
    .where(eq(followsTable.follower_id, input.id))
    .execute();

    return results;
  } catch (error) {
    console.error('Get following failed:', error);
    throw error;
  }
};