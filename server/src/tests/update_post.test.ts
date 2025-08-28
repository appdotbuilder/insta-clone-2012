import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable } from '../db/schema';
import { type UpdatePostInput } from '../schema';
import { updatePost } from '../handlers/update_post';
import { eq } from 'drizzle-orm';

describe('updatePost', () => {
  let testUserId: number;
  let testPostId: number;

  beforeEach(async () => {
    await createDB();

    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;

    // Create a test post
    const postResult = await db.insert(postsTable)
      .values({
        user_id: testUserId,
        image_url: 'https://example.com/test-image.jpg',
        caption: 'Original caption'
      })
      .returning()
      .execute();

    testPostId = postResult[0].id;
  });

  afterEach(resetDB);

  it('should update a post caption', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      caption: 'Updated caption'
    };

    const result = await updatePost(input);

    expect(result.id).toBe(testPostId);
    expect(result.caption).toBe('Updated caption');
    expect(result.user_id).toBe(testUserId);
    expect(result.image_url).toBe('https://example.com/test-image.jpg');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update caption to null when explicitly set', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      caption: null
    };

    const result = await updatePost(input);

    expect(result.id).toBe(testPostId);
    expect(result.caption).toBeNull();
    expect(result.user_id).toBe(testUserId);
  });

  it('should not change caption when not provided', async () => {
    const input: UpdatePostInput = {
      id: testPostId
      // caption not provided
    };

    const result = await updatePost(input);

    expect(result.id).toBe(testPostId);
    expect(result.caption).toBe('Original caption'); // Should remain unchanged
    expect(result.user_id).toBe(testUserId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated post to database', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      caption: 'Database updated caption'
    };

    await updatePost(input);

    // Verify the post was actually updated in the database
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    expect(posts).toHaveLength(1);
    expect(posts[0].caption).toBe('Database updated caption');
    expect(posts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    // Get original timestamp
    const originalPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    const originalUpdatedAt = originalPost[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdatePostInput = {
      id: testPostId,
      caption: 'Caption with new timestamp'
    };

    const result = await updatePost(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error when post does not exist', async () => {
    const input: UpdatePostInput = {
      id: 99999, // Non-existent post ID
      caption: 'This should fail'
    };

    await expect(updatePost(input)).rejects.toThrow(/Post with id 99999 not found/i);
  });

  it('should preserve other post fields when updating', async () => {
    // Update the post with additional data first
    await db.update(postsTable)
      .set({
        likes_count: 42,
        comments_count: 7
      })
      .where(eq(postsTable.id, testPostId))
      .execute();

    const input: UpdatePostInput = {
      id: testPostId,
      caption: 'New caption only'
    };

    const result = await updatePost(input);

    expect(result.caption).toBe('New caption only');
    expect(result.likes_count).toBe(42); // Should be preserved
    expect(result.comments_count).toBe(7); // Should be preserved
    expect(result.user_id).toBe(testUserId); // Should be preserved
    expect(result.image_url).toBe('https://example.com/test-image.jpg'); // Should be preserved
  });
});