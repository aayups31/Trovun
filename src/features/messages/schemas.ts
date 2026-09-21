import { z } from 'zod';

export const conversationIdSchema = z.uuid('That conversation ID is invalid.');
export const listingConversationSchema = z.object({
  listingId: z.uuid('That listing ID is invalid.'),
});
export const sendMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Write a message first.')
    .max(2000, 'Keep messages under 2,000 characters.'),
});
export const sellerRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export type ListingConversationInput = z.infer<typeof listingConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
