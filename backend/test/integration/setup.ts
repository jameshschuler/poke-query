import { vi } from "vitest";

export const TEST_USER_ID =
  process.env.INTEGRATION_TEST_USER_ID ?? "11111111-1111-4111-8111-111111111111";
export const OTHER_TEST_USER_ID =
  process.env.INTEGRATION_TEST_OTHER_USER_ID ?? "22222222-2222-4222-8222-222222222222";

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
            user: { id: TEST_USER_ID, email: "integration@example.com" },
          },
          error: null,
        }),
      ),
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: TEST_USER_ID, email: "integration@example.com" } },
          error: null,
        }),
      ),
    },
  }),
}));
