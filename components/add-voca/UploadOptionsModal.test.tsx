// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import UploadOptionsModal from "./UploadOptionsModal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

function renderModal(element: ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("UploadOptionsModal", () => {
  let rendered: ReturnType<typeof renderModal> | null = null;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    rendered?.unmount();
    rendered = null;
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    vi.clearAllMocks();
  });

  it("shows the preserve-existing-images option and confirms its default checked state", () => {
    const onConfirm = vi.fn();

    rendered = renderModal(
      <UploadOptionsModal
        open
        selectedOptions={{
          images: false,
          examples: false,
          translations: false,
          furigana: false,
          preserveExistingImages: true,
        }}
        isImageGenerationEnabled={false}
        isExampleAndTranslationGenerationEnabled={false}
        isFuriganaEnabled={false}
        isPreserveExistingImagesEnabled
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );

    expect(document.body.textContent).toContain(
      "Preserve existing images when overwriting",
    );

    const confirmButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Start Upload"),
    );
    expect(confirmButton).not.toBeUndefined();

    act(() => {
      confirmButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onConfirm).toHaveBeenCalledWith({
      images: false,
      examples: false,
      translations: false,
      furigana: false,
      preserveExistingImages: true,
    });
  });

  it("hides preserve-existing-images when disabled and strips it from the confirmed options", () => {
    const onConfirm = vi.fn();

    rendered = renderModal(
      <UploadOptionsModal
        open
        selectedOptions={{
          images: false,
          examples: false,
          translations: false,
          furigana: false,
          preserveExistingImages: true,
        }}
        isImageGenerationEnabled={false}
        isExampleAndTranslationGenerationEnabled={false}
        isFuriganaEnabled={false}
        isPreserveExistingImagesEnabled={false}
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );

    expect(document.body.textContent).not.toContain(
      "Preserve existing images when overwriting",
    );

    const confirmButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Start Upload"),
    );
    expect(confirmButton).not.toBeUndefined();

    act(() => {
      confirmButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onConfirm).toHaveBeenCalledWith({
      images: false,
      examples: false,
      translations: false,
      furigana: false,
      preserveExistingImages: false,
    });
  });
});
