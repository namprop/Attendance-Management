import { z } from 'zod';
import { Document } from 'mongodb';
import { BaseRepository } from '@/app/lib/monggodb/BaseRepository';

export const WebAuthnChallengeCreateSchema = z.object({
  challenge: z.string().min(1),
  expiresAt: z.date(),
});

export type WebAuthnChallengeCreate = z.infer<typeof WebAuthnChallengeCreateSchema>;

export interface WebAuthnChallenge extends WebAuthnChallengeCreate {
  _id: string;
  id: string;
}

class WebAuthnChallengeRepository extends BaseRepository<WebAuthnChallenge, WebAuthnChallengeCreate> {
  protected readonly collectionName = 'webauthn-challenges';
  protected readonly createSchema = WebAuthnChallengeCreateSchema;
  protected readonly updateSchema = WebAuthnChallengeCreateSchema.partial();

  protected serialize(doc: Document): WebAuthnChallenge {
    return {
      ...doc,
      _id: this.stringifyId(doc),
      id: this.stringifyId(doc),
    } as WebAuthnChallenge;
  }

  async findByChallenge(challenge: string): Promise<WebAuthnChallenge | null> {
    return this.findOne({ challenge });
  }
}

export const webAuthnChallengeModel = new WebAuthnChallengeRepository();
