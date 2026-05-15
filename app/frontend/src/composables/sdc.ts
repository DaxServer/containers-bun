import { WikidataEntity, WikidataProperty } from '@/components/wikidata/useWikidata'
import { DataValueType, Rank, SnakDataType, SnakType, WikibaseEntityType } from '@/types/asyncapi'

// ============================================================================
// Low-level builders for creating snaks and statements
// ============================================================================

export const createStringSnak = (property: PropertyId, value: string): StringValueSnak => ({
  snaktype: SnakType.VALUE,
  property,
  datatype: SnakDataType.STRING,
  datavalue: { value, type: DataValueType.STRING },
})

export const createUrlSnak = (property: PropertyId, value: string): UrlValueSnak => ({
  snaktype: SnakType.VALUE,
  property,
  datatype: SnakDataType.URL,
  datavalue: { value, type: DataValueType.STRING },
})

export const createWikibaseItemSnak = (
  property: PropertyId,
  itemId: ItemId,
): EntityIdValueSnak => ({
  snaktype: SnakType.VALUE,
  property,
  datatype: SnakDataType.WIKIBASE_ITEM,
  datavalue: {
    value: { 'entity-type': WikibaseEntityType.ITEM, 'numeric-id': getNumericId(itemId) },
    type: DataValueType.WIKIBASE_ENTITYID,
  },
})

export const createSomeValueSnak = (property: PropertyId): SomeValueSnak => ({
  snaktype: SnakType.SOMEVALUE,
  property,
})

export const createExternalIdSnak = (property: PropertyId, value: string): ExternalIdValueSnak => ({
  snaktype: SnakType.VALUE,
  property,
  datatype: SnakDataType.EXTERNAL_ID,
  datavalue: { value, type: DataValueType.STRING },
})

export const createTimeSnak = (property: PropertyId, date: Date): TimeValueSnak => {
  const dateString = date.toISOString().split('T')[0]
  const time = `+0000000${dateString}T00:00:00Z`

  return {
    snaktype: SnakType.VALUE,
    property,
    datatype: SnakDataType.TIME,
    datavalue: {
      value: {
        time,
        precision: 11,
        after: 0,
        before: 0,
        timezone: 0,
        calendarmodel: 'http://www.wikidata.org/entity/Q1985727',
      },
      type: DataValueType.TIME,
    },
  }
}

export const createQuantitySnak = (
  property: PropertyId,
  amount: number,
  unit: ItemId,
): QuantityValueSnak => ({
  snaktype: SnakType.VALUE,
  property,
  datatype: SnakDataType.QUANTITY,
  datavalue: {
    value: {
      amount: `+${amount}`,
      upperBound: null,
      lowerBound: null,
      unit: `http://www.wikidata.org/entity/${unit}`,
    },
    type: DataValueType.QUANTITY,
  },
})

export const createGlobeCoordinateSnak = (
  property: PropertyId,
  latitude: number,
  longitude: number,
  precision = 1.0e-9,
): GlobeCoordinateValueSnak => ({
  snaktype: SnakType.VALUE,
  property,
  datatype: SnakDataType.GLOBE_COORDINATE,
  datavalue: {
    value: {
      latitude,
      longitude,
      altitude: null,
      precision,
      globe: 'http://www.wikidata.org/entity/Q2',
    },
    type: DataValueType.GLOBECOORDINATE,
  },
})

export const createStatement = (
  mainsnak: Snak,
  qualifiers: Snak[] = [],
  rank: Rank = Rank.NORMAL,
): Statement => {
  const statement: Statement = {
    mainsnak,
    type: 'statement',
    rank,
  }

  if (qualifiers.length > 0) {
    const _qualifiers: Record<string, Snak[]> = {}
    const _qualifiersOrder: string[] = []

    for (const snak of qualifiers) {
      if (!_qualifiers[snak.property]) {
        _qualifiers[snak.property] = []
        _qualifiersOrder.push(snak.property)
      }
      _qualifiers[snak.property]!.push(snak)
    }

    statement.qualifiers = _qualifiers
    statement['qualifiers-order'] = _qualifiersOrder
  }

  return statement
}

export const createExternalIdStatement = (property: PropertyId, value: string): Statement => {
  return createStatement(createExternalIdSnak(property, value))
}

export const createWikibaseItemStatement = (property: PropertyId, itemId: ItemId): Statement => {
  return createStatement(createWikibaseItemSnak(property, itemId))
}

export const createTimeStatement = (property: PropertyId, date: Date): Statement => {
  return createStatement(createTimeSnak(property, date))
}

export const createQuantityStatement = (
  property: PropertyId,
  amount: number,
  unit: ItemId,
): Statement => {
  return createStatement(createQuantitySnak(property, amount, unit))
}

// ============================================================================
// High-level domain-specific claim builders for Mapillary SDC
// ============================================================================

export const getNumericId = (entity: ItemId): number => parseInt(entity.slice(1), 10)

export const createCreatorClaim = (username: string, snaks?: Snak[]): Statement => {
  return createStatement(createSomeValueSnak(WikidataProperty.Creator), [
    createStringSnak(WikidataProperty.AuthorNameString, username),
    ...(snaks || []),
  ])
}

export const createInceptionClaim = (date: Date): Statement => {
  return createTimeStatement(WikidataProperty.Inception, date)
}

export const createSourceOfFileClaim = (url: string): Statement => {
  return createStatement(
    createWikibaseItemSnak(WikidataProperty.SourceOfFile, WikidataEntity.FileAvailableOnInternet),
    [
      createWikibaseItemSnak(WikidataProperty.Operator, WikidataEntity.Mapillary),
      createUrlSnak(WikidataProperty.DescribedAtUrl, url),
    ],
  )
}

export const createCopyrightStatusClaim = (): Statement => {
  return createWikibaseItemStatement(WikidataProperty.CopyrightStatus, WikidataEntity.Copyrighted)
}

export const createCopyrightLicenseClaim = (): Statement => {
  return createWikibaseItemStatement(WikidataProperty.CopyrightLicense, WikidataEntity.CCBYSA40)
}

export const createWidthClaim = (width: number): Statement => {
  return createQuantityStatement(WikidataProperty.Width, width, WikidataEntity.Pixel)
}

export const createHeightClaim = (height: number): Statement => {
  return createQuantityStatement(WikidataProperty.Height, height, WikidataEntity.Pixel)
}

export const createPointOfViewClaim = (location: GeoLocation): Statement => {
  const qualifiers: Snak[] = []
  if (location.compass_angle !== undefined) {
    qualifiers.push(
      createQuantitySnak(WikidataProperty.Heading, location.compass_angle, WikidataEntity.Degree),
    )
  }
  return createStatement(
    createGlobeCoordinateSnak(
      WikidataProperty.CoordinatesOfThePointOfView,
      location.latitude,
      location.longitude,
    ),
    qualifiers,
  )
}
