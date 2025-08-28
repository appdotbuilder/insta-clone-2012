import { db } from '../db';
import { postsTable, usersTable } from '../db/schema';
import { type CreatePostInput, type Post } from '../schema';
import { eq } from 'drizzle-orm';

export const createPost = async (input: CreatePostInput): Promise<Post> => {
  try {
    // 1. Validate that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // 2. Create a new post record in the database
    const result = await db.insert(postsTable)
      .values({
        user_id: input.user_id,
        image_url: input.image_url,
        caption: input.caption || null
      })
      .returning()
      .execute();

    // 3. Increment the user's posts_count
    await db.update(usersTable)
      .set({ 
        posts_count: user[0].posts_count + 1,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, input.user_id))
      .execute();

    // 4. Return the created post data
    return result[0];
  } catch (error) {
    console.error('Post creation failed:', error);
    throw error;
  }
};