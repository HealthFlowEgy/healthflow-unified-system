/**
 * Artillery Load Test Processor
 * Custom functions for load testing
 */

module.exports = {
  // Generate random email
  randomEmail: function(context, events, done) {
    context.vars.randomEmail = `user${Math.floor(Math.random() * 10000)}@test.com`;
    return done();
  },

  // Generate random integer
  randomInt: function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Generate random date (next 30 days)
  randomDate: function(context, events, done) {
    const today = new Date();
    const futureDate = new Date(today.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
    context.vars.randomDate = futureDate.toISOString().split('T')[0];
    return done();
  },

  // Generate random time
  randomTime: function(context, events, done) {
    const hours = Math.floor(Math.random() * 8) + 9; // 9 AM to 5 PM
    const minutes = Math.random() < 0.5 ? '00' : '30';
    context.vars.randomTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
    return done();
  },

  // Log response time
  logResponseTime: function(requestParams, response, context, ee, next) {
    console.log(`Response time: ${response.timings.phases.total}ms`);
    return next();
  }
};
