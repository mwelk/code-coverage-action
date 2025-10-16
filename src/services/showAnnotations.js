const core = require("@actions/core");

const { getShowAnnotations } = require("../input");
const { getPullRequestContext } = require("../lib/github");

const MAX_ANNOTATIONS = 10;

function processAnnotations(coverageData) {
  let annotationCount = 0;
  const allMissingCoverage = [];

  coverageData.forEach(({ file, lines }) => {
    lines.forEach((line) => {
      const lineInfo = Array.isArray(line)
        ? { file, startLine: line[0], endLine: line[line.length - 1] }
        : { file, startLine: line };

      allMissingCoverage.push(lineInfo);

      if (annotationCount < MAX_ANNOTATIONS) {
        if (Array.isArray(line)) {
          core.info(
            `Processing file: ${file}, lines: ${line[0]} - ${line[line.length - 1]}`
          );
          core.warning(`Test Coverage missing!`, {
            file,
            startLine: line[0],
            endLine: line[line.length - 1]
          });
        } else {
          core.info(`Processing file: ${file}, line: ${line}`);
          core.warning(`Test Coverage missing!`, {
            file,
            startLine: line
          });
        }
        annotationCount += 1;
      }
    });
  });

  return allMissingCoverage;
}

function generateSummary(allMissingCoverage) {
  const summary = core.summary
    .addHeading("Code Coverage Report")
    .addRaw(`Total missing coverage locations: ${allMissingCoverage.length}`)
    .addEOL();

  if (allMissingCoverage.length > MAX_ANNOTATIONS) {
    summary.addRaw(
      `⚠️ Showing first ${MAX_ANNOTATIONS} annotations. See full list below.`
    );
    summary.addEOL();
  }

  summary.addHeading("Missing Coverage Details", 3);

  const tableData = [
    [
      { data: "File", header: true },
      { data: "Line(s)", header: true }
    ],
    ...allMissingCoverage.map(({ file, startLine, endLine }) => [
      file,
      endLine ? `${startLine}-${endLine}` : `${startLine}`
    ])
  ];

  summary.addTable(tableData);
  return summary;
}

const showAnnotations = async (coverageData) => {
  const showAnnotationsInput = getShowAnnotations();
  const pullRequestContext = getPullRequestContext();

  if (showAnnotationsInput && pullRequestContext) {
    core.info("Show annotations feature enabled");
    const allMissingCoverage = processAnnotations(coverageData);
    const summary = generateSummary(allMissingCoverage);
    await summary.write();
  }
};

module.exports = showAnnotations;
