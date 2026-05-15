import type { Config } from 'prettier'

const config: Config = {
  $schema: 'https://json.schemastore.org/prettierrc',
  arrowParens: 'always',
  bracketSameLine: false,
  bracketSpacing: true,
  endOfLine: 'lf',
  printWidth: 100,
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  useTabs: false,
  plugins: ['prettier-plugin-organize-imports'],
  overrides: [
    {
      files: ['*.ts'],
      options: {
        parser: 'typescript',
      },
    },
  ],
}

export default config
