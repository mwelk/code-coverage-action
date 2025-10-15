const core = require("@actions/core");

const { getShowAnnotations } = require("../input");
const { getPullRequestContext } = require("../lib/github");

const showAnnotations = async (coverageData) => {
  const showAnnotationsInput = getShowAnnotations();
  const pullRequestContext = getPullRequestContext();

  if (showAnnotationsInput && pullRequestContext) {
    core.info("Show annotations feature enabled");

    coverageData.forEach(({ file, lines }) => {
      lines.forEach((line) => {
        if (Array.isArray(line)) {
          core.warning(`Test Coverage missing!`, {
            file,
            startLine: line[0],
            endLine: line[line.length - 1]
          });
        } else {
          core.warning(`Test Coverage missing!`, {
            file,
            startLine: line
          });
        }
      });
    });
  }
};

module.exports = showAnnotations;
