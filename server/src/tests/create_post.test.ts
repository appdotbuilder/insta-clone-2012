import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable, usersTable } from '../db/schema';
import { type CreatePostInput } from '../schema';
import { createPost } from '../handlers/create_post';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword123',
      profile_picture_url: null,
      bio: null,
      followers_count: 0,
      following_count: 0,
      posts_count: 0
    })
    .returning()
    .execute();
  
  return result[0];
};

// Test input for creating a post
const createTestInput = (user_id: number): CreatePostInput => ({
  user_id,
  image_url: 'https://example.com/image.jpg',
  caption: 'Test post caption'
});

describe('createPost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a post successfully', async () => {
    const testUser = await createTestUser();
    const input = createTestInput(testUser.id);
    
    const result = await createPost(input);

    // Basic field validation
    expect(result.user_id).toEqual(testUser.id);
    expect(result.image_url).toEqual('https://example.com/image.jpg');
    expect(result.caption).toEqual('Test post caption');
    expect(result.likes_count).toEqual(0);
    expect(result.comments_count).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a post with null caption', async () => {
    const testUser = await createTestUser();
    const input: CreatePostInput = {
      user_id: testUser.id,
      image_url: 'https://example.com/image.jpg',
      caption: null
    };
    
    const result = await createPost(input);

    expect(result.caption).toBeNull();
    expect(result.user_id).toEqual(testUser.id);
    expect(result.image_url).toEqual('https://example.com/image.jpg');
  });

  it('should create a post without caption field', async () => {
    const testUser = await createTestUser();
    const input: CreatePostInput = {
      user_id: testUser.id,
      image_url: 'https://example.com/image.jpg'
    };
    
    const result = await createPost(input);

    expect(result.caption).toBeNull();
    expect(result.user_id).toEqual(testUser.id);
    expect(result.image_url).toEqual('https://example.com/image.jpg');
  });

  it('should save post to database', async () => {
    const testUser = await createTestUser();
    const input = createTestInput(testUser.id);
    
    const result = await createPost(input);

    // Query using proper drizzle syntax
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, result.id))
      .execute();

    expect(posts).toHaveLength(1);
    expect(posts[0].user_id).toEqual(testUser.id);
    expect(posts[0].image_url).toEqual('https://example.com/image.jpg');
    expect(posts[0].caption).toEqual('Test post caption');
    expect(posts[0].likes_count).toEqual(0);
    expect(posts[0].comments_count).toEqual(0);
    expect(posts[0].created_at).toBeInstanceOf(Date);
    expect(posts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should increment user posts_count', async () => {
    const testUser = await createTestUser();
    const input = createTestInput(testUser.id);
    
    // Initial posts_count should be 0
    expect(testUser.posts_count).toEqual(0);
    
    await createPost(input);

    // Check that posts_count has been incremented
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(updatedUser).toHaveLength(1);
    expect(updatedUser[0].posts_count).toEqual(1);
    expect(updatedUser[0].updated_at.getTime()).toBeGreaterThan(testUser.updated_at!.getTime());
  });

  it('should increment posts_count correctly for multiple posts', async () => {
    const testUser = await createTestUser();
    
    // Create first post
    const input1 = createTestInput(testUser.id);
    input1.image_url = 'https://example.com/image1.jpg';
    await createPost(input1);

    // Create second post
    const input2 = createTestInput(testUser.id);
    input2.image_url = 'https://example.com/image2.jpg';
    await createPost(input2);

    // Check that posts_count is now 2
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(updatedUser[0].posts_count).toEqual(2);
  });

  it('should throw error when user does not exist', async () => {
    const input = createTestInput(999); // Non-existent user ID
    
    await expect(createPost(input)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should update user updated_at timestamp', async () => {
    const testUser = await createTestUser();
    const originalUpdatedAt = testUser.updated_at!;
    
    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const input = createTestInput(testUser.id);
    await createPost(input);

    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(updatedUser[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should create multiple posts for the same user', async () => {
    const testUser = await createTestUser();
    
    const input1 = createTestInput(testUser.id);
    input1.caption = 'First post';
    const post1 = await createPost(input1);

    const input2 = createTestInput(testUser.id);
    input2.caption = 'Second post';
    input2.image_url = 'https://example.com/image2.jpg';
    const post2 = await createPost(input2);

    // Both posts should exist
    expect(post1.id).toBeDefined();
    expect(post2.id).toBeDefined();
    expect(post1.id).not.toEqual(post2.id);
    
    // Verify both posts in database
    const allPosts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.user_id, testUser.id))
      .execute();

    expect(allPosts).toHaveLength(2);
    expect(allPosts.map(p => p.caption).sort()).toEqual(['First post', 'Second post']);
  });
});