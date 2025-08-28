import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, likesTable } from '../db/schema';
import { type LikePostInput } from '../schema';
import { likePost } from '../handlers/like_post';
import { eq, and } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashed_password'
};

const testPost = {
  user_id: 1,
  image_url: 'https://example.com/image.jpg',
  caption: 'Test post'
};

const testInput: LikePostInput = {
  user_id: 1,
  post_id: 1
};

describe('likePost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully like a post', async () => {
    // Create test user and post
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(postsTable).values(testPost).execute();

    const result = await likePost(testInput);

    // Verify the like record
    expect(result.user_id).toEqual(1);
    expect(result.post_id).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save like to database', async () => {
    // Create test user and post
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(postsTable).values(testPost).execute();

    const result = await likePost(testInput);

    // Verify like exists in database
    const likes = await db.select()
      .from(likesTable)
      .where(eq(likesTable.id, result.id))
      .execute();

    expect(likes).toHaveLength(1);
    expect(likes[0].user_id).toEqual(1);
    expect(likes[0].post_id).toEqual(1);
    expect(likes[0].created_at).toBeInstanceOf(Date);
  });

  it('should increment post likes count', async () => {
    // Create test user and post
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(postsTable).values(testPost).execute();

    // Verify initial likes count is 0
    const initialPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, 1))
      .execute();
    expect(initialPost[0].likes_count).toEqual(0);

    // Like the post
    await likePost(testInput);

    // Verify likes count is incremented
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, 1))
      .execute();
    expect(updatedPost[0].likes_count).toEqual(1);
    expect(updatedPost[0].updated_at).toBeInstanceOf(Date);
  });

  it('should prevent duplicate likes from same user', async () => {
    // Create test user and post
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(postsTable).values(testPost).execute();

    // Like the post first time
    await likePost(testInput);

    // Try to like the same post again
    await expect(likePost(testInput)).rejects.toThrow(/already liked/i);

    // Verify only one like exists
    const likes = await db.select()
      .from(likesTable)
      .where(
        and(
          eq(likesTable.user_id, testInput.user_id),
          eq(likesTable.post_id, testInput.post_id)
        )
      )
      .execute();
    expect(likes).toHaveLength(1);

    // Verify likes count is still 1
    const post = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testInput.post_id))
      .execute();
    expect(post[0].likes_count).toEqual(1);
  });

  it('should throw error when post does not exist', async () => {
    // Create test user but no post
    await db.insert(usersTable).values(testUser).execute();

    const nonExistentPostInput: LikePostInput = {
      user_id: 1,
      post_id: 999
    };

    await expect(likePost(nonExistentPostInput)).rejects.toThrow(/post not found/i);
  });

  it('should allow different users to like the same post', async () => {
    // Create two test users
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(usersTable).values({
      username: 'testuser2',
      email: 'test2@example.com',
      password_hash: 'hashed_password2'
    }).execute();
    
    // Create test post
    await db.insert(postsTable).values(testPost).execute();

    // Both users like the same post
    const user1Like = await likePost({ user_id: 1, post_id: 1 });
    const user2Like = await likePost({ user_id: 2, post_id: 1 });

    expect(user1Like.user_id).toEqual(1);
    expect(user2Like.user_id).toEqual(2);
    expect(user1Like.post_id).toEqual(1);
    expect(user2Like.post_id).toEqual(1);

    // Verify both likes exist
    const likes = await db.select()
      .from(likesTable)
      .where(eq(likesTable.post_id, 1))
      .execute();
    expect(likes).toHaveLength(2);

    // Verify post likes count is 2
    const post = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, 1))
      .execute();
    expect(post[0].likes_count).toEqual(2);
  });
});