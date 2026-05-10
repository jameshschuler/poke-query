//  @ts-check

/** @type {import('prettier').Config} */
const config = {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  overrides: [
    {
      files: '*.css',
      options: {
        printWidth: 200,
      },
    },
  ],
}

export default config
