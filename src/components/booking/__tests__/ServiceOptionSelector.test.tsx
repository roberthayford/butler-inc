import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { ServiceOptionSelector } from "../ServiceOptionSelector";

vi.mock("motion/react", () => ({
  motion: {
    button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      children: React.ReactNode;
    }) => <button {...props}>{children}</button>,
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children: React.ReactNode;
    }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("ServiceOptionSelector", () => {
  it("renders task options for a standard butler type", () => {
    const onSelect = vi.fn();
    render(
      <ServiceOptionSelector butlerType="busy" onSelect={onSelect} />
    );

    expect(screen.getByText("Choose a service")).toBeInTheDocument();
    expect(
      screen.getByText("Courier and package services")
    ).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("calls onSelect when a task is clicked", () => {
    const onSelect = vi.fn();
    render(
      <ServiceOptionSelector butlerType="busy" onSelect={onSelect} />
    );

    fireEvent.click(screen.getByText("Courier and package services"));
    expect(onSelect).toHaveBeenCalledWith("courier");
  });

  it("renders bespoke textarea instead of task list", () => {
    const onSelect = vi.fn();
    render(
      <ServiceOptionSelector butlerType="bespoke" onSelect={onSelect} />
    );

    expect(screen.getByText("Describe your request")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        /Describe what you need in as much detail as possible/
      )
    ).toBeInTheDocument();
  });

  it("disables continue button when bespoke textarea is empty", () => {
    const onSelect = vi.fn();
    render(
      <ServiceOptionSelector butlerType="bespoke" onSelect={onSelect} />
    );

    const continueBtn = screen.getByText("Continue");
    expect(continueBtn).toBeDisabled();
  });

  it("enables continue button when bespoke description is entered", () => {
    const onSelect = vi.fn();
    render(
      <ServiceOptionSelector butlerType="bespoke" onSelect={onSelect} />
    );

    const textarea = screen.getByPlaceholderText(/Describe what you need in as much detail as possible/);
    fireEvent.change(textarea, {
      target: { value: "Plan a dinner party" },
    });

    const continueBtn = screen.getByText("Continue");
    expect(continueBtn).not.toBeDisabled();
  });

  it("shows custom description input when 'Other' is selected", () => {
    const onSelect = vi.fn();
    render(
      <ServiceOptionSelector butlerType="busy" onSelect={onSelect} />
    );

    fireEvent.click(screen.getByText("Other"));
    expect(
      screen.getByPlaceholderText("Describe what you need...")
    ).toBeInTheDocument();
  });
});
