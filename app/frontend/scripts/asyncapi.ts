import {
  ConstrainedArrayModel,
  ConstrainedDictionaryModel,
  PYTHON_PYDANTIC_PRESET,
  PythonGenerator,
  type PythonOptions,
  type PythonPreset,
  TypeScriptGenerator,
  typeScriptDefaultEnumKeyConstraints,
} from '@asyncapi/modelina'
import fs from 'node:fs'
import path from 'node:path'

const renderPythonLiteral = (value: unknown): string => {
  if (typeof value === 'string') {
    const escaped = value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")
    return `'${escaped}'`
  }
  return JSON.stringify(value)
}

const CUSTOM_PYDANTIC_PRESET: PythonPreset<PythonOptions> = {
  class: {
    ...PYTHON_PYDANTIC_PRESET.class,
    additionalContent(context) {
      const original = PYTHON_PYDANTIC_PRESET.class!.additionalContent?.(context) || ''
      context.renderer.dependencyManager.addDependency(
        'from pydantic import ConfigDict, field_validator',
      )

      const properties = context.model.properties || {}
      const dictFields = []
      const arrayFields = []

      for (const [_, property] of Object.entries(properties)) {
        const isOptional = !property.required || property.property.options.isNullable === true

        // Match logic with property preset: collections are NOT marked Optional in python type
        const isDictionary = property.property instanceof ConstrainedDictionaryModel
        const isArray = property.property instanceof ConstrainedArrayModel

        if (isOptional) {
          if (isDictionary) dictFields.push(property.propertyName)
          if (isArray) arrayFields.push(property.propertyName)
        }
      }

      let validatorCode = ''
      if (dictFields.length > 0) {
        const fieldsStr = dictFields.map((f) => `"${f}"`).join(', ')
        validatorCode += `
@field_validator(${fieldsStr}, mode='before')
@classmethod
def parse_empty_dict(cls, v):
    if v is None:
        return {}
    return v
`
      }
      if (arrayFields.length > 0) {
        const fieldsStr = arrayFields.map((f) => `"${f}"`).join(', ')
        validatorCode += `
@field_validator(${fieldsStr}, mode='before')
@classmethod
def parse_empty_list(cls, v):
    if v is None:
        return []
    return v
`
      }

      return `model_config = ConfigDict(populate_by_name=True)${validatorCode}\n\n${original}`
    },
    property({ property, model, renderer }) {
      let type = property.property.type
      const propertyName = property.propertyName
      const isOptional = !property.required || property.property.options.isNullable === true

      const isCollection =
        property.property instanceof ConstrainedDictionaryModel ||
        property.property instanceof ConstrainedArrayModel
      const shouldBeOptional = isOptional && !isCollection

      if (shouldBeOptional) {
        type = `Optional[${type}]`
      }

      if (property.property.options.const) {
        renderer.dependencyManager.addDependency('from typing import Literal')
        type = `Literal[${renderPythonLiteral(property.property.options.const.originalInput)}]`
      }

      type = renderer.renderPropertyType({
        modelType: model.type,
        propertyType: type,
      })

      const decoratorArgs = []

      if (property.property.originalInput.description) {
        decoratorArgs.push(`description='''${property.property.originalInput.description}'''`)
      }

      // Fix: Check for default value in originalInput
      let defaultValue = property.property.originalInput.default
      if (defaultValue === null) {
        defaultValue = 'None'
      }

      if (property.property.options.const) {
        decoratorArgs.push(
          `default=${renderPythonLiteral(property.property.options.const.originalInput)}`,
        )
        decoratorArgs.push('frozen=True')
      } else if (defaultValue !== undefined) {
        if (typeof defaultValue === 'string' && defaultValue !== 'None') {
          decoratorArgs.push(`default='${defaultValue}'`)
        } else if (defaultValue === 'None') {
          decoratorArgs.push(`default=None`)
        } else {
          decoratorArgs.push(`default=${JSON.stringify(defaultValue)}`)
        }
      } else if (isOptional) {
        if (property.property instanceof ConstrainedDictionaryModel) {
          decoratorArgs.push('default={}')
        } else if (property.property instanceof ConstrainedArrayModel) {
          decoratorArgs.push('default=[]')
        } else {
          decoratorArgs.push('default=None')
        }
      }

      if (
        property.property instanceof ConstrainedDictionaryModel &&
        property.property.serializationType === 'unwrap'
      ) {
        decoratorArgs.push('exclude=True')
      }

      if (
        property.propertyName !== property.unconstrainedPropertyName &&
        (!(property.property instanceof ConstrainedDictionaryModel) ||
          property.property.serializationType !== 'unwrap')
      ) {
        decoratorArgs.push(`alias='''${property.unconstrainedPropertyName}'''`)
      }

      // Fix: Check for oneOf and add discriminator if present in schema
      if (property.property.originalInput.oneOf && property.property.originalInput.discriminator) {
        const discriminator = property.property.originalInput.discriminator.propertyName
        decoratorArgs.push(`discriminator='${discriminator}'`)
      }

      return `${propertyName}: ${type} = Field(${decoratorArgs.join(', ')})`
    },
  },
}

const inputPath = path.resolve(import.meta.dir, '../asyncapi.json')
const sdcInputPath = path.resolve(import.meta.dir, '../sdc.json')
const backendPath = path.resolve(import.meta.dir, '../../backend')

// Load documents globally
const content = await Bun.file(inputPath).text()
const document = JSON.parse(content)

const sdcContent = await Bun.file(sdcInputPath).text()
const sdcDocument = JSON.parse(sdcContent)

// Merge sdc schemas into document components for model generation
document.components.schemas = {
  ...document.components.schemas,
  ...sdcDocument.components.schemas,
}

// Recursively replace sdc.json# references with local # references in the document object
const replaceSdcRefs = (obj: unknown) => {
  if (typeof obj !== 'object' || obj === null) return
  for (const key in obj) {
    if (key === '$ref' && typeof obj[key] === 'string' && obj[key].startsWith('sdc.json#')) {
      obj[key] = obj[key].replace('sdc.json#', '#')
    } else {
      replaceSdcRefs(obj[key])
    }
  }
}
replaceSdcRefs(document)

const generatePythonCode = async () => {
  const pythonGenerator = new PythonGenerator({ presets: [CUSTOM_PYDANTIC_PRESET] })
  const documentWithAllSchemas = {
    ...document,
    channels: {
      ...document.channels,
      schemas: {
        address: 'schemas',
        messages: Object.fromEntries(
          Object.keys(document.components.schemas || {}).map((name) => [
            name,
            { payload: { $ref: `#/components/schemas/${name}` } },
          ]),
        ),
      },
    },
    operations: {
      ...document.operations,
      allSchemas: {
        action: 'send',
        channel: {
          $ref: '#/channels/schemas',
        },
      },
    },
  }

  const models = (await pythonGenerator.generate(documentWithAllSchemas)).filter(
    (m) => m.modelName !== 'WsChannel' && m.modelName !== 'Schemas',
  )
  const modelNames = models.map((m) => m.modelName).filter((name) => name && name.trim() !== '')
  const backendOutputDir = path.resolve(backendPath, 'src/curator/asyncapi')

  if (fs.existsSync(backendOutputDir)) {
    fs.rmSync(backendOutputDir, { recursive: true, force: true })
  }
  fs.mkdirSync(backendOutputDir, { recursive: true })

  for (const model of models) {
    if (!model.modelName || model.modelName.trim() === '') {
      continue
    }
    let code = model.result
    // Workaround for Modelina's Pydantic preset issue where unwrap_additional_properties
    // assumes input is always a dict or model instance. When validating Unions containing
    // primitives, this validator receives the primitive value, causing an AttributeError
    // on .model_dump(). We catch this to allow Pydantic to handle the type mismatch naturally.
    code = code.replace(
      /(\s+)if not isinstance\(data, dict\):\s+data = data\.model_dump\(\)/g,
      '$1if not isinstance(data, dict):\n$1    try:\n$1        data = data.model_dump()\n$1    except AttributeError:\n$1        return data\n$1data = data.copy()',
    )

    // Fix double quoting issue for const fields
    code = code.replace(/default=''(.*?)''/g, "default='$1'")

    code = code.replace(/\bdefault=(true|false)\b/g, (_match, value) => {
      return `default=${value === 'true' ? 'True' : 'False'}`
    })

    const imports = new Set(model.dependencies || [])

    // Find model dependencies
    const referencedModels = modelNames.filter(
      (name) => name !== model.modelName && new RegExp(`\\b${name}\\b`).test(code),
    )

    const modelImports = referencedModels.map((name) => `from .${name} import ${name}`)

    const fileContent = [
      '# Auto-generated by @asyncapi/modelina',
      '# DO NOT EDIT MANUALLY',
      '',
      ...Array.from(imports),
      ...modelImports,
      '',
      code,
    ].join('\n')

    await Bun.write(path.join(backendOutputDir, `${model.modelName}.py`), fileContent)
  }

  // Generate __init__.py
  const initContent = [
    '# Auto-generated by @asyncapi/modelina',
    '# DO NOT EDIT MANUALLY',
    '',
    ...modelNames.map((name) => `from .${name} import ${name}`),
    '',
    '__all__ = [',
    ...modelNames.map((name) => `    "${name}",`),
    ']',
    '',
    // We don't need to rebuild explicitly if we use imports, but to be safe for recursive refs:
    '# Rebuild models to resolve forward references',
    'from pydantic import BaseModel',
    'for name, cls in list(globals().items()):',
    '    if isinstance(cls, type) and issubclass(cls, BaseModel) and cls is not BaseModel:',
    '        try:',
    '            cls.model_rebuild()',
    '        except Exception:',
    '            pass',
  ].join('\n')

  await Bun.write(path.join(backendOutputDir, '__init__.py'), initContent)
  console.log(`Generated Python models to ${backendOutputDir}`)
}

const getInferredType = async (pattern: string): Promise<string> => {
  const tempFile = path.resolve(
    import.meta.dir,
    `temp_type_${Math.random().toString(36).slice(2)}.ts`,
  )
  // Simplify pattern for type inference to avoid "excessively deep" errors
  const simplifiedPattern = pattern
    .replace(/\[1-9\]/g, '\\d')
    .replace(/\[0-9\]/g, '\\d')
    .replace(/\\d\\d\*/g, '\\d+')

  // Escape backslashes for the TS file string literal
  const escapedPattern = simplifiedPattern.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const content = `import { regex } from 'arkregex'; const r = regex('${escapedPattern}'); type T = typeof r; const x: never = {} as T;`
  await Bun.write(tempFile, content)

  try {
    // We use bun x tsc and expect it to fail with the type information in the error message
    const { stdout, stderr } = Bun.spawnSync([
      'bun',
      'x',
      'tsc',
      tempFile,
      '--noEmit',
      '--esModuleInterop',
      '--skipLibCheck',
      '--target',
      'esnext',
      '--moduleResolution',
      'bundler',
      '--module',
      'esnext',
      '--ignoreConfig',
    ])

    // Bun.spawnSync doesn't throw on non-zero exit code by default,
    // it returns a result object with the status and outputs.
    // The tsc command will exit with code 1 due to the type mismatch (T as never).
    const output = stdout.toString() + stderr.toString()

    // Look for the Regex type in the error message. It usually looks like:
    // Type 'Regex<"P${number}${number}", {}>' is not assignable to type 'never'.
    const match = output.match(/Regex<["'`](.*?)["'`],/)
    if (match) {
      return `\`${match[1]}\``
    }
    return 'string'
  } catch (_) {
    // Fallback if spawnSync itself fails (unlikely)
    return 'string'
  } finally {
    const file = Bun.file(tempFile)
    if (await file.exists()) {
      await fs.promises.unlink(tempFile)
    }
  }
}

// Generate union types dynamically from all operations in the AsyncAPI document
const generateOperationUnionTypes = (): string[] => {
  const unionTypes: string[] = []

  // Process each operation to generate union types
  for (const [operationName, operation] of Object.entries(document.operations)) {
    if (!operation?.messages || !Array.isArray(operation.messages)) {
      continue
    }

    const messageRefs = operation.messages
    const messageTypes = messageRefs
      .map((m: { $ref: string }) => {
        const name = m.$ref.split('/').pop()
        return name
      })
      .filter(Boolean) // Remove any undefined/null values

    if (messageTypes.length === 0) {
      continue
    }

    const unionType = `type ${operationName} = ${messageTypes.join(' | ')}`
    unionTypes.push(unionType)
  }

  return unionTypes
}

const generateTypescriptCode = async () => {
  const tsGenerator = new TypeScriptGenerator({
    modelType: 'interface',
    mapType: 'record',
    rawPropertyNames: true,
    processorOptions: {
      interpreter: {
        ignoreAdditionalProperties: true,
      },
    },
    constraints: {
      enumKey: typeScriptDefaultEnumKeyConstraints({
        NO_SPECIAL_CHAR: (context) => {
          return context.replace(/-/g, '_')
        },
        NO_RESERVED_KEYWORDS: (context) => {
          return context
        },
      }),
    },
  })

  // Process main document with all schemas included
  const documentWithAllSchemas = {
    ...document,
    channels: {
      ...document.channels,
      // Add a channel for all standalone schemas in components
      schemas: {
        address: 'schemas',
        messages: Object.fromEntries(
          Object.keys(document.components.schemas || {}).map((name) => [
            name,
            { payload: { $ref: `#/components/schemas/${name}` } },
          ]),
        ),
      },
    },
    operations: {
      ...document.operations,
      // Add an operation for the schemas channel
      allSchemas: {
        action: 'send',
        channel: {
          $ref: '#/channels/schemas',
        },
      },
    },
  }

  const tsModels = (await tsGenerator.generate(documentWithAllSchemas)).filter(
    (m) => m.modelName !== 'WsChannel' && m.modelName !== 'Schemas',
  )
  const sdcModels = (
    await tsGenerator.generate({
      ...sdcDocument,
      channels: {
        sdc: {
          address: 'sdc',
          messages: Object.fromEntries(
            Object.keys(sdcDocument.components.schemas).map((name) => [
              name,
              { payload: { $ref: `#/components/schemas/${name}` } },
            ]),
          ),
        },
      },
      operations: {
        allSdcSchemas: {
          action: 'send',
          channel: {
            $ref: '#/channels/sdc',
          },
        },
      },
    })
  ).filter((m) => m.modelName !== 'Sdc')

  const inferredTypes: Record<string, string> = {}
  for (const m of [...tsModels, ...sdcModels]) {
    if (m.model.originalInput.pattern) {
      const type = await getInferredType(m.model.originalInput.pattern)
      inferredTypes[m.modelName] = type
    }
  }

  // Deduplicate models between main spec and SDC spec
  const tsModelNames = new Set(tsModels.map((m) => m.modelName))
  const filteredSdcModels = sdcModels.filter((m) => !tsModelNames.has(m.modelName))

  let tsContent = [
    `// Generated by @asyncapi/modelina
// Do not edit manually`,
    '',
    ...tsModels.map((m) => m.result),
    ...filteredSdcModels.map((m) => m.result),
  ].join('\n\n')

  // Generate operation union types (schemas are already generated by Modelina)
  const operationUnionTypes = generateOperationUnionTypes()

  // Add operation union types to the content
  if (operationUnionTypes.length > 0) {
    tsContent += `\n\n${operationUnionTypes.join('\n\n')}\n`
  }

  // Fix reserved keywords and add exports
  tsContent = tsContent
    .replace(/^interface (\w+) {/gm, 'export type $1 = {')
    .replace(/^(type|enum)/gm, 'export $1')

  // Apply inferred types
  for (const [modelName, type] of Object.entries(inferredTypes)) {
    const regex = new RegExp(`export type ${modelName} = string`, 'g')
    tsContent = tsContent.replace(regex, `export type ${modelName} = ${type}`)
  }

  const frontendPath = path.resolve(import.meta.dir, '../src/types')
  const tsOutputFile = path.resolve(frontendPath, 'asyncapi.ts')

  await Bun.write(tsOutputFile, tsContent)
  console.log(`Generated TypeScript models to ${tsOutputFile}`)
}

generatePythonCode().then(() => {
  Bun.spawnSync(['poetry', 'run', 'ruff', 'format'], {
    cwd: backendPath,
  })
  console.log('Formatted Python code with ruff formatter')
  Bun.spawnSync(['poetry', 'run', 'ruff', 'check', '--fix'], {
    cwd: backendPath,
  })
  console.log('Formatted Python code with ruff linter')
  Bun.spawnSync(['poetry', 'run', 'isort', '.'], {
    cwd: backendPath,
  })
  console.log('Formatted Python code with isort')
})

generateTypescriptCode().then(() => {
  Bun.spawnSync(['bun', 'format'], {
    cwd: path.resolve(import.meta.dir, '../'),
  })
  console.log('Formatted TypeScript code with bun format')
})
