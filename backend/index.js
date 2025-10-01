const express = require("express");
const cors = require("cors");
const Docker = require("dockerode");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const docker = new Docker();

app.use(cors());
app.use(express.json());

const languageConfigs = {
  c: {
    image: "gcc:latest",
    extension: ".c",
    compile: ["gcc", "-o", "/code/temp", "/code/temp.c"],
    run: ["/code/temp"],
  },
  cpp: {
    image: "gcc:latest",
    extension: ".cpp",
    compile: ["g++", "-o", "/code/temp", "/code/temp.cpp"],
    run: ["/code/temp"],
  },
  java: {
    image: "openjdk:11",
    extension: ".java",
    compile: ["javac", "/code/Solution.java"],
    run: ["java", "-cp", "/code", "Solution"],
  },
  python: {
    image: "python:3.9-slim",
    extension: ".py",
    run: ["python", "/code/solution.py"],
  },
};

const problems = {
  'gas-station': {
    number: 1,
    title: 'Gas Station',
    description:
      'There are n gas stations along a circular route, where the amount of gas at the ith station is gas[i]. You have a car with an unlimited gas tank and it costs cost[i] of gas to travel from the ith station to its next (i + 1)th station. You begin the journey with an empty tank at one of the gas stations. Return the starting gas station’s index if you can travel around the circuit once in the clockwise direction, otherwise return -1. If there exists a solution, it is guaranteed to be unique.',
    examples: [
      { input: 'gas = [1,2,3,4,5], cost = [3,4,5,1,2]', output: '3' },
      { input: 'gas = [2,3,4], cost = [3,4,3]', output: '-1' },
    ],
    constraints: [
      'gas.length == n',
      'cost.length == n',
      '1 <= n <= 10^5',
      '0 <= gas[i], cost[i] <= 10^4',
    ],
    testCases: [
      { input: [[1, 2, 3, 4, 5], [3, 4, 5, 1, 2]], expected: 3 },
      { input: [[2, 3, 4], [3, 4, 3]], expected: -1 },
      { input: [[5, 1, 2, 3, 4], [4, 4, 1, 5, 1]], expected: 4 },
      { input: [[1, 1, 1], [2, 2, 2]], expected: -1 },
      { input: [[3, 1, 2], [1, 2, 3]], expected: 0 },
    ],
    functionSignature: {
      java: 'public int canCompleteCircuit(int[] gas, int[] cost)',
      python: 'def can_complete_circuit(gas, cost):',
      cpp: 'int canCompleteCircuit(vector<int>& gas, vector<int>& cost)',
      c: 'int canCompleteCircuit(int* gas, int gasSize, int* cost, int costSize)',
    },
  },
  'candy': {
    number: 2,
    title: 'Candy',
    description:
      'There are n children standing in a line. Each child is assigned a rating value given in the integer array ratings. You are giving candies to these children subjected to the following requirements: 1. Each child must have at least one candy. 2. Children with a higher rating get more candies than their neighbors. Return the minimum number of candies you need to have to distribute the candies to the children.',
    examples: [
      { input: 'ratings = [1,0,2]', output: '5' },
      { input: 'ratings = [1,2,2]', output: '4' },
    ],
    constraints: [
      'n == ratings.length',
      '1 <= n <= 2 * 10^4',
      '0 <= ratings[i] <= 2 * 10^4',
    ],
    testCases: [
      { input: [[1, 0, 2]], expected: 5 },
      { input: [[1, 2, 2]], expected: 4 },
      { input: [[1, 3, 2, 2, 1]], expected: 7 },
      { input: [[1, 2, 3, 1, 0]], expected: 9 },
      { input: [[1, 0, 2, 2, 3]], expected: 8 },
    ],
    functionSignature: {
      java: 'public int candy(int[] ratings)',
      python: 'def candy(ratings):',
      cpp: 'int candy(vector<int>& ratings)',
      c: 'int candy(int* ratings, int ratingsSize)',
    },
  },
  'longest-increasing-subsequence': {
    number: 3,
    title: 'Longest Increasing Subsequence',
    description:
      'Given an integer array nums, return the length of the longest strictly increasing subsequence. A subsequence is a sequence that can be derived from an array by deleting some or no elements without changing the order of the remaining elements.',
    examples: [
      { input: 'nums = [10,9,2,5,3,7,101,18]', output: '4' },
      { input: 'nums = [0,1,0,3,2,3]', output: '4' },
      { input: 'nums = [7,7,7,7,7,7,7]', output: '1' },
    ],
    constraints: [
      '1 <= nums.length <= 2500',
      '-10^4 <= nums[i] <= 10^4',
    ],
    testCases: [
      { input: [[10, 9, 2, 5, 3, 7, 101, 18]], expected: 4 },
      { input: [[0, 1, 0, 3, 2, 3]], expected: 4 },
      { input: [[7, 7, 7, 7, 7, 7, 7]], expected: 1 },
      { input: [[1, 3, 6, 7, 9, 4, 10, 5, 6]], expected: 6 },
      { input: [[1]], expected: 1 },
    ],
    functionSignature: {
      java: 'public int lengthOfLIS(int[] nums)',
      python: 'def lengthOfLIS(nums):',
      cpp: 'int lengthOfLIS(vector<int>& nums)',
      c: 'int lengthOfLIS(int* nums, int numsSize)',
    },
  },
};

const codeTemplates = {
  'gas-station': {
    java: `public int canCompleteCircuit(int[] gas, int[] cost) {
    // Write your code here
    return -1;
}`,
    python: `def can_complete_circuit(gas, cost):
    # Write your code here
    return -1`,
    cpp: `int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {
    // Write your code here
    return -1;
}`,
    c: `int canCompleteCircuit(int* gas, int gasSize, int* cost, int costSize) {
    // Write your code here
    return -1;
}`,
  },
  'candy': {
    java: `public int candy(int[] ratings) {
    // Write your code here
    return 0;
}`,
    python: `def candy(ratings):
    // Write your code here
    return 0`,
    cpp: `int candy(vector<int>& ratings) {
    // Write your code here
    return 0;
}`,
    c: `int candy(int* ratings, int ratingsSize) {
    // Write your code here
    return 0;
}`,
  },
  'longest-increasing-subsequence': {
    java: `public int lengthOfLIS(int[] nums) {
    // Write your code here
    return 0;
}`,
    python: `def lengthOfLIS(nums):
    // Write your code here
    return 0`,
    cpp: `int lengthOfLIS(vector<int>& nums) {
    // Write your code here
    return 0;
}`,
    c: `int lengthOfLIS(int* nums, int numsSize) {
    // Write your code here
    return 0;
}`,
  },
};

app.get('/problem/:problemId', (req, res) => {
  const { problemId } = req.params;
  const problem = problems[problemId];
  if (!problem) {
    return res.status(404).json({ error: 'Problem not found' });
  }
  res.json(problem);
});

app.get('/problem/:problemId/template/:language', (req, res) => {
  const { problemId, language } = req.params;
  if (!problems[problemId] || !codeTemplates[problemId] || !codeTemplates[problemId][language]) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json({ template: codeTemplates[problemId][language] });
});

app.post('/run', async (req, res) => {
  const { code, language, problemId } = req.body;
  if (!code || !language || !problemId || !languageConfigs[language]) {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }
  if (!problems[problemId]) {
    return res.status(400).json({ error: 'Problem not found' });
  }
  const problem = problems[problemId];
  const testCases = problem.testCases.slice(0, 2);
  try {
    const results = await runTestCases(code, language, problemId, testCases);
    res.json({ testResults: results });
  } catch (error) {
    console.error('Run error:', error);
    res.status(500).json({ error: 'Execution failed: ' + error.message });
  }
});

app.post('/submit', async (req, res) => {
  const { code, language, problemId } = req.body;
  if (!code || !language || !problemId || !languageConfigs[language]) {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }
  if (!problems[problemId]) {
    return res.status(400).json({ error: 'Problem not found' });
  }
  const problem = problems[problemId];
  const testCases = problem.testCases;
  try {
    const results = await runTestCases(code, language, problemId, testCases);
    const passedTests = results.filter((r) => r.passed).length;
    const totalTests = results.length;
    const accepted = passedTests === totalTests;
    res.json({
      accepted,
      passedTests,
      totalTests,
      testResults: results,
      executionTime: '3ms',
      memory: '1.5MB',
      submissionId: 'sub_' + Date.now(),
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Submission failed: ' + error.message });
  }
});

async function runTestCases(userCode, language, problemId, testCases) {
  const results = [];
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    try {
      const result = await executeTestCase(userCode, language, problemId, testCase, i + 1);
      results.push(result);
    } catch (error) {
      results.push({
        id: i + 1,
        input: testCase.input.map((arr) => `[${arr.join(',')}]`).join(', '),
        expectedOutput: testCase.expected.toString(),
        actualOutput: 'Runtime Error: ' + error.message,
        passed: false,
        executionTime: '0ms',
        memory: '0MB',
      });
    }
  }
  return results;
}

async function executeTestCase(userCode, language, problemId, testCase, testId) {
  const tempDir = path.join(__dirname, 'temp', `test_${Date.now()}_${testId}`);
  try {
    await fs.mkdir(tempDir, { recursive: true });
    const fullCode = generateFullCode(userCode, language, problemId, testCase);
    const config = languageConfigs[language];
    let fileName;
    switch (language) {
      case 'java':
        fileName = 'Solution.java';
        break;
      case 'c':
        fileName = 'temp.c';
        break;
      case 'cpp':
        fileName = 'temp.cpp';
        break;
      case 'python':
        fileName = 'solution.py';
        break;
      default:
        fileName = `solution${config.extension}`;
    }
    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, fullCode);
    if (config.compile) {
      const compileResult = await runInDocker(config.image, config.compile, tempDir);
      if (compileResult.error) {
        throw new Error('Compilation Error: ' + compileResult.error);
      }
    }
    const runResult = await runInDocker(config.image, config.run, tempDir);
    if (runResult.error) {
      throw new Error(runResult.error);
    }
    const actualOutput = runResult.output.trim();
    const expectedOutput = testCase.expected.toString();
    const passed = actualOutput === expectedOutput;
    return {
      id: testId,
      input: testCase.input.map((arr) => `[${arr.join(',')}]`).join(', '),
      expectedOutput,
      actualOutput,
      passed,
      executionTime: '2ms',
      memory: '1.2MB',
    };
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  }
}

function generateFullCode(userCode, language, problemId, testCase) {
  switch (language) {
    case 'java':
      return `import java.util.*;
public class Solution {
    ${userCode}
    public static void main(String[] args) {
        Solution solution = new Solution();
        ${generateJavaTestCall(problemId, testCase)}
    }
}`;
    case 'python':
      return `${userCode}
if __name__ == "__main__":
    ${generatePythonTestCall(problemId, testCase)}`;
    case 'cpp':
      return `#include <iostream>
#include <vector>
#include <string>
using namespace std;
${userCode}
int main() {
    ${generateCppTestCall(problemId, testCase)}
    return 0;
}`;
    case 'c':
      return `#include <stdio.h>
#include <stdlib.h>
${userCode}
int main() {
    ${generateCTestCall(problemId, testCase)}
    return 0;
}`;
    default:
      throw new Error('Unsupported language');
  }
}

function generateJavaTestCall(problemId, testCase) {
  switch (problemId) {
    case 'gas-station':
      return `int[] gas = {${testCase.input[0].join(',')}};
        int[] cost = {${testCase.input[1].join(',')}};
        int result = solution.canCompleteCircuit(gas, cost);
        System.out.println(result);`;
    case 'candy':
      return `int[] ratings = {${testCase.input[0].join(',')}};
        int result = solution.candy(ratings);
        System.out.println(result);`;
    case 'longest-increasing-subsequence':
      return `int[] nums = {${testCase.input[0].join(',')}};
        int result = solution.lengthOfLIS(nums);
        System.out.println(result);`;
    default:
      throw new Error('Unknown problem');
  }
}

function generatePythonTestCall(problemId, testCase) {
  switch (problemId) {
    case 'gas-station':
      return `gas = [${testCase.input[0].join(',')}]
    cost = [${testCase.input[1].join(',')}]
    result = can_complete_circuit(gas, cost)
    print(result)`;
    case 'candy':
      return `ratings = [${testCase.input[0].join(',')}]
    result = candy(ratings)
    print(result)`;
    case 'longest-increasing-subsequence':
      return `nums = [${testCase.input[0].join(',')}]
    result = lengthOfLIS(nums)
    print(result)`;
    default:
      throw new Error('Unknown problem');
  }
}

function generateCppTestCall(problemId, testCase) {
  switch (problemId) {
    case 'gas-station':
      return `vector<int> gas = {${testCase.input[0].join(',')}};
    vector<int> cost = {${testCase.input[1].join(',')}};
    int result = canCompleteCircuit(gas, cost);
    cout << result << endl;`;
    case 'candy':
      return `vector<int> ratings = {${testCase.input[0].join(',')}};
    int result = candy(ratings);
    cout << result << endl;`;
    case 'longest-increasing-subsequence':
      return `vector<int> nums = {${testCase.input[0].join(',')}};
    int result = lengthOfLIS(nums);
    cout << result << endl;`;
    default:
      throw new Error('Unknown problem');
  }
}

function generateCTestCall(problemId, testCase) {
  switch (problemId) {
    case 'gas-station':
      return `int gas[] = {${testCase.input[0].join(',')}};
    int cost[] = {${testCase.input[1].join(',')}};
    int result = canCompleteCircuit(gas, ${testCase.input[0].length}, cost, ${testCase.input[1].length});
    printf("%d\\n", result);`;
    case 'candy':
      return `int ratings[] = {${testCase.input[0].join(',')}};
    int result = candy(ratings, ${testCase.input[0].length});
    printf("%d\\n", result);`;
    case 'longest-increasing-subsequence':
      return `int nums[] = {${testCase.input[0].join(',')}};
    int result = lengthOfLIS(nums, ${testCase.input[0].length});
    printf("%d\\n", result);`;
    default:
      throw new Error('Unknown problem');
  }
}

async function runInDocker(image, command, tempDir, input = '') {
  let container;
  try {
    container = await docker.createContainer({
      Image: image,
      Cmd: command,
      Tty: false,
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        Binds: [`${path.resolve(tempDir)}:/code:rw`],
        NetworkMode: 'none',
        Memory: 128 * 1024 * 1024,
        CpuPeriod: 100000,
        CpuQuota: 50000,
        AutoRemove: false,
      },
      WorkingDir: '/code',
    });
    await container.start();
    const result = await Promise.race([
      container.wait(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Execution timeout')), 10000)),
    ]);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      timestamps: false,
    });
    const { stdout, stderr } = parseLogs(logs);
    return { output: stdout.trim(), error: stderr.trim() };
  } catch (err) {
    console.error('Docker execution error:', err);
    return { output: '', error: err.message || 'Container execution failed' };
  } finally {
    if (container) {
      try {
        await container.remove({ force: true });
      } catch (e) {
        console.error('Container cleanup error:', e);
      }
    }
  }
}

function parseLogs(logs) {
  const logBuffer = Buffer.from(logs);
  let stdout = '';
  let stderr = '';
  let offset = 0;
  while (offset < logBuffer.length) {
    if (offset + 8 > logBuffer.length) break;
    const header = logBuffer.slice(offset, offset + 8);
    const streamType = header[0];
    const size = header.readUInt32BE(4);
    if (offset + 8 + size > logBuffer.length) break;
    const content = logBuffer.slice(offset + 8, offset + 8 + size).toString();
    if (streamType === 1) {
      stdout += content;
    } else if (streamType === 2) {
      stderr += content;
    }
    offset += 8 + size;
  }
  if (!stdout && !stderr) {
    const allLogs = logs.toString();
    if (allLogs.includes('error') || allLogs.includes('Error') || allLogs.includes('Exception')) {
      stderr = allLogs;
    } else {
      stdout = allLogs;
    }
  }
  return { stdout, stderr };
}

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Supported languages:', Object.keys(languageConfigs));
  console.log('Available problems:', Object.keys(problems));
});