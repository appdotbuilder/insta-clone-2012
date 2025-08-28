import { db } from '../db';
import { commentsTable } from '../db/schema';
import { type GetCommentsInput, type Comment } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getComments = async (input: GetCommentsInput): Promise<Comment[]> => {
  try {
    // Apply pagination - use defaults if not provided
    const limit = input.limit || 20;
    const offset = input.offset || 0;
    
    // Build and execute query in one step
    const results = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.post_id, input.post_id))
      .orderBy(asc(commentsTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    return results;
  } catch (error) {
    console.error('Get comments failed:', error);
    throw error;
  }
};