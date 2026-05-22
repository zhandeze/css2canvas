module.exports = {
  testEnvironment: 'jsdom',
  roots: ['src'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {tsconfig: 'tsconfig.jest.json'}],
    '^.+\\.js$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
        presets: [['@babel/preset-env', {targets: {node: 'current'}}]]
      }
    ]
  },
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\](?!((?:.*[/\\\\])?@chenglou[/\\\\]pretext[/\\\\]))']
};
