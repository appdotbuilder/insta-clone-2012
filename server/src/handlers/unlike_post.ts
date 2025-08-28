import { db } from '../db';
import { likesTable, postsTable } from '../db/schema';
import { type LikePostInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export const unlikePost = async (input: LikePostInput): Promise<{ success: boolean }> => {
  try {
    // Find the existing like record for this user and post
    const existingLike = await db.select()
      .from(likesTable)
      .where(
        and(
          eq(likesTable.user_id, input.user_id),
          eq(likesTable.post_id, input.post_id)
        )
      )
      .execute();

    // If no like exists, return success (idempotent operation)
    if (existingLike.length === 0) {
      return { success: true };
    }

    // Get current post data before deleting the like
    const post = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, input.post_id))
      .execute();

    if (post.length === 0) {
      return { success: true };
    }

    // Delete the like record
    await db.delete(likesTable)
      .where(
        and(
          eq(likesTable.user_id, input.user_id),
          eq(likesTable.post_id, input.post_id)
        )
      )
      .execute();

    // Decrement the post's likes_count (ensure it doesn't go negative)
    await db.update(postsTable)
      .set({
        likes_count: Math.max(0, post[0].likes_count - 1)
      })
      .where(eq(postsTable.id, input.post_id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Unlike post failed:', error);
    throw error;
  }
};