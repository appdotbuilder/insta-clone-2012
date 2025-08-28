import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, followsTable } from '../db/schema';
import { type GetUserByIdInput } from '../schema';
import { getFollowing } from '../handlers/get_following';

describe('getFollowing', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user follows no one', async () => {
    // Create a user who follows no one
    const userResult = await db.insert(usersTable)
      .values({
        username: 'loner',
        email: 'loner@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const input: GetUserByIdInput = { id: userResult[0].id };
    const result = await getFollowing(input);

    expect(result).toEqual([]);
  });

  it('should return following users for a user', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'follower',
          email: 'follower@example.com',
          password_hash: 'hashedpassword',
          bio: 'I follow people',
          followers_count: 0,
          following_count: 2,
          posts_count: 5
        },
        {
          username: 'user1',
          email: 'user1@example.com',
          password_hash: 'hashedpassword',
          profile_picture_url: 'https://example.com/pic1.jpg',
          bio: 'First user',
          followers_count: 10,
          following_count: 5,
          posts_count: 20
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          password_hash: 'hashedpassword',
          bio: 'Second user',
          followers_count: 15,
          following_count: 8,
          posts_count: 12
        }
      ])
      .returning()
      .execute();

    const [follower, user1, user2] = users;

    // Create follow relationships
    await db.insert(followsTable)
      .values([
        { follower_id: follower.id, following_id: user1.id },
        { follower_id: follower.id, following_id: user2.id }
      ])
      .execute();

    const input: GetUserByIdInput = { id: follower.id };
    const result = await getFollowing(input);

    expect(result).toHaveLength(2);
    
    // Verify the structure and content
    const followingUsernames = result.map(user => user.username).sort();
    expect(followingUsernames).toEqual(['user1', 'user2']);

    // Verify first following user details
    const followingUser1 = result.find(user => user.username === 'user1');
    expect(followingUser1).toBeDefined();
    expect(followingUser1!.id).toEqual(user1.id);
    expect(followingUser1!.email).toEqual('user1@example.com');
    expect(followingUser1!.profile_picture_url).toEqual('https://example.com/pic1.jpg');
    expect(followingUser1!.bio).toEqual('First user');
    expect(followingUser1!.followers_count).toEqual(10);
    expect(followingUser1!.following_count).toEqual(5);
    expect(followingUser1!.posts_count).toEqual(20);
    expect(followingUser1!.created_at).toBeInstanceOf(Date);
    expect(followingUser1!.updated_at).toBeInstanceOf(Date);

    // Verify second following user details  
    const followingUser2 = result.find(user => user.username === 'user2');
    expect(followingUser2).toBeDefined();
    expect(followingUser2!.id).toEqual(user2.id);
    expect(followingUser2!.email).toEqual('user2@example.com');
    expect(followingUser2!.profile_picture_url).toBeNull();
    expect(followingUser2!.bio).toEqual('Second user');
    expect(followingUser2!.followers_count).toEqual(15);
    expect(followingUser2!.following_count).toEqual(8);
    expect(followingUser2!.posts_count).toEqual(12);

    // Verify no password hash is included (PublicUser type)
    result.forEach(user => {
      expect(user).not.toHaveProperty('password_hash');
    });
  });

  it('should return only users that the specified user follows', async () => {
    // Create three users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'alice',
          email: 'alice@example.com',
          password_hash: 'hashedpassword'
        },
        {
          username: 'bob',
          email: 'bob@example.com',
          password_hash: 'hashedpassword'
        },
        {
          username: 'charlie',
          email: 'charlie@example.com',
          password_hash: 'hashedpassword'
        }
      ])
      .returning()
      .execute();

    const [alice, bob, charlie] = users;

    // Alice follows Bob, Bob follows Charlie
    await db.insert(followsTable)
      .values([
        { follower_id: alice.id, following_id: bob.id },
        { follower_id: bob.id, following_id: charlie.id }
      ])
      .execute();

    // Get who Alice follows (should be only Bob)
    const aliceFollowingInput: GetUserByIdInput = { id: alice.id };
    const aliceFollowing = await getFollowing(aliceFollowingInput);

    expect(aliceFollowing).toHaveLength(1);
    expect(aliceFollowing[0].username).toEqual('bob');
    expect(aliceFollowing[0].id).toEqual(bob.id);

    // Get who Bob follows (should be only Charlie)
    const bobFollowingInput: GetUserByIdInput = { id: bob.id };
    const bobFollowing = await getFollowing(bobFollowingInput);

    expect(bobFollowing).toHaveLength(1);
    expect(bobFollowing[0].username).toEqual('charlie');
    expect(bobFollowing[0].id).toEqual(charlie.id);

    // Get who Charlie follows (should be empty)
    const charlieFollowingInput: GetUserByIdInput = { id: charlie.id };
    const charlieFollowing = await getFollowing(charlieFollowingInput);

    expect(charlieFollowing).toHaveLength(0);
  });

  it('should handle user with null profile fields correctly', async () => {
    // Create users with minimal data (nullable fields as null)
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'follower',
          email: 'follower@example.com',
          password_hash: 'hashedpassword'
        },
        {
          username: 'minimal_user',
          email: 'minimal@example.com',
          password_hash: 'hashedpassword',
          profile_picture_url: null,
          bio: null
        }
      ])
      .returning()
      .execute();

    const [follower, minimalUser] = users;

    // Create follow relationship
    await db.insert(followsTable)
      .values({ follower_id: follower.id, following_id: minimalUser.id })
      .execute();

    const input: GetUserByIdInput = { id: follower.id };
    const result = await getFollowing(input);

    expect(result).toHaveLength(1);
    expect(result[0].username).toEqual('minimal_user');
    expect(result[0].profile_picture_url).toBeNull();
    expect(result[0].bio).toBeNull();
    expect(result[0].followers_count).toEqual(0); // Default value
    expect(result[0].following_count).toEqual(0); // Default value
    expect(result[0].posts_count).toEqual(0); // Default value
  });

  it('should return empty array for non-existent user', async () => {
    const input: GetUserByIdInput = { id: 999 };
    const result = await getFollowing(input);

    expect(result).toEqual([]);
  });
});