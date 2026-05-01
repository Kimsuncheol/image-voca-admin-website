import { describe, expect, it, vi } from "vitest";

import PopQuizRedirectPage from "./page";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("PopQuizRedirectPage", () => {
  it("redirects to the combined quiz page", () => {
    PopQuizRedirectPage();

    expect(redirectMock).toHaveBeenCalledWith("/quiz");
  });
});
