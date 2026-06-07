import { describe, expect, it } from "vitest";
import { butlerPageConfigs } from "../butler-page-configs";
import { BUTLER_TASKS } from "../butler-tasks";
import { services } from "../services";

function allSourceText() {
  return JSON.stringify({ butlerPageConfigs, BUTLER_TASKS, services });
}

describe("butler content examples", () => {
  it("uses safer Baby Butler childcare examples", () => {
    const babyText = JSON.stringify({
      config: butlerPageConfigs.baby,
      tasks: BUTLER_TASKS.baby,
      service: services.find((service) => service.id === "baby"),
    });

    expect(babyText).toContain("playdate");
    expect(babyText).toContain("kids party");
    expect(babyText).toContain("Night Nurse");
    expect(babyText).not.toContain("medical appointment");
  });

  it("uses specific Bougie Butler examples without overpromising access", () => {
    const bougieText = JSON.stringify({
      config: butlerPageConfigs.bougie,
      tasks: BUTLER_TASKS.bougie,
      service: services.find((service) => service.id === "bougie"),
    });

    expect(bougieText).toContain("Private jet and private island bookings");
    expect(bougieText).toContain("Personal shopper pick");
    expect(bougieText).toContain("Stand in arrangement at auction house");
  });

  it("does not include removed high-risk or nondescript examples", () => {
    const text = allSourceText();

    expect(text).not.toContain("Luxury lifestyle");
    expect(text).not.toContain("Luxury event organising");
    expect(text).not.toContain("Front-row seats");
    expect(text).not.toContain("sold-out West End");
    expect(text).not.toContain("Private viewing arrangements");
    expect(text).not.toContain("fully-booked Michelin");
    expect(text).not.toContain("high-net-worth clients");
  });
});

describe("Farida 6 Jun task edits", () => {
  it("updates Busy Butler tasks (errands relabel, procurement removed, two added)", () => {
    const labels = BUTLER_TASKS.busy.map((t) => t.label);
    expect(labels).toContain(
      "Business and office errands including photocopying, binding, lamination etc"
    );
    expect(labels).not.toContain("Procurement services");
    expect(labels).toContain("Corporate events");
    expect(labels).toContain("Meeting secretaries and assistants");
  });

  it("updates Baby Butler tasks (relabels and four additions)", () => {
    const labels = BUTLER_TASKS.baby.map((t) => t.label);
    expect(labels).toContain(
      "School plays, sports games, recitals etc attendance for filming"
    );
    expect(labels).not.toContain("School play and recital recording");
    expect(labels).toContain("Kids parties, activities and playdates attendance");
    expect(labels).not.toContain("Kids activity planning");
    expect(labels).toContain("Elderly assistance to appointments and check-ups");
    expect(labels).toContain(
      "Personalised gift packs created and delivered for kids' birthdays"
    );
    expect(labels).toContain("Kids clothing and essentials shopping and errands");
    expect(labels).toContain("Teenager check-ins");
  });

  it("updates Bougie Butler tasks (relabels and three additions)", () => {
    const labels = BUTLER_TASKS.bougie.map((t) => t.label);
    expect(labels).toContain("Personalised gift experiences");
    expect(labels).not.toContain("Personalised gift packages");
    expect(labels).toContain(
      "Personal shopper errands, including multiple items store pick-ups and returns"
    );
    expect(labels).toContain(
      "Night club bookings and table service experiences with attendants"
    );
    expect(labels).toContain(
      "High end and specialist grocery stores shopping and delivery"
    );
    expect(labels).toContain("Wait staff for dinner parties");
    expect(labels).toContain(
      "Travel concierge including packing and unpacking of luggage plus delivery of luggage"
    );
  });

  it("updates Base Butler tasks (pickups + house-waiting relabels, welcome-home added)", () => {
    const labels = BUTLER_TASKS.base.map((t) => t.label);
    expect(labels).toContain("Errands to pick-up and drop-off forgotten items");
    expect(labels).toContain(
      "House waiting and monitoring of external service providers e.g. installations, fumigations, renovations"
    );
    expect(labels).not.toContain("House waiting");
    expect(labels).toContain(
      "Welcome home services: house set up, fridge stocking, cleaners and gardeners coordination"
    );
  });

  it("adds mail redirection to Budget Butler mail task", () => {
    const labels = BUTLER_TASKS.budget.map((t) => t.label);
    expect(labels).toContain(
      "Mail sorting, package collection and mail redirection"
    );
    expect(labels).not.toContain("Mail sorting and package collection");
  });

  it("uses no em dashes in any task label", () => {
    const allLabels = Object.values(BUTLER_TASKS)
      .flat()
      .map((t) => t.label)
      .join(" ");
    expect(allLabels).not.toContain("—");
  });
});
