import { db } from '../db';
import { commentsTable, postsTable, usersTable } from '../db/schema';
import { type CreateCommentInput, type Comment } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const createComment = async (input: CreateCommentInput): Promise<Comment> => {
  try {
    // 1. Validate that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // 2. Validate that the post exists
    const post = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, input.post_id))
      .execute();

    if (post.length === 0) {
      throw new Error(`Post with id ${input.post_id} not found`);
    }

    // 3. Create the comment record
    const result = await db.insert(commentsTable)
      .values({
        user_id: input.user_id,
        post_id: input.post_id,
        content: input.content
      })
      .returning()
      .execute();

    const comment = result[0];

    // 4. Increment the post's comments_count
    await db.update(postsTable)
      .set({
        comments_count: sql`${postsTable.comments_count} + 1`,
        updated_at: sql`NOW()`
      })
      .where(eq(postsTable.id, input.post_id))
      .execute();

    return comment;
  } catch (error) {
    console.error('Comment creation failed:', error);
    throw error;
  }
};