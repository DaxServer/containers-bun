import { WikidataEntity, WikidataProperty } from '@/components/wikidata/useWikidata'
import {
  createCopyrightLicenseClaim,
  createCopyrightStatusClaim,
  createCreatorClaim,
  createExternalIdSnak,
  createHeightClaim,
  createInceptionClaim,
  createQuantitySnak,
  createSourceOfFileClaim,
  createStatement,
  createStringSnak,
  createTimeSnak,
  createUrlSnak,
  createWidthClaim,
  createWikibaseItemSnak,
  getNumericId,
} from '@/composables/sdc'
import { DataValueType, Rank, SnakDataType, SnakType, WikibaseEntityType } from '@/types/asyncapi'
import { describe, expect, it } from 'bun:test'

describe('SDC Builders', () => {
  it('should create an external-id statement', () => {
    const property = 'P1947'
    const value = '168951548443095'

    expect(createStatement(createExternalIdSnak(property, value))).toEqual({
      mainsnak: {
        snaktype: SnakType.VALUE,
        property,
        datatype: SnakDataType.EXTERNAL_ID,
        datavalue: {
          value,
          type: DataValueType.STRING,
        },
      },
      type: 'statement',
      rank: Rank.NORMAL,
    })
  })

  it('should create a wikibase-item statement', () => {
    const property = 'P1433'
    const numericId = 26757498

    expect(createStatement(createWikibaseItemSnak(property, `Q${numericId}`))).toEqual({
      mainsnak: {
        snaktype: SnakType.VALUE,
        property,
        datatype: SnakDataType.WIKIBASE_ITEM,
        datavalue: {
          value: {
            'entity-type': WikibaseEntityType.ITEM,
            'numeric-id': numericId,
          },
          type: DataValueType.WIKIBASE_ENTITYID,
        },
      },
      type: 'statement',
      rank: Rank.NORMAL,
    })
  })

  it('should create a time statement', () => {
    const property = 'P571'
    const dateValue = '2017-06-24T00:00:00Z'

    expect(createStatement(createTimeSnak(property, new Date(dateValue)))).toEqual({
      mainsnak: {
        snaktype: SnakType.VALUE,
        property,
        datatype: SnakDataType.TIME,
        datavalue: {
          value: {
            time: `+0000000${dateValue}`,
            precision: 11,
            after: 0,
            before: 0,
            timezone: 0,
            calendarmodel: 'http://www.wikidata.org/entity/Q1985727',
          },
          type: DataValueType.TIME,
        },
      },
      type: 'statement',
      rank: Rank.NORMAL,
    })
  })

  it('should create a quantity statement', () => {
    const property = 'P2049'
    const amount = 5312
    const unit = 'Q355198'

    expect(createStatement(createQuantitySnak(property, amount, unit))).toEqual({
      mainsnak: {
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
      },
      type: 'statement',
      rank: Rank.NORMAL,
    })
  })

  it('should create a string value snak with qualifiers', () => {
    const property = 'P2093'
    const value = 'testuser'

    expect(createStringSnak(property, value)).toEqual({
      snaktype: SnakType.VALUE,
      property,
      datatype: SnakDataType.STRING,
      datavalue: {
        value,
        type: DataValueType.STRING,
      },
    })
  })

  it('should create a url value snak with qualifiers', () => {
    const property = 'P2699'
    const value = 'https://www.example.com/user/testuser'

    expect(createUrlSnak(property, value)).toEqual({
      snaktype: SnakType.VALUE,
      property,
      datatype: SnakDataType.URL,
      datavalue: {
        value,
        type: DataValueType.STRING,
      },
    })
  })

  it('should create creator claim with qualifiers', () => {
    const username = 'testuser'

    expect(
      createCreatorClaim(username, [
        createExternalIdSnak(WikidataProperty.MapillaryUsername, username),
      ]),
    ).toEqual({
      mainsnak: {
        property: WikidataProperty.Creator,
        snaktype: SnakType.SOMEVALUE,
      },
      qualifiers: {
        [WikidataProperty.AuthorNameString]: [
          {
            snaktype: SnakType.VALUE,
            property: WikidataProperty.AuthorNameString,
            datatype: SnakDataType.STRING,
            datavalue: {
              value: username,
              type: DataValueType.STRING,
            },
          },
        ],
        [WikidataProperty.MapillaryUsername]: [
          {
            snaktype: SnakType.VALUE,
            property: WikidataProperty.MapillaryUsername,
            datatype: SnakDataType.EXTERNAL_ID,
            datavalue: {
              value: username,
              type: DataValueType.STRING,
            },
          },
        ],
      },
      'qualifiers-order': [WikidataProperty.AuthorNameString, WikidataProperty.MapillaryUsername],
      type: 'statement',
      rank: Rank.NORMAL,
    })
  })

  it('should create Inception claim', () => {
    const date = '2023-01-01T00:00:00Z'

    expect(createInceptionClaim(new Date(date))).toEqual({
      mainsnak: {
        property: WikidataProperty.Inception,
        snaktype: SnakType.VALUE,
        datatype: SnakDataType.TIME,
        datavalue: {
          value: {
            time: `+0000000${date}`,
            precision: 11,
            after: 0,
            before: 0,
            timezone: 0,
            calendarmodel: 'http://www.wikidata.org/entity/Q1985727',
          },
          type: DataValueType.TIME,
        },
      },
      type: 'statement',
      rank: Rank.NORMAL,
    })
  })

  it('should create Source of File claim', () => {
    const url = 'https://example.com/image.jpg'

    expect(createSourceOfFileClaim(url)).toEqual({
      mainsnak: {
        property: WikidataProperty.SourceOfFile,
        snaktype: SnakType.VALUE,
        datatype: SnakDataType.WIKIBASE_ITEM,
        datavalue: {
          value: {
            'entity-type': WikibaseEntityType.ITEM,
            'numeric-id': getNumericId(WikidataEntity.FileAvailableOnInternet),
          },
          type: DataValueType.WIKIBASE_ENTITYID,
        },
      },
      qualifiers: {
        [WikidataProperty.Operator]: [
          {
            snaktype: SnakType.VALUE,
            property: WikidataProperty.Operator,
            datatype: SnakDataType.WIKIBASE_ITEM,
            datavalue: {
              value: {
                'entity-type': WikibaseEntityType.ITEM,
                'numeric-id': getNumericId(WikidataEntity.Mapillary),
              },
              type: DataValueType.WIKIBASE_ENTITYID,
            },
          },
        ],
        [WikidataProperty.DescribedAtUrl]: [
          {
            snaktype: SnakType.VALUE,
            property: WikidataProperty.DescribedAtUrl,
            datatype: SnakDataType.URL,
            datavalue: {
              value: url,
              type: DataValueType.STRING,
            },
          },
        ],
      },
      'qualifiers-order': [WikidataProperty.Operator, WikidataProperty.DescribedAtUrl],
      type: 'statement',
      rank: Rank.NORMAL,
    })
  })

  it('should create Copyright Status claim', () => {
    expect(createCopyrightStatusClaim()).toEqual({
      mainsnak: {
        property: WikidataProperty.CopyrightStatus,
        snaktype: SnakType.VALUE,
        datatype: SnakDataType.WIKIBASE_ITEM,
        datavalue: {
          value: {
            'entity-type': WikibaseEntityType.ITEM,
            'numeric-id': getNumericId(WikidataEntity.Copyrighted),
          },
          type: DataValueType.WIKIBASE_ENTITYID,
        },
      },
      type: 'statement',
      rank: Rank.NORMAL,
    })
  })

  it('should create Copyright License claim', () => {
    expect(createCopyrightLicenseClaim()).toEqual({
      mainsnak: {
        property: WikidataProperty.CopyrightLicense,
        snaktype: SnakType.VALUE,
        datatype: SnakDataType.WIKIBASE_ITEM,
        datavalue: {
          value: {
            'entity-type': WikibaseEntityType.ITEM,
            'numeric-id': getNumericId(WikidataEntity.CCBYSA40),
          },
          type: DataValueType.WIKIBASE_ENTITYID,
        },
      },
      type: 'statement',
      rank: Rank.NORMAL,
    })
  })

  it('should create Width claim', () => {
    const width = 1000

    expect(createWidthClaim(width)).toEqual({
      mainsnak: {
        property: WikidataProperty.Width,
        snaktype: SnakType.VALUE,
        datatype: SnakDataType.QUANTITY,
        datavalue: {
          value: {
            amount: `+${width}`,
            upperBound: null,
            lowerBound: null,
            unit: `http://www.wikidata.org/entity/${WikidataEntity.Pixel}`,
          },
          type: DataValueType.QUANTITY,
        },
      },
      type: 'statement',
      rank: Rank.NORMAL,
    })
  })

  it('should create Height claim', () => {
    const height = 800

    expect(createHeightClaim(height)).toEqual({
      mainsnak: {
        property: WikidataProperty.Height,
        snaktype: SnakType.VALUE,
        datatype: SnakDataType.QUANTITY,
        datavalue: {
          value: {
            amount: `+${height}`,
            upperBound: null,
            lowerBound: null,
            unit: `http://www.wikidata.org/entity/${WikidataEntity.Pixel}`,
          },
          type: DataValueType.QUANTITY,
        },
      },
      type: 'statement',
      rank: Rank.NORMAL,
    })
  })
})
