import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { PostCard } from './PostCard';
import type { PublicUser, Post } from '../../../server/src/schema';

interface FeedProps {
  currentUser: PublicUser;
}

export function Feed({ currentUser }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // useCallback to memoize function used in useEffect
  const loadFeed = useCallback(async () => {
    try {
      setIsLoading(true);
      const feedPosts = await trpc.getFeed.query({
        user_id: currentUser.id,
        limit: 20,
        offset: 0
      });
      setPosts(feedPosts);
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id]);

  // useEffect with proper dependencies
  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleLike = async (postId: number) => {
    try {
      await trpc.likePost.mutate({
        user_id: currentUser.id,
        post_id: postId
      });
      // Update local state to reflect the like
      setPosts((prevPosts: Post[]) =>
        prevPosts.map((post: Post) =>
          post.id === postId
            ? { ...post, likes_count: post.likes_count + 1 }
            : post
        )
      );
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleComment = async (postId: number, content: string) => {
    try {
      await trpc.createComment.mutate({
        user_id: currentUser.id,
        post_id: postId,
        content
      });
      // Update local state to reflect the new comment
      setPosts((prevPosts: Post[]) =>
        prevPosts.map((post: Post) =>
          post.id === postId
            ? { ...post, comments_count: post.comments_count + 1 }
            : post
        )
      );
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Your feed is empty!</p>
          <p className="text-gray-400 mt-2">Follow some users to see their posts here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      {posts.map((post: Post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUser={currentUser}
          onLike={handleLike}
          onComment={handleComment}
        />
      ))}
    </div>
  );
}