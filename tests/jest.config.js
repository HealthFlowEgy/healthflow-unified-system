module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    '../services/**/*.ts',
    '!../services/**/node_modules/**',
    '!../services/**/dist/**'
  ]
};
