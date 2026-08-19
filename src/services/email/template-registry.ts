import type { EmailTemplateDefinition, EmailTemplateKey } from "./types";
import { getEmailProvider } from "./provider";

function brandLayout(title: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAFAF8; margin: 0; padding: 24px; color: #141B16; }
    .wrapper { max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E3E6E0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .header { padding: 24px 32px; background-color: #141B16; text-align: left; }
    .logo { font-size: 18px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; }
    .logo span { color: #0E8F5D; }
    .body { padding: 32px; font-size: 14px; line-height: 1.6; color: #3A433D; }
    .button { display: inline-block; background-color: #0E8F5D; color: #FFFFFF !important; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 6px; margin: 16px 0; font-size: 14px; }
    .footer { padding: 24px 32px; background-color: #FAFAF8; border-top: 1px solid #E3E6E0; font-size: 12px; color: #7C847E; text-align: center; }
    .code { font-family: monospace; font-size: 18px; font-weight: bold; background: #E7FAF1; color: #0E8F5D; padding: 8px 16px; border-radius: 6px; letter-spacing: 2px; display: inline-block; margin: 12px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">Seller<span>Salt</span></div>
    </div>
    <div class="body">
      ${contentHtml}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} SellerSalt. All rights reserved.</p>
      <p>Need help? Contact our support team at <a href="mailto:support@sellersalt.com" style="color: #0E8F5D;">support@sellersalt.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

export const EMAIL_TEMPLATES: Record<EmailTemplateKey, EmailTemplateDefinition> = {
  EMAIL_VERIFICATION: {
    key: "EMAIL_VERIFICATION",
    name: "Email Verification",
    description: "Sent to new users to verify their email address upon registration.",
    defaultSubject: "Verify your SellerSalt account",
    variables: ["name", "verificationUrl", "expiresInHours"],
    generateHtml: (vars) =>
      brandLayout(
        "Verify your email",
        `<h2 style="margin-top:0; color:#141B16;">Confirm your email address</h2>
         <p>Hi ${vars.name || "there"},</p>
         <p>Thanks for joining SellerSalt. Please click the button below to verify your email address and activate your workspace:</p>
         <div style="text-align: center; margin: 24px 0;">
           <a href="${vars.verificationUrl}" class="button">Verify Email Address →</a>
         </div>
         <p style="font-size: 12px; color: #7C847E;">This verification link will expire in ${vars.expiresInHours || "24"} hours.</p>`
      ),
    generateText: (vars) =>
      `Hi ${vars.name || "there"},\n\nConfirm your SellerSalt email by opening this link: ${vars.verificationUrl}`,
  },

  WELCOME: {
    key: "WELCOME",
    name: "Welcome to SellerSalt",
    description: "Sent after user completes onboarding and verifies their account.",
    defaultSubject: "Welcome to SellerSalt — Let's find your winning products",
    variables: ["name", "dashboardUrl"],
    generateHtml: (vars) =>
      brandLayout(
        "Welcome to SellerSalt",
        `<h2 style="margin-top:0; color:#141B16;">Welcome to SellerSalt! 🎯</h2>
         <p>Hi ${vars.name || "there"},</p>
         <p>Your workspace is ready. Here are three high-leverage workflows to get started today:</p>
         <ol style="padding-left: 20px; line-height: 1.8;">
           <li><strong>Opportunity Radar:</strong> Scan high-demand, low-competition keywords in your niche.</li>
           <li><strong>Market Research:</strong> Audit top-selling Etsy stores and track their daily transaction velocity.</li>
           <li><strong>Personal Assistant:</strong> Ask the assistant copilot to uncover untapped breakout niches.</li>
         </ol>
         <div style="text-align: center; margin: 24px 0;">
           <a href="${vars.dashboardUrl || "https://staging.sellersalt.com/dashboard"}" class="button">Launch Dashboard →</a>
         </div>`
      ),
    generateText: (vars) =>
      `Welcome to SellerSalt, ${vars.name || "there"}!\n\nOpen your dashboard to get started: ${vars.dashboardUrl}`,
  },

  PASSWORD_RESET: {
    key: "PASSWORD_RESET",
    name: "Password Reset Request",
    description: "Sent when a user requests a password reset link.",
    defaultSubject: "Reset your SellerSalt password",
    variables: ["name", "resetUrl", "expiresInHours"],
    generateHtml: (vars) =>
      brandLayout(
        "Reset password",
        `<h2 style="margin-top:0; color:#141B16;">Reset your password</h2>
         <p>Hi ${vars.name || "there"},</p>
         <p>We received a request to reset your SellerSalt password. Click the button below to choose a new password:</p>
         <div style="text-align: center; margin: 24px 0;">
           <a href="${vars.resetUrl}" class="button">Reset Password →</a>
         </div>
         <p style="font-size: 12px; color: #7C847E;">This link expires in ${vars.expiresInHours || "1"} hour. If you didn't request a password reset, you can safely ignore this email.</p>`
      ),
    generateText: (vars) =>
      `Hi ${vars.name || "there"},\n\nReset your password at: ${vars.resetUrl}`,
  },

  PASSWORD_CHANGED: {
    key: "PASSWORD_CHANGED",
    name: "Password Successfully Changed",
    description: "Security notification sent after password is changed.",
    defaultSubject: "Security alert: Your SellerSalt password was updated",
    variables: ["name", "timestamp", "ipAddress"],
    generateHtml: (vars) =>
      brandLayout(
        "Password changed",
        `<h2 style="margin-top:0; color:#141B16;">Your password was updated</h2>
         <p>Hi ${vars.name || "there"},</p>
         <p>This is a confirmation that your SellerSalt account password was changed on <strong>${vars.timestamp || "recently"}</strong>.</p>
         <p style="font-size: 12px; color: #DC2626;">If you did not perform this change, please contact support immediately.</p>`
      ),
    generateText: (vars) =>
      `Your SellerSalt account password was changed. If this wasn't you, contact support immediately.`,
  },

  EMAIL_CHANGED: {
    key: "EMAIL_CHANGED",
    name: "Email Address Updated",
    description: "Security notification sent when login email is updated.",
    defaultSubject: "Security alert: SellerSalt login email updated",
    variables: ["name", "newEmail"],
    generateHtml: (vars) =>
      brandLayout(
        "Email updated",
        `<h2 style="margin-top:0; color:#141B16;">Account email updated</h2>
         <p>Hi ${vars.name || "there"},</p>
         <p>Your primary SellerSalt login email was updated to: <strong>${vars.newEmail}</strong>.</p>`
      ),
    generateText: (vars) =>
      `Your SellerSalt account email was updated to ${vars.newEmail}.`,
  },

  SECURITY_ALERT: {
    key: "SECURITY_ALERT",
    name: "Account Security Alert",
    description: "Sent on unusual login or account activity.",
    defaultSubject: "SellerSalt Security Alert",
    variables: ["name", "activity", "location"],
    generateHtml: (vars) =>
      brandLayout(
        "Security Alert",
        `<h2 style="margin-top:0; color:#DC2626;">Security Alert</h2>
         <p>Hi ${vars.name || "there"},</p>
         <p>We detected the following activity on your account: <strong>${vars.activity}</strong> (${vars.location || "Unknown location"}).</p>`
      ),
    generateText: (vars) => `Security Alert: ${vars.activity}`,
  },

  TEAM_INVITATION: {
    key: "TEAM_INVITATION",
    name: "Team Workspace Invitation",
    description: "Sent when an admin invites a team member to join their workspace.",
    defaultSubject: "You've been invited to join a SellerSalt workspace",
    variables: ["inviterName", "workspaceName", "role", "inviteUrl"],
    generateHtml: (vars) =>
      brandLayout(
        "Team Invitation",
        `<h2 style="margin-top:0; color:#141B16;">Workspace Invitation</h2>
         <p><strong>${vars.inviterName || "A team member"}</strong> has invited you to collaborate on the <strong>${vars.workspaceName}</strong> workspace as a <strong>${vars.role || "Member"}</strong>.</p>
         <div style="text-align: center; margin: 24px 0;">
           <a href="${vars.inviteUrl}" class="button">Accept Invitation →</a>
         </div>`
      ),
    generateText: (vars) =>
      `You were invited to join ${vars.workspaceName}. Accept here: ${vars.inviteUrl}`,
  },

  SUBSCRIPTION_STARTED: {
    key: "SUBSCRIPTION_STARTED",
    name: "Subscription Started",
    description: "Sent when recurring subscription becomes active.",
    defaultSubject: "Welcome to SellerSalt Pro!",
    variables: ["name", "planName", "billingPeriodEnd"],
    generateHtml: (vars) =>
      brandLayout(
        "Subscription Active",
        `<h2 style="margin-top:0; color:#141B16;">Your subscription is active! 🚀</h2>
         <p>Hi ${vars.name || "there"},</p>
         <p>Thank you for subscribing to <strong>${vars.planName || "SellerSalt Pro"}</strong>. You now have full access to Opportunity Radar, Market Research, and the AI Assistant.</p>`
      ),
    generateText: (vars) => `Your subscription to ${vars.planName} is active!`,
  },

  TRIAL_STARTED: {
    key: "TRIAL_STARTED",
    name: "Trial Activated",
    description: "Sent when a plan's trial period starts (if the plan includes one).",
    defaultSubject: "Your SellerSalt trial is live!",
    variables: ["name", "trialDays", "renewalDate", "priceUsd"],
    generateHtml: (vars) =>
      brandLayout(
        "Trial Activated",
        `<h2 style="margin-top:0; color:#141B16;">Your Trial is Live! 🌟</h2>
         <p>Hi ${vars.name || "there"},</p>
         <p>Your ${vars.trialDays ? `${vars.trialDays}-day` : ""} trial is now active. Explore all features without limits.</p>`
      ),
    generateText: (vars) => `Your trial is active!`,
  },

  PAYMENT_SUCCESSFUL: {
    key: "PAYMENT_SUCCESSFUL",
    name: "Payment Receipt",
    description: "Sent when an invoice or subscription renewal succeeds.",
    defaultSubject: "Receipt for your SellerSalt payment",
    variables: ["name", "amount", "invoiceUrl"],
    generateHtml: (vars) =>
      brandLayout(
        "Payment Receipt",
        `<h2 style="margin-top:0; color:#141B16;">Payment Receipt</h2>
         <p>Hi ${vars.name || "there"},</p>
         <p>We received your payment of <strong>${vars.amount}</strong>. Thank you for your continued business!</p>`
      ),
    generateText: (vars) => `Receipt: Payment of ${vars.amount} received.`,
  },

  PAYMENT_FAILED: {
    key: "PAYMENT_FAILED",
    name: "Payment Failed",
    description: "Sent when a recurring payment cannot be collected.",
    defaultSubject: "Action required: Payment failed for SellerSalt",
    variables: ["name", "billingUrl"],
    generateHtml: (vars) =>
      brandLayout(
        "Payment Failed",
        `<h2 style="margin-top:0; color:#DC2626;">Payment Failed</h2>
         <p>Hi ${vars.name || "there"},</p>
         <p>We were unable to process your recent subscription renewal payment. Please update your billing details to maintain uninterrupted access.</p>
         <div style="text-align: center; margin: 24px 0;">
           <a href="${vars.billingUrl || "https://staging.sellersalt.com/settings/billing"}" class="button">Update Payment Method →</a>
         </div>`
      ),
    generateText: (vars) => `Payment failed. Please update your billing details.`,
  },

  SUBSCRIPTION_CANCELLED: {
    key: "SUBSCRIPTION_CANCELLED",
    name: "Subscription Cancelled",
    description: "Sent when a user cancels their subscription.",
    defaultSubject: "Confirmation: SellerSalt subscription cancelled",
    variables: ["name", "accessUntilDate"],
    generateHtml: (vars) =>
      brandLayout(
        "Subscription Cancelled",
        `<h2 style="margin-top:0; color:#141B16;">Subscription Cancelled</h2>
         <p>Hi ${vars.name || "there"},</p>
         <p>Your subscription has been cancelled. You will retain access to your plan features until <strong>${vars.accessUntilDate || "the end of your current billing period"}</strong>.</p>`
      ),
    generateText: (vars) => `Your subscription was cancelled. Access active until ${vars.accessUntilDate}.`,
  },

  SUBSCRIPTION_RESUMED: {
    key: "SUBSCRIPTION_RESUMED",
    name: "Subscription Resumed",
    description: "Sent when a user un-cancels/resumes their plan.",
    defaultSubject: "Your SellerSalt subscription is back!",
    variables: ["name", "planName"],
    generateHtml: (vars) =>
      brandLayout(
        "Subscription Resumed",
        `<h2 style="margin-top:0; color:#141B16;">Welcome Back!</h2>
         <p>Hi ${vars.name || "there"},</p>
         <p>Your ${vars.planName || "SellerSalt"} subscription has been resumed successfully.</p>`
      ),
    generateText: (vars) => `Subscription resumed.`,
  },

  ETSY_CONNECTED: {
    key: "ETSY_CONNECTED",
    name: "Etsy Shop Connected",
    description: "Sent after successfully connecting an Etsy seller store.",
    defaultSubject: "Etsy store connected to SellerSalt",
    variables: ["name", "shopName", "analyticsUrl"],
    generateHtml: (vars) =>
      brandLayout(
        "Etsy Connected",
        `<h2 style="margin-top:0; color:#141B16;">Etsy Shop Connected 🎉</h2>
         <p>Hi ${vars.name || "there"},</p>
         <p>Your store <strong>${vars.shopName}</strong> is now synced with SellerSalt. Live analytics and sales velocity tracking are unlocked!</p>
         <div style="text-align: center; margin: 24px 0;">
           <a href="${vars.analyticsUrl || "https://staging.sellersalt.com/analytics"}" class="button">View Store Analytics →</a>
         </div>`
      ),
    generateText: (vars) => `Etsy store ${vars.shopName} is connected!`,
  },

  ETSY_DISCONNECTED: {
    key: "ETSY_DISCONNECTED",
    name: "Etsy Shop Disconnected",
    description: "Sent when an Etsy seller store is disconnected or token expires.",
    defaultSubject: "Etsy store disconnected from SellerSalt",
    variables: ["name", "shopName", "reconnectUrl"],
    generateHtml: (vars) =>
      brandLayout(
        "Etsy Disconnected",
        `<h2 style="margin-top:0; color:#141B16;">Etsy Shop Disconnected</h2>
         <p>Hi ${vars.name || "there"},</p>
         <p>Your Etsy store <strong>${vars.shopName}</strong> has been disconnected or its authorization has expired.</p>
         <div style="text-align: center; margin: 24px 0;">
           <a href="${vars.reconnectUrl || "https://staging.sellersalt.com/settings/channels"}" class="button">Reconnect Etsy Shop →</a>
         </div>`
      ),
    generateText: (vars) => `Etsy store ${vars.shopName} was disconnected.`,
  },
};

export async function sendLifecycleEmail(
  templateKey: EmailTemplateKey,
  to: string,
  variables: Record<string, string>
) {
  const template = EMAIL_TEMPLATES[templateKey];
  if (!template) throw new Error(`Unknown email template "${templateKey}"`);

  const provider = getEmailProvider();
  return provider.send({
    to,
    subject: template.defaultSubject,
    html: template.generateHtml(variables),
    text: template.generateText(variables),
  });
}
