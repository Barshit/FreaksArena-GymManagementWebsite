module.exports = (err, req, res, next) => {
  console.error(err.stack || err);
  res.status(500).send('Internal Server Error');
};
