// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ParenthesesForm from "./ParenthesesForm";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function renderForm(element: ReactElement) {
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

function createForm() {
  return (
    <ParenthesesForm
      apiPath="/api/text/test"
      submitLabel="Submit"
      loadingLabel="Loading"
      resetLabel="Reset"
      inputLabel="Input"
      outputLabel="Output"
      inputRequiredMsg="Input is required"
      networkErrorMsg="Network error"
    />
  );
}

function createFormWithOption() {
  return (
    <ParenthesesForm
      apiPath="/api/text/test"
      submitLabel="Submit"
      loadingLabel="Loading"
      resetLabel="Reset"
      inputLabel="Input"
      outputLabel="Output"
      inputRequiredMsg="Input is required"
      networkErrorMsg="Network error"
      checkboxOptions={[
        {
          key: "remove_brackets",
          label: "Remove brackets at the same time.",
          defaultValue: true,
          buildPayload: (checked) => ({ remove_brackets: checked }),
        },
      ]}
    />
  );
}

function createFormWithHiraganaModeOption() {
  return (
    <ParenthesesForm
      apiPath="/api/text/test"
      submitLabel="Submit"
      loadingLabel="Loading"
      resetLabel="Reset"
      inputLabel="Input"
      outputLabel="Output"
      inputRequiredMsg="Input is required"
      networkErrorMsg="Network error"
      checkboxOptions={[
        {
          key: "hiragana_only",
          label: "Hiragana only",
          defaultValue: false,
          buildPayload: (checked) =>
            checked ? { mode: "hiragana_only" } : {},
        },
      ]}
    />
  );
}

function getTextareas() {
  const textareas = Array.from(document.querySelectorAll("textarea")).filter(
    (textarea) => textarea.getAttribute("aria-hidden") !== "true",
  );
  expect(textareas).toHaveLength(2);

  return {
    input: textareas[0],
    output: textareas[1],
  };
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;

  expect(setter).toBeTypeOf("function");

  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

async function submitForm() {
  const submitButton = Array.from(document.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Submit"),
  );

  expect(submitButton).not.toBeUndefined();

  await act(async () => {
    submitButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function clickButton(label: string) {
  const button = Array.from(document.querySelectorAll("button")).find((node) =>
    node.textContent?.includes(label),
  );

  expect(button).not.toBeUndefined();

  act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function getCheckbox(label: string) {
  const labels = Array.from(document.querySelectorAll("label"));
  const controlLabel = labels.find((node) => node.textContent?.includes(label));
  const checkbox = controlLabel?.querySelector('input[type="checkbox"]');

  expect(checkbox).not.toBeNull();

  return checkbox as HTMLInputElement;
}

describe("ParenthesesForm", () => {
  let rendered: ReturnType<typeof renderForm> | null = null;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  afterEach(() => {
    rendered?.unmount();
    rendered = null;
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders result_text responses in the output field", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ result_text: "cat" }),
    });

    rendered = renderForm(createForm());
    const { input, output } = getTextareas();

    act(() => {
      setTextareaValue(input, "cat");
    });

    await submitForm();

    expect(fetchMock).toHaveBeenCalledWith("/api/text/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "cat" }),
    });
    expect(output.value).toBe("cat");
  });

  it("falls back to romanized_text responses in the output field", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ romanized_text: "konnichiha" }),
    });

    rendered = renderForm(createForm());
    const { input, output } = getTextareas();

    act(() => {
      setTextareaValue(input, "こんにちは");
    });

    await submitForm();

    expect(output.value).toBe("konnichiha");
  });

  it("keeps the output empty when the response has no supported text field", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ original_text: "hello" }),
    });

    rendered = renderForm(createForm());
    const { input, output } = getTextareas();

    act(() => {
      setTextareaValue(input, "hello");
    });

    await submitForm();

    expect(output.value).toBe("");
    const copyButton = Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Copy"),
    );
    expect(copyButton).toHaveProperty("disabled", true);
  });

  it("shows the existing network error when the response is not ok", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ detail: "boom" }),
    });

    rendered = renderForm(createForm());
    const { input, output } = getTextareas();

    act(() => {
      setTextareaValue(input, "hello");
    });

    await submitForm();

    expect(output.value).toBe("");
    expect(document.body.textContent).toContain("Network error");
  });

  it("submits the default true option value when configured", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ result_text: "cat" }),
    });

    rendered = renderForm(createFormWithOption());
    const { input } = getTextareas();

    act(() => {
      setTextareaValue(input, "cat");
    });

    await submitForm();

    expect(fetchMock).toHaveBeenCalledWith("/api/text/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "cat", remove_brackets: true }),
    });
  });

  it("submits false when the configured option is unchecked", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ result_text: "cat" }),
    });

    rendered = renderForm(createFormWithOption());
    const { input } = getTextareas();
    const checkbox = getCheckbox("Remove brackets at the same time.");

    act(() => {
      checkbox.click();
      setTextareaValue(input, "cat");
    });

    await submitForm();

    expect(fetchMock).toHaveBeenCalledWith("/api/text/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "cat", remove_brackets: false }),
    });
  });

  it("restores the configured option default on reset", async () => {
    rendered = renderForm(createFormWithOption());
    const checkbox = getCheckbox("Remove brackets at the same time.");

    expect(checkbox.checked).toBe(true);

    act(() => {
      checkbox.click();
    });

    expect(checkbox.checked).toBe(false);

    clickButton("Reset");

    expect(checkbox.checked).toBe(true);
  });

  it("omits mode when the hiragana-only option is left unchecked", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ result_text: "ねこ" }),
    });

    rendered = renderForm(createFormWithHiraganaModeOption());
    const { input } = getTextareas();

    act(() => {
      setTextareaValue(input, "猫");
    });

    await submitForm();

    expect(fetchMock).toHaveBeenCalledWith("/api/text/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "猫" }),
    });
  });

  it("adds hiragana_only mode when the option is checked", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ result_text: "ねこ" }),
    });

    rendered = renderForm(createFormWithHiraganaModeOption());
    const { input } = getTextareas();
    const checkbox = getCheckbox("Hiragana only");

    act(() => {
      checkbox.click();
      setTextareaValue(input, "猫");
    });

    await submitForm();

    expect(fetchMock).toHaveBeenCalledWith("/api/text/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "猫", mode: "hiragana_only" }),
    });
  });

  it("restores the hiragana-only option default on reset", async () => {
    rendered = renderForm(createFormWithHiraganaModeOption());
    const checkbox = getCheckbox("Hiragana only");

    expect(checkbox.checked).toBe(false);

    act(() => {
      checkbox.click();
    });

    expect(checkbox.checked).toBe(true);

    clickButton("Reset");

    expect(checkbox.checked).toBe(false);
  });
});
