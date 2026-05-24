import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import { MemberManager } from "../MemberManager";

const mockUsers = [
  {
    id: "user-1",
    email: "kwasi@example.com",
    name: "Kwasi Hayford",
    membership: {
      id: "mem-1",
      tier_id: "tier-ess",
      personal_hours_total: 15,
      personal_hours_used: 3,
      virtual_tasks_total: 8,
      virtual_tasks_used: 1,
      billing_period_start: "2026-04-01",
      billing_period_end: "2026-04-30",
      status: "active",
      membership_tiers: {
        slug: "frequent",
        name: "Frequent",
      },
    },
  },
  {
    id: "user-2",
    email: "jane@example.com",
    name: "Jane Doe",
    membership: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockUsers),
  });
});

describe("MemberManager", () => {
  it("renders user list with names and emails", async () => {
    render(<MemberManager />);
    expect(await screen.findByText("Kwasi Hayford")).toBeInTheDocument();
    expect(screen.getByText("kwasi@example.com")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("shows tier badge for members", async () => {
    render(<MemberManager />);
    expect(await screen.findByText("Frequent")).toBeInTheDocument();
  });

  it("shows 'No membership' for non-members", async () => {
    render(<MemberManager />);
    expect(await screen.findByText("No membership")).toBeInTheDocument();
  });

  it("expands edit form when Edit is clicked", async () => {
    render(<MemberManager />);
    const editButtons = await screen.findAllByRole("button", { name: /Edit/i });
    fireEvent.click(editButtons[0]);
    expect(await screen.findByText("Tier")).toBeInTheDocument();
    expect(screen.getByLabelText(/Hours Total/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tasks Total/i)).toBeInTheDocument();
  });

  it("shows Create Membership button for non-members", async () => {
    render(<MemberManager />);
    const createButtons = await screen.findAllByRole("button", { name: /Create Membership/i });
    expect(createButtons).toHaveLength(1);
  });
});
