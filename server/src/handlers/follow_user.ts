import { db } from '../db';
import { followsTable, usersTable } from '../db/schema';
import { type FollowUserInput, type Follow } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export const followUser = async (input: FollowUserInput): Promise<Follow> => {
  try {
    // Check if the follower is not trying to follow themselves
    if (input.follower_id === input.following_id) {
      throw new Error('Users cannot follow themselves');
    }

    // Verify both users exist
    const followerExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.follower_id))
      .execute();

    const followingExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.following_id))
      .execute();

    if (followerExists.length === 0) {
      throw new Error('Follower user does not exist');
    }
    if (followingExists.length === 0) {
      throw new Error('User to follow does not exist');
    }

    // Check if the follow relationship doesn't already exist
    const existingFollow = await db.select()
      .from(followsTable)
      .where(
        and(
          eq(followsTable.follower_id, input.follower_id),
          eq(followsTable.following_id, input.following_id)
        )
      )
      .execute();

    if (existingFollow.length > 0) {
      throw new Error('Follow relationship already exists');
    }

    // Create a new follow record
    const result = await db.insert(followsTable)
      .values({
        follower_id: input.follower_id,
        following_id: input.following_id
      })
      .returning()
      .execute();

    // Increment follower's following_count
    await db.update(usersTable)
      .set({ 
        following_count: sql`following_count + 1`,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, input.follower_id))
      .execute();

    // Increment following user's followers_count
    await db.update(usersTable)
      .set({ 
        followers_count: sql`followers_count + 1`,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, input.following_id))
      .execute();

    return result[0];
  } catch (error) {
    console.error('Follow user failed:', error);
    throw error;
  }
};