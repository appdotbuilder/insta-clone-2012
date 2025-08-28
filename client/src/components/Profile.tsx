import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/utils/trpc';
import type { PublicUser, Post } from '../../../server/src/schema';

interface ProfileProps {
  currentUser: PublicUser;
}

export function Profile({ currentUser }: ProfileProps) {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // useCallback to memoize function used in useEffect
  const loadUserPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const posts = await trpc.getPostsByUserId.query({
        user_id: currentUser.id,
        limit: 50,
        offset: 0
      });
      setUserPosts(posts);
    } catch (error) {
      console.error('Failed to load user posts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id]);

  // useEffect with proper dependencies
  useEffect(() => {
    loadUserPosts();
  }, [loadUserPosts]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Profile Header */}
      <div className="flex items-center mb-8 p-6 bg-white rounded-lg border border-gray-300">
        <Avatar className="w-32 h-32 mr-8">
          <AvatarImage src={currentUser.profile_picture_url || undefined} />
          <AvatarFallback className="bg-gray-200 text-gray-700 text-4xl">
            {currentUser.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center mb-4">
            <h1 className="text-2xl font-light mr-6">{currentUser.username}</h1>
            <Button variant="outline" size="sm">
              Edit Profile
            </Button>
          </div>

          <div className="flex space-x-8 mb-4">
            <div>
              <span className="font-semibold">{currentUser.posts_count}</span>
              <span className="text-gray-600 ml-1">posts</span>
            </div>
            <div>
              <span className="font-semibold">{currentUser.followers_count}</span>
              <span className="text-gray-600 ml-1">followers</span>
            </div>
            <div>
              <span className="font-semibold">{currentUser.following_count}</span>
              <span className="text-gray-600 ml-1">following</span>
            </div>
          </div>

          {currentUser.bio && (
            <div className="text-sm">
              <div className="font-semibold">{currentUser.username}</div>
              <div>{currentUser.bio}</div>
            </div>
          )}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="border-t border-gray-300 pt-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : userPosts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📷</div>
            <h3 className="text-2xl font-light mb-2">No posts yet</h3>
            <p className="text-gray-500">When you share photos, they'll appear on your profile.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center text-sm font-semibold text-gray-600 uppercase tracking-wide">
                <span className="mr-2">📊</span>
                Posts
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 md:gap-8">
              {userPosts.map((post: Post) => (
                <div
                  key={post.id}
                  className="aspect-square relative group cursor-pointer"
                >
                  <img
                    src={post.image_url}
                    alt={post.caption || 'Post'}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Hover overlay with stats */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-white text-center">
                      <div className="flex items-center justify-center space-x-4">
                        <div className="flex items-center">
                          <span className="mr-1">❤️</span>
                          <span className="font-semibold">{post.likes_count}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-1">💬</span>
                          <span className="font-semibold">{post.comments_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}