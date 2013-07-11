
var chai = require("chai"),
    chaiAsPromised = require("chai-as-promised"),
    mochaAsPromised = require("mocha-as-promised"),
    when = require("when");

mochaAsPromised();

global.should = chai.should();
chai.use(chaiAsPromised);

global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;

global.fulfilledPromise = when.resolve;
global.rejectedPromise = when.reject;
