import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test data setup
const testPassword = 'testpassword123';
let testPasswordHash: string;

const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  profile_picture_url: null,
  bio: null,
  followers_count: 0,
  following_count: 0,
  posts_count: 0
};

const loginInput: LoginUserInput = {
  email: 'test@example.com',
  password: testPassword
};

const invalidLoginInput: LoginUserInput = {
  email: 'test@example.com',
  password: 'wrongpassword'
};

const nonExistentUserInput: LoginUserInput = {
  email: 'nonexistent@example.com',
  password: testPassword
};

describe('loginUser', () => {
  beforeEach(async () => {
    await createDB();
    
    // Hash the test password using Bun's password hashing
    testPasswordHash = await Bun.password.hash(testPassword);
    
    // Create test user
    await db.insert(usersTable)
      .values({
        ...testUser,
        password_hash: testPasswordHash
      })
      .execute();
  });
  
  afterEach(resetDB);

  it('should successfully login with valid credentials', async () => {
    const result = await loginUser(loginInput);

    // Should return user data without password hash
    expect(result.email).toEqual('test@example.com');
    expect(result.username).toEqual('testuser');
    expect(result.profile_picture_url).toBeNull();
    expect(result.bio).toBeNull();
    expect(result.followers_count).toEqual(0);
    expect(result.following_count).toEqual(0);
    expect(result.posts_count).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Should not include password hash
    expect('password_hash' in result).toBe(false);
  });

  it('should throw error for invalid password', async () => {
    await expect(loginUser(invalidLoginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for non-existent email', async () => {
    await expect(loginUser(nonExistentUserInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should verify password hash correctly', async () => {
    // Create user with specific password
    const specificPassword = 'mySecurePassword456';
    const specificPasswordHash = await Bun.password.hash(specificPassword);
    
    await db.insert(usersTable)
      .values({
        username: 'specificuser',
        email: 'specific@example.com',
        password_hash: specificPasswordHash,
        profile_picture_url: null,
        bio: null,
        followers_count: 0,
        following_count: 0,
        posts_count: 0
      })
      .execute();

    const validInput: LoginUserInput = {
      email: 'specific@example.com',
      password: specificPassword
    };

    const invalidInput: LoginUserInput = {
      email: 'specific@example.com',
      password: 'wrongPassword'
    };

    // Valid password should work
    const result = await loginUser(validInput);
    expect(result.username).toEqual('specificuser');

    // Invalid password should fail
    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should handle user with profile data correctly', async () => {
    // Create user with profile data
    const profilePasswordHash = await Bun.password.hash(testPassword);
    
    await db.insert(usersTable)
      .values({
        username: 'profileuser',
        email: 'profile@example.com',
        password_hash: profilePasswordHash,
        profile_picture_url: 'https://example.com/profile.jpg',
        bio: 'This is my bio',
        followers_count: 10,
        following_count: 5,
        posts_count: 3
      })
      .execute();

    const profileLoginInput: LoginUserInput = {
      email: 'profile@example.com',
      password: testPassword
    };

    const result = await loginUser(profileLoginInput);

    expect(result.username).toEqual('profileuser');
    expect(result.profile_picture_url).toEqual('https://example.com/profile.jpg');
    expect(result.bio).toEqual('This is my bio');
    expect(result.followers_count).toEqual(10);
    expect(result.following_count).toEqual(5);
    expect(result.posts_count).toEqual(3);
    expect('password_hash' in result).toBe(false);
  });
});