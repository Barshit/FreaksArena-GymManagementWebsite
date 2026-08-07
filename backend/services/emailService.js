const nodemailer = require('nodemailer');


const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: '74.125.69.109', // Gmail SMTP IPv4
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    servername: 'smtp.gmail.com',
  },
});
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter error:', error);
  } else {
    console.log('Email service is ready.');
  }
});
async function sendEnquiryEmail(enquiry) {
  const mailOptions = {
    from: `"Freaks Arena Website" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `New Enquiry from ${enquiry.name}`,
    html: `
      <h2>New Gym Enquiry</h2>

      <p><strong>Name:</strong> ${enquiry.name}</p>
      <p><strong>Email:</strong> ${enquiry.email}</p>
      <p><strong>Phone:</strong> ${enquiry.phone}</p>
      <p><strong>Fitness Goal:</strong> ${enquiry.goal}</p>
      <p><strong>Interested Plan:</strong> ${enquiry.plan}</p>

      <p><strong>Message:</strong></p>
      <p>${enquiry.message || 'No message provided.'}</p>

      <hr>

      <small>
        This enquiry was submitted from the Freaks Arena website.
      </small>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendEnquiryEmail,
};