import { db } from '../db';
import { usersTable, followsTable } from '../db/schema';
import { type GetUserByIdInput, type PublicUser } from '../schema';
import { eq } from 'drizzle-orm';

export const getFollowers = async (input: GetUserByIdInput): Promise<PublicUser[]> => {
  try {
    // Query the follows table for records where following_id matches the user ID
    // Join with users table to get follower user data
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
      .innerJoin(usersTable, eq(followsTable.follower_id, usersTable.id))
      .where(eq(followsTable.following_id, input.id))
      .execute();

    return results;
  } catch (error) {
    console.error('Get followers failed:', error);
    throw error;
  }
};