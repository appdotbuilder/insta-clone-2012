import { db } from '../db';
import { likesTable, postsTable } from '../db/schema';
import { type LikePostInput, type Like } from '../schema';
import { eq, and } from 'drizzle-orm';

export const likePost = async (input: LikePostInput): Promise<Like> => {
  try {
    // Check if the user has already liked this post
    const existingLike = await db.select()
      .from(likesTable)
      .where(
        and(
          eq(likesTable.user_id, input.user_id),
          eq(likesTable.post_id, input.post_id)
        )
      )
      .execute();

    if (existingLike.length > 0) {
      throw new Error('User has already liked this post');
    }

    // Verify that the post exists
    const post = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, input.post_id))
      .execute();

    if (post.length === 0) {
      throw new Error('Post not found');
    }

    // Create the like record
    const result = await db.insert(likesTable)
      .values({
        user_id: input.user_id,
        post_id: input.post_id
      })
      .returning()
      .execute();

    // Increment the post's likes_count
    await db.update(postsTable)
      .set({
        likes_count: post[0].likes_count + 1,
        updated_at: new Date()
      })
      .where(eq(postsTable.id, input.post_id))
      .execute();

    return result[0];
  } catch (error) {
    console.error('Like post failed:', error);
    throw error;
  }
};