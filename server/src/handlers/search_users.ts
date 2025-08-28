import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SearchUsersInput, type PublicUser } from '../schema';
import { ilike } from 'drizzle-orm';

export const searchUsers = async (input: SearchUsersInput): Promise<PublicUser[]> => {
  try {
    // Build the base query with where clause
    const baseQuery = db.select({
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
    .where(ilike(usersTable.username, `%${input.query}%`));

    // Apply limit if provided, otherwise execute without limit
    const results = input.limit !== undefined
      ? await baseQuery.limit(input.limit).execute()
      : await baseQuery.execute();

    return results;
  } catch (error) {
    console.error('User search failed:', error);
    throw error;
  }
};