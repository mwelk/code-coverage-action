const { githubApi } = require("@barecheck/core");
const path = require("path");

const { getPullRequestContext, getOctokit } = require("../lib/github");
const { getWorkspacePath } = require("../input");

/**
 * Process a single line from a patch and update line tracking
 */
function processPatchLine(line, currentLine, changedLines) {
  const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if (hunkMatch) return parseInt(hunkMatch[1], 10);
  if (line.startsWith("-")) return currentLine;

  if (line.startsWith("+")) {
    changedLines.push(currentLine);
    return currentLine + 1;
  }

  return line.startsWith("\\") ? currentLine : currentLine + 1;
}

/**
 * Extracts the line numbers that were added or modified from a Git patch
 * @param {string} patch - The Git patch string from GitHub API
 * @returns {number[]} - Array of line numbers that were changed
 */
function extractChangedLines(patch) {
  if (!patch) return [];

  const changedLines = [];
  const lines = patch.split("\n");

  lines.reduce(
    (currentLine, line) => processPatchLine(line, currentLine, changedLines),
    0
  );

  return changedLines;
}

const getChangedFilesCoverage = async (coverage) => {
  const pullRequestContext = getPullRequestContext();

  if (!pullRequestContext) return coverage.data;

  const octokit = await getOctokit();

  const { repo, owner, pullNumber } = pullRequestContext;
  const changedFiles = await githubApi.getChangedFiles(octokit, {
    repo,
    owner,
    pullNumber,
    limit: 0
  });

  const workspacePath = getWorkspacePath();
  const changedFilesCoverage = coverage.data.reduce(
    (allFiles, { file, lines }) => {
      const filePath = workspacePath ? path.join(workspacePath, file) : file;

      const changedFile = changedFiles.find(
        ({ filename }) => filename === filePath
      );

      if (changedFile) {
        // Extract changed line numbers from the patch
        const changedLines = extractChangedLines(changedFile.patch);

        // Filter coverage lines to only include changed lines
        const filteredLines = lines.filter((lineNumber) =>
          changedLines.includes(lineNumber)
        );

        // Only include file if it has coverage on changed lines
        if (filteredLines.length > 0) {
          return [
            ...allFiles,
            {
              file: filePath,
              url: changedFile.blob_url,
              lines: filteredLines
            }
          ];
        }
      }
      return allFiles;
    },
    []
  );

  return changedFilesCoverage;
};

module.exports = getChangedFilesCoverage;
