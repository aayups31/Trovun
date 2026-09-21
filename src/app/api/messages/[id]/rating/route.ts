import {
  assertSameOrigin,
  messageErrorResponse,
  messageJson,
  readJsonBody,
} from '@/features/messages/http';
import { rateConversationSeller } from '@/features/messages/queries';

type RatingRouteContext = {
  params: Promise<{ id: string }>;
};

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: RatingRouteContext) {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    const rating = await rateConversationSeller(id, await readJsonBody(request));
    return messageJson({ rating });
  } catch (error) {
    return messageErrorResponse(error);
  }
}
