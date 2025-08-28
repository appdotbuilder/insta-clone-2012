import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, commentsTable } from '../db/schema';
import { type CreateCommentInput } from '../schema';
import { createComment } from '../handlers/create_comment';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateCommentInput = {
  user_id: 1,
  post_id: 1,
  content: 'This is a test comment'
};

describe('createComment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a comment successfully', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create prerequisite post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: userId,
        image_url: 'https://example.com/image.jpg',
        caption: 'Test post'
      })
      .returning()
      .execute();

    const postId = postResult[0].id;

    // Update test input with actual IDs
    const input = {
      ...testInput,
      user_id: userId,
      post_id: postId
    };

    const result = await createComment(input);

    // Verify comment data
    expect(result.user_id).toEqual(userId);
    expect(result.post_id).toEqual(postId);
    expect(result.content).toEqual('This is a test comment');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save comment to database', async () => {
    // Create prerequisite user and post
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const postResult = await db.insert(postsTable)
      .values({
        user_id: userResult[0].id,
        image_url: 'https://example.com/image.jpg',
        caption: 'Test post'
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      user_id: userResult[0].id,
      post_id: postResult[0].id
    };

    const result = await createComment(input);

    // Verify comment was saved
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, result.id))
      .execute();

    expect(comments).toHaveLength(1);
    expect(comments[0].content).toEqual('This is a test comment');
    expect(comments[0].user_id).toEqual(userResult[0].id);
    expect(comments[0].post_id).toEqual(postResult[0].id);
    expect(comments[0].created_at).toBeInstanceOf(Date);
  });

  it('should increment post comments_count', async () => {
    // Create prerequisite user and post
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const postResult = await db.insert(postsTable)
      .values({
        user_id: userResult[0].id,
        image_url: 'https://example.com/image.jpg',
        caption: 'Test post',
        comments_count: 5 // Initial count
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      user_id: userResult[0].id,
      post_id: postResult[0].id
    };

    await createComment(input);

    // Verify comments_count was incremented
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, postResult[0].id))
      .execute();

    expect(updatedPost[0].comments_count).toEqual(6);
    expect(updatedPost[0].updated_at).toBeInstanceOf(Date);
    expect(updatedPost[0].updated_at.getTime()).toBeGreaterThan(postResult[0].updated_at.getTime());
  });

  it('should throw error when user does not exist', async () => {
    // Create prerequisite post only
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const postResult = await db.insert(postsTable)
      .values({
        user_id: userResult[0].id,
        image_url: 'https://example.com/image.jpg',
        caption: 'Test post'
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      user_id: 999, // Non-existent user
      post_id: postResult[0].id
    };

    await expect(createComment(input)).rejects.toThrow(/user.*not found/i);
  });

  it('should throw error when post does not exist', async () => {
    // Create prerequisite user only
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      user_id: userResult[0].id,
      post_id: 999 // Non-existent post
    };

    await expect(createComment(input)).rejects.toThrow(/post.*not found/i);
  });

  it('should handle multiple comments on same post', async () => {
    // Create prerequisite user and post
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const postResult = await db.insert(postsTable)
      .values({
        user_id: userResult[0].id,
        image_url: 'https://example.com/image.jpg',
        caption: 'Test post'
      })
      .returning()
      .execute();

    const baseInput = {
      user_id: userResult[0].id,
      post_id: postResult[0].id
    };

    // Create first comment
    const comment1 = await createComment({
      ...baseInput,
      content: 'First comment'
    });

    // Create second comment
    const comment2 = await createComment({
      ...baseInput,
      content: 'Second comment'
    });

    // Verify both comments exist
    expect(comment1.id).not.toEqual(comment2.id);
    expect(comment1.content).toEqual('First comment');
    expect(comment2.content).toEqual('Second comment');

    // Verify comments_count was incremented twice
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, postResult[0].id))
      .execute();

    expect(updatedPost[0].comments_count).toEqual(2);
  });
});