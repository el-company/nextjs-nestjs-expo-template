import mjml2html from "mjml";

interface EmailVerificationData {
  code: string;
  name?: string | null;
  expiresInMinutes: number;
}

export function renderEmailVerificationTemplate(
  data: EmailVerificationData
): string {
  const greeting = data.name ? `Hi ${data.name},` : "Hi there,";
  const expiry = data.expiresInMinutes;

  const mjmlTemplate = `
    <mjml>
      <mj-head>
        <mj-font
          name="Inter"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
        <mj-attributes>
          <mj-all font-family="Inter, -apple-system, 'Helvetica Neue', Arial, sans-serif" />
        </mj-attributes>
      </mj-head>
      <mj-body background-color="#f4f4f5">

        <!-- Brand -->
        <mj-section padding="40px 0 0" background-color="#f4f4f5">
          <mj-column>
            <mj-text
              align="center"
              font-size="17px"
              font-weight="700"
              color="#09090b"
              letter-spacing="-0.3px"
            >
              YourApp
            </mj-text>
          </mj-column>
        </mj-section>

        <!-- Card -->
        <mj-section padding="16px 24px 40px" background-color="#f4f4f5">
          <mj-column
            background-color="#ffffff"
            border-radius="8px"
            padding="0"
            border="1px solid #e4e4e7"
          >
            <!-- Heading -->
            <mj-text
              padding="40px 40px 8px"
              align="center"
              font-size="22px"
              font-weight="700"
              color="#09090b"
              line-height="30px"
            >
              Verify your email address
            </mj-text>

            <!-- Description -->
            <mj-text
              padding="0 40px 32px"
              align="center"
              font-size="15px"
              color="#71717a"
              line-height="24px"
            >
              ${greeting} enter the 6-digit code below to verify your email address.
            </mj-text>

            <!-- Code box -->
            <mj-text padding="0 40px 8px" align="center">
              <div style="background-color:#f4f4f5;border-radius:8px;padding:20px 24px;display:inline-block;width:100%;box-sizing:border-box;">
                <span style="font-size:42px;font-weight:700;color:#09090b;letter-spacing:10px;font-family:monospace,'Courier New',Courier;">${data.code}</span>
              </div>
            </mj-text>

            <!-- Expiry -->
            <mj-text
              padding="16px 40px 40px"
              align="center"
              font-size="13px"
              color="#a1a1aa"
              line-height="20px"
            >
              This code expires in ${expiry} minutes.<br/>
              If you didn&#39;t create an account, you can safely ignore this email.
            </mj-text>
          </mj-column>
        </mj-section>

        <!-- Footer -->
        <mj-section padding="0 0 32px" background-color="#f4f4f5">
          <mj-column>
            <mj-text align="center" font-size="12px" color="#a1a1aa">
              &copy; 2025 YourApp. All rights reserved.
            </mj-text>
          </mj-column>
        </mj-section>

      </mj-body>
    </mjml>
  `;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const result = mjml2html(mjmlTemplate, { validationLevel: "skip" }) as {
    html: string;
    errors: unknown[];
  };
  return result.html;
}

export function emailVerificationPlainText(data: EmailVerificationData): string {
  const greeting = data.name ? `Hi ${data.name},` : "Hi there,";
  return [
    "Verify your email address",
    "",
    greeting,
    "Enter the code below to verify your email address:",
    "",
    `  ${data.code}`,
    "",
    `This code expires in ${data.expiresInMinutes} minutes.`,
    "If you didn't create an account, you can safely ignore this email.",
  ].join("\n");
}
