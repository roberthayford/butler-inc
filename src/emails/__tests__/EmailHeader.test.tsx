import { describe, it, expect } from "vitest"
import { render } from "@react-email/components"
import { EmailHeader } from "../components/EmailHeader"

describe("EmailHeader", () => {
  it("renders 'Butlers Inc.' as text instead of an image", async () => {
    const html = await render(<EmailHeader />)
    expect(html).toContain("Butlers Inc.")
    expect(html).not.toContain("<img")
    expect(html).not.toContain("butlers-inc-logo")
  })

  it("renders the tagline", async () => {
    const html = await render(<EmailHeader />)
    expect(html).toContain("Life, handled.")
  })
})
