const Enquiry = require('../models/enquiry');
const { sendEnquiryEmail } = require('../services/emailService');

const createEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.create({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      goal: req.body.goal,
      plan: req.body.plan,
      message: req.body.message,
    });

    try {
      await sendEnquiryEmail(enquiry);
      console.log("✅ Enquiry email sent.");
    } catch (emailError) {
      console.error("❌ Email sending failed:", emailError);
      // Don't stop the request if email fails
    }

    res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully.",
      enquiry,
    });

  } catch (error) {
    console.error("Database error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};

module.exports = {
  createEnquiry,
};