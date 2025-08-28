import { db } from '../db';
import { postsTable } from '../db/schema';
import { type GetPostsByUserIdInput, type Post } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getPostsByUserId = async (input: GetPostsByUserIdInput): Promise<Post[]> => {
  try {
    // Apply pagination - use defaults if not provided
    const limit = input.limit ?? 20;
    const offset = input.offset ?? 0;

    // Build the complete query in one chain
    const results = await db.select()
      .from(postsTable)
      .where(eq(postsTable.user_id, input.user_id))
      .orderBy(desc(postsTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    // Return the posts (no numeric conversion needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to get posts by user ID:', error);
    throw error;
  }
};