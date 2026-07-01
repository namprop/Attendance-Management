import { z } from 'zod';
import { Document, ObjectId } from 'mongodb';
import { BaseRepository } from '@/app/lib/monggodb/BaseRepository';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const WebAuthnCredentialCreateSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  credentialID: z.string().min(1, 'Credential ID is required'), // Base64URL string
  credentialPublicKey: z.string().min(1, 'Public Key is required'), // Base64URL string
  counter: z.number().default(0),
  credentialDeviceType: z.string().default('singleDevice'),
  credentialBackedUp: z.boolean().default(false),
  transports: z.array(z.string()).optional().default([]),
});

export const WebAuthnCredentialUpdateSchema = WebAuthnCredentialCreateSchema.partial();

export type WebAuthnCredentialCreate = z.infer<typeof WebAuthnCredentialCreateSchema>;
export type WebAuthnCredentialUpdate = z.infer<typeof WebAuthnCredentialUpdateSchema>;

export interface WebAuthnCredential extends WebAuthnCredentialCreate {
  _id: string;
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Repository ───────────────────────────────────────────────────────────────

class WebAuthnCredentialRepository extends BaseRepository<WebAuthnCredential, WebAuthnCredentialCreate> {
  protected readonly collectionName = 'webauthn-credentials';
  protected readonly createSchema = WebAuthnCredentialCreateSchema;
  protected readonly updateSchema = WebAuthnCredentialUpdateSchema;

  protected serialize(doc: Document): WebAuthnCredential {
    return {
      ...doc,
      _id: this.stringifyId(doc),
      id: this.stringifyId(doc),
    } as WebAuthnCredential;
  }

  /**
   * Find credentials by employee ID
   */
  async findByEmployeeId(employeeId: string): Promise<WebAuthnCredential[]> {
    const result = await this.findMany({ filters: { employeeId } });
    return result.data;
  }

  /**
   * Find a specific credential by its ID (base64url encoded)
   */
  async findByCredentialId(credentialID: string): Promise<WebAuthnCredential | null> {
    return this.findOne({ credentialID });
  }
}

export const webAuthnCredentialModel = new WebAuthnCredentialRepository();
