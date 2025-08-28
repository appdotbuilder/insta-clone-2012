import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, followsTable } from '../db/schema';
import { type GetUserByIdInput } from '../schema';
import { getFollowers } from '../handlers/get_followers';

// Test input
const testInput: GetUserByIdInput = {
  id: 1
};

describe('getFollowers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no followers', async () => {
    // Create a user with no followers
    await db.insert(usersTable)
      .values({
        username: 'lonely_user',
        email: 'lonely@example.com',
        password_hash: 'hashed_password'
      })
      .execute();

    const result = await getFollowers(testInput);

    expect(result).toEqual([]);
  });

  it('should return list of followers for a user', async () => {
    // Create target user being followed
    await db.insert(usersTable)
      .values({
        id: 1,
        username: 'popular_user',
        email: 'popular@example.com',
        password_hash: 'hashed_password',
        bio: 'I am popular',
        followers_count: 2,
        following_count: 0,
        posts_count: 5
      })
      .execute();

    // Create follower users
    await db.insert(usersTable)
      .values([
        {
          id: 2,
          username: 'follower1',
          email: 'follower1@example.com',
          password_hash: 'hashed_password1',
          bio: 'First follower',
          followers_count: 0,
          following_count: 1,
          posts_count: 2
        },
        {
          id: 3,
          username: 'follower2',
          email: 'follower2@example.com',
          password_hash: 'hashed_password2',
          profile_picture_url: 'https://example.com/pic2.jpg',
          bio: 'Second follower',
          followers_count: 1,
          following_count: 3,
          posts_count: 0
        }
      ])
      .execute();

    // Create follow relationships
    await db.insert(followsTable)
      .values([
        {
          follower_id: 2,
          following_id: 1
        },
        {
          follower_id: 3,
          following_id: 1
        }
      ])
      .execute();

    const result = await getFollowers(testInput);

    expect(result).toHaveLength(2);
    
    // Verify follower1
    const follower1 = result.find(user => user.username === 'follower1');
    expect(follower1).toBeDefined();
    expect(follower1!.id).toEqual(2);
    expect(follower1!.email).toEqual('follower1@example.com');
    expect(follower1!.bio).toEqual('First follower');
    expect(follower1!.followers_count).toEqual(0);
    expect(follower1!.following_count).toEqual(1);
    expect(follower1!.posts_count).toEqual(2);
    expect(follower1!.profile_picture_url).toBeNull();
    expect(follower1!.created_at).toBeInstanceOf(Date);
    expect(follower1!.updated_at).toBeInstanceOf(Date);

    // Verify follower2
    const follower2 = result.find(user => user.username === 'follower2');
    expect(follower2).toBeDefined();
    expect(follower2!.id).toEqual(3);
    expect(follower2!.email).toEqual('follower2@example.com');
    expect(follower2!.bio).toEqual('Second follower');
    expect(follower2!.profile_picture_url).toEqual('https://example.com/pic2.jpg');
    expect(follower2!.followers_count).toEqual(1);
    expect(follower2!.following_count).toEqual(3);
    expect(follower2!.posts_count).toEqual(0);

    // Verify password_hash is not included (PublicUser type)
    result.forEach(user => {
      expect(user).not.toHaveProperty('password_hash');
    });
  });

  it('should only return followers of the specified user', async () => {
    // Create multiple users
    await db.insert(usersTable)
      .values([
        {
          id: 1,
          username: 'user1',
          email: 'user1@example.com',
          password_hash: 'hashed_password1'
        },
        {
          id: 2,
          username: 'user2',
          email: 'user2@example.com',
          password_hash: 'hashed_password2'
        },
        {
          id: 3,
          username: 'user3',
          email: 'user3@example.com',
          password_hash: 'hashed_password3'
        }
      ])
      .execute();

    // Create follow relationships - user3 follows user1, user2 follows user2 (not user1)
    await db.insert(followsTable)
      .values([
        {
          follower_id: 3,
          following_id: 1  // user3 follows user1
        },
        {
          follower_id: 2,
          following_id: 2  // user2 follows user2 (self-follow, different user)
        }
      ])
      .execute();

    const result = await getFollowers(testInput); // Get followers of user1

    expect(result).toHaveLength(1);
    expect(result[0].username).toEqual('user3');
    expect(result[0].id).toEqual(3);
  });

  it('should handle user with mixed follow relationships correctly', async () => {
    // Create users
    await db.insert(usersTable)
      .values([
        {
          id: 1,
          username: 'target_user',
          email: 'target@example.com',
          password_hash: 'hashed_password1'
        },
        {
          id: 2,
          username: 'mutual_friend',
          email: 'mutual@example.com',
          password_hash: 'hashed_password2'
        }
      ])
      .execute();

    // Create mutual follow relationships
    await db.insert(followsTable)
      .values([
        {
          follower_id: 2,
          following_id: 1  // user2 follows user1
        },
        {
          follower_id: 1,
          following_id: 2  // user1 follows user2
        }
      ])
      .execute();

    const result = await getFollowers(testInput); // Get followers of user1

    // Should only return user2 as a follower of user1, not the reverse relationship
    expect(result).toHaveLength(1);
    expect(result[0].username).toEqual('mutual_friend');
    expect(result[0].id).toEqual(2);
  });
});