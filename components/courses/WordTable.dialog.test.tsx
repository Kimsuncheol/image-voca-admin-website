// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WordTable from "./WordTable";
import { updateCollectionWordImageUrl, updateWordDerivatives, updateWordImageUrl } from "@/lib/firebase/firestore";
import { uploadWordImage } from "@/lib/firebase/storage";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const labels: Record<string, string> = {
        "courses.word": "Word",
        "courses.meaning": "Meaning",
        "courses.pronunciation": "Pronunciation",
        "courses.example": "Example",
        "courses.translation": "Translation",
        "words.derivative": "Derivatives",
        "words.generateDerivatives": "Generate derivatives",
        "words.generateNewImage": "Generate new image",
        "words.removeImage": "Remove image",
        "words.contextMenuEdit": "Edit",
        "words.none": "None",
      };

      if (typeof fallback === "string") return fallback;
      return labels[key] ?? key;
    },
  }),
}));

vi.mock("@/components/shared/InlineEditableText", () => ({
  default: ({ value, emptyLabel }: { value?: string; emptyLabel?: string }) => (
    <span>{value || emptyLabel || ""}</span>
  ),
}));

vi.mock("@/components/shared/CellContextMenu", () => ({
  default: () => null,
}));

vi.mock("@/components/words/WordFinderMissingFieldDialog", () => ({
  default: ({
    open,
    field,
  }: {
    open: boolean;
    field: string | null;
  }) => (open ? <div data-testid="missing-field-dialog">{`missing:${field}`}</div> : null),
}));

vi.mock("@/components/courses/DerivativeEditDialog", () => ({
  default: ({
    open,
    baseWord,
    canGenerate,
    onSave,
  }: {
    open: boolean;
    baseWord: string;
    canGenerate?: boolean;
    onSave: (items: Array<{ word: string; meaning: string }>) => void | Promise<void>;
  }) =>
    open ? (
      <div data-testid="derivative-dialog">
        <span>{`dialog:${baseWord}:${String(canGenerate)}`}</span>
        <button onClick={() => void onSave([{ word: "generated", meaning: "generated meaning" }])}>
          Mock save
        </button>
      </div>
    ) : null,
}));

vi.mock("@/types/course", () => ({
  getCourseById: (id: string) => {
    if (id === "JLPT_COUNTER") {
      return {
        id,
        label: "Counters",
        path: "courses/JLPT_COUNTER/counter_hon",
        schema: "jlpt",
        storageMode: "collection",
      };
    }
    if (id === "JLPT_PREFIX") {
      return {
        id,
        label: "Prefix",
        path: "courses/JLPT_PREFIX",
        schema: "prefix",
        storageMode: "singleList",
        singleListSubcollection: "prefix",
      };
    }
    return {
      id,
      label: id,
      path: `courses/${id}`,
      schema: "standard",
      storageMode: "day",
    };
  },
  getJlptCounterOptionByPath: (path: string) =>
    path === "courses/JLPT_COUNTER/counter_hon"
      ? { id: "counter_hon", label: "Counter Hon", path }
      : undefined,
  getSingleListSubcollectionByCourseId: (id: string) =>
    id === "JLPT_PREFIX" ? "prefix" : null,
}));

vi.mock("react-dropzone", () => ({
  useDropzone: ({
    onDrop,
    disabled,
  }: {
    onDrop: (acceptedFiles: File[]) => void;
    disabled?: boolean;
  }) => ({
    getRootProps: () => ({
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        if (disabled) return;
        onDrop(Array.from(event.dataTransfer?.files ?? []));
      },
      onDragOver: (event: DragEvent) => event.preventDefault(),
    }),
    isDragActive: false,
  }),
}));

vi.mock("@/lib/firebase/firestore", () => ({
  updateWordTextField: vi.fn().mockResolvedValue(undefined),
  updateSingleListWordTextField: vi.fn().mockResolvedValue(undefined),
  updateCollectionWordTextField: vi.fn().mockResolvedValue(undefined),
  updateWordImageUrl: vi.fn().mockResolvedValue(undefined),
  updateSingleListWordImageUrl: vi.fn().mockResolvedValue(undefined),
  updateCollectionWordImageUrl: vi.fn().mockResolvedValue(undefined),
  updateWordDerivatives: vi.fn().mockResolvedValue(undefined),
  updateSingleListWordDerivatives: vi.fn().mockResolvedValue(undefined),
  updateCollectionWordDerivatives: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/firebase/storage", () => ({
  uploadWordImage: vi.fn().mockResolvedValue("https://example.com/uploaded.png"),
}));

function renderTable(element: ReactElement) {
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

function getSelectableCell(text: string): HTMLTableCellElement | null {
  return Array.from(document.querySelectorAll('td[aria-selected]')).find((node) =>
    node.textContent?.includes(text),
  ) as HTMLTableCellElement | null;
}

function getImageCell(wordId: string): HTMLTableCellElement | null {
  return document
    .querySelector(`[data-testid="word-image-dropzone-${wordId}"]`)
    ?.closest("td") as HTMLTableCellElement | null;
}

function dropFile(target: Element, file: File) {
  const event = new Event("drop", { bubbles: true });
  Object.defineProperty(event, "dataTransfer", {
    value: {
      files: [file],
    },
  });
  target.dispatchEvent(event);
}

describe("WordTable derivative dialog integration", () => {
  let rendered: ReturnType<typeof renderTable> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  afterEach(() => {
    rendered?.unmount();
    rendered = null;
    document.body.innerHTML = "";
  });

  it("opens DerivativeEditDialog for missing supported derivatives", () => {
    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "std-1",
            word: "care",
            meaning: "attention",
            pronunciation: "",
            example: "",
            translation: "",
          },
        ]}
        isCollocation={false}
        showImageUrl={false}
        courseId="TOEIC"
        coursePath="courses/TOEIC"
        dayId="Day1"
      />,
    );

    const button = document.querySelector('button[aria-label="Generate derivatives"]');
    expect(button).not.toBeNull();

    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("dialog:care:true");
  });

  it("clears an existing selection before opening the missing-derivative dialog", () => {
    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "std-1",
            word: "care",
            meaning: "attention",
            pronunciation: "",
            example: "",
            translation: "",
          },
        ]}
        isCollocation={false}
        showImageUrl={false}
        courseId="TOEIC"
        coursePath="courses/TOEIC"
        dayId="Day1"
      />,
    );

    const selectedCell = getSelectableCell("care");
    const button = document.querySelector('button[aria-label="Generate derivatives"]');
    expect(selectedCell).not.toBeNull();
    expect(button).not.toBeNull();

    act(() => {
      selectedCell?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(selectedCell?.getAttribute("aria-selected")).toBe("true");

    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(getSelectableCell("care")?.getAttribute("aria-selected")).toBe("false");
    expect(button?.closest("td")?.hasAttribute("aria-selected")).toBe(false);
    expect(document.body.textContent).toContain("dialog:care:true");
  });

  it("opens the same dialog for existing derivatives and saves through updateWordDerivatives", async () => {
    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "std-2",
            word: "use",
            meaning: "purpose",
            pronunciation: "",
            example: "",
            translation: "",
            derivative: [{ word: "useful", meaning: "helpful or practical" }],
          },
        ]}
        isCollocation={false}
        showImageUrl={false}
        courseId="TOEIC"
        coursePath="courses/TOEIC"
        dayId="Day1"
      />,
    );

    const derivativeCell = Array.from(document.querySelectorAll("td")).find((node) =>
      node.textContent?.includes("useful"),
    );
    expect(derivativeCell).not.toBeNull();

    act(() => {
      derivativeCell?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("dialog:use:true");

    await act(async () => {
      Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Mock save"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(updateWordDerivatives).toHaveBeenCalledWith(
      "courses/TOEIC",
      "Day1",
      "std-2",
      [{ word: "generated", meaning: "generated meaning" }],
    );
    expect(document.body.textContent).toContain("generated");
  });

  it("clears an existing selection before opening an existing-derivatives cell", () => {
    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "std-2",
            word: "use",
            meaning: "purpose",
            pronunciation: "",
            example: "",
            translation: "",
            derivative: [{ word: "useful", meaning: "helpful or practical" }],
          },
        ]}
        isCollocation={false}
        showImageUrl={false}
        courseId="TOEIC"
        coursePath="courses/TOEIC"
        dayId="Day1"
      />,
    );

    const selectedCell = getSelectableCell("use");
    const derivativeCell = Array.from(document.querySelectorAll("td")).find((node) =>
      node.textContent?.includes("useful"),
    ) as HTMLTableCellElement | undefined;
    expect(selectedCell).not.toBeNull();
    expect(derivativeCell).not.toBeUndefined();

    act(() => {
      selectedCell?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(selectedCell?.getAttribute("aria-selected")).toBe("true");

    act(() => {
      derivativeCell?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(getSelectableCell("use")?.getAttribute("aria-selected")).toBe("false");
    expect(derivativeCell?.hasAttribute("aria-selected")).toBe(false);
    expect(document.body.textContent).toContain("dialog:use:true");
  });

  it("clears an existing selection before opening the missing-image dialog", () => {
    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "img-1",
            word: "care",
            meaning: "attention",
            pronunciation: "",
            example: "",
            translation: "",
            imageUrl: "",
          },
        ]}
        isCollocation={false}
        showImageUrl
        courseId="TOEIC"
        coursePath="courses/TOEIC"
        dayId="Day1"
      />,
    );

    const selectedCell = getSelectableCell("care");
    let imageCell = getImageCell("img-1");
    expect(selectedCell).not.toBeNull();
    expect(imageCell).not.toBeNull();

    act(() => {
      selectedCell?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(selectedCell?.getAttribute("aria-selected")).toBe("true");
    imageCell = getImageCell("img-1");

    act(() => {
      imageCell?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(getSelectableCell("care")?.getAttribute("aria-selected")).toBe("false");
    expect(getImageCell("img-1")?.hasAttribute("aria-selected")).toBe(false);
    expect(document.body.textContent).toContain("missing:image");
  });

  it("clears an existing selection before opening an existing image", () => {
    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "img-2",
            word: "use",
            meaning: "purpose",
            pronunciation: "",
            example: "",
            translation: "",
            imageUrl: "https://example.com/use.png",
          },
        ]}
        isCollocation={false}
        showImageUrl
        courseId="TOEIC"
        coursePath="courses/TOEIC"
        dayId="Day1"
      />,
    );

    const selectedCell = getSelectableCell("use");
    let imageCell = getImageCell("img-2");
    expect(selectedCell).not.toBeNull();
    expect(imageCell).not.toBeNull();

    act(() => {
      selectedCell?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(selectedCell?.getAttribute("aria-selected")).toBe("true");
    imageCell = getImageCell("img-2");

    act(() => {
      imageCell?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(getSelectableCell("use")?.getAttribute("aria-selected")).toBe("false");
    expect(getImageCell("img-2")?.hasAttribute("aria-selected")).toBe(false);
    expect(document.body.textContent).toContain("missing:image");
  });

  it("removes an existing image without opening the image dialog", () => {
    const onWordImageUpdated = vi.fn();

    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "img-remove-1",
            word: "erase",
            meaning: "remove",
            pronunciation: "",
            example: "",
            translation: "",
            imageUrl: "https://example.com/erase.png",
          },
        ]}
        isCollocation={false}
        showImageUrl
        courseId="TOEIC"
        coursePath="courses/TOEIC"
        dayId="Day1"
        onWordImageUpdated={onWordImageUpdated}
      />,
    );

    const removeButton = document.querySelector(".remove-img-btn");
    expect(removeButton).not.toBeNull();

    act(() => {
      removeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(updateWordImageUrl).toHaveBeenCalledWith(
      "courses/TOEIC",
      "Day1",
      "img-remove-1",
      "",
    );
    expect(onWordImageUpdated).toHaveBeenCalledWith("img-remove-1", "");
    expect(document.body.textContent).not.toContain("missing:image");
  });

  it("uploads a dropped image for day-storage image cells", async () => {
    const onWordImageUpdated = vi.fn();

    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "img-upload-1",
            word: "care",
            meaning: "attention",
            pronunciation: "",
            example: "",
            translation: "",
            imageUrl: "",
          },
        ]}
        isCollocation={false}
        showImageUrl
        courseId="TOEIC"
        coursePath="courses/TOEIC"
        dayId="Day1"
        onWordImageUpdated={onWordImageUpdated}
      />,
    );

    const dropzone = document.querySelector('[data-testid="word-image-dropzone-img-upload-1"]');
    expect(dropzone).not.toBeNull();

    await act(async () => {
      dropFile(dropzone as Element, new File(["image"], "care.png", { type: "image/png" }));
    });

    expect(uploadWordImage).toHaveBeenCalledWith(
      expect.any(File),
      "TOEIC",
      "Day1",
      "img-upload-1",
    );
    expect(updateWordImageUrl).toHaveBeenCalledWith(
      "courses/TOEIC",
      "Day1",
      "img-upload-1",
      "https://example.com/uploaded.png",
    );
    expect(onWordImageUpdated).toHaveBeenCalledWith(
      "img-upload-1",
      "https://example.com/uploaded.png",
    );
    expect(document.querySelector('img[alt="care"]')?.getAttribute("src")).toBe(
      "https://example.com/uploaded.png",
    );
  });

  it("uploads a dropped image for JLPT counter collection image cells", async () => {
    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "counter-1",
            word: "本",
            meaningEnglish: "counter",
            meaningKorean: "개수사",
            pronunciation: "ほん",
            pronunciationRoman: "",
            example: "ペンを三本買った。",
            exampleHurigana: "",
            exampleRoman: "",
            translationEnglish: "",
            translationKorean: "",
            imageUrl: "",
          },
        ]}
        isCollocation={false}
        isJlpt
        showImageUrl
        courseId="JLPT_COUNTER"
        coursePath="courses/JLPT_COUNTER/counter_hon"
      />,
    );

    const dropzone = document.querySelector('[data-testid="word-image-dropzone-counter-1"]');
    expect(dropzone).not.toBeNull();

    await act(async () => {
      dropFile(dropzone as Element, new File(["image"], "counter.webp", { type: "image/webp" }));
    });

    expect(uploadWordImage).toHaveBeenCalledWith(
      expect.any(File),
      "JLPT_COUNTER",
      expect.any(String),
      "counter-1",
    );
    expect(updateCollectionWordImageUrl).toHaveBeenCalledWith(
      "courses/JLPT_COUNTER/counter_hon",
      "counter-1",
      "https://example.com/uploaded.png",
    );
  });
});
