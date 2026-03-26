// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DerivativeEditDialog from "./DerivativeEditDialog";
import { requestDerivativePreview } from "@/lib/derivativeGeneration";

const fetchMock = vi.fn<typeof fetch>();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, options?: { count?: number }) => {
      if (key === "words.derivativePreviewCount" && typeof options?.count === "number") {
        return `${options.count} candidates`;
      }

      const labels: Record<string, string> = {
        "words.editDerivativesTitle": "Edit derivatives",
        "words.generateDerivatives": "Generate derivatives",
        "words.generateMeanings": "Generate meanings",
        "words.addDerivative": "Add derivative",
        "words.applySelectedDerivatives": "Apply selected",
        "words.derivativePreviewLoading": "Detecting adjective derivatives...",
        "words.derivativePreviewPartial":
          "Some words could not be analyzed. You can still continue with the available results.",
        "words.derivativePreviewOriginal": "Original",
        "words.derivativePreviewEmptyRow": "No adjective derivatives were found for this word.",
        "words.generateActionError": "The selected generation action failed.",
        "courses.word": "Word",
        "courses.meaning": "Meaning",
        "common.cancel": "Cancel",
        "common.save": "Save",
        "common.delete": "Delete",
      };

      if (typeof fallback === "string") return fallback;
      return labels[key] ?? key;
    },
  }),
}));

vi.mock("@/lib/derivativeGeneration", () => ({
  buildDerivativePreviewRequestItems: vi.fn(
    (
      results: Array<{
        id: string;
        primaryText: string;
        meaning: string;
        derivative?: Array<{ word: string; meaning: string }>;
      }>,
      getLabel: (result: { id: string; primaryText: string; meaning: string }) => string,
    ) => [
      {
        itemId: results[0]?.id ?? "preview",
        dayName: getLabel(results[0]),
        words: [
          {
            word: results[0]?.primaryText ?? "",
            meaning: results[0]?.meaning ?? "",
            pronunciation: "",
            example: "",
            translation: "",
            derivative: results[0]?.derivative,
          },
        ],
      },
    ],
  ),
  requestDerivativePreview: vi.fn(),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function findButtonByText(text: string): HTMLButtonElement | null {
  return (
    (Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent?.includes(text),
    ) as HTMLButtonElement | undefined) ?? null
  );
}

function findButtonByAriaLabel(label: string): HTMLButtonElement | null {
  return (
    (Array.from(document.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === label,
    ) as HTMLButtonElement | undefined) ?? null
  );
}

function findButtonsByAriaLabelPrefix(prefix: string): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll("button")).filter(
    (button): button is HTMLButtonElement =>
      button instanceof HTMLButtonElement &&
      (button.getAttribute("aria-label") ?? "").startsWith(prefix),
  );
}

function getTextInputs(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll("input")).filter(
    (input): input is HTMLInputElement => input instanceof HTMLInputElement && input.type !== "checkbox",
  );
}

function setInputValue(input: HTMLInputElement, value: string) {
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function renderDialog(element: ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    rerender(nextElement: ReactElement) {
      act(() => {
        root.render(nextElement);
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("DerivativeEditDialog", () => {
  let root: ReturnType<typeof renderDialog> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = "";
  });

  it("shows the generate action only when generation is allowed", () => {
    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="care"
        baseMeaning="attention"
        initial={[]}
        canGenerate={false}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    expect(findButtonByText("Generate derivatives")).toBeNull();
    expect(findButtonsByAriaLabelPrefix("Generate meanings:")).toHaveLength(0);

    root.rerender(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="care"
        baseMeaning="attention"
        initial={[]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    expect(findButtonByText("Generate derivatives")).not.toBeNull();
  });

  it("renders inline meaning actions for rows that already have meanings", () => {
    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="care"
        baseMeaning="attention"
        initial={[{ word: "careful", meaning: "showing caution" }]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    expect(findButtonByAriaLabel("Generate meanings: careful")).not.toBeNull();
    expect(findButtonsByAriaLabelPrefix("Generate meanings:")).toHaveLength(1);
  });

  it("renders loading state while preview generation is in flight", async () => {
    const deferred = createDeferred<{ items: never[] }>();
    vi.mocked(requestDerivativePreview).mockReturnValueOnce(deferred.promise);

    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="care"
        baseMeaning="attention"
        initial={[]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    await act(async () => {
      findButtonByText("Generate derivatives")?.click();
    });

    expect(document.body.textContent).toContain("Detecting adjective derivatives...");

    await act(async () => {
      deferred.resolve({ items: [] });
      await deferred.promise;
    });
  });

  it("renders empty and partial preview states", async () => {
    vi.mocked(requestDerivativePreview)
      .mockResolvedValueOnce({ items: [{ itemId: "preview", dayName: "TOEIC", words: [{ baseWord: "care", baseMeaning: "attention", candidates: [] }] }] })
      .mockResolvedValueOnce({
        items: [
          {
            itemId: "preview",
            dayName: "TOEIC",
            words: [
              {
                baseWord: "suit",
                baseMeaning: "match",
                candidates: [{ word: "suited", meaning: "well matched", source: "free-dictionary", selectedByDefault: true }],
                errors: ["partial"],
              },
            ],
          },
        ],
      });

    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="care"
        baseMeaning="attention"
        initial={[]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    await act(async () => {
      findButtonByText("Generate derivatives")?.click();
    });

    expect(document.body.textContent).toContain("No adjective derivatives were found for this word.");

    root.rerender(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="suit"
        baseMeaning="match"
        initial={[]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    await act(async () => {
      findButtonByText("Generate derivatives")?.click();
    });

    expect(document.body.textContent).toContain(
      "Some words could not be analyzed. You can still continue with the available results.",
    );
    expect(document.body.textContent).toContain("suited");
  });

  it("renders preview errors", async () => {
    vi.mocked(requestDerivativePreview).mockRejectedValueOnce(new Error("Preview failed"));

    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="care"
        baseMeaning="attention"
        initial={[]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    await act(async () => {
      findButtonByText("Generate derivatives")?.click();
    });

    expect(document.body.textContent).toContain("Preview failed");
  });

  it("appends selected generated candidates without duplicating existing rows", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    vi.mocked(requestDerivativePreview).mockResolvedValueOnce({
      items: [
        {
          itemId: "preview",
          dayName: "TOEIC / Day1",
          words: [
            {
              baseWord: "use",
              baseMeaning: "purpose",
              candidates: [
                {
                  word: "useful",
                  meaning: "helpful or practical",
                  source: "free-dictionary",
                  selectedByDefault: true,
                },
                {
                  word: "usable",
                  meaning: "fit to be used",
                  source: "free-dictionary",
                  selectedByDefault: true,
                },
              ],
            },
          ],
        },
      ],
    });

    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="use"
        baseMeaning="purpose"
        initial={[{ word: "useful", meaning: "helpful or practical" }]}
        canGenerate
        onClose={() => {}}
        onSave={onSave}
      />,
    );

    await act(async () => {
      findButtonByText("Generate derivatives")?.click();
    });

    await act(async () => {
      findButtonByText("Apply selected")?.click();
    });

    const values = getTextInputs().map((input) => input.value);
    expect(values.filter((value) => value === "useful")).toHaveLength(1);
    expect(values).toContain("usable");

    await act(async () => {
      findButtonByText("Save")?.click();
    });

    expect(onSave).toHaveBeenCalledWith([
      { word: "useful", meaning: "helpful or practical" },
      { word: "usable", meaning: "fit to be used" },
    ]);
  });

  it("fills only the targeted row and does not overwrite other rows", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          word: "careful",
          meaning: "giving close attention",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="care"
        baseMeaning="attention"
        initial={[
          { word: "careful", meaning: "" },
          { word: "usable", meaning: "" },
          { word: "useful", meaning: "already there" },
        ]}
        canGenerate
        onClose={() => {}}
        onSave={onSave}
      />,
    );

    await act(async () => {
      findButtonByAriaLabel("Generate meanings: careful")?.click();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/naver-dict/meaning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: "careful" }),
    });

    const values = getTextInputs().map((input) => input.value);
    expect(values).toContain("giving close attention");
    expect(values).toContain("");
    expect(values).toContain("already there");

    await act(async () => {
      findButtonByText("Save")?.click();
    });

    expect(onSave).toHaveBeenCalledWith([
      { word: "careful", meaning: "giving close attention" },
      { word: "usable", meaning: "" },
      { word: "useful", meaning: "already there" },
    ]);
  });

  it("shows a success message for the targeted row", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          word: "careful",
          meaning: "giving close attention",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="care"
        baseMeaning="attention"
        initial={[
          { word: "careful", meaning: "" },
          { word: "usable", meaning: "" },
        ]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    await act(async () => {
      findButtonByAriaLabel("Generate meanings: careful")?.click();
    });

    expect(document.body.textContent).toContain(
      'Filled the meaning for "careful".',
    );
  });

  it("shows an error when no exact dictionary meaning is found for the row", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          word: "careful",
          meaning: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="care"
        baseMeaning="attention"
        initial={[{ word: "careful", meaning: "" }]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    await act(async () => {
      findButtonByAriaLabel("Generate meanings: careful")?.click();
    });

    expect(document.body.textContent).toContain(
      'No exact dictionary meaning was found for "careful".',
    );
  });

  it("shows an API error message when the single lookup returns an error", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          word: "careful",
          meaning: null,
          error: "Lookup failed.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="care"
        baseMeaning="attention"
        initial={[{ word: "careful", meaning: "" }]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    await act(async () => {
      findButtonByAriaLabel("Generate meanings: careful")?.click();
    });

    expect(document.body.textContent).toContain("Lookup failed.");
  });

  it("keeps the inline meaning action mounted for rows with existing meanings", () => {
    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="care"
        baseMeaning="attention"
        initial={[
          { word: "careful", meaning: "" },
          { word: "usable", meaning: "fit to be used" },
          { word: "", meaning: "ignored" },
        ]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    expect(findButtonByAriaLabel("Generate meanings: careful")).not.toBeNull();
    expect(findButtonByAriaLabel("Generate meanings: usable")).not.toBeNull();
    expect(findButtonsByAriaLabelPrefix("Generate meanings:")).toHaveLength(2);
  });

  it("overwrites an existing meaning when the inline action succeeds", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          word: "usable",
          meaning: "suitable for use",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="use"
        baseMeaning="purpose"
        initial={[{ word: "usable", meaning: "fit to be used" }]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    await act(async () => {
      findButtonByAriaLabel("Generate meanings: usable")?.click();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/naver-dict/meaning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: "usable" }),
    });
    expect(getTextInputs().map((input) => input.value)).toContain("suitable for use");
    expect(document.body.textContent).toContain('Filled the meaning for "usable".');
  });

  it("does not clear an existing meaning when the lookup returns null", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          word: "usable",
          meaning: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="use"
        baseMeaning="purpose"
        initial={[{ word: "usable", meaning: "fit to be used" }]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    await act(async () => {
      findButtonByAriaLabel("Generate meanings: usable")?.click();
    });

    expect(getTextInputs().map((input) => input.value)).toContain("fit to be used");
    expect(document.body.textContent).toContain(
      'No exact dictionary meaning was found for "usable".',
    );
  });

  it("does not overwrite an existing meaning when the lookup returns an error", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          word: "usable",
          meaning: null,
          error: "Lookup failed.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="use"
        baseMeaning="purpose"
        initial={[{ word: "usable", meaning: "fit to be used" }]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    await act(async () => {
      findButtonByAriaLabel("Generate meanings: usable")?.click();
    });

    expect(getTextInputs().map((input) => input.value)).toContain("fit to be used");
    expect(document.body.textContent).toContain("Lookup failed.");
  });

  it("renders inline meaning actions only for rows with words", () => {
    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="care"
        baseMeaning="attention"
        initial={[
          { word: "careful", meaning: "" },
          { word: "usable", meaning: "fit to be used" },
          { word: "", meaning: "" },
        ]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    expect(findButtonByAriaLabel("Generate meanings: careful")).not.toBeNull();
    expect(findButtonByAriaLabel("Generate meanings: usable")).not.toBeNull();
    expect(findButtonsByAriaLabelPrefix("Generate meanings:")).toHaveLength(2);
  });

  it("keeps unrelated rows editable while one inline meaning request is loading", async () => {
    const deferred = createDeferred<Response>();
    fetchMock.mockReturnValueOnce(deferred.promise);

    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="care"
        baseMeaning="attention"
        initial={[
          { word: "careful", meaning: "" },
          { word: "usable", meaning: "" },
        ]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    await act(async () => {
      findButtonByAriaLabel("Generate meanings: careful")?.click();
    });

    expect(findButtonByAriaLabel("Generate meanings: careful")?.disabled).toBe(true);
    expect(findButtonByAriaLabel("Generate meanings: usable")?.disabled).toBe(false);

    await act(async () => {
      deferred.resolve(
        new Response(JSON.stringify({ word: "careful", meaning: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      await deferred.promise;
    });
  });

  it("resets edited rows and preview state when reopened", async () => {
    vi.mocked(requestDerivativePreview).mockResolvedValueOnce({
      items: [
        {
          itemId: "preview",
          dayName: "TOEIC / Day1",
          words: [
            {
              baseWord: "care",
              baseMeaning: "attention",
              candidates: [
                {
                  word: "careful",
                  meaning: "using caution",
                  source: "free-dictionary",
                  selectedByDefault: true,
                },
              ],
            },
          ],
        },
      ],
    });

    root = renderDialog(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="care"
        baseMeaning="attention"
        initial={[]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    act(() => {
      findButtonByText("Add derivative")?.click();
    });

    const firstWordInput = getTextInputs()[0];
    setInputValue(firstWordInput, "manual");

    await act(async () => {
      findButtonByText("Generate derivatives")?.click();
    });

    expect(document.body.textContent).toContain("careful");

    root.rerender(
      <DerivativeEditDialog
        open={false}
        courseId="TOEIC"
        baseWord="care"
        baseMeaning="attention"
        initial={[]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    root.rerender(
      <DerivativeEditDialog
        open
        courseId="TOEIC"
        baseWord="care"
        baseMeaning="attention"
        initial={[{ word: "careful", meaning: "using caution" }]}
        canGenerate
        onClose={() => {}}
        onSave={() => {}}
      />,
    );

    expect(document.body.textContent).not.toContain("manual");
    expect(document.body.textContent).not.toContain("1 candidates");
    expect(getTextInputs().map((input) => input.value)).toContain("careful");
  });
});
