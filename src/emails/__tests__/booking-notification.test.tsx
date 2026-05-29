import { describe, it, expect } from "vitest"
import { render } from "@react-email/components"
import { BookingNotificationEmail } from "../booking-notification"
import type { BookingEmailProps } from "../types"

const baseProps: BookingEmailProps = {
  reference: "BT-TEST1",
  butlerType: "Lifestyle",
  serviceOption: "Personal Shopping",
  dayOption: "nextDay",
  timeSlot: "morning",
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "+44 7700 900123",
  notes: null,
  formattedDate: "Thursday, 26 March 2026",
  priceLabel: "from £55/hr",
  timeSlotLabel: "Morning (7:00 - 11:59)",
}

const genieProps: BookingEmailProps = {
  ...baseProps,
  butlerType: "bespoke",
  serviceOption: "genie",
  notes: "Source a sold-out designer handbag before the weekend",
}

describe("BookingNotificationEmail", () => {
  describe("regular booking", () => {
    it("shows 'New Booking' badge", async () => {
      const html = await render(<BookingNotificationEmail {...baseProps} />)
      expect(html).toContain("New Booking")
      expect(html).not.toContain("URGENT")
    })

    it("shows 'New Booking Request' heading", async () => {
      const html = await render(<BookingNotificationEmail {...baseProps} />)
      expect(html).toContain("New Booking Request")
    })

    it("formats butler names in title case", async () => {
      const html = await render(
        <BookingNotificationEmail {...baseProps} butlerType="busy" />
      )
      expect(html).toContain("Busy Butler")
      expect(html).not.toContain("busy Butler")
    })
  })

  describe("genie booking", () => {
    it("shows urgent badge instead of regular badge", async () => {
      const html = await render(<BookingNotificationEmail {...genieProps} />)
      expect(html).toContain("URGENT")
      expect(html).toContain("Genie Request")
    })

    it("shows 'Urgent Genie Request' heading", async () => {
      const html = await render(<BookingNotificationEmail {...genieProps} />)
      expect(html).toContain("Urgent Genie Request")
      expect(html).not.toContain("New Booking Request")
    })

    it("displays the wish text in a callout", async () => {
      const html = await render(<BookingNotificationEmail {...genieProps} />)
      expect(html).toContain("Source a sold-out designer handbag before the weekend")
    })

    it("uses red/amber badge color", async () => {
      const html = await render(<BookingNotificationEmail {...genieProps} />)
      expect(html).toContain("#CC3333")
    })
  })
})
