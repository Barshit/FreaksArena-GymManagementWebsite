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

await sendEnquiryEmail(enquiry);

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully.',
      enquiry,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Something went wrong.',
    });
  }
};

module.exports = {
  createEnquiry,
};