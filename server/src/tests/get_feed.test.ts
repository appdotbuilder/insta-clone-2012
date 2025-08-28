import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, followsTable } from '../db/schema';
import { type GetFeedInput } from '../schema';
import { getFeed } from '../handlers/get_feed';
import { eq } from 'drizzle-orm';

describe('getFeed', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return current user posts when no one is followed', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123'
      })
      .returning()
      .execute();

    // Create first post
    const [post1] = await db.insert(postsTable)
      .values({
        user_id: user.id,
        image_url: 'https://example.com/image1.jpg',
        caption: 'My first post'
      })
      .returning()
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));

    // Create second post
    const [post2] = await db.insert(postsTable)
      .values({
        user_id: user.id,
        image_url: 'https://example.com/image2.jpg',
        caption: 'My second post'
      })
      .returning()
      .execute();

    const input: GetFeedInput = {
      user_id: user.id,
      limit: 10,
      offset: 0
    };

    const result = await getFeed(input);

    expect(result).toHaveLength(2);
    // Posts should be ordered by created_at descending (newest first)
    expect(result[0].id).toEqual(post2.id);
    expect(result[1].id).toEqual(post1.id);
    expect(result[0].user_id).toEqual(user.id);
    expect(result[1].user_id).toEqual(user.id);
    // Verify timestamp ordering
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should return posts from followed users and current user', async () => {
    // Create test users
    const [user1, user2, user3] = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com',
          password_hash: 'hash1'
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          password_hash: 'hash2'
        },
        {
          username: 'user3',
          email: 'user3@example.com',
          password_hash: 'hash3'
        }
      ])
      .returning()
      .execute();

    // User1 follows User2
    await db.insert(followsTable)
      .values({
        follower_id: user1.id,
        following_id: user2.id
      })
      .execute();

    // Create posts for each user
    await db.insert(postsTable)
      .values([
        {
          user_id: user1.id,
          image_url: 'https://example.com/user1-post.jpg',
          caption: 'User1 post'
        },
        {
          user_id: user2.id,
          image_url: 'https://example.com/user2-post.jpg',
          caption: 'User2 post'
        },
        {
          user_id: user3.id,
          image_url: 'https://example.com/user3-post.jpg',
          caption: 'User3 post'
        }
      ])
      .execute();

    const input: GetFeedInput = {
      user_id: user1.id,
      limit: 10,
      offset: 0
    };

    const result = await getFeed(input);

    // Should contain posts from user1 (self) and user2 (followed), but not user3
    expect(result).toHaveLength(2);
    
    const userIds = result.map(post => post.user_id);
    expect(userIds).toContain(user1.id);
    expect(userIds).toContain(user2.id);
    expect(userIds).not.toContain(user3.id);
  });

  it('should apply pagination correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123'
      })
      .returning()
      .execute();

    // Create multiple posts
    const posts = [];
    for (let i = 1; i <= 5; i++) {
      posts.push({
        user_id: user.id,
        image_url: `https://example.com/image${i}.jpg`,
        caption: `Post ${i}`
      });
    }
    
    await db.insert(postsTable)
      .values(posts)
      .execute();

    // Test first page
    const firstPageInput: GetFeedInput = {
      user_id: user.id,
      limit: 2,
      offset: 0
    };

    const firstPage = await getFeed(firstPageInput);
    expect(firstPage).toHaveLength(2);

    // Test second page
    const secondPageInput: GetFeedInput = {
      user_id: user.id,
      limit: 2,
      offset: 2
    };

    const secondPage = await getFeed(secondPageInput);
    expect(secondPage).toHaveLength(2);

    // Verify no overlap between pages
    const firstPageIds = firstPage.map(p => p.id);
    const secondPageIds = secondPage.map(p => p.id);
    const hasOverlap = firstPageIds.some(id => secondPageIds.includes(id));
    expect(hasOverlap).toBe(false);
  });

  it('should handle empty feed', async () => {
    // Create test user with no posts and no follows
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123'
      })
      .returning()
      .execute();

    const input: GetFeedInput = {
      user_id: user.id,
      limit: 10,
      offset: 0
    };

    const result = await getFeed(input);

    expect(result).toHaveLength(0);
  });

  it('should use default pagination values when not provided', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123'
      })
      .returning()
      .execute();

    // Create multiple posts (more than default limit of 10)
    const posts = [];
    for (let i = 1; i <= 15; i++) {
      posts.push({
        user_id: user.id,
        image_url: `https://example.com/image${i}.jpg`,
        caption: `Post ${i}`
      });
    }
    
    await db.insert(postsTable)
      .values(posts)
      .execute();

    // Test with minimal input (should use defaults)
    const input: GetFeedInput = {
      user_id: user.id
    };

    const result = await getFeed(input);

    // Should return 10 posts (default limit) from offset 0
    expect(result).toHaveLength(10);
  });

  it('should order posts by created_at descending', async () => {
    // Create test users
    const [user1, user2] = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com',
          password_hash: 'hash1'
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          password_hash: 'hash2'
        }
      ])
      .returning()
      .execute();

    // User1 follows User2
    await db.insert(followsTable)
      .values({
        follower_id: user1.id,
        following_id: user2.id
      })
      .execute();

    // Create posts with specific timing to test ordering
    const [oldPost] = await db.insert(postsTable)
      .values({
        user_id: user2.id,
        image_url: 'https://example.com/old-post.jpg',
        caption: 'Old post'
      })
      .returning()
      .execute();

    // Wait a tiny bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));

    const [newPost] = await db.insert(postsTable)
      .values({
        user_id: user1.id,
        image_url: 'https://example.com/new-post.jpg',
        caption: 'New post'
      })
      .returning()
      .execute();

    const input: GetFeedInput = {
      user_id: user1.id,
      limit: 10,
      offset: 0
    };

    const result = await getFeed(input);

    expect(result).toHaveLength(2);
    // Newer post should come first
    expect(result[0].id).toEqual(newPost.id);
    expect(result[1].id).toEqual(oldPost.id);
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });
});