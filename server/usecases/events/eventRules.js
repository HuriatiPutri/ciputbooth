import { Event } from '../../domain/entities/Event.js';
import { ForbiddenError, ValidationError } from '../../domain/errors.js';

/**
 * Shared by create/update: validates input and checks that every referenced frame exists.
 * frameCatalog.findMissing(ids) -> ids that do not exist.
 */
export async function buildEventSettings(input, frameCatalog, actor) {
  const settings = Event.sanitize(input);
  const draft = new Event({ userId: null, ...settings });
  const missing = await frameCatalog.findMissing(draft.referencedFrameIds(), actor);
  if (missing.length) throw new ValidationError(`Unknown frame(s): ${missing.join(', ')}`);
  return settings;
}

export function assertCanManage(event, actor) {
  if (!event.isOwnedBy(actor)) throw new ForbiddenError('You can only manage your own events');
}
