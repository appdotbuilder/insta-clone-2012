import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserByIdInput, type PublicUser } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserById = async (input: GetUserByIdInput): Promise<PublicUser | null> => {
  try {
    // Query user by ID
    const result = await db.select({
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
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    // Return null if user not found
    if (result.length === 0) {
      return null;
    }

    // Return the first (and only) user record
    return result[0];
  } catch (error) {
    console.error('Get user by ID failed:', error);
    throw error;
  }
};