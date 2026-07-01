import sgMail from '@sendgrid/mail';
import { render } from '@react-email/render';
import React from 'react';

// Setup API Key if available
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'quynhldhe171568@fpt.edu.vn';

interface EmailPayload {
  to: string;
  subject: string;
  reactElement: React.ReactElement;
}

export const sendEmail = async ({ to, subject, reactElement }: EmailPayload) => {
  if (!apiKey) {
    console.error('SENDGRID_API_KEY is not set');
    throw new Error('SENDGRID_API_KEY is not set');
  }

  try {
    const html = await render(reactElement);

    const msg = {
      to,
      from: {
        email: FROM_EMAIL,
        name: 'Công ty Chấm công HRNS'
      },
      replyTo: {
        email: FROM_EMAIL, // Đảm bảo email phản hồi là hợp lệ giúp chống spam
        name: 'Công ty Chấm công HRNS'
      },
      subject,
      html,
    };

    const response = await sgMail.send(msg);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending email:', error);
    // Log detailed sendgrid errors
    if (error && typeof error === 'object' && 'response' in error) {
      console.error((error as { response?: { body?: unknown } }).response?.body);
    }
    throw error;
  }
};
