import { WIKIDATA_ENTITY, WIKIDATA_PROPERTY } from '@backend/mediawiki/sdc'

const properties: Record<string, string> = {
  [WIKIDATA_PROPERTY.AuthorNameString]: 'author name string',
  [WIKIDATA_PROPERTY.CommonsCategory]: 'Commons category',
  [WIKIDATA_PROPERTY.CoordinatesOfThePointOfView]: 'coordinates of the point of view',
  [WIKIDATA_PROPERTY.CopyrightLicense]: 'copyright license',
  [WIKIDATA_PROPERTY.CopyrightStatus]: 'copyright status',
  [WIKIDATA_PROPERTY.Creator]: 'creator',
  [WIKIDATA_PROPERTY.DescribedAtUrl]: 'described at url',
  [WIKIDATA_PROPERTY.Heading]: 'heading',
  [WIKIDATA_PROPERTY.Height]: 'height',
  [WIKIDATA_PROPERTY.Inception]: 'inception',
  [WIKIDATA_PROPERTY.MapillaryPhotoID]: 'Mapillary photo ID',
  [WIKIDATA_PROPERTY.MapillaryUsername]: 'Mapillary username',
  [WIKIDATA_PROPERTY.Operator]: 'operator',
  [WIKIDATA_PROPERTY.PublishedIn]: 'published in',
  [WIKIDATA_PROPERTY.SourceOfFile]: 'source of file',
  [WIKIDATA_PROPERTY.Title]: 'title',
  [WIKIDATA_PROPERTY.Url]: 'url',
  [WIKIDATA_PROPERTY.Width]: 'width',
}

const entities: Record<string, string> = {
  [WIKIDATA_ENTITY.CCBYSA40]: 'CC BY-SA 4.0',
  [WIKIDATA_ENTITY.Copyrighted]: 'copyrighted',
  [WIKIDATA_ENTITY.Degree]: 'degree',
  [WIKIDATA_ENTITY.FileAvailableOnInternet]: 'file available on the internet',
  [WIKIDATA_ENTITY.Mapillary]: 'Mapillary',
  [WIKIDATA_ENTITY.MapillaryDatabase]: 'Mapillary database',
  [WIKIDATA_ENTITY.Pixel]: 'pixel',
}

export const useWikidata = () => {
  const getPropertyLabel = (property: string) => properties[property] ?? ''
  const getEntityLabel = (entity: string) => entities[entity] ?? ''

  return {
    getPropertyLabel,
    getEntityLabel,
  }
}
