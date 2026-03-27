import { vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: vi.fn(() => Promise.resolve({ error: null })),
      verifyOtp: vi.fn(() =>
        Promise.resolve({
          data: {
            session: {
              access_token: "mock-token",
              refresh_token: "mock-refresh",
            },
            user: { id: "uuid-123", email: "trainer@example.com" },
          },
          error: null,
        }),
      ),
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: "uuid-123", email: "trainer@example.com" } },
          error: null,
        }),
      ),
    },
  }),
}));
