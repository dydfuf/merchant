export interface AuthContext {
  userId: string;
  sessionId?: string;
  roles?: readonly string[];
}

export function isActorAuthorized(auth: AuthContext, actorId: string): boolean {
  return auth.userId === actorId;
}
