module.exports = {
  testEnvironment: 'jsdom',
  roots: ['src'],
  testPathIgnorePatterns: ['/src/layout/tests/'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {tsconfig: 'tsconfig.jest.json'}]
  }
};
