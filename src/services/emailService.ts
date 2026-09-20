/**
 * Dual Email Service (EmailJS + Resend)
 * Sends OTP emails to ANY recipient using EmailJS (no domain required)
 * with automatic fallback to Resend API.
 */

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = import.meta.env.VITE_RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export interface SendOtpResult {
  success: boolean;
  provider?: 'emailjs' | 'resend';
  messageId?: string;
  error?: string;
}

export const emailService = {
  /**
   * Dispatches a 6-digit OTP verification email to ANY recipient.
   */
  async sendOtpEmail(toEmail: string, username: string, otpCode: string): Promise<SendOtpResult> {
    console.log(`[EmailService] Attempting to send OTP (${otpCode}) to ${toEmail}...`);

    // 1. Primary Method: EmailJS (Sends to ANY email address with 0 domain restrictions)
    if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
      try {
        console.log('[EmailService] Dispatching via EmailJS...');
        const emailJsResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: {
              to_email: toEmail,
              user_name: username,
              otp_code: otpCode,
              name: 'Smart Home Security'
            }
          })
        });

        if (emailJsResponse.ok) {
          console.log('[EmailService] 🟢 OTP Email successfully delivered via EmailJS to:', toEmail);
          return {
            success: true,
            provider: 'emailjs'
          };
        } else {
          const errText = await emailJsResponse.text();
          console.warn(`[EmailService] EmailJS response status ${emailJsResponse.status}:`, errText);
        }
      } catch (err: any) {
        console.warn('[EmailService] EmailJS dispatch error, attempting fallback:', err);
      }
    }

    // 2. Secondary Method: Resend API
    try {
      console.log('[EmailService] Dispatching via Resend fallback...');
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `Smart Home <${RESEND_FROM_EMAIL}>`,
          to: [toEmail],
          subject: `Your Smart Home Verification Code: ${otpCode}`,
          html: `<p>Hello <strong>${username}</strong>,</p><p>Your verification code is: <strong>${otpCode}</strong></p>`
        })
      });

      const resendData = await resendResponse.json().catch(() => ({}));

      if (resendResponse.ok && resendData.id) {
        console.log('[EmailService] 🟢 OTP Email successfully delivered via Resend to:', toEmail);
        return {
          success: true,
          provider: 'resend',
          messageId: resendData.id
        };
      } else {
        return {
          success: false,
          error: resendData.message || `Resend Error: ${resendResponse.status}`
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error communicating with Email API'
      };
    }
  }
};
