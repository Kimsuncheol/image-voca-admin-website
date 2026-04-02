// @vitest-environment jsdom

import {
  act,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { persistMangaUploadBatchMock } = vi.hoisted(() => ({
  persistMangaUploadBatchMock: vi.fn(),
}));

vi.mock("@/lib/mangaUpload", () => ({
  persistMangaUploadBatch: persistMangaUploadBatchMock,
}));

import MangaNoAiUploadModal from "./MangaNoAiUploadModal";

let latestDayChange:
  | ((event: { target: { value: string } }) => void)
  | undefined;

vi.mock("@mui/material/Dialog", () => ({
  default: ({
    open,
    children,
  }: {
    open: boolean;
    children: ReactNode;
  }) => (open ? <div data-testid="mock-dialog">{children}</div> : null),
}));

vi.mock("@mui/material/Button", () => ({
  default: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@mui/material/IconButton", () => ({
  default: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@mui/material/TextField", () => ({
  default: ({
    value,
    onChange,
    placeholder,
    slotProps,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
    slotProps?: { htmlInput?: Record<string, string> };
  }) => {
    latestDayChange = onChange;

    return (
      <input
        value={value ?? ""}
        onChange={(event) => onChange?.({ target: { value: event.target.value } })}
        placeholder={placeholder}
        aria-label={slotProps?.htmlInput?.["aria-label"] ?? "text-field"}
      />
    );
  },
}));

vi.mock("react-dropzone", () => ({
  useDropzone: ({ onDrop }: { onDrop: (files: File[]) => void }) => ({
    getRootProps: () => ({ "data-testid": "mock-dropzone-root" }),
    getInputProps: () => ({
      type: "file",
      multiple: true,
      onChange: (event: Event) => {
        const target = event.target as HTMLInputElement;
        onDrop(Array.from(target.files ?? []));
      },
    }),
    isDragActive: false,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

function renderComponent(element: ReactElement) {
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

function clickByText(label: string) {
  const node = Array.from(
    document.querySelectorAll('[role="button"], button, .MuiChip-root'),
  ).find((candidate) => candidate.textContent?.includes(label));

  expect(node).not.toBeUndefined();

  act(() => {
    node?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function selectFiles(files: File[]) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
  expect(input).not.toBeNull();

  Object.defineProperty(input, "files", {
    configurable: true,
    value: files,
  });

  act(() => {
    input?.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function typeDay(value: string) {
  expect(latestDayChange).toBeTypeOf("function");

  act(() => {
    latestDayChange?.({ target: { value } });
  });

  return document.querySelector('input[aria-label="Day"]') as HTMLInputElement;
}

describe("MangaNoAiUploadModal", () => {
  let rendered: ReturnType<typeof renderComponent> | null = null;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn((file: File) => `blob:${file.name}`),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    persistMangaUploadBatchMock.mockReset();
    persistMangaUploadBatchMock.mockResolvedValue([]);
  });

  afterEach(() => {
    rendered?.unmount();
    rendered = null;
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    latestDayChange = undefined;
    vi.clearAllMocks();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectUrl,
    });
  });

  it("renders compact previews, removes one image, and clears all previews", () => {
    rendered = renderComponent(<MangaNoAiUploadModal open onClose={() => {}} />);

    selectFiles([
      new File(["panel-1"], "panel-1.png", { type: "image/png" }),
      new File(["panel-2"], "panel-2.png", { type: "image/png" }),
    ]);

    expect(document.body.textContent).toContain("panel-1.png");
    expect(document.body.textContent).toContain("panel-2.png");

    const removeButton = document.querySelector(
      'button[aria-label="Remove panel-1.png"]',
    ) as HTMLButtonElement | null;
    expect(removeButton).not.toBeNull();

    act(() => {
      removeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).not.toContain("panel-1.png");
    expect(document.body.textContent).toContain("panel-2.png");

    clickByText("Clear all");

    expect(document.body.textContent).toContain("No images selected yet.");
    expect(document.body.textContent).not.toContain("panel-2.png");
  });

  it("requires a JLPT level chip before JLPT batches can submit, then persists and resets after success", async () => {
    const onClose = vi.fn();

    rendered = renderComponent(<MangaNoAiUploadModal open onClose={onClose} />);

    const primaryAction = Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Upload without AI"),
    ) as HTMLButtonElement | undefined;

    expect(primaryAction).not.toBeUndefined();
    expect(primaryAction?.disabled).toBe(true);

    selectFiles([new File(["panel"], "panel-3.png", { type: "image/png" })]);
    clickByText("JLPT");

    typeDay("day-12a");
    expect(primaryAction?.disabled).toBe(true);

    clickByText("N3");
    expect(primaryAction?.disabled).toBe(false);

    await act(async () => {
      primaryAction?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(persistMangaUploadBatchMock).toHaveBeenCalledWith({
      files: [expect.objectContaining({ name: "panel-3.png" })],
      courseId: "JLPT",
      jlptLevel: "N3",
      day: 12,
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    expect(document.body.textContent).toContain("No images selected yet.");
    expect(
      (document.querySelector('input[aria-label="Day"]') as HTMLInputElement | null)?.value,
    ).toBe("");
    const reopenedPrimary = Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Upload without AI"),
    ) as HTMLButtonElement | undefined;
    expect(reopenedPrimary?.disabled).toBe(true);
  });

  it("keeps the modal open and shows the upload error when persistence fails", async () => {
    const onClose = vi.fn();
    persistMangaUploadBatchMock.mockRejectedValueOnce(new Error("Upload failed."));

    rendered = renderComponent(<MangaNoAiUploadModal open onClose={onClose} />);

    selectFiles([new File(["panel"], "panel-4.png", { type: "image/png" })]);
    clickByText("CSAT");
    typeDay("7");

    const primaryAction = Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Upload without AI"),
    ) as HTMLButtonElement | undefined;

    expect(primaryAction?.disabled).toBe(false);

    await act(async () => {
      primaryAction?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Upload failed.");
    expect(document.body.textContent).toContain("panel-4.png");
    expect(document.body.textContent).toContain("Upload manga (no AI)");
  });
});
