var serverParameters = {};

process
    .argv
    .slice(2)
    .forEach((val, index) => { serverParameters[val.split("=")[0]] = val.split("=")[1]; });

module.exports = serverParameters;