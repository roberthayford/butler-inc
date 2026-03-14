# Reset Password - Text Logo Version

Supabase Auth email template for password reset. Uses a text-based "Butlers Inc." logo.

**Supabase location:** Authentication > Email Templates > Reset password

## HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #262F3D; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #262F3D;">
    <tr>
      <td align="center" style="padding: 48px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <span style="font-family: 'Georgia', 'Times New Roman', serif; font-size: 28px; font-weight: 700; color: #FDFDFD; letter-spacing: 0.025em;">
                Butlers Inc.
              </span>
            </td>
          </tr>

          <!-- Brass Divider -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <div style="width: 48px; height: 1px; background-color: #B3895D;"></div>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td style="background-color: #FCFBF9; border-radius: 4px; padding: 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

                <!-- Heading -->
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <h1 style="margin: 0; font-family: 'Georgia', 'Times New Roman', serif; font-size: 24px; font-weight: 500; color: #262F3D; letter-spacing: 0.025em;">
                      Reset Your Password
                    </h1>
                  </td>
                </tr>

                <!-- Body Text -->
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #6B7280;">
                      We received a request to reset your password. Click the button below to choose a new one.
                    </p>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color: #B3895D; border-radius: 4px;">
                          <a href="{{ .ConfirmationURL }}"
                             target="_blank"
                             style="display: inline-block; padding: 14px 32px; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: 500; color: #262F3D; text-decoration: none;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Fallback Link -->
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-size: 12px; line-height: 1.6; color: #9E9893;">
                      If the button doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="margin: 8px 0 0 0; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-size: 12px; line-height: 1.6; word-break: break-all;">
                      <a href="{{ .ConfirmationURL }}" style="color: #C4985F; text-decoration: underline;">{{ .ConfirmationURL }}</a>
                    </p>
                  </td>
                </tr>

                <!-- Safety Note -->
                <tr>
                  <td align="center" style="padding-top: 24px;">
                    <p style="margin: 0; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-size: 12px; line-height: 1.6; color: #9E9893;">
                      If you didn't request this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin: 0; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #9E9893; line-height: 1.6;">
                Questions? Email us at
                <a href="mailto:bookings@butlersinc.com" style="color: #C4985F; text-decoration: none;">bookings@butlersinc.com</a>
              </p>
              <p style="margin: 8px 0 0 0; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #6B7280;">
                Butlers Inc. &mdash; Premium Concierge Services
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```
