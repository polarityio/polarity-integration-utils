module.exports = {
  collectCoverage: true,
  coverageReporters: ['json', 'html'],
  coverageDirectory: '<rootDir>/coverage',
  rootDir: '.',
  preset: 'ts-jest',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        //the content you'd placed at "global"
        babel: true,
        tsconfig: 'tsconfig.json',
        diagnostics: false
      }
    ]
  },
  verbose: true
};
