import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, followsTable } from '../db/schema';
import { type FollowUserInput } from '../schema';
import { followUser } from '../handlers/follow_user';
import { eq, and } from 'drizzle-orm';


describe('followUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let followerUser: any;
  let followingUser: any;

  beforeEach(async () => {
    // Create test users
    const passwordHash = 'hashed_password_123'; // Simple string for tests

    const users = await db.insert(usersTable)
      .values([
        {
          username: 'follower_user',
          email: 'follower@test.com',
          password_hash: passwordHash,
          followers_count: 0,
          following_count: 0,
          posts_count: 0
        },
        {
          username: 'following_user',
          email: 'following@test.com',
          password_hash: passwordHash,
          followers_count: 0,
          following_count: 0,
          posts_count: 0
        }
      ])
      .returning()
      .execute();

    followerUser = users[0];
    followingUser = users[1];
  });

  it('should create a follow relationship', async () => {
    const input: FollowUserInput = {
      follower_id: followerUser.id,
      following_id: followingUser.id
    };

    const result = await followUser(input);

    expect(result.follower_id).toEqual(followerUser.id);
    expect(result.following_id).toEqual(followingUser.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save follow relationship to database', async () => {
    const input: FollowUserInput = {
      follower_id: followerUser.id,
      following_id: followingUser.id
    };

    await followUser(input);

    const follows = await db.select()
      .from(followsTable)
      .where(
        and(
          eq(followsTable.follower_id, followerUser.id),
          eq(followsTable.following_id, followingUser.id)
        )
      )
      .execute();

    expect(follows).toHaveLength(1);
    expect(follows[0].follower_id).toEqual(followerUser.id);
    expect(follows[0].following_id).toEqual(followingUser.id);
  });

  it('should increment follower count and following count', async () => {
    const input: FollowUserInput = {
      follower_id: followerUser.id,
      following_id: followingUser.id
    };

    await followUser(input);

    // Check follower's following_count increased
    const updatedFollower = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, followerUser.id))
      .execute();

    expect(updatedFollower[0].following_count).toEqual(1);

    // Check following user's followers_count increased
    const updatedFollowing = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, followingUser.id))
      .execute();

    expect(updatedFollowing[0].followers_count).toEqual(1);
  });

  it('should throw error when user tries to follow themselves', async () => {
    const input: FollowUserInput = {
      follower_id: followerUser.id,
      following_id: followerUser.id
    };

    await expect(followUser(input)).rejects.toThrow(/cannot follow themselves/i);
  });

  it('should throw error when follower user does not exist', async () => {
    const input: FollowUserInput = {
      follower_id: 99999, // Non-existent user
      following_id: followingUser.id
    };

    await expect(followUser(input)).rejects.toThrow(/follower user does not exist/i);
  });

  it('should throw error when user to follow does not exist', async () => {
    const input: FollowUserInput = {
      follower_id: followerUser.id,
      following_id: 99999 // Non-existent user
    };

    await expect(followUser(input)).rejects.toThrow(/user to follow does not exist/i);
  });

  it('should throw error when follow relationship already exists', async () => {
    const input: FollowUserInput = {
      follower_id: followerUser.id,
      following_id: followingUser.id
    };

    // Create the follow relationship first
    await followUser(input);

    // Try to create the same relationship again
    await expect(followUser(input)).rejects.toThrow(/follow relationship already exists/i);
  });

  it('should not increment counts when follow creation fails', async () => {
    const input: FollowUserInput = {
      follower_id: followerUser.id,
      following_id: followingUser.id
    };

    // Create the follow relationship first
    await followUser(input);

    const initialFollowerCounts = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, followerUser.id))
      .execute();

    const initialFollowingCounts = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, followingUser.id))
      .execute();

    // Try to create the same relationship again (should fail)
    try {
      await followUser(input);
    } catch (error) {
      // Expected to throw
    }

    // Verify counts haven't changed
    const finalFollowerCounts = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, followerUser.id))
      .execute();

    const finalFollowingCounts = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, followingUser.id))
      .execute();

    expect(finalFollowerCounts[0].following_count).toEqual(initialFollowerCounts[0].following_count);
    expect(finalFollowingCounts[0].followers_count).toEqual(initialFollowingCounts[0].followers_count);
  });
});