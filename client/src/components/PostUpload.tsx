import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/utils/trpc';
import type { PublicUser } from '../../../server/src/schema';

interface PostUploadProps {
  currentUser: PublicUser;
  onUploadComplete: () => void;
}

export function PostUpload({ currentUser, onUploadComplete }: PostUploadProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) return;

    setIsUploading(true);
    try {
      await trpc.createPost.mutate({
        user_id: currentUser.id,
        image_url: imageUrl.trim(),
        caption: caption.trim() || null
      });
      
      // Reset form
      setImageUrl('');
      setCaption('');
      
      // Navigate back to feed
      onUploadComplete();
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-center">Create new post</h2>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Image URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image URL
            </label>
            <Input
              type="url"
              placeholder="https://example.com/your-image.jpg"
              value={imageUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setImageUrl(e.target.value)}
              className="w-full"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter a direct link to your image
            </p>
          </div>

          {/* Image Preview */}
          {imageUrl && (
            <div className="aspect-square">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full h-full object-cover rounded-lg"
                onError={() => {
                  // Handle broken image URLs gracefully
                }}
              />
            </div>
          )}

          {/* Caption Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Caption
            </label>
            <Textarea
              placeholder="Write a caption..."
              value={caption}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCaption(e.target.value)}
              className="w-full resize-none"
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {caption.length}/500
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setImageUrl('');
                setCaption('');
                onUploadComplete();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={!imageUrl.trim() || isUploading}
            >
              {isUploading ? 'Posting...' : 'Share'}
            </Button>
          </div>
        </form>
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-sm mb-2">📝 Tips for great posts:</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Use direct image URLs (ending in .jpg, .png, .gif)</li>
          <li>• Try free image hosting: imgur.com, unsplash.com</li>
          <li>• Square images work best for Instagram-style posts</li>
          <li>• Write engaging captions to get more interaction</li>
        </ul>
      </div>
    </div>
  );
}