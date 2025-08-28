import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, commentsTable } from '../db/schema';
import { type GetCommentsInput } from '../schema';
import { getComments } from '../handlers/get_comments';

// Test data
const testUser1 = {
  username: 'testuser1',
  email: 'test1@example.com',
  password_hash: 'hashedpassword123'
};

const testUser2 = {
  username: 'testuser2',
  email: 'test2@example.com',
  password_hash: 'hashedpassword456'
};

const testPost = {
  user_id: 1,
  image_url: 'https://example.com/image.jpg',
  caption: 'Test post'
};

describe('getComments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get comments for a post ordered by creation date', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable).values([testUser1, testUser2]).returning().execute();
    const posts = await db.insert(postsTable).values({ ...testPost, user_id: users[0].id }).returning().execute();
    
    // Create comments with specific timestamps
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute earlier
    const later = new Date(now.getTime() + 60000); // 1 minute later
    
    const comments = await db.insert(commentsTable).values([
      {
        user_id: users[1].id,
        post_id: posts[0].id,
        content: 'Second comment',
        created_at: now
      },
      {
        user_id: users[0].id,
        post_id: posts[0].id,
        content: 'First comment',
        created_at: earlier
      },
      {
        user_id: users[1].id,
        post_id: posts[0].id,
        content: 'Third comment',
        created_at: later
      }
    ]).returning().execute();

    const input: GetCommentsInput = {
      post_id: posts[0].id
    };

    const result = await getComments(input);

    // Should return 3 comments
    expect(result).toHaveLength(3);
    
    // Should be ordered by created_at ascending (oldest first)
    expect(result[0].content).toEqual('First comment');
    expect(result[1].content).toEqual('Second comment');
    expect(result[2].content).toEqual('Third comment');
    
    // Verify all required fields are present
    result.forEach(comment => {
      expect(comment.id).toBeDefined();
      expect(comment.user_id).toBeDefined();
      expect(comment.post_id).toEqual(posts[0].id);
      expect(comment.content).toBeDefined();
      expect(comment.created_at).toBeInstanceOf(Date);
      expect(comment.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for post with no comments', async () => {
    // Create prerequisite data without comments
    const users = await db.insert(usersTable).values(testUser1).returning().execute();
    const posts = await db.insert(postsTable).values({ ...testPost, user_id: users[0].id }).returning().execute();

    const input: GetCommentsInput = {
      post_id: posts[0].id
    };

    const result = await getComments(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should apply limit correctly', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable).values(testUser1).returning().execute();
    const posts = await db.insert(postsTable).values({ ...testPost, user_id: users[0].id }).returning().execute();
    
    // Create 5 comments
    const commentData = Array.from({ length: 5 }, (_, i) => ({
      user_id: users[0].id,
      post_id: posts[0].id,
      content: `Comment ${i + 1}`
    }));
    
    await db.insert(commentsTable).values(commentData).execute();

    const input: GetCommentsInput = {
      post_id: posts[0].id,
      limit: 3
    };

    const result = await getComments(input);

    expect(result).toHaveLength(3);
  });

  it('should apply offset correctly', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable).values(testUser1).returning().execute();
    const posts = await db.insert(postsTable).values({ ...testPost, user_id: users[0].id }).returning().execute();
    
    // Create comments with predictable order
    const now = new Date();
    const commentData = Array.from({ length: 5 }, (_, i) => ({
      user_id: users[0].id,
      post_id: posts[0].id,
      content: `Comment ${i + 1}`,
      created_at: new Date(now.getTime() + i * 1000) // 1 second apart each
    }));
    
    await db.insert(commentsTable).values(commentData).execute();

    const input: GetCommentsInput = {
      post_id: posts[0].id,
      offset: 2,
      limit: 2
    };

    const result = await getComments(input);

    expect(result).toHaveLength(2);
    expect(result[0].content).toEqual('Comment 3'); // Third comment (offset 2)
    expect(result[1].content).toEqual('Comment 4'); // Fourth comment
  });

  it('should use default pagination values when not provided', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable).values(testUser1).returning().execute();
    const posts = await db.insert(postsTable).values({ ...testPost, user_id: users[0].id }).returning().execute();
    
    // Create more than 20 comments to test default limit
    const commentData = Array.from({ length: 25 }, (_, i) => ({
      user_id: users[0].id,
      post_id: posts[0].id,
      content: `Comment ${i + 1}`
    }));
    
    await db.insert(commentsTable).values(commentData).execute();

    const input: GetCommentsInput = {
      post_id: posts[0].id
      // No limit or offset specified
    };

    const result = await getComments(input);

    // Should apply default limit of 20
    expect(result).toHaveLength(20);
  });

  it('should only return comments for the specified post', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable).values([testUser1, testUser2]).returning().execute();
    const posts = await db.insert(postsTable).values([
      { ...testPost, user_id: users[0].id },
      { ...testPost, user_id: users[1].id, image_url: 'https://example.com/other.jpg' }
    ]).returning().execute();
    
    // Create comments for both posts
    await db.insert(commentsTable).values([
      {
        user_id: users[0].id,
        post_id: posts[0].id,
        content: 'Comment on post 1'
      },
      {
        user_id: users[1].id,
        post_id: posts[0].id,
        content: 'Another comment on post 1'
      },
      {
        user_id: users[0].id,
        post_id: posts[1].id,
        content: 'Comment on post 2'
      }
    ]).execute();

    const input: GetCommentsInput = {
      post_id: posts[0].id
    };

    const result = await getComments(input);

    expect(result).toHaveLength(2);
    result.forEach(comment => {
      expect(comment.post_id).toEqual(posts[0].id);
    });
  });

  it('should return empty array for non-existent post', async () => {
    const input: GetCommentsInput = {
      post_id: 999999 // Non-existent post ID
    };

    const result = await getComments(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });
});