import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable } from '../db/schema';
import { type GetPostsByUserIdInput } from '../schema';
import { getPostsByUserId } from '../handlers/get_posts_by_user_id';

describe('getPostsByUserId', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123'
      })
      .returning()
      .execute();
    
    return result[0];
  };

  // Helper function to create a test post
  const createTestPost = async (userId: number, caption?: string) => {
    const result = await db.insert(postsTable)
      .values({
        user_id: userId,
        image_url: 'https://example.com/image.jpg',
        caption: caption || null,
        likes_count: 0,
        comments_count: 0
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should return posts for a specific user', async () => {
    // Create test user
    const user = await createTestUser();
    
    // Create posts for the user
    await createTestPost(user.id, 'First post');
    await createTestPost(user.id, 'Second post');

    const input: GetPostsByUserIdInput = {
      user_id: user.id
    };

    const result = await getPostsByUserId(input);

    expect(result).toHaveLength(2);
    result.forEach(post => {
      expect(post.user_id).toEqual(user.id);
      expect(post.image_url).toBeDefined();
      expect(post.id).toBeDefined();
      expect(post.created_at).toBeInstanceOf(Date);
      expect(post.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return posts ordered by created_at descending', async () => {
    // Create test user
    const user = await createTestUser();
    
    // Create posts with some delay to ensure different timestamps
    const firstPost = await createTestPost(user.id, 'First post');
    // Simulate a small delay
    await new Promise(resolve => setTimeout(resolve, 10));
    const secondPost = await createTestPost(user.id, 'Second post');

    const input: GetPostsByUserIdInput = {
      user_id: user.id
    };

    const result = await getPostsByUserId(input);

    expect(result).toHaveLength(2);
    // Most recent post should be first
    expect(result[0].id).toEqual(secondPost.id);
    expect(result[1].id).toEqual(firstPost.id);
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should apply limit parameter correctly', async () => {
    // Create test user
    const user = await createTestUser();
    
    // Create multiple posts
    await createTestPost(user.id, 'Post 1');
    await createTestPost(user.id, 'Post 2');
    await createTestPost(user.id, 'Post 3');

    const input: GetPostsByUserIdInput = {
      user_id: user.id,
      limit: 2
    };

    const result = await getPostsByUserId(input);

    expect(result).toHaveLength(2);
  });

  it('should apply offset parameter correctly', async () => {
    // Create test user
    const user = await createTestUser();
    
    // Create posts with identifiable captions
    await createTestPost(user.id, 'Post 1');
    await new Promise(resolve => setTimeout(resolve, 10));
    await createTestPost(user.id, 'Post 2');
    await new Promise(resolve => setTimeout(resolve, 10));
    await createTestPost(user.id, 'Post 3');

    // Get first page
    const firstPageInput: GetPostsByUserIdInput = {
      user_id: user.id,
      limit: 2,
      offset: 0
    };

    const firstPage = await getPostsByUserId(firstPageInput);
    expect(firstPage).toHaveLength(2);

    // Get second page
    const secondPageInput: GetPostsByUserIdInput = {
      user_id: user.id,
      limit: 2,
      offset: 2
    };

    const secondPage = await getPostsByUserId(secondPageInput);
    expect(secondPage).toHaveLength(1);

    // Ensure no overlap between pages
    const firstPageIds = firstPage.map(post => post.id);
    const secondPageIds = secondPage.map(post => post.id);
    const hasOverlap = firstPageIds.some(id => secondPageIds.includes(id));
    expect(hasOverlap).toBe(false);
  });

  it('should return empty array for user with no posts', async () => {
    // Create test user
    const user = await createTestUser();

    const input: GetPostsByUserIdInput = {
      user_id: user.id
    };

    const result = await getPostsByUserId(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent user', async () => {
    const input: GetPostsByUserIdInput = {
      user_id: 99999 // Non-existent user ID
    };

    const result = await getPostsByUserId(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle posts with null captions correctly', async () => {
    // Create test user
    const user = await createTestUser();
    
    // Create post with null caption
    await createTestPost(user.id); // No caption provided, defaults to null

    const input: GetPostsByUserIdInput = {
      user_id: user.id
    };

    const result = await getPostsByUserId(input);

    expect(result).toHaveLength(1);
    expect(result[0].caption).toBeNull();
  });

  it('should not return posts from other users', async () => {
    // Create two test users
    const user1 = await createTestUser();
    
    const user2 = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hash456'
      })
      .returning()
      .execute();

    // Create posts for both users
    await createTestPost(user1.id, 'User 1 post');
    await createTestPost(user2[0].id, 'User 2 post');

    const input: GetPostsByUserIdInput = {
      user_id: user1.id
    };

    const result = await getPostsByUserId(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1.id);
    expect(result[0].caption).toEqual('User 1 post');
  });

  it('should use default values for optional parameters', async () => {
    // Create test user
    const user = await createTestUser();
    
    // Create more than 20 posts to test default limit
    const createPromises = [];
    for (let i = 1; i <= 25; i++) {
      createPromises.push(createTestPost(user.id, `Post ${i}`));
    }
    await Promise.all(createPromises);

    const input: GetPostsByUserIdInput = {
      user_id: user.id
      // No limit or offset provided, should use defaults
    };

    const result = await getPostsByUserId(input);

    // Should return 20 posts (default limit) starting from offset 0
    expect(result).toHaveLength(20);
  });
});