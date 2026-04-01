import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const { lookupMeaningMock, verifySessionUserMock } = vi.hoisted(() => ({
  lookupMeaningMock: vi.fn(),
  verifySessionUserMock: vi.fn(),
}));

vi.mock("@/lib/server/naverDictMeaning", () => ({
  lookupMeaning: lookupMeaningMock,
}));

vi.mock("@/lib/server/sessionUser", () => ({
  verifySessionUser: verifySessionUserMock,
}));

describe("POST /api/admin/derivatives/meaning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    verifySessionUserMock.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/derivatives/meaning", {
        method: "POST",
        body: JSON.stringify({ word: "careful" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects non-admin requests", async () => {
    verifySessionUserMock.mockResolvedValue({ role: "user" });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/derivatives/meaning", {
        method: "POST",
        body: JSON.stringify({ word: "careful" }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects invalid payloads", async () => {
    verifySessionUserMock.mockResolvedValue({ role: "admin" });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/derivatives/meaning", {
        method: "POST",
        body: JSON.stringify({ word: "   " }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns the lookup response for admins", async () => {
    verifySessionUserMock.mockResolvedValue({ role: "admin" });
    lookupMeaningMock.mockResolvedValue({
      word: "careful",
      meaning: "giving close attention",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/derivatives/meaning", {
        method: "POST",
        body: JSON.stringify({ word: "careful" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      word: "careful",
      meaning: "giving close attention",
    });
    expect(lookupMeaningMock).toHaveBeenCalledWith("careful");
  });
});
