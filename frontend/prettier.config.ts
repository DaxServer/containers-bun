import type { Config } from 'prettier'

const config: Config = {
  $schema: 'https://json.schemastore.org/prettierrc',
  arrowParens: 'always',
  bracketSameLine: false,
  bracketSpacing: true,
  endOfLine: 'lf',
  htmlWhitespaceSensitivity: 'ignore',
  printWidth: 100,
  semi: false,
  singleAttributePerLine: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  useTabs: false,
  vueIndentScriptAndStyle: false,
  plugins: ['prettier-plugin-organize-imports'],
  overrides: [
    {
      files: ['*.ts'],
      options: {
        parser: 'typescript',
      },
    },
    {
      files: ['*.vue'],
      options: {
        parser: 'vue',
      },
    },
  ],
}

export default config
