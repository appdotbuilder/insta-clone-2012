import { db } from '../db';
import { postsTable } from '../db/schema';
import { type UpdatePostInput, type Post } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePost = async (input: UpdatePostInput): Promise<Post> => {
  try {
    // First, verify the post exists
    const existingPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, input.id))
      .limit(1)
      .execute();

    if (existingPost.length === 0) {
      throw new Error(`Post with id ${input.id} not found`);
    }

    // Update the post
    const updateData: any = {
      updated_at: new Date()
    };

    // Only update caption if it's provided in the input
    if (input.caption !== undefined) {
      updateData.caption = input.caption;
    }

    const result = await db.update(postsTable)
      .set(updateData)
      .where(eq(postsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Post update failed:', error);
    throw error;
  }
};