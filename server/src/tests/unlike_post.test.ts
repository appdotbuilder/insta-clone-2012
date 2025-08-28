import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, likesTable } from '../db/schema';
import { type LikePostInput } from '../schema';
import { unlikePost } from '../handlers/unlike_post';
import { eq, and } from 'drizzle-orm';

// Test input
const testInput: LikePostInput = {
  user_id: 1,
  post_id: 1
};

describe('unlikePost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should unlike a post successfully', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .execute();

    // Create test post
    await db.insert(postsTable)
      .values({
        user_id: 1,
        image_url: 'https://example.com/image.jpg',
        caption: 'Test post',
        likes_count: 1
      })
      .execute();

    // Create existing like
    await db.insert(likesTable)
      .values({
        user_id: 1,
        post_id: 1
      })
      .execute();

    const result = await unlikePost(testInput);

    expect(result.success).toBe(true);
  });

  it('should remove like record from database', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .execute();

    // Create test post
    await db.insert(postsTable)
      .values({
        user_id: 1,
        image_url: 'https://example.com/image.jpg',
        caption: 'Test post',
        likes_count: 1
      })
      .execute();

    // Create existing like
    await db.insert(likesTable)
      .values({
        user_id: 1,
        post_id: 1
      })
      .execute();

    await unlikePost(testInput);

    // Verify like was removed
    const likes = await db.select()
      .from(likesTable)
      .where(
        and(
          eq(likesTable.user_id, 1),
          eq(likesTable.post_id, 1)
        )
      )
      .execute();

    expect(likes).toHaveLength(0);
  });

  it('should decrement post likes_count', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .execute();

    // Create test post with initial likes_count
    await db.insert(postsTable)
      .values({
        user_id: 1,
        image_url: 'https://example.com/image.jpg',
        caption: 'Test post',
        likes_count: 5
      })
      .execute();

    // Create existing like
    await db.insert(likesTable)
      .values({
        user_id: 1,
        post_id: 1
      })
      .execute();

    await unlikePost(testInput);

    // Verify likes_count was decremented
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, 1))
      .execute();

    expect(posts).toHaveLength(1);
    expect(posts[0].likes_count).toBe(4);
  });

  it('should not allow negative likes_count', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .execute();

    // Create test post with 0 likes_count
    await db.insert(postsTable)
      .values({
        user_id: 1,
        image_url: 'https://example.com/image.jpg',
        caption: 'Test post',
        likes_count: 0
      })
      .execute();

    // Create existing like (data inconsistency scenario)
    await db.insert(likesTable)
      .values({
        user_id: 1,
        post_id: 1
      })
      .execute();

    await unlikePost(testInput);

    // Verify likes_count stays at 0 (not negative)
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, 1))
      .execute();

    expect(posts).toHaveLength(1);
    expect(posts[0].likes_count).toBe(0);
  });

  it('should be idempotent when like does not exist', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .execute();

    // Create test post
    await db.insert(postsTable)
      .values({
        user_id: 1,
        image_url: 'https://example.com/image.jpg',
        caption: 'Test post',
        likes_count: 3
      })
      .execute();

    // No existing like created
    const result = await unlikePost(testInput);

    expect(result.success).toBe(true);

    // Verify post likes_count unchanged
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, 1))
      .execute();

    expect(posts[0].likes_count).toBe(3);
  });

  it('should handle different users unliking same post', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          username: 'testuser1',
          email: 'test1@example.com',
          password_hash: 'hashedpassword'
        },
        {
          username: 'testuser2',
          email: 'test2@example.com',
          password_hash: 'hashedpassword'
        }
      ])
      .execute();

    // Create test post
    await db.insert(postsTable)
      .values({
        user_id: 1,
        image_url: 'https://example.com/image.jpg',
        caption: 'Test post',
        likes_count: 2
      })
      .execute();

    // Create likes from both users
    await db.insert(likesTable)
      .values([
        { user_id: 1, post_id: 1 },
        { user_id: 2, post_id: 1 }
      ])
      .execute();

    // User 1 unlikes the post
    await unlikePost({ user_id: 1, post_id: 1 });

    // Verify only user 1's like was removed
    const remainingLikes = await db.select()
      .from(likesTable)
      .where(eq(likesTable.post_id, 1))
      .execute();

    expect(remainingLikes).toHaveLength(1);
    expect(remainingLikes[0].user_id).toBe(2);

    // Verify likes_count was decremented by 1
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, 1))
      .execute();

    expect(posts[0].likes_count).toBe(1);
  });
});