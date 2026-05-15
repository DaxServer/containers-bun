export type DataValue =
  | EntityIdDataValue
  | GlobeCoordinateDataValue
  | QuantityDataValue
  | TimeDataValue
  | StringDataValue
  | UrlDataValue

export type Snak =
  | NoValueSnak
  | SomeValueSnak
  | EntityIdValueSnak
  | ExternalIdValueSnak
  | GlobeCoordinateValueSnak
  | QuantityValueSnak
  | StringValueSnak
  | TimeValueSnak
  | UrlValueSnak

export type ValueSnak =
  | EntityIdValueSnak
  | ExternalIdValueSnak
  | GlobeCoordinateValueSnak
  | QuantityValueSnak
  | StringValueSnak
  | TimeValueSnak
  | UrlValueSnak

export type Claims = Record<
  string,
  (
    | NoValueSnak
    | SomeValueSnak
    | EntityIdValueSnak
    | ExternalIdValueSnak
    | GlobeCoordinateValueSnak
    | QuantityValueSnak
    | StringValueSnak
    | TimeValueSnak
    | UrlValueSnak
  )[]
>

export type NoValueSnak = {
  snaktype: 'novalue'
  property: string
  hash?: string
}

export type SomeValueSnak = {
  snaktype: 'somevalue'
  property: string
  hash?: string
}

export type EntityIdValueSnak = {
  snaktype: 'value'
  property: string
  datatype: 'wikibase-item'
  datavalue: EntityIdDataValue
  hash?: string
}

export type EntityIdDataValue = {
  type: 'wikibase-entityid'
  value: DataValueEntityId
}

export type DataValueEntityId = {
  'entity-type': WikibaseEntityType
  'numeric-id': number
}

export enum WikibaseEntityType {
  ITEM = 'item',
  PROPERTY = 'property',
}

export type ExternalIdValueSnak = {
  snaktype: 'value'
  property: string
  datatype: 'external-id'
  datavalue: StringDataValue
  hash?: string
}

export type StringDataValue = {
  type: 'string'
  value: string
}

export type GlobeCoordinateValueSnak = {
  snaktype: 'value'
  property: string
  datatype: 'globe-coordinate'
  datavalue: GlobeCoordinateDataValue
  hash?: string
}

export type GlobeCoordinateDataValue = {
  type: 'globecoordinate'
  value: DataValueGlobeCoordinate
}

export type DataValueGlobeCoordinate = {
  latitude: number
  longitude: number
  altitude: number | null
  precision: number
  globe: string
}

export type QuantityValueSnak = {
  snaktype: 'value'
  property: string
  datatype: 'quantity'
  datavalue: QuantityDataValue
  hash?: string
}

export type QuantityDataValue = {
  type: 'quantity'
  value: DataValueQuantity
}

export type DataValueQuantity = {
  amount: string
  unit: string
  upperBound?: string | null
  lowerBound?: string | null
}

export type StringValueSnak = {
  snaktype: 'value'
  property: string
  datatype: 'string'
  datavalue: StringDataValue
  hash?: string
}

export type TimeValueSnak = {
  snaktype: 'value'
  property: string
  datatype: 'time'
  datavalue: TimeDataValue
  hash?: string
}

export type TimeDataValue = {
  type: 'time'
  value: DataValueTime
}

export type DataValueTime = {
  time: string
  timezone?: number
  before?: number
  after?: number
  precision?: number
  calendarmodel?: string
}

export type UrlValueSnak = {
  snaktype: 'value'
  property: string
  datatype: 'url'
  datavalue: UrlDataValue
  hash?: string
}

export type UrlDataValue = {
  type: 'string'
  value: string
}

export enum DataValueType {
  EXTERNAL_ID = 'external-id',
  GLOBECOORDINATE = 'globecoordinate',
  QUANTITY = 'quantity',
  STRING = 'string',
  TIME = 'time',
  WIKIBASE_ENTITYID = 'wikibase-entityid',
}

export type ItemId = `Q${number}`

export type PropertyId = `P${number}`

export enum Rank {
  DEPRECATED = 'deprecated',
  NORMAL = 'normal',
  PREFERRED = 'preferred',
}

export type Reference = {
  snaks: Record<
    string,
    (
      | NoValueSnak
      | SomeValueSnak
      | EntityIdValueSnak
      | ExternalIdValueSnak
      | GlobeCoordinateValueSnak
      | QuantityValueSnak
      | StringValueSnak
      | TimeValueSnak
      | UrlValueSnak
    )[]
  >
  'snaks-order'?: string[]
  hash?: string
}

export enum SnakDataType {
  EXTERNAL_ID = 'external-id',
  GLOBE_COORDINATE = 'globe-coordinate',
  QUANTITY = 'quantity',
  STRING = 'string',
  TIME = 'time',
  URL = 'url',
  WIKIBASE_ITEM = 'wikibase-item',
}

export type Statement = {
  mainsnak:
    | NoValueSnak
    | SomeValueSnak
    | EntityIdValueSnak
    | ExternalIdValueSnak
    | GlobeCoordinateValueSnak
    | QuantityValueSnak
    | StringValueSnak
    | TimeValueSnak
    | UrlValueSnak
  rank: Rank
  qualifiers?: Record<
    string,
    (
      | NoValueSnak
      | SomeValueSnak
      | EntityIdValueSnak
      | ExternalIdValueSnak
      | GlobeCoordinateValueSnak
      | QuantityValueSnak
      | StringValueSnak
      | TimeValueSnak
      | UrlValueSnak
    )[]
  >
  'qualifiers-order'?: string[]
  references?: Reference[]
  type?: 'statement'
  id?: string
}

export enum SnakType {
  NOVALUE = 'novalue',
  SOMEVALUE = 'somevalue',
  VALUE = 'value',
}
