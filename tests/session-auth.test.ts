import { describe, it, expect } from "vitest";

function checkSessionAccess(
  session: { userId: string | null; guestToken: string | null },
  requestUser: { id: string } | null,
  requestGuestToken?: string
): boolean {
  // ログイン済みユーザーが作成したセッション
  if (session.userId) {
    return requestUser?.id === session.userId;
  }

  // ゲストユーザーが作成したセッション
  if (session.guestToken) {
    if (requestGuestToken && requestGuestToken === session.guestToken) {
      return true;
    }
    // ログインユーザーが自分の履歴として同期・閲覧する場合
    if (requestUser) {
      return true;
    }
    return false;
  }

  return false;
}

describe("Session Authorization Logic", () => {
  it("should allow owner user to access their own session", () => {
    const session = { userId: "user_123", guestToken: null };
    expect(checkSessionAccess(session, { id: "user_123" })).toBe(true);
  });

  it("should deny other users from accessing private session", () => {
    const session = { userId: "user_123", guestToken: null };
    expect(checkSessionAccess(session, { id: "user_999" })).toBe(false);
  });

  it("should deny unauthenticated requests to a user-owned session", () => {
    const session = { userId: "user_123", guestToken: null };
    expect(checkSessionAccess(session, null)).toBe(false);
  });

  it("should allow guest access with matching guest token", () => {
    const session = { userId: null, guestToken: "token_abc" };
    expect(checkSessionAccess(session, null, "token_abc")).toBe(true);
  });

  it("should reject guest access with wrong guest token", () => {
    const session = { userId: null, guestToken: "token_abc" };
    expect(checkSessionAccess(session, null, "token_xyz")).toBe(false);
  });
});
