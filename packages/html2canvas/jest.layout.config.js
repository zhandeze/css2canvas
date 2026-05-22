module.exports = {
  testEnvironment: 'node',
  roots: ['src/layout/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', {tsconfig: 'tsconfig.jest.layout.json'}]
  },
  transformIgnorePatterns: []
};
