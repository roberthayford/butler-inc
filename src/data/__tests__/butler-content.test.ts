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
