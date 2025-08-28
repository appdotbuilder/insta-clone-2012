import { db } from '../db';
import { followsTable, usersTable } from '../db/schema';
import { type FollowUserInput } from '../schema';
import { and, eq, sql } from 'drizzle-orm';

export const unfollowUser = async (input: FollowUserInput): Promise<{ success: boolean }> => {
  try {
    // Find the existing follow record
    const existingFollow = await db.select()
      .from(followsTable)
      .where(
        and(
          eq(followsTable.follower_id, input.follower_id),
          eq(followsTable.following_id, input.following_id)
        )
      )
      .limit(1)
      .execute();

    // If no follow record exists, return false
    if (existingFollow.length === 0) {
      return { success: false };
    }

    // Delete the follow record
    await db.delete(followsTable)
      .where(
        and(
          eq(followsTable.follower_id, input.follower_id),
          eq(followsTable.following_id, input.following_id)
        )
      )
      .execute();

    // Decrement follower's following_count (ensure it doesn't go below 0)
    await db.update(usersTable)
      .set({
        following_count: sql`GREATEST(${usersTable.following_count} - 1, 0)`
      })
      .where(eq(usersTable.id, input.follower_id))
      .execute();

    // Decrement following user's followers_count (ensure it doesn't go below 0)
    await db.update(usersTable)
      .set({
        followers_count: sql`GREATEST(${usersTable.followers_count} - 1, 0)`
      })
      .where(eq(usersTable.id, input.following_id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Unfollow user failed:', error);
    throw error;
  }
};